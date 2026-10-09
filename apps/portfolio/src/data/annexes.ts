/**
 * Les pages annexes du voyage. La 404, « Bagage égaré », une escale hors itinéraire : de nuit, un tapis à
 * bagages tourne à vide sous le panneau du tapis 404 ; à côté, une valise attend seule. La valise ramène au
 * départ ; le cartel mène aux projets. Et les mentions légales. Brouillons, à relire.
 */

import { projects } from "@index/projects";
import { EMAIL, inWords, NBSP, type Lang } from "../i18n/voyage";
import { WEB_ANALYTICS_TOKEN } from "./stats";

/** La scène de la 404 : le fond du terminal de nuit et la valise à cliquer, en % de chaque rendu. */
export const NOT_FOUND_SCENE = {
  scene: "bagage",
  bg: "#121522",
  spot: [66.6, 54.8] as [number, number],
  spotMobile: [73.8, 50] as [number, number],
};

interface NotFoundStrings {
  pageTitle: string;
  description: string;
  label: string;
  caption: string;
  /** Le titre, en HTML (l'italique du mot clé). */
  title: string;
  text: string;
  spot: string;
  alt: string;
  projects: string;
  about: string;
}

export const NOT_FOUND: Record<Lang, NotFoundStrings> = {
  fr: {
    pageTitle: "Escale introuvable",
    description: "Cette page n'existe pas, ou plus. Le reste du voyage, lui, est bien arrivé.",
    label: "Escale 404 · Introuvable",
    caption: "Hors itinéraire",
    title: "Bagage <em>égaré</em>.",
    text: "Cette page n'existe pas, ou plus : elle a dû se perdre en correspondance. Le reste du voyage, lui, est bien arrivé.",
    spot: "Reprendre le voyage",
    alt: "Un tapis à bagages tourne à vide dans un terminal de nuit, sous le panneau du tapis 404 ; à côté, une valise terre cuite attend seule, l'étiquette « 404 » pendue à sa poignée.",
    projects: `Voir les ${inWords("fr", projects.length)} projets →`,
    about: "À propos →",
  },
  en: {
    pageTitle: "Stop not found",
    description: "This page doesn't exist, or no longer does. The rest of the journey arrived safely.",
    label: "Stop 404 · Not found",
    caption: "Off the route",
    title: "Lost <em>luggage</em>.",
    text: "This page doesn't exist, or no longer does: it must have gone astray on a connection. The rest of the journey arrived safely.",
    spot: "Resume the journey",
    alt: "A baggage carousel turns empty in a terminal at night, under the sign for belt 404; beside it, a terracotta suitcase waits alone, a “404” tag hanging from its handle.",
    projects: `See all ${inWords("en", projects.length)} projects →`,
    about: "About →",
  },
};

/*
 * Les mentions légales. Depuis la loi SREN (2024), l'article 1-1 de la LCEN : un particulier qui publie à
 * titre non professionnel peut ne confier son identité qu'à l'hébergeur ; le site affiche alors le nom,
 * l'adresse et le téléphone de l'hébergeur. Cantin signe de son nom, avec son e-mail : ni adresse ni
 * téléphone à lui. L'hébergeur, d'après ses rapports à la SEC et cloudflare.com (octobre 2026).
 * Les affirmations sur les données restent vraies tant que le site ne dépose aucun cookie chez ses visiteurs
 * (seule la connexion du propriétaire en pose, @index/auth), ne charge rien d'un autre site (les polices sont
 * auto-hébergées), sauf le script de mesure d'audience sans cookie quand il est actif (data/stats.ts), et n'a
 * aucun formulaire.
 */

const mail = `<a href="mailto:${EMAIL}">${EMAIL}</a>`;
const cf = `<a href="https://www.cloudflare.com" target="_blank" rel="noopener">cloudflare.com</a>`;
const cfPhone = ["+1", "888", "993", "5273"].join(NBSP);

interface LegalStrings {
  pageTitle: string;
  description: string;
  label: string;
  /** Le titre, en HTML (l'italique du mot clé). */
  title: string;
  intro: string;
  /** [rubrique, paragraphes en HTML] */
  sections: [string, string[]][];
  creditsLabel: string;
  repainted: string;
  updated: string;
}

