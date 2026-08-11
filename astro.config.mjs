// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/** Paginas con `noindex`: no deben aparecer en el sitemap. */
const excludedFromSitemap = ['/aviso-legal', '/privacidad', '/cookies'];

// https://astro.build/config
export default defineConfig({
  site: 'https://www.narfoodtruck.com',
  // Todo se prerenderiza salvo /api/presupuesto, que declara `prerender = false`.
  output: 'static',
  // Cambiar por @astrojs/vercel o @astrojs/netlify segun el hosting final.
  adapter: node({ mode: 'standalone' }),
  // Genera sitemap-index.xml con lastmod en cada build: no hay que mantenerlo
  // a mano al anadir paginas.
  integrations: [
    sitemap({
      filter: (page) => !excludedFromSitemap.some((path) => page.includes(path)),
      lastmod: new Date(),
      // Sin barra final, igual que los canonical y los enlaces de la
      // navegacion. Si el sitemap y el canonical no coinciden, se le esta
      // declarando al buscador dos URLs para la misma pagina.
      serialize: (item) => ({ ...item, url: item.url.replace(/(.+)\/$/, '$1') }),
    }),
  ],
  image: {
    responsiveStyles: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
