import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
