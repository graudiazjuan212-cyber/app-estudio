export const fileFixture = {
  json: '{"secret":"pregunta privada, respuesta privada, id-privado"}',
  fileName: 'backup_estudio_2026-11-24.json', type: 'application/json',
  now: '2026-11-24T10:00:00.000Z', userAgent: 'Chrome Android prueba',
};
export const expectedDetail = 'Operación: Compartir archivo\nError: NotAllowedError: Permission denied\nArchivo: backup_estudio_2026-11-24.json (application/json, 42 bytes)\ncanShare: sí\nNavegador: Chrome Android prueba\nHora: 2026-11-24T10:00:00.000Z';
