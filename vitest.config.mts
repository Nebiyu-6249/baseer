import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only. Integration tests run under @vscode/test-electron,
    // which needs a real VS Code binary and is driven separately.
    include: ['src/test/unit/**/*.test.ts'],
    environment: 'node',
    coverage: { reporter: ['text', 'lcov'], include: ['src/**/*.ts'] },
  },
});
