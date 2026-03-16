import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: [path.resolve(__dirname, 'tools', 'setupTests.ts')],
    include: ['packages/**/src/**/*.test.{ts,tsx}'],
    alias: {
      '@openmrs/esm-framework': '@openmrs/esm-framework/mock',
      '@openmrs/esm-patient-common-lib': '@openmrs/esm-patient-common-lib',
      'react-i18next': path.resolve(__dirname, '__mocks__', 'react-i18next.js'),
      'lodash-es': 'lodash',
      uuid: path.resolve(__dirname, 'node_modules', 'uuid', 'dist', 'index.js'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: path.resolve(__dirname, 'coverage'),
      include: ['packages/**/src/**/*.component.tsx'],
      exclude: ['**/node_modules/**', '**/vendor/**', '**/src/**/*.test.*', '**/src/declarations.d.ts', '**/e2e/**'],
    },
  },
});

