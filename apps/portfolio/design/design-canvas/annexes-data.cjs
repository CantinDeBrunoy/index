// Les pages annexes du voyage, en français et en anglais : la 404 (l'escale introuvable), les mentions légales
// et l'image d'aperçu des partages (LinkedIn, Slack, WhatsApp…). Brouillons, à relire.
// Mentions légales : depuis la loi SREN (2024), l'article 1-1 de la LCEN. Un particulier qui publie à titre
// non professionnel peut garder son identité pour l'hébergeur ; il doit afficher le nom, l'adresse et le
// téléphone de l'hébergeur. Cantin signe de son nom, avec son e-mail : ni adresse ni téléphone à lui.
const L = {
  by3: `<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>`,
  by4: `<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>`,
  poly: `<a href="https://poly.pizza/m/3UtIosDm9u-" target="_blank" rel="noopener">Poly Pizza</a>`,
  wiki: `<a href="https://commons.wikimedia.org/wiki/File:Arc_de_Triomphe.stl" target="_blank" rel="noopener">Wikimedia Commons</a>`,
  ofl: `<a href="https://openfontlicense.org" target="_blank" rel="noopener">SIL Open Font</a>`,
  cf: `<a href="https://www.cloudflare.com" target="_blank" rel="noopener">cloudflare.com</a>`,
};
const MAIL = "cantin.roquier@gmail.com";
const mail = `<a href="mailto:${MAIL}">${MAIL}</a>`;

