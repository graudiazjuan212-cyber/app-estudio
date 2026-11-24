import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { packConfig } from '../src/config.ts';
import { packSchema } from '../src/domain/pack/schema.ts';

writeFileSync(new URL('../docs/estudio-pack-1.schema.json', import.meta.url),
  `${JSON.stringify({ ...z.toJSONSchema(packSchema, { io: 'input' }), description: packConfig.semanticDescription }, null, 2)}\n`);

import { progressConfig } from '../src/config.ts';
import { progressSchema } from '../src/domain/progress/schema.ts';

writeFileSync(new URL('../docs/estudio-progreso-1.schema.json', import.meta.url),
  `${JSON.stringify({ ...z.toJSONSchema(progressSchema, { io: 'input' }), description: progressConfig.semanticDescription }, null, 2)}\n`);
