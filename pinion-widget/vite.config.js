import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { scopePinionCssPlugin } from './tools/scope-css.js';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  esbuild: {
    charset: 'ascii',
  },
  plugins: [
    react(),
    tailwindcss(),
    scopePinionCssPlugin(),
  ],
  build: {
    lib: {
      entry: 'src/lib.jsx',
      name: 'pinion',
      formats: ['umd'],
      fileName: () => 'pinion.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'pinion.css';
          }
          return assetInfo.name;
        },
      },
    },
    outDir: 'build',
    cssMinify: true,
  },
});
