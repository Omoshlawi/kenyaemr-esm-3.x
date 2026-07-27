import path from 'node:path';
import { defineConfig } from 'vitest/config';

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
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: [path.resolve(rootDir, 'tools', 'setupTests.ts')],
    include: ['packages/esm-pharmacy-app/src/**/*.test.{ts,tsx}'],
    server: { deps: { inline: [/@openmrs\/esm-/] } },
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
      include: ['packages/esm-pharmacy-app/src/**/*.{ts,tsx}'],
      exclude: [
        'packages/esm-pharmacy-app/src/**/*.test.{ts,tsx}',
        'packages/esm-pharmacy-app/src/declarations.d.ts',
        'packages/esm-pharmacy-app/src/setup-tests.ts',
        'packages/esm-pharmacy-app/src/types/**',
      ],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
