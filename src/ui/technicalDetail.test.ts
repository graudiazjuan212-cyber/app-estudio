import { expect, it } from 'vitest';
import { technicalDetail } from './technicalDetail.ts';
import { expectedDetail, fileFixture as f } from '../../tests/fixtures/file-delivery.ts';

it('formats every diagnostic line exactly with fixed metadata', () => {
  expect(technicalDetail({ operation: 'Compartir archivo', error: new DOMException('Permission denied', 'NotAllowedError'),
    fileName: f.fileName, fileType: f.type, size: 42, canShare: true, userAgent: f.userAgent, now: f.now })).toBe(expectedDetail);
});
it.each([['fallo', 'fallo'], [null, 'null'], [{ private: 'dato' }, '[object Object]']] as const)(
  'formats non Error values without serializing object properties: %s', (error, expected) => {
    expect(technicalDetail({ operation: 'Exportar copia', error, userAgent: f.userAgent })).toContain(`Error: ${expected}\n`);
  });
it.each([[false, 'no'], [undefined, 'n/d']] as const)('reports unavailable or false capability: %s', (canShare, text) => {
  expect(technicalDetail({ operation: 'Exportar copia', error: null, canShare, userAgent: f.userAgent })).toContain(`canShare: ${text}\n`);
});
it('contains metadata only, never the backup content', () => {
  const result = technicalDetail({ operation: 'Exportar copia', error: new Error('disco lleno'),
    fileName: f.fileName, fileType: f.type, size: new Blob([f.json]).size, userAgent: f.userAgent, now: f.now });
  for (const secret of [f.json, 'pregunta privada', 'respuesta privada', 'id-privado']) expect(result).not.toContain(secret);
});
