// @ts-check
// Pure helpers of the web page (no DOM): formatting, validation, config edits.
// Tested in test/web-lib.test.ts. The validation mirrors src/config.ts, which stays authoritative.

/** Longest stay the API can return; same value as MAX_STAY_DAYS in src/config.ts. */
export const MAX_STAY_DAYS = 60;

/**
 * @typedef {{ id: string, label: string, to: string, maxPrice: number, departFrom: string, departTo: string, minDays: number, maxDays: number }} Watch
 * @typedef {{ origins: string[], currency: string, watches: Watch[] }} Config
 * @typedef {{ price: number, departDate: string, returnDate: string, stayDays: number, originAirport: string, destinationAirport: string, airline: string, transfers: number, returnTransfers: number, link: string }} SnapshotOffer
 * @typedef {{ month: string, best: SnapshotOffer | null, offers: number, failed: boolean }} SnapshotMonth
 * @typedef {Watch & { deals: SnapshotOffer[], months: SnapshotMonth[] }} SnapshotWatch
 * @typedef {{ version: number, generatedAt: string, currency: string, origins: string[], watches: SnapshotWatch[] }} Snapshot
 * @typedef {{ code: string, name: string, country: string }} City
 */

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });
/** @type {Record<string, string>} */
const CURRENCY_SYMBOLS = { eur: "€", usd: "$", gbp: "£" };

// ---- Dates ("YYYY-MM-DD", computed in UTC like the script) ----

/** @param {unknown} value @returns {value is string} */
export function isIsoDate(value) {
  return typeof value === "string" && ISO_DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}

