// @ts-check
// Mode démo de la page (« ?demo » dans l'adresse) : des surveillances et des prix fictifs, pour montrer
// ou filmer la page sans dévoiler les vrais voyages surveillés. Le relevé fictif (demo/latest.json, au
// format de data/latest.json) est ramené au mois en cours. Rien ne part vers GitHub ni vers l'API des
// villes : les modifications restent dans la page et la recherche des prix est simulée.
// Testé dans test/web-demo.test.ts.

import { addDays, daysBetween } from "./lib.js";

/**
 * @typedef {import("./lib.js").Watch} Watch
 * @typedef {import("./lib.js").Config} Config
 * @typedef {import("./lib.js").Snapshot} Snapshot
 * @typedef {import("./lib.js").SnapshotWatch} SnapshotWatch
 * @typedef {import("./lib.js").SnapshotOffer} SnapshotOffer
 * @typedef {import("./lib.js").City} City
 */

/** Le relevé fictif, à côté de la page. */
export const DEMO_SNAPSHOT_FILE = "demo/latest.json";
/** Durée de la recherche des prix simulée après un ajout ou une modification. */
export const DEMO_SEARCH_MS = 4_000;
/** Âge affiché du relevé fictif : « Prix relevés il y a 47 min ». */
const DEMO_AGE_MS = 47 * 60_000;
const DEMO_AIRLINES = ["AF", "KL", "LH", "TP", "IB", "U2"];

/** Les villes que propose le formulaire en démo, à la place de l'autocomplétion de Travelpayouts. @type {readonly City[]} */
export const DEMO_CITIES = [
  { code: "REK", name: "Reykjavik", country: "Islande" },
  { code: "NYC", name: "New York", country: "États-Unis" },
  { code: "BKK", name: "Bangkok", country: "Thaïlande" },
  { code: "ATH", name: "Athènes", country: "Grèce" },
  { code: "NAP", name: "Naples", country: "Italie" },
  { code: "CPH", name: "Copenhague", country: "Danemark" },
  { code: "LIM", name: "Lima", country: "Pérou" },
  { code: "CPT", name: "Le Cap", country: "Afrique du Sud" },
  { code: "LIS", name: "Lisbonne", country: "Portugal" },
  { code: "ROM", name: "Rome", country: "Italie" },
  { code: "RAK", name: "Marrakech", country: "Maroc" },
  { code: "YMQ", name: "Montréal", country: "Canada" },
  { code: "SEL", name: "Séoul", country: "Corée du Sud" },
];

/** @param {string} search la partie « ?… » de l'adresse */
export function isDemo(search) {
  return new URLSearchParams(search).has("demo");
}

/**
 * Le relevé fictif décalé d'autant de mois qu'il s'en est écoulé depuis sa rédaction, et relevé il y a
 * 47 min : la démo garde des départs à venir quel que soit le jour où on l'ouvre.
 * @param {Snapshot} snapshot @param {Date} now @returns {Snapshot}
 */
export function shiftSnapshot(snapshot, now) {
  const months = monthIndex(now.toISOString()) - monthIndex(snapshot.generatedAt);
  /** @param {SnapshotOffer} offer @param {string} to */
  const shiftOffer = (offer, to) => withDates(offer, to, shiftDate(offer.departDate, months));
  return {
    ...snapshot,
    generatedAt: new Date(now.getTime() - DEMO_AGE_MS).toISOString(),
    watches: snapshot.watches.map((watch) => ({
      ...watch,
      departFrom: shiftDate(watch.departFrom, months),
      departTo: shiftDate(watch.departTo, months),
      deals: watch.deals.map((offer) => shiftOffer(offer, watch.to)),
      months: watch.months.map((row) => ({
        ...row,
        month: shiftDate(`${row.month}-01`, months).slice(0, 7),
        best: row.best && shiftOffer(row.best, watch.to),
      })),
    })),
  };
}

/** La configuration lue par ce relevé : ses surveillances, sans les résultats. @param {Snapshot} snapshot @returns {Config} */
export function demoConfig(snapshot) {
  return {
    origins: snapshot.origins,
    currency: snapshot.currency,
    watches: snapshot.watches.map(({ id, label, to, maxPrice, departFrom, departTo, minDays, maxDays }) => ({
      id,
      label,
      to,
      maxPrice,
      departFrom,
      departTo,
      minDays,
      maxDays,
    })),
  };
}

