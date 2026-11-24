import { z } from 'zod';
import { progressConfig as c, studyConfig, packConfig } from '../../config.ts';
import { idSchema } from '../pack/schema.ts';

const brief = z.string().max(c.shortTextMax + 1);
const session = z.strictObject({
  fecha: z.iso.date(), minutos: z.number().nonnegative().multipleOf(1 / c.decimalScale),
  preguntas: z.int().nonnegative(), aciertos: z.int().nonnegative(),
  tipo: z.enum(['estudio', 'repaso', 'examen']),
}).refine(s => s.aciertos <= s.preguntas, 'Los aciertos no pueden superar las preguntas.');
export const progressSchema = z.strictObject({
  schema: z.literal(c.schema), exportado: z.iso.datetime({ offset: true }), asignatura: idSchema,
  sesiones: z.array(session).max(c.sessionsMax),
  capitulos: z.array(z.strictObject({
    id: idSchema, numero: z.int().positive(), titulo: z.string(), porcentaje: z.int().min(0).max(studyConfig.percentScale),
    bloques: z.array(z.strictObject({
      id: idSchema, titulo: z.string(), peso: z.union(packConfig.weights.map(w => z.literal(w))),
      estado: z.enum(['pendiente', 'en_curso', 'dominado', 'graduado']), bloqueado: z.boolean(),
      dias_dominio: z.array(z.iso.date()), proximo_repaso: z.iso.date().nullable(),
    })),
  })),
  puntos_ciegos: z.array(z.strictObject({ item: idSchema, enunciado_corto: brief, fecha: z.iso.date() })),
  fallos_recurrentes: z.array(z.strictObject({
    item: idSchema, enunciado_corto: brief, fallos: z.int().min(c.minimumFailures),
  })),
});
export type ProgressExport = z.infer<typeof progressSchema>;