/** @param {string} from @param {string} to */
export function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** @param {string} date @param {number} days */
export function addDays(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Today in the viewer's time zone, "YYYY-MM-DD". @param {Date} [now] */
export function localToday(now = new Date()) {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

// ---- Formatting ----

/** 548, "eur" → "548 €" @param {number} price @param {string} currency */
export function formatPrice(price, currency) {
  return `${Math.round(price)}\u00a0${CURRENCY_SYMBOLS[currency.toLowerCase()] ?? currency.toUpperCase()}`;
}

/** "2027-03-12" → "12 mars" @param {string} date */
export function formatDay(date) {
  return dayMonth.format(new Date(`${date}T00:00:00Z`)).replace(" ", "\u00a0");
}

/** "2027-03" → "mars 2027" @param {string} month */
export function formatMonth(month) {
  return monthYear.format(new Date(`${month}-01T00:00:00Z`));
}

/** @param {string} iso @param {Date} [now] */
export function timeAgo(iso, now = new Date()) {
  const minutes = Math.round((now.getTime() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

/** @param {number} transfers */
export function transfersLabel(transfers) {
  if (transfers === 0) return "direct";
  return transfers === 1 ? "1 escale" : `${transfers} escales`;
}

/** Only https links to an Aviasales site are shown. @param {string} link @returns {string | null} */
export function safeOfferLink(link) {
  try {
    const url = new URL(link);
    return url.protocol === "https:" && /(^|\.)aviasales\.[a-z]+$/.test(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

// ---- Watches ----

/**
 * Error messages for the watch form, empty when the watch is valid.
 * @param {Watch} watch @param {string} today
 */
export function validateWatch(watch, today) {
  /** @type {string[]} */
  const errors = [];
  if (!/^[A-Z]{3}$/.test(watch.to) || watch.label.trim() === "") errors.push("Choisis une destination dans la liste.");
  if (!(watch.maxPrice > 0)) errors.push("Indique un prix maximum.");
  if (!isIsoDate(watch.departFrom) || !isIsoDate(watch.departTo)) {
    errors.push("Indique les deux dates de la période de départ.");
  } else if (watch.departFrom > watch.departTo) {
    errors.push("La période de départ doit finir après son début.");
  } else if (watch.departTo < today) {
    errors.push("La période de départ est déjà passée.");
  }
  const stays = [watch.minDays, watch.maxDays];
  if (!stays.every((days) => Number.isInteger(days) && days >= 0)) {
    errors.push("Indique la durée du séjour en jours.");
  } else if (watch.minDays > watch.maxDays) {
    errors.push("La durée minimale du séjour dépasse la durée maximale.");
  } else if (watch.maxDays > MAX_STAY_DAYS) {
    errors.push(`Le séjour ne peut pas dépasser ${MAX_STAY_DAYS} jours (limite de l'API des prix).`);
  }
  return errors;
}

/** "Mexico City" → "mexico-city" @param {string} label */
export function slugify(label) {
  const slug = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return slug || "surveillance";
}

/** @param {string} label @param {readonly string[]} existingIds */
export function newWatchId(label, existingIds) {
  const base = slugify(label);
  let id = base;
  for (let index = 2; existingIds.includes(id); index++) id = `${base}-${index}`;
  return id;
}

/** Replaces the watch with the same id, or appends it. @param {Config} config @param {Watch} watch @returns {Config} */
export function upsertWatch(config, watch) {
  const exists = config.watches.some((current) => current.id === watch.id);
  const watches = exists ? config.watches.map((current) => (current.id === watch.id ? watch : current)) : [...config.watches, watch];
  return { ...config, watches };
}

/** @param {Config} config @param {string} id @returns {Config} */
export function removeWatch(config, id) {
  return { ...config, watches: config.watches.filter((watch) => watch.id !== id) };
}

/** config.json as the script expects it, keys in a stable order. @param {Config} config */
export function serializeConfig(config) {
  const watches = config.watches.map(({ id, label, to, maxPrice, departFrom, departTo, minDays, maxDays }) => ({
    id,
    label,
    to,
    maxPrice,
    departFrom,
    departTo,
    minDays,
    maxDays,
  }));
  return `${JSON.stringify({ origins: config.origins, currency: config.currency, watches }, null, 2)}\n`;
}

/** @param {Watch} a @param {Watch} b */
export function sameSearch(a, b) {
  return (
    a.to === b.to &&
    a.maxPrice === b.maxPrice &&
    a.departFrom === b.departFrom &&
    a.departTo === b.departTo &&
    a.minDays === b.minDays &&
    a.maxDays === b.maxDays
  );
}

/**
 * "expired": departure window over · "pending": no reading yet for these settings · "ready".
 * @param {Watch} watch @param {SnapshotWatch | undefined} read @param {string} today
 * @returns {"expired" | "pending" | "ready"}
 */
export function watchState(watch, read, today) {
  if (watch.departTo < today) return "expired";
  return read && sameSearch(watch, read) ? "ready" : "pending";
}

/**
 * Current deals of the watches whose last reading matches their settings, in watch order.
 * @param {Config} config @param {Snapshot | null} snapshot @param {string} today
 */
export function currentDeals(config, snapshot, today) {
  return config.watches.flatMap((watch) => {
    const read = snapshot?.watches.find((candidate) => candidate.id === watch.id);
    if (!read || watchState(watch, read, today) !== "ready") return [];
    return read.deals.filter((deal) => deal.departDate >= today).map((deal) => ({ watch, deal }));
  });
}

/**
 * The best current price closest to its threshold, to show when there is no deal.
 * @param {Config} config @param {Snapshot | null} snapshot @param {string} today
 */
export function closestToThreshold(config, snapshot, today) {
  /** @type {{ watch: Watch, offer: SnapshotOffer } | null} */
  let closest = null;
  for (const watch of config.watches) {
    const read = snapshot?.watches.find((candidate) => candidate.id === watch.id);
    if (!read || watchState(watch, read, today) !== "ready") continue;
    for (const { best } of read.months) {
      if (!best || best.departDate < today) continue;
      if (!closest || best.price / watch.maxPrice < closest.offer.price / closest.watch.maxPrice) closest = { watch, offer: best };
    }
  }
  return closest;
}

/** Cities of an autocomplete response (autocomplete.travelpayouts.com/places2). @param {unknown} response @returns {City[]} */
export function parseCities(response) {
  if (!Array.isArray(response)) return [];
  return response.flatMap((place) => {
    const { type, code, name, country_name: country } = place ?? {};
    return type === "city" && typeof code === "string" && /^[A-Z]{3}$/.test(code) && typeof name === "string"
      ? [{ code, name, country: typeof country === "string" ? country : "" }]
      : [];
  });
}