export const LEGAL: Record<Lang, LegalStrings> = {
  fr: {
    pageTitle: "Mentions légales",
    description: "Les mentions légales d'INDEX, le site de Cantin Roquier : qui le publie, qui l'héberge, vos données et les crédits.",
    label: "Index · le site",
    title: "Mentions <em>légales</em>",
    intro: "Qui publie ce site, qui l'héberge, et ce qu'il fait de vos données : rien, ou presque.",
    sections: [
      ["Éditeur", ["Ce site est édité à titre personnel par Cantin Roquier, qui en est aussi le directeur de la publication.", `Pour me joindre : ${mail}.`]],
      [
        "Hébergement",
        [
          `<strong>Cloudflare, Inc.</strong><br>101 Townsend St, San Francisco, CA 94107, États-Unis<br>${cfPhone} · ${cf}`,
          "Les apps ont chacune leur hébergeur, indiqué dans le billet de leur fiche.",
        ],
      ],
      [
        "Vos données",
        [
          WEB_ANALYTICS_TOKEN
            ? "Ce site ne dépose aucun cookie chez ses visiteurs et n'a aucun formulaire. Il compte ses visites avec Cloudflare Web Analytics, sans cookie ni identifiant : seulement des chiffres d'ensemble (pages vues, pays, navigateur). Si vous m'écrivez, votre adresse sert seulement à vous répondre."
            : "Ce site ne dépose aucun cookie chez ses visiteurs, ne mesure pas l'audience et n'a aucun formulaire. Si vous m'écrivez, votre adresse sert seulement à vous répondre.",
          "Seule exception, le lien « Connexion » en bas des pages, qui ne sert qu'à moi : il passe par GitHub et dépose des cookies strictement nécessaires à la connexion, pour ouvrir mes propres données dans Magellan et Hublot.",
          "Comme tout hébergeur, Cloudflare tient des journaux techniques, dont l'adresse IP, pour faire fonctionner et protéger le service.",
          `Une question sur vos données ? Écrivez-moi. Vous pouvez aussi vous adresser à la <a href="https://www.cnil.fr" target="_blank" rel="noopener">CNIL</a>.`,
        ],
      ],
      [
        "Propriété intellectuelle",
        [
          "Les textes, les scènes 3D et le code de ce site sont de Cantin Roquier.",
          "Le code de mes projets est public sur GitHub : sauf licence indiquée dans le dépôt, tous droits réservés. Pour en reprendre un morceau, demandez-moi.",
        ],
      ],
    ],
    creditsLabel: "Crédits",
    repainted: "Tous les modèles sont repeints dans la matière du voyage.",
    updated: "Mise à jour le 9 octobre 2026",
  },
  en: {
    pageTitle: "Legal notice",
    description: "The legal notice of INDEX, Cantin Roquier's site: who publishes it, who hosts it, your data and the credits.",
    label: "Index · the site",
    title: "Legal <em>notice</em>",
    intro: "Who publishes this site, who hosts it, and what it does with your data: nothing, or nearly.",
    sections: [
      ["Publisher", ["This site is published in a personal capacity by Cantin Roquier, who is also its publication director.", `To reach me: ${mail}.`]],
      [
        "Hosting",
        [
          `<strong>Cloudflare, Inc.</strong><br>101 Townsend St, San Francisco, CA 94107, United States<br>${cfPhone} · ${cf}`,
          "Each app has its own host, listed on the ticket of its project page.",
        ],
      ],
      [
        "Your data",
        [
          WEB_ANALYTICS_TOKEN
            ? "This site sets no cookies on its visitors and has no forms. It counts its visits with Cloudflare Web Analytics, with no cookies and no identifiers: only overall figures (page views, countries, browsers). If you write to me, your address is only used to reply."
            : "This site sets no cookies on its visitors, runs no analytics and has no forms. If you write to me, your address is only used to reply.",
          "The one exception is the “Sign in” link at the bottom of the pages, which is for me only: it goes through GitHub and sets cookies strictly needed to sign in, to open my own data in Magellan and Hublot.",
          "Like any host, Cloudflare keeps technical logs, including IP addresses, to run and protect the service.",
          `A question about your data? Write to me. You can also contact the <a href="https://www.cnil.fr/en" target="_blank" rel="noopener">CNIL</a>, the French data protection authority.`,
        ],
      ],
      [
        "Intellectual property",
        [
          "The texts, 3D scenes and code of this site are by Cantin Roquier.",
          "My projects' code is public on GitHub: unless a licence is stated in the repository, all rights are reserved. To reuse a piece, ask me.",
        ],
      ],
    ],
    creditsLabel: "Credits",
    repainted: "Every model is repainted in the journey's own materials.",
    updated: "Updated on 9 October 2026",
  },
};
