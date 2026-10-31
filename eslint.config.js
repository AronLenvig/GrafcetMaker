import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist',
      'dev-dist',
      'coverage',
      'playwright-report',
      'test-results',
      'node_modules',
      'scripts/_*',
      '.wrangler',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // core/ must stay framework- and DOM-free so it runs in Node and Web Workers.
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: { ...globals['shared-node-browser'] } },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'zustand', 'zustand/*', 'dexie', 'i18next'],
              message: 'core/ must stay pure.',
            },
            {
              group: ['@/ui/*', '@/editor/*', '@/panels/*', '@/app/*', '@/theme/*', '@/workers/*'],
              message: 'core/ must not depend on UI layers.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator'],
    },
  },
  // UI layers, lowest first: core ← ui ← editor ← panels ← app (CONTRIBUTING.md, Architecture).
  // A layer imports only the layers below it; app-level wiring fills in what the editor needs.
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/editor/*',
                '@/panels/*',
                '@/app/*',
                '**/editor/**',
                '**/panels/**',
                '**/app/**',
              ],
              message: 'ui/ is the shared UI kit: it must not depend on the editor, panels or app.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/editor/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/panels/*', '@/app/*', '**/panels/**', '**/app/**'],
              message: 'editor/ must not depend on the panels or the app.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/panels/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/app/*', '**/app/**'], message: 'panels/ must not depend on the app.' },
          ],
        },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**', 'tests/e2e/**', 'server/**'],
    languageOptions: { globals: { ...globals.node } },
  },
);
