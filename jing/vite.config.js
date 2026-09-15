import { defineConfig } from 'vite';

// base relativo: o build funciona servido da raiz ou de uma subpasta (GitHub Pages, /jing/dist/, file server...).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    target: 'es2020',
    rollupOptions: {
      output: {
        // code splitting: o bundle da engine 3D fica separado do código da experiência
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap')) return 'gsap';
          return undefined;
        },
      },
    },
  },
  server: { host: '127.0.0.1', port: 5173 },
});
