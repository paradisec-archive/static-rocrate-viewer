import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'scripts/generate-catalog.ts',
      formats: ['es'],
      fileName: 'generate-catalog',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: [/^node:/],
    },
  },
});
