// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/** Paginas con `noindex`: no deben aparecer en el sitemap. */
const excludedFromSitemap = ['/aviso-legal', '/privacidad', '/cookies'];

/**
 * Rutas internas del panel de gestion. El sitemap SI incluye las paginas SSR,
 * asi que hay que sacarlas a mano: aunque respondan 404 desde fuera, listarlas
 * delataria que existe un panel. La URL secreta real (ADMIN_PATH) no tiene
 * archivo propio y nunca llega aqui.
 */
/** @param {string} page */
const esRutaInterna = (page) => /^\/(api\/)?admin(\/|$)/.test(new URL(page).pathname);

// https://astro.build/config
export default defineConfig({
  site: 'https://www.narfoodtruck.com',
  // Todo se prerenderiza salvo /api/presupuesto, que declara `prerender = false`.
  output: 'static',
  // Las paginas salen como HTML estatico y /api/presupuesto como funcion.
  // El adaptador de node dejaba el resultado en dist/server + dist/client, que
  // Vercel no sabe servir: de ahi el 404 de todo el sitio.
  adapter: vercel(),
  // Genera sitemap-index.xml con lastmod en cada build: no hay que mantenerlo
  // a mano al anadir paginas.
  integrations: [
    sitemap({
      filter: (page) =>
        !esRutaInterna(page) && !excludedFromSitemap.some((path) => page.includes(path)),
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
