// @ts-check
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { PORTFOLIO_URL } from "@index/projects";
import { defineConfig } from "astro/config";

export default defineConfig({
  // URL publique, définie dans @index/projects (source de vérité unique).
  site: PORTFOLIO_URL,
  // Fiches en /005-magellan, sans slash final : build en fichiers .html.
  trailingSlash: "never",
  // Astro 7 compresse les espaces « façon JSX » par défaut ; on garde le comportement HTML
  // (un espace entre deux éléments inline sur des lignes différentes reste un espace).
  compressHTML: true,
  build: { format: "file" },
  i18n: {
    locales: ["fr", "en"],
    defaultLocale: "fr",
    // Le français reste à la racine ; l'anglais arrivera sous /en/.
    routing: { prefixDefaultLocale: false },
  },
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes("/styleguide") })],
});
