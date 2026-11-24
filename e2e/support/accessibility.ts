import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { qualityConfig as c } from './quality-config';

export async function audit(page: Page) {
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  expect(await page.locator('body').innerText()).not.toMatch(c.forbidden);
  const result = await new AxeBuilder({ page }).withTags([...c.tags]).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
  for (const control of await page.locator('button, a[href], select, textarea, input:not([type="radio"]):not([type="checkbox"]), label:has(input[type="radio"]), label:has(input[type="checkbox"])').all()) {
    if (!await control.isVisible()) continue;
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(c.targetSize);
    expect(box?.width).toBeGreaterThanOrEqual(c.targetSize);
  }
}
export async function visibleFocus(page: Page, control: Locator) {
  await control.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(control).toBeFocused();
  const focus = await control.evaluate(node => {
    const style = getComputedStyle(node);
    function luminance(color: string) {
      const rgb = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
      if (rgb?.length !== 3) throw new Error(`Color no medible: ${color}`);
      return rgb.reduce((total, channel, index) => {
        const value = channel / 255;
        return total + (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
          * ([0.2126, 0.7152, 0.0722][index] ?? 0);
      }, 0);
    }
    const foreground = luminance(style.outlineColor);
    const background = luminance(getComputedStyle(document.body).backgroundColor);
    return { visible: node.matches(':focus-visible'), width: parseFloat(style.outlineWidth),
      contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05) };
  });
  expect(focus.visible).toBe(true);
  expect(focus.width).toBeGreaterThanOrEqual(c.focusWidth);
  expect(focus.contrast).toBeGreaterThanOrEqual(c.focusContrast);
}
