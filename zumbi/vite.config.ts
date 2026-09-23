import { defineConfig } from 'vite';

// base './' = caminhos relativos: o mesmo build funciona no Netlify,
// no GitHub Pages (subpasta), num artefato ou dentro de um app Capacitor.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Phaser fica num arquivo separado: muda pouco, o navegador guarda em cache.
        manualChunks(id: string) {
          return id.includes('node_modules/phaser') ? 'phaser' : undefined;
        },
      },
    },
  },
  server: { host: true },
});
