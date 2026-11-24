import { z } from 'zod';
import { packConfig as c } from '../../config.ts';

const text = (max: number = c.textMax) => z.string().min(1).max(max).refine(s => s.trim().length > 0, 'El texto no puede estar vacío.');
export const idSchema = z.string().min(1).max(c.idMax).regex(/^[a-z0-9][a-z0-9_-]*$/);
const common = {
  id: idSchema, etiquetas: z.array(text(c.tagMax)).max(c.tagsMax).optional(),
  fuente: text(c.sourceMax).optional(),
};
const evaluable = { ...common, relaciona: z.boolean().optional(), explicacion: text().optional() };
export const optionSchema = z.strictObject({ texto: text(), correcta: z.boolean(), feedback: text().optional() });
const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-ES');
const distinct = (values: string[]) => new Set(values.map(normalize)).size === values.length;
function choices(min: number, max: number, multi = false) {
  return z.array(optionSchema).min(min).max(max).superRefine((options, ctx) => {
    const count = options.filter(o => o.correcta).length;
    if (multi ? count === 0 || count === options.length : count !== 1)
      ctx.addIssue({ code: 'custom', message: multi
        ? 'Debe haber al menos 1 opción correcta y 1 incorrecta.'
        : `Debe tener exactamente 1 opción correcta y tiene ${String(count)}.` });
    if (!distinct(options.map(o => o.texto))) ctx.addIssue({ code: 'custom', message: 'Los textos de las opciones deben ser distintos.' });
  });
}
export const itemSchema = z.discriminatedUnion('tipo', [
  z.strictObject({ ...common, tipo: z.literal('info'), titulo: text(c.titleMax), cuerpo: text(c.bodyMax) }),
  z.strictObject({ ...evaluable, tipo: z.literal('flashcard'), anverso: text(), reverso: text() }),
  z.strictObject({ ...evaluable, tipo: z.literal('test'), enunciado: text(), opciones: choices(...c.testOptions) }),
  z.strictObject({ ...evaluable, tipo: z.literal('multi'), enunciado: text(), opciones: choices(...c.multiOptions, true) }),
  z.strictObject({ ...evaluable, tipo: z.literal('vf'), enunciado: text(), correcta: z.boolean(), feedback: text().optional() }),
  z.strictObject({ ...evaluable, tipo: z.literal('ordenar'), enunciado: text(),
    pasos: z.array(text()).min(c.steps[0]).max(c.steps[1]).refine(distinct, 'Los pasos deben ser distintos.') }),
  z.strictObject({ ...evaluable, tipo: z.literal('emparejar'), enunciado: text(),
    pares: z.array(z.strictObject({ izquierda: text(), derecha: text() })).min(c.pairs[0]).max(c.pairs[1])
      .superRefine((pairs, ctx) => {
        for (const side of ['izquierda', 'derecha'] as const)
          if (!distinct(pairs.map(p => p[side]))) ctx.addIssue({ code: 'custom', path: [side], message: `Los textos de ${side} deben ser distintos.` });
      }) }),
  z.strictObject({ ...evaluable, tipo: z.literal('huecos'), enunciado: text(),
    huecos: z.array(z.strictObject({ n: z.int().min(1), opciones: choices(...c.gapOptions) })).min(c.gaps[0]).max(c.gaps[1]),
  }).superRefine((item, ctx) => {
    const markers = [...item.enunciado.matchAll(/\{\{([^{}]*)\}\}/g)].map(m => m[1]);
    const expected = item.huecos.map((_, i) => String(i + 1));
    if (markers.length !== expected.length || new Set(markers).size !== markers.length ||
      expected.some(n => !markers.includes(n)) ||
      new Set(item.huecos.map(h => h.n)).size !== expected.length ||
      expected.some(n => !item.huecos.some(h => String(h.n) === n)))
      ctx.addIssue({ code: 'custom', path: ['huecos'], message: 'Los marcadores deben empezar en 1, sin saltos ni repeticiones, y corresponder a cada hueco.' });
  }),
  z.strictObject({ ...evaluable, tipo: z.literal('error'), enunciado: text(), correccion: text().optional(),
    pasos: z.array(z.strictObject({ texto: text(), incorrecto: z.boolean() })).min(c.steps[0]).max(c.steps[1])
      .refine(steps => steps.filter(s => s.incorrecto).length === 1, 'Debe haber exactamente 1 paso incorrecto.') }),
]);
export const blockSchema = z.strictObject({ id: idSchema, titulo: text(c.titleMax),
  peso: z.union(c.weights.map(w => z.literal(w))), requiere: z.array(idSchema).default([]),
  items: z.array(itemSchema).min(1).max(c.itemsMax) });
export const packSchema = z.strictObject({
  schema: z.literal(c.schema), asignatura: z.strictObject({ id: idSchema, nombre: text(c.nameMax) }),
  capitulo: z.strictObject({ id: idSchema, numero: z.int().min(1), titulo: text(c.titleMax) }),
  version: z.int().min(1), generado: z.iso.date(), bloques: z.array(blockSchema).min(1).max(c.blocksMax),
});
export type Pack = z.infer<typeof packSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Block = z.infer<typeof blockSchema>;
export type ItemType = Item['tipo'];
