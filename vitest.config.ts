import { defineConfig } from 'vitest/config';

// Standalone rather than merged with vite.config.ts: tests are Node-side only
// (EAF parsing happens at generate time), so the React/router/Tailwind plugins
// are dead weight here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
