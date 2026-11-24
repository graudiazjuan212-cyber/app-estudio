import { defineConfig } from 'vitest/config';

// Tests that inspect the production build in `dist/`: they run after `npm run build`.
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.dist.test.ts'] },
});
