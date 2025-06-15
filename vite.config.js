import { defineConfig } from 'vite';
import { resolve } from 'path';

const app = process.env.APP_NAME || 'app1';

export default defineConfig({
  root: `apps/${app}`,
  build: {
    outDir: resolve(__dirname, 'dist', app),
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.js',
      output: {
        format: 'iife',
        entryFileNames: 'bundle.js'
      }
    }
  },
});
