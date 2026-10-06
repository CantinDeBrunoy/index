import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * Textes longs des fiches projet (contexte, problème résolu, choix techniques).
 * Un fichier par langue et par entrée : src/content/projets/fr/<slug>.mdx.
 * Les métadonnées (numéro, nom, stack, URLs…) restent dans @index/projects.
 */
const projets = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/projets" }),
  schema: z.object({
    /** Phrase d'accroche de la fiche, plus longue que le pitch de l'index. */
    lede: z.string(),
  }),
});

export const collections = { projets };
