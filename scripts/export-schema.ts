import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { packSchema } from '../src/domain/pack/schema.ts';

writeFileSync(new URL('../docs/estudio-pack-1.schema.json', import.meta.url),
  `${JSON.stringify(z.toJSONSchema(packSchema), null, 2)}\n`);
