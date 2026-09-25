import { defineConfig } from 'vitest/config';
// Medições de desempenho (fora da suíte normal): npx vitest run -c dev/vitest.perf.config.ts
export default defineConfig({ test: { include: ['dev/**/*.test.ts'] } });