module.exports = {
  fr: {
    nf: {
      label: "Escale 404 · Introuvable",
      caption: "Hors itinéraire",
      title: "Bagage <em>égaré</em>.",
      text: "Cette page n'existe pas, ou plus : elle a dû se perdre en correspondance. Le reste du voyage, lui, est bien arrivé.",
      spot: "Reprendre le voyage",
      alt: "Un tapis à bagages tourne à vide dans un terminal de nuit, sous le panneau du tapis 404 ; à côté, une valise terre cuite attend seule, l'étiquette « 404 » pendue à sa poignée.",
      pageTitle: "INDEX — escale introuvable",
    },
    legal: {
      link: "Mentions légales",
      label: "Index · le site",
      title: "Mentions <em>légales</em>",
      intro: "Qui publie ce site, qui l'héberge, et ce qu'il fait de vos données : rien, ou presque.",
      sections: [
        ["Éditeur", [
          "Ce site est édité à titre personnel par Cantin Roquier, qui en est aussi le directeur de la publication.",
          `Pour me joindre : ${mail}.`,
        ]],
        ["Hébergement", [
          `<strong>Cloudflare, Inc.</strong><br>101 Townsend St, San Francisco, CA 94107, États-Unis<br>+1 650 319 8930 · ${L.cf}`,
          "Les apps ont chacune leur hébergeur, indiqué dans le billet de leur fiche.",
        ]],
        ["Vos données", [
          "Ce site ne dépose aucun cookie, ne mesure pas l'audience et n'a aucun formulaire. Si vous m'écrivez, votre adresse sert seulement à vous répondre.",
          "Comme tout hébergeur, Cloudflare tient des journaux techniques, dont l'adresse IP, pour faire fonctionner et protéger le service.",
          `Une question sur vos données ? Écrivez-moi. Vous pouvez aussi vous adresser à la <a href="https://www.cnil.fr" target="_blank" rel="noopener">CNIL</a>.`,
        ]],
        ["Propriété intellectuelle", [
          "Les textes, les scènes 3D et le code de ce site sont de Cantin Roquier.",
          "Le code de mes projets est public sur GitHub : sauf licence indiquée dans le dépôt, tous droits réservés. Pour en reprendre un morceau, demandez-moi.",
        ]],
      ],
      creditsLabel: "Crédits",
      credits: [
        ["L'avion de ligne : « very cute airplane », d'Akash Rudra", `${L.by3}, via ${L.poly}`],
        ["L'arc de triomphe, de Microsoft", `${L.by4}, via ${L.wiki}`],
        ["La tour Eiffel : « Eiffel Tower LOW POLY », d'ingoenius", "CC0"],
        ["Les voitures, de Quaternius", "CC0"],
        ["Le coffre-fort, de CreativeTrio", "CC0"],
        ["La carte du monde, de Natural Earth", "domaine public"],
        ["Les polices Instrument Serif, Geist et Geist Mono", `licence ${L.ofl}`],
        ["Les scènes, rendues avec three.js", "licence MIT"],
      ],
      repainted: "Tous les modèles sont repeints dans la matière du voyage.",
      updated: "Mise à jour le 7 octobre 2026",
      pageTitle: "INDEX — mentions légales",
    },
    og: {
      line: "Un voyage en dix escales · onze projets",
      pageTitle: "INDEX — aperçu de partage",
      ficheTitle: "INDEX — aperçu de partage d'une fiche",
    },
  },
  en: {
    nf: {
      label: "Stop 404 · Not found",
      caption: "Off the route",
      title: "Lost <em>luggage</em>.",
      text: "This page doesn't exist, or no longer does: it must have gone astray on a connection. The rest of the journey arrived safely.",
      spot: "Resume the journey",
      alt: "A baggage carousel turns empty in a terminal at night, under the sign for belt 404; beside it, a terracotta suitcase waits alone, a “404” tag hanging from its handle.",
      pageTitle: "INDEX — stop not found",
    },
    legal: {
      link: "Legal notice",
      label: "Index · the site",
      title: "Legal <em>notice</em>",
      intro: "Who publishes this site, who hosts it, and what it does with your data: nothing, or nearly.",
      sections: [
        ["Publisher", [
          "This site is published in a personal capacity by Cantin Roquier, who is also its publication director.",
          `To reach me: ${mail}.`,
        ]],
        ["Hosting", [
          `<strong>Cloudflare, Inc.</strong><br>101 Townsend St, San Francisco, CA 94107, United States<br>+1 650 319 8930 · ${L.cf}`,
          "Each app has its own host, listed on the ticket of its project page.",
        ]],
        ["Your data", [
          "This site sets no cookies, runs no analytics and has no forms. If you write to me, your address is only used to reply.",
          "Like any host, Cloudflare keeps technical logs, including IP addresses, to run and protect the service.",
          `A question about your data? Write to me. You can also contact the <a href="https://www.cnil.fr/en" target="_blank" rel="noopener">CNIL</a>, the French data protection authority.`,
        ]],
        ["Intellectual property", [
          "The texts, 3D scenes and code of this site are by Cantin Roquier.",
          "My projects' code is public on GitHub: unless a licence is stated in the repository, all rights are reserved. To reuse a piece, ask me.",
        ]],
      ],
      creditsLabel: "Credits",
      credits: [
        ["The airliner: “very cute airplane”, by Akash Rudra", `${L.by3}, via ${L.poly}`],
        ["The Arc de Triomphe, by Microsoft", `${L.by4}, via ${L.wiki}`],
        ["The Eiffel Tower: “Eiffel Tower LOW POLY”, by ingoenius", "CC0"],
        ["The cars, by Quaternius", "CC0"],
        ["The safe, by CreativeTrio", "CC0"],
        ["The world map, by Natural Earth", "public domain"],
        ["The Instrument Serif, Geist and Geist Mono fonts", `${L.ofl} licence`],
        ["The scenes, rendered with three.js", "MIT licence"],
      ],
      repainted: "Every model is repainted in the journey's own materials.",
      updated: "Updated on 7 October 2026",
      pageTitle: "INDEX — legal notice",
    },
    og: {
      line: "A journey in ten stops · eleven projects",
      pageTitle: "INDEX — share preview",
      ficheTitle: "INDEX — share preview of a project page",
    },
  },
};
