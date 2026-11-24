import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
interface Option { texto: string; correcta: boolean; feedback?: string }
interface DemoItem {
  id: string; tipo: string; opciones?: Option[]; correcta?: boolean;
  pasos?: (string | { texto: string; incorrecto: boolean })[];
  pares?: { izquierda: string; derecha: string }[];
  huecos?: { n: number; opciones: Option[] }[];
}
interface Fixture { bloques: { items: DemoItem[] }[] }
function items(name: string): DemoItem[] {
  const fixture = JSON.parse(readFileSync(new URL(`../tests/fixtures/packs/${name}-ejemplo-c01.json`, import.meta.url), 'utf8')) as Fixture;
  return fixture.bloques.flatMap(block => block.items);
}
async function select(page: Page, item: DemoItem) {
  await page.getByRole('combobox', { name: 'Pregunta' }).selectOption({ label: `${item.tipo} · ${item.id}` });
}
async function respond(page: Page, item: DemoItem, correct: boolean) {
  const card = page.getByRole('article', { name: 'Pregunta', exact: true });
  const click = async (text: string) => { await card.getByRole('button', { name: text, exact: true }).click(); };
  switch (item.tipo) {
    case 'info': await click('Entendido'); return;
    case 'flashcard': await click('Mostrar respuesta'); await click(correct ? 'Bien' : 'Otra vez'); return;
    case 'test': case 'multi': {
      const options = required(item.opciones);
      const chosen = item.tipo === 'test' ? [required(options.find(o => o.correcta === correct))]
        : correct ? options.filter(o => o.correcta) : options.filter(o => !o.correcta);
      for (const option of chosen) await card.getByRole(item.tipo === 'test' ? 'radio' : 'checkbox', { name: option.texto, exact: true }).click();
      break;
    }
    case 'vf': await card.getByRole('radio', { name: (correct ? item.correcta : !item.correcta) ? 'Verdadero' : 'Falso', exact: true }).click(); break;
    case 'ordenar': {
      const steps = item.pasos as string[];
      for (const step of correct ? steps : [...steps].reverse()) await click(step);
      break;
    }
    case 'emparejar': {
      const pairs = required(item.pares);
      for (let i = 0; i < pairs.length; i++) {
        await click(required(pairs[i]).izquierda);
        await click(required(pairs[correct ? i : (i + 1) % pairs.length]).derecha);
      }
      break;
    }
    case 'huecos':
      for (const gap of required(item.huecos)) {
        const option = required(gap.opciones.find(o => o.correcta === correct));
        await card.getByRole('radiogroup', { name: `Hueco ${String(gap.n)}`, exact: true }).getByRole('radio', { name: option.texto, exact: true }).click();
      }
      break;
    case 'error': {
      const steps = item.pasos as { texto: string; incorrecto: boolean }[];
      const index = steps.findIndex(step => step.incorrecto === correct);
      await card.getByRole('radio').nth(index).click(); break;
    }
  }
  await expect(card.getByRole('button', { name: 'Comprobar', exact: true })).toBeDisabled();
  await card.getByRole('radio', { name: 'Seguro', exact: true }).click();
  await card.getByRole('button', { name: 'Comprobar', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  page.on('console', message => { if (message.type() === 'error') throw new Error(message.text()); });
  await page.goto('./#/demo');
});
const demoItems = [...items('ioe'), ...items('codigo')];
for (const tipo of ['info', 'flashcard', 'test', 'multi', 'vf', 'ordenar', 'emparejar', 'huecos', 'error']) {
  for (const correct of tipo === 'info' ? [true] : [true, false]) {
    test(`${tipo}: ${correct ? 'correct' : 'incorrect'}`, async ({ page }) => {
      const item = required(demoItems.find(entry => entry.tipo === tipo));
      await select(page, item);
      // Buttons (including radio/checkbox roles) must meet both 44px dimensions.
      for (const target of await page.locator('article button').all()) {
        const box = required(await target.boundingBox());
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      await respond(page, item, correct);
      await expect(page.getByRole('status')).toContainText(tipo === 'info' || tipo === 'flashcard' ? 'Anotado' : correct ? 'Correcto' : 'Incorrecto');
      if (!correct && item.opciones) {
        for (const option of item.opciones.filter(o => !o.correcta && o.feedback)) {
          if (tipo === 'test' && option !== item.opciones.find(o => !o.correcta)) continue;
          await expect(page.getByText(required(option.feedback), { exact: true })).toBeVisible();
        }
      }
      await expect(page.getByRole('status')).toBeFocused();
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
      await expect(page.getByRole('status')).toHaveCount(0);
    });
  }
}
test('unknown answer', async ({ page }) => {
  await select(page, required(demoItems.find(i => i.tipo === 'test')));
  await page.getByRole('button', { name: 'No lo sé', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Incorrecto');
});
test('incomplete answer stays disabled even with confidence', async ({ page }) => {
  await select(page, required(demoItems.find(i => i.tipo === 'ordenar')));
  await page.getByRole('radio', { name: 'Seguro', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Comprobar', exact: true })).toBeDisabled();
});
test('failed save has no feedback and retries the same submission', async ({ page }) => {
  await select(page, required(demoItems.find(i => i.tipo === 'test')));
  await page.getByRole('checkbox', { name: 'Simular fallo de guardado' }).check();
  await respond(page, required(demoItems.find(i => i.tipo === 'test')), true);
  await expect(page.getByRole('alert')).toContainText('No se ha podido guardar');
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByTestId('submissions')).toHaveText('1');
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('status')).toContainText('Correcto');
  await expect(page.getByTestId('submissions')).toHaveText('2');
});
test('rapid double click submits once', async ({ page }) => {
  const item = required(demoItems.find(i => i.tipo === 'test'));
  await select(page, item);
  await page.getByRole('radio', { name: required(required(item.opciones).find(o => o.correcta)).texto, exact: true }).click();
  await page.getByRole('radio', { name: 'Seguro', exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).evaluate(button => {
    if (button instanceof HTMLButtonElement) { button.click(); button.click(); }
  });
  await expect(page.getByTestId('submissions')).toHaveText('1');
});
test('math renders and touch targets are large enough', async ({ page }) => {
  await select(page, required(items('mat').find(i => i.id === 'mat-i3')));
  await expect(page.locator('article .katex').first()).toBeVisible();
  // All interactive controls are buttons, including labelled radios: both dimensions >= 44px.
  for (const target of await page.locator('article button, article input, article [role="radio"], article [role="checkbox"]').all()) {
    if (!await target.isVisible()) continue;
    const box = await target.boundingBox();
    expect(required(box).width).toBeGreaterThanOrEqual(44);
    expect(required(box).height).toBeGreaterThanOrEqual(44);
  }
});

test('script markup stays text without dialogs or script errors', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', dialog => { dialogs.push(dialog.message()); void dialog.dismiss(); });
  await page.reload();
  await expect(page.getByText('<script>alert(1)</script>', { exact: true })).toBeVisible();
  expect(dialogs).toEqual([]);
});

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Faltan datos de la pregunta.");
  return value;
}
