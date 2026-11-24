export const appConfig = {
  productionBase: '/app-estudio/',
  developmentBase: '/',
  title: 'Estudio',
  themeColor: '#204b46',
  backgroundColor: '#f5f7f6',
  previewPort: 4173,
} as const;

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
