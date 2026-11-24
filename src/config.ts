export const appConfig = {
  productionBase: '/app-estudio/',
  developmentBase: '/',
  title: 'Estudio',
  themeColor: '#204b46',
  backgroundColor: '#f5f7f6',
  previewPort: 4173,
} as const;

export const dataConfig = {
  dbName: 'estudio', schemaVersion: 1, snapshotKeep: 3, premigrationKeep: 2,
  blockedTimeoutMs: 8000,
  maxBackupRows: 2000000,
  backupSchema: 'estudio-backup/1' as const, backupReminderDays: 7,
};

export function previewUrl(): string {
  return `http://localhost:${String(appConfig.previewPort)}${appConfig.productionBase}`;
}

export const packConfig = {
  schema: 'estudio-pack/1', idMax: 80, nameMax: 80, titleMax: 120,
  textMax: 4000, bodyMax: 8000, sourceMax: 200, tagsMax: 10, tagMax: 40,
  depthMax: 12,
  listNames: { opciones: 'Las opciones', pasos: 'Los pasos', pares: 'Los pares', huecos: 'Los huecos' } as Record<string, string>,
  itemTypes: ['info', 'flashcard', 'test', 'multi', 'vf', 'ordenar', 'emparejar', 'huecos', 'error'],
  semanticDescription: 'La app comprueba además ocho reglas semánticas: número de opciones correctas (una en test y huecos; al menos una correcta y una incorrecta en multi), textos distintos, marcadores {{n}} consecutivos y correspondientes a los huecos, exactamente un paso incorrecto, ids únicos y no reservados, dependencias existentes sin autorreferencias, ausencia de ciclos y LaTeX válido.',
  blocksMax: 60, itemsMax: 200, errorsMax: 50, suggestionDistance: 2,
  weights: [1, 3, 5], testOptions: [3, 5], multiOptions: [3, 6],
  gapOptions: [2, 5], steps: [3, 8], pairs: [3, 6], gaps: [1, 6],
} as const;

export const studyConfig = {
  secondsPerType: { info: 20, flashcard: 15, vf: 15, test: 30, multi: 40,
    huecos: 45, ordenar: 60, emparejar: 60, error: 60 },
  calibrationMinAttempts: 30,
  calibrationClampSeconds: [5, 180],
  blindSpotBudgetPercent: 40,
  examSize: { current: 2, previous: 1, earlier: 1, relaciona: 1 },
  examPassPercent: 80,
  dailyGoalMinutes: [5, 10, 15],
  defaultSessionMinutes: 10,
  defaultDailyGoalMinutes: 10,
  defaultTheme: 'system',
  themes: ['system', 'light', 'dark'],
  maxAttemptMs: 3600000,
  secondsPerMinute: 60,
  millisecondsPerSecond: 1000,
  random: { increment: 0x6d2b79f5, shiftA: 15, shiftB: 7, shiftC: 14, divisor: 4294967296, mix: 61 },
  dayCutoffHour: 4,
  schedulerVersion: 1,
  fsrs: {
    request_retention: 0.9, maximum_interval: 36500,
    enable_fuzz: false, enable_short_term: false,
  },
  masteryThresholdPercent: 80,
  percentScale: 100,
  masteryRequiredDays: 2,
  graduationRequiredReviews: 3,
  initialItemGeneration: 1,
  emptyCardInstant: '1970-01-01T00:00:00.000Z',
  millisecondsPerDay: 86400000,
  cutoffSearchDays: 2,
} as const;

export const renderConfig = {
  cacheMax: 500,
  markdown: { html: false, linkify: false, typographer: false, breaks: false },
  mathOutput: 'htmlAndMathml',
  orderRetries: 10,
  hashOffset: 2166136261,
  hashPrime: 16777619,
  codeIndent: 4,
} as const;

export const questionConfig = {
  confidences: [['duda', 'Duda'], ['bastante', 'Bastante seguro'], ['seguro', 'Seguro']],
  ratings: [['otra', 'Otra vez'], ['dificil', 'Difícil'], ['bien', 'Bien'], ['facil', 'Fácil']],
} as const;

export const routerConfig = { idPattern: /^[a-z0-9][a-z0-9_-]{0,79}$/ };
