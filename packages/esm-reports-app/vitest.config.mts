import { defineConfig } from 'vitest/config';
import path from 'node:path';

const rootDir = path.resolve(__dirname, '..', '..');

export default defineConfig({
  resolve: {
    alias: {
      'workbox-window': path.resolve(rootDir, '__mocks__', 'workbox-window.ts'),
    },
  },
  test: {
    root: rootDir,
    globals: true,
    environment: 'jsdom',
    server: {
      deps: {
        inline: [/@openmrs\/esm-/],
      },
    },
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: [path.resolve(rootDir, 'tools', 'setupTests.ts')],
    include: ['packages/esm-reports-app/src/**/*.test.{ts,tsx}'],
    alias: {
      '@openmrs/esm-framework': '@openmrs/esm-framework/mock',
      '@openmrs/esm-patient-common-lib': '@openmrs/esm-patient-common-lib',
      'react-i18next': path.resolve(rootDir, '__mocks__', 'react-i18next.js'),
      'lodash-es': 'lodash',
      uuid: path.resolve(rootDir, 'node_modules', 'uuid', 'dist', 'index.js'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: path.resolve(__dirname, 'coverage'),
      include: ['packages/esm-reports-app/src/**/*.{ts,tsx}'],
      exclude: [
        'packages/esm-reports-app/src/index.ts',
        'packages/esm-reports-app/src/declarations.d.ts',
        'packages/esm-reports-app/src/config-schema.ts',
        'packages/esm-reports-app/src/types/**',
        '**/*.test.*',
      ],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
});
