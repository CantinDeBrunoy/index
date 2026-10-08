/**
 * Le texte du bandeau d'infos voyageurs du hub, d'après l'état de chaque app : rendu par la page
 * (avant le statut en direct), puis repris par scripts/hub-status.ts une fois le statut connu.
 * Sans DOM, pour servir des deux côtés.
 */

import type { TickerStrings } from "../data/hub";
import type { Lang } from "../i18n/voyage";

/** Une ligne du tableau : `live` tant que le statut n'est pas arrivé, puis online, asleep… ; ou un état fixe. */
export interface TickerApp {
  slug: string;
  name: string;
  state: string;
}

const SEP = " ··· ";

export function tickerText(t: TickerStrings, apps: readonly TickerApp[], lang: Lang): string {
  const list = new Intl.ListFormat(lang === "fr" ? "fr-FR" : "en-GB", { type: "conjunction" });
  const named = (state: string) => apps.filter((a) => a.state === state).map((a) => a.name);
  const parts = [t.lead];
  // Les états partagés en une annonce (« Tonalli et Hublot : à l'heure »), les incidents app par app.
  const together = (state: string, text: string) => {
    const names = named(state);
    if (names.length > 0) parts.push(text.replace("{names}", list.format(names)));
  };
  const each = (state: string, text: string) => {
    for (const name of named(state)) parts.push(text.replace("{name}", name));
  };
  together("online", t.onTime);
  each("asleep", t.asleep);
  each("offline", t.offline);
  together("soon", t.soon);
  together("download", t.download);
  parts.push(t.back, t.end);
  return parts.join(SEP) + SEP;
}
