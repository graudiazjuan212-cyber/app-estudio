import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'dist-e2e/**', 'dist-e2e-a/**', 'dist-e2e-b/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'coverage/**'] },
  js.configs.recommended,
  { files: ['**/*.js', '**/*.mjs'], languageOptions: { globals: globals.node } },
  ...ts.configs.strictTypeChecked.map(config => ({ ...config, files: ['**/*.ts', '**/*.tsx'] })),
  ...ts.configs.stylisticTypeChecked.map(config => ({ ...config, files: ['**/*.ts', '**/*.tsx'] })),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    plugins: { 'react-hooks': hooks },
    rules: { ...hooks.configs.recommended.rules, '@typescript-eslint/no-explicit-any': 'error' },
  },
];