/** Les villes de démo dont le nom commence par ce qui est tapé (sans accents ni majuscules). @param {string} term */
export function demoCities(term) {
  const wanted = fold(term);
  return DEMO_CITIES.filter((city) => fold(city.name).startsWith(wanted) || city.code.toLowerCase() === wanted);
}

/**
 * Un relevé inventé pour une surveillance ajoutée ou modifiée en démo, toujours le même pour les mêmes
 * réglages : un prix par mois de départ (quelques mois vides), dont au moins un sous le seuil.
 * @param {Watch} watch @param {readonly string[]} origins @param {string} today @returns {SnapshotWatch}
 */
export function demoReading(watch, origins, today) {
  const random = seededRandom([watch.to, watch.maxPrice, watch.departFrom, watch.departTo, watch.minDays, watch.maxDays].join("|"));
  const from = watch.departFrom > today ? watch.departFrom : today;
  /** @type {string[]} */
  const months = [];
  for (let month = from.slice(0, 7); month <= watch.departTo.slice(0, 7) && months.length < 12; month = nextMonth(month)) months.push(month);
  const cheapest = Math.floor(random() * months.length);

  const rows = months.map((month, index) => {
    if (index !== cheapest && random() < 0.15) return { month, best: null, offers: 0, failed: false };
    const first = month === from.slice(0, 7) ? from : `${month}-01`;
    const last = month === watch.departTo.slice(0, 7) ? watch.departTo : lastDay(month);
    const departDate = addDays(first, Math.floor(random() * (daysBetween(first, last) + 1)));
    const ratio = index === cheapest ? 0.8 + random() * 0.14 : 0.97 + random() * 0.4;
    const transfers = random() < 0.6 ? 0 : 1;
    /** @type {SnapshotOffer} */
    const offer = {
      price: Math.round(watch.maxPrice * ratio),
      departDate,
      returnDate: departDate,
      stayDays: watch.minDays + Math.floor(random() * (watch.maxDays - watch.minDays + 1)),
      originAirport: origins[Math.floor(random() * origins.length)] ?? "CDG",
      destinationAirport: watch.to,
      airline: DEMO_AIRLINES[Math.floor(random() * DEMO_AIRLINES.length)] ?? "AF",
      transfers,
      returnTransfers: transfers,
      link: "",
    };
    return { month, best: withDates(offer, watch.to, departDate), offers: 3 + Math.floor(random() * 14), failed: false };
  });

  const deals = rows
    .flatMap(({ best }) => (best && best.price <= watch.maxPrice ? [best] : []))
    .sort((a, b) => a.price - b.price || a.departDate.localeCompare(b.departDate));
  return { ...watch, deals, months: rows };
}

// ---- Dates et liens ----

/** L'offre partant ce jour-là : retour et lien Aviasales recalculés. @param {SnapshotOffer} offer @param {string} to @param {string} departDate */
function withDates(offer, to, departDate) {
  const returnDate = addDays(departDate, offer.stayDays);
  /** @param {string} date "2027-03-12" → "1203" */
  const dayMonth = (date) => date.slice(8, 10) + date.slice(5, 7);
  return { ...offer, departDate, returnDate, link: `https://www.aviasales.fr/search/PAR${dayMonth(departDate)}${to}${dayMonth(returnDate)}1` };
}

/** "2027-01-31", 1 → "2027-02-28" : le jour est ramené à la fin d'un mois plus court. @param {string} date @param {number} months */
function shiftDate(date, months) {
  const index = monthIndex(date) + months;
  const month = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
  const day = Math.min(Number(date.slice(8, 10)), Number(lastDay(month).slice(8, 10)));
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** "2026-12" → "2027-01" @param {string} month */
function nextMonth(month) {
  return shiftDate(`${month}-01`, 1).slice(0, 7);
}

/** "2027-02" → "2027-02-28" @param {string} month */
function lastDay(month) {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
}

/** Mois écoulés depuis l'an 0, d'une date ou d'un instant ISO. @param {string} iso */
function monthIndex(iso) {
  return Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
}

/** @param {string} text */
function fold(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Suite pseudo-aléatoire reproductible (mulberry32), amorcée par un texte. @param {string} seed */
function seededRandom(seed) {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}
