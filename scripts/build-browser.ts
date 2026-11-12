import { fileURLToPath } from 'node:url';

import { build } from 'vite';

await build({
  configFile: false,
  logLevel: 'info',
  build: {
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL('../dist/index.js', import.meta.url)),
      name: 'ReedSolomonCodec',
      formats: ['iife'],
      fileName: () => 'index.global.min.js',
    },
    minify: true,
    outDir: fileURLToPath(new URL('../dist', import.meta.url)),
  },
});
