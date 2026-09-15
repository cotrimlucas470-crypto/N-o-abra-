import { defineConfig } from 'vite';

/**
 * BUILD PORTÁTIL — um único arquivo .html.
 *
 * O build normal usa módulos ES e code splitting, o que exige um servidor
 * HTTP. Esta variante empacota tudo (JS, CSS e as fontes em base64) num
 * bundle IIFE clássico, para o arquivo abrir com dois cliques direto do
 * disco, sem servidor e sem instalar nada.
 *
 *   npm run build:portatil
 *
 * O preço: nenhum code splitting e um arquivo maior. Para publicar de
 * verdade, use o build normal (`npm run build`).
 */
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist-portatil',
    target: 'es2020',
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 100 * 1024 * 1024, // fontes viram data: URI
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'bundle.js',
        assetFileNames: 'bundle[extname]',
      },
    },
  },
});
