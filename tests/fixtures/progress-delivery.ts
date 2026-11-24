export const choiceCases = [[true, 'share'], [false, 'download']] as const;
export const messageCases = [
  ['shared', 'Progreso exportado: progreso_ejmat_2026-12-02.json. Súbelo al proyecto de la asignatura en Claude.'],
  ['downloaded', 'Progreso exportado: progreso_ejmat_2026-12-02.json. Súbelo al proyecto de la asignatura en Claude.'],
  ['cancelled', 'Exportación cancelada. Puedes volver a intentarlo.'],
] as const;
