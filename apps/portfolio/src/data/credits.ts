/**
 * Les crédits des modèles 3D des scènes, tous repeints (design/renders/assets/CREDITS.md). L'avion de ligne
 * (CC BY 3.0) et l'arc de triomphe (CC BY 4.0) doivent être crédités sur le site : ici, affichés dans le
 * carnet. En HTML, pour les liens vers les licences et les sources.
 */

import type { Lang } from "../i18n/voyage";

const link = (href: string, text: string) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
const BY3 = link("https://creativecommons.org/licenses/by/3.0/", "CC BY 3.0");
const BY4 = link("https://creativecommons.org/licenses/by/4.0/", "CC BY 4.0");
const POLY = link("https://poly.pizza/m/3UtIosDm9u-", "Poly Pizza");
const WIKI = link("https://commons.wikimedia.org/wiki/File:Arc_de_Triomphe.stl", "Wikimedia Commons");

export const CREDITS: Record<Lang, string> = {
  fr: `Crédits, tous repeints : l'avion de ligne est « very cute airplane » d'Akash Rudra, sous licence ${BY3}, via ${POLY} ; l'arc de triomphe est un modèle de Microsoft, sous licence ${BY4}, via ${WIKI} ; la tour Eiffel, d'ingoenius (CC0) ; les voitures, de Quaternius (CC0) ; le coffre-fort, de CreativeTrio (CC0) ; la carte du monde vient de Natural Earth (domaine public).`,
  en: `Credits, all repainted: the airliner is “very cute airplane” by Akash Rudra, licensed ${BY3}, via ${POLY}; the Arc de Triomphe is a model by Microsoft, licensed ${BY4}, via ${WIKI}; the Eiffel Tower is by ingoenius (CC0); the cars are by Quaternius (CC0); the safe is by CreativeTrio (CC0); the world map comes from Natural Earth (public domain).`,
};
