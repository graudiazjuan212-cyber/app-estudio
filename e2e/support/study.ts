import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
interface Option { texto: string; correcta: boolean; feedback?: string }
export interface DemoItem {
  id: string; tipo: string; enunciado?: string; anverso?: string; titulo?: string; opciones?: Option[]; correcta?: boolean;
  pasos?: (string | { texto: string; incorrecto: boolean })[];
  pares?: { izquierda: string; derecha: string }[];
  huecos?: { n: number; opciones: Option[] }[];
}
interface Fixture { bloques: { items: DemoItem[] }[] }
export function fixtureItems(name = 'mat-ejemplo-c01'): DemoItem[] {
  const fixture = JSON.parse(readFileSync(new URL(`../../tests/fixtures/packs/${name}.json`, import.meta.url), 'utf8')) as Fixture;
  return fixture.bloques.flatMap(block => block.items);
}
export async function answerCorrectly(page: Page, item: DemoItem, correct = true, submit: 'click' | 'dblclick' | 'answer-only' = 'click') {
  await page.locator('article button').evaluateAll(nodes => {
    for (const node of nodes) {
      const clone = node.cloneNode(true) as HTMLElement;
      for (const math of clone.querySelectorAll('.katex')) math.replaceWith(`$${math.querySelector('annotation')?.textContent ?? ''}$`);
      node.setAttribute('data-source-text', clone.textContent.trim());
    }
  });
  const card = page.getByRole('article', { name: 'Pregunta', exact: true });
  const click = async (text: string) => { await textControl(page, 'button', text).click(); };
  switch (item.tipo) {
    case 'info': await click('Entendido'); return;
    case 'flashcard': await click('Mostrar respuesta'); await click(correct ? 'Bien' : 'Otra vez'); return;
    case 'test': case 'multi': {
      const options = required(item.opciones);
      const chosen = item.tipo === 'test' ? [required(options.find(o => o.correcta === correct))]
        : correct ? options.filter(o => o.correcta) : options.filter(o => !o.correcta);
      for (const option of chosen) await textControl(page, item.tipo === 'test' ? 'radio' : 'checkbox', option.texto).click();
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
  if (submit === 'answer-only') return;
  await expect(card.getByRole('button', { name: 'Comprobar', exact: true })).toBeEnabled();
  await card.getByRole('radio', { name: 'Seguro', exact: true }).click();
  await card.getByRole('button', { name: 'Comprobar', exact: true })[submit]();
}
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Faltan datos de la pregunta.");
  return value;
}

export async function importFixture(page: Page, name: string) {
  await page.goto('./#/ajustes');
  await page.getByLabel('Elegir archivo').setInputFiles(`tests/fixtures/packs/${name}.json`);
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await expect(page.getByText(/^Importado:/)).toBeVisible();
}
export async function idbCount(page: Page, table: string): Promise<number> {
  return page.evaluate(table => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('estudio');
    request.onerror = () => { reject(new Error('Cannot open database')); };
    request.onsuccess = () => {
      const db = request.result;
      const count = db.transaction(table).objectStore(table).count();
      count.onsuccess = () => { db.close(); resolve(count.result); };
      count.onerror = () => { db.close(); reject(new Error('Cannot count rows')); };
    };
  }), table);
}
export async function visibleItem(page: Page, name = 'mat-ejemplo-c01'): Promise<DemoItem> {
  await expect(page.getByRole('article', { name: 'Pregunta', exact: true })).toBeVisible();
  const text = await page.locator('article[aria-label="Pregunta"]').evaluate(node => {
    const clone = node.firstElementChild?.cloneNode(true) as HTMLElement;
    for (const math of clone.querySelectorAll('.katex')) math.replaceWith(`$${math.querySelector('annotation')?.textContent ?? ''}$`);
    return clone.textContent;
  });
  const item = fixtureItems(name).find(i => text.trim() === (i.enunciado ?? i.anverso ?? i.titulo ?? 'MISSING'));
  return required(item);
}
function textControl(page: Page, role: 'button' | 'radio' | 'checkbox', text: string) {
  if (!text.includes('$')) return page.getByRole('article', { name: 'Pregunta', exact: true }).getByRole(role, { name: text, exact: true });
  return page.getByRole('article', { name: 'Pregunta', exact: true }).getByRole(role).and(page.locator(`[data-source-text=${JSON.stringify(text)}]`));
}
