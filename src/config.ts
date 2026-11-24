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
