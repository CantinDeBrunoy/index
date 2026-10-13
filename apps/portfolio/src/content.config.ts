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
/** Une case du schéma de l'architecture, [colonne, rangée], à partir de 1. */
const cell = z.tuple([z.number().int().min(1), z.number().int().min(1)]);

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
    /**
     * La vidéo de démo (public/demos/<slug>.mp4, son affiche <slug>.webp à côté), sans son ni donnée personnelle.
     * Sa taille : 1280 × 800 pour celles filmées par scripts/demo-videos.ts, 1280 × 720 pour les montages.
     */
    video: z
      .object({ src: z.string(), caption: z.string(), width: z.number().int().default(1280), height: z.number().int().default(800) })
      .optional(),
    /** La capture d'écran (src/assets/shots/<slug>-desktop.jpg), sans donnée personnelle. */
    capture: z.object({ alt: z.string(), caption: z.string() }).optional(),
    /**
     * « En images » : trois ou quatre écrans, chacun avec ce qu'il montre. L'image est
     * src/assets/screens/<slug>/<image>.jpg (scripts/fiche-screens.ts), sans donnée personnelle ; plus haute que
     * large, elle se montre comme un écran de téléphone.
     */
    screens: z.array(item.extend({ image: z.string(), alt: z.string() })).default([]),
    /**
     * « Sous le capot » : une phrase, puis le schéma (FicheSchema.astro). Les boîtes se posent sur une grille,
     * `at` = [colonne, rangée] à partir de 1, `span` = [colonnes, rangées] ; deux boîtes reliées partagent une
     * rangée ou une colonne. Les zones encadrent ce qui tourne au même endroit.
     */
    architecture: z
      .object({
        intro: z.string(),
        nodes: z
          .array(
            item.extend({
              id: z.string(),
              at: cell,
              span: cell.optional(),
              kind: z.enum(["user", "app", "server", "data", "job", "ext", "file"]).default("app"),
            }),
          )
          .min(2),
        links: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional(), both: z.boolean().default(false) })).default([]),
        groups: z.array(z.object({ label: z.string(), from: cell, to: cell })).default([]),
      })
      .optional(),
    /** « L'équipage » : seul ou en équipe, mon rôle, puis le carnet de bord (durée, méthode, outils…). */
    crew: z.object({ title: z.string(), text: z.string(), log: z.array(item).default([]) }).optional(),
  }),
});

export const collections = { projets };
