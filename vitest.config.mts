import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only. Integration tests run under @vscode/test-electron,
    // which needs a real VS Code binary and is driven separately.
    // .mts for tests that import ES-module scripts (e.g. scripts/*.mjs).
    include: ['src/test/unit/**/*.test.{ts,mts}'],
    environment: 'node',
    coverage: { reporter: ['text', 'lcov'], include: ['src/**/*.ts'] },
  },
});
