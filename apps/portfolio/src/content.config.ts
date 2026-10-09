import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * Les textes des fiches projet, un fichier par langue et par projet : src/content/projets/fr/<slug>.yaml.
 * Les chaînes sont entre guillemets doubles : les « : » des textes français ne se lisent pas comme des clés.
 * Les métadonnées (numéro, nom, pile, hébergeur, liens…) restent dans @index/projects ; le décor et
 * l'accroche de chaque escale, dans src/data/voyage.ts. Ce sont des brouillons, à réécrire.
 */
const item = z.object({ title: z.string(), text: z.string() });

const projets = defineCollection({
  // L'identifiant est le chemin du fichier, « fr/magellan » : sans ça, celui d'INDEX (index.yaml) prendrait
  // le nom de son dossier, comme une page.
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/projets", generateId: ({ entry }) => entry.replace(/\.yaml$/, "") }),
  schema: z.object({
    /** « Pourquoi je l'ai fabriqué ». */
    why: z.string().optional(),
    /** « Ce que ça fait » : trois cartes. */
    features: z.array(item).default([]),
    /** « Comment c'est fait » : un choix, et sa raison. */
    choices: z.array(item).default([]),
    /** La vidéo de démo (public/demos/<slug>.mp4), sans son ni donnée personnelle ; la capture lui sert d'affiche. */
    video: z.object({ src: z.string(), caption: z.string() }).optional(),
    /** La capture d'écran (src/assets/shots/<slug>-desktop.jpg), sans donnée personnelle. */
    capture: z.object({ alt: z.string(), caption: z.string() }).optional(),
    /** Un projet raconté sur la fiche d'un autre (l'API REST .NET, sur l'étagère de Mithril) : ce qu'en dit l'étagère. */
    shelf: z.string().optional(),
  }),
});

export const collections = { projets };
