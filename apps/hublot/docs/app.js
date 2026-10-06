// @ts-check
// fare-radar web page: current deals + management of the watches (config.json of the repository).
// Reads the repository files; writes config.json through the GitHub API with the viewer's token.

import { createGitHub, GitHubError } from "./github.js";
import {
  MAX_STAY_DAYS,
  addDays,
  closestToThreshold,
  currentDeals,
  formatDay,
  formatMonth,
  formatPrice,
  localToday,
  newWatchId,
  parseCities,
  removeWatch,
  safeOfferLink,
  serializeConfig,
  timeAgo,
  transfersLabel,
  upsertWatch,
  validateWatch,
  watchState,
} from "./lib.js";

/**
 * @typedef {import("./lib.js").Watch} Watch
 * @typedef {import("./lib.js").Config} Config
 * @typedef {import("./lib.js").Snapshot} Snapshot
 * @typedef {import("./lib.js").SnapshotWatch} SnapshotWatch
 * @typedef {import("./lib.js").SnapshotOffer} SnapshotOffer
 * @typedef {import("./lib.js").City} City
 */

const BRANCH = "main";
const WORKFLOW = "check.yml";
const CONFIG_FILE = "config.json";
const SNAPSHOT_FILE = "data/latest.json";
const TOKEN_KEY = "fare-radar:github-token";
const STALE_AFTER_MS = 8 * 3_600_000;
const DEALS_SHOWN_PER_WATCH = 3;
const POLL_EVERY_MS = 20_000;
const POLL_FOR_MS = 6 * 60_000;
const AUTOCOMPLETE_URL = "https://autocomplete.travelpayouts.com/places2";

const site = locateSite(location);

const state = {
  /** @type {Config | null} */
  config: null,
  /** @type {string | null} sha of config.json, known when read through the API */
  configSha: null,
  /** @type {Snapshot | null} */
  snapshot: null,
  token: readToken(),
  /** Watch ids whose prices are being searched right now. */
  searching: new Set(),
};

const ui = {
  updated: byId("updated", HTMLElement),
  banner: byId("banner", HTMLElement),
  deals: byId("deals", HTMLElement),
  watches: byId("watches", HTMLElement),
  addWatch: byId("add-watch", HTMLButtonElement),
  openSettings: byId("open-settings", HTMLButtonElement),
  watchDialog: byId("watch-dialog", HTMLDialogElement),
  watchForm: byId("watch-form", HTMLFormElement),
  watchTitle: byId("watch-dialog-title", HTMLElement),
  cityInput: byId("city-input", HTMLInputElement),
  citySuggestions: byId("city-suggestions", HTMLElement),
  departFrom: byId("depart-from", HTMLInputElement),
  departTo: byId("depart-to", HTMLInputElement),
  minDays: byId("min-days", HTMLInputElement),
  maxDays: byId("max-days", HTMLInputElement),
  maxPrice: byId("max-price", HTMLInputElement),
  watchErrors: byId("watch-errors", HTMLElement),
  watchSubmit: byId("watch-submit", HTMLButtonElement),
  settingsDialog: byId("settings-dialog", HTMLDialogElement),
  settingsForm: byId("settings-form", HTMLFormElement),
  settingsReason: byId("settings-reason", HTMLElement),
  repoName: byId("repo-name", HTMLElement),
  tokenLink: byId("token-link", HTMLAnchorElement),
  tokenInput: byId("token-input", HTMLInputElement),
  tokenSave: byId("token-save", HTMLButtonElement),
  tokenRemove: byId("token-remove", HTMLButtonElement),
  settingsErrors: byId("settings-errors", HTMLElement),
  confirmDialog: byId("confirm-dialog", HTMLDialogElement),
  confirmMessage: byId("confirm-message", HTMLElement),
};

// ---- Start ----

setUpWatchDialog();
setUpSettingsDialog();
ui.addWatch.addEventListener("click", () => openWatchDialog(null));
ui.openSettings.addEventListener("click", () => openSettings());
void refresh();

async function refresh() {
  try {
    const data = await loadData();
    state.config = data.config;
    state.configSha = data.sha;
    state.snapshot = data.snapshot;
  } catch (error) {
    showBanner(`Impossible de charger les données : ${describeError(error)}`, "error");
  }
  render();
}

/** @returns {Promise<{ config: Config, sha: string | null, snapshot: Snapshot | null }>} */
async function loadData() {
  if (site.local) {
    // Local preview served from the repository root: the page lives in /docs/.
    const [config, snapshot] = await Promise.all([fetchJson("../config.json"), fetchJson("../data/latest.json").catch(() => null)]);
    return { config, sha: null, snapshot };
  }
  if (state.token) {
    try {
      const github = gitHub();
      const [configFile, snapshotFile] = await Promise.all([
        github.readFile(CONFIG_FILE),
        github.readFile(SNAPSHOT_FILE).catch((error) => (error instanceof GitHubError && error.status === 404 ? null : Promise.reject(error))),
      ]);
      return { config: JSON.parse(configFile.text), sha: configFile.sha, snapshot: snapshotFile ? JSON.parse(snapshotFile.text) : null };
    } catch (error) {
      showBanner(`Clé GitHub inutilisable (${describeError(error)}) : affichage en lecture seule.`, "warning");
    }
  }
  const raw = `https://raw.githubusercontent.com/${site.owner}/${site.repo}/${BRANCH}/`;
  const [config, snapshot] = await Promise.all([fetchJson(raw + CONFIG_FILE), fetchJson(raw + SNAPSHOT_FILE).catch(() => null)]);
  return { config, sha: null, snapshot };
}

// ---- Rendering ----

function render() {
  const today = localToday();
  renderUpdated();
  renderDeals(today);
  renderWatches(today);
}

function renderUpdated() {
  const generatedAt = state.snapshot?.generatedAt;
  const stale = generatedAt !== undefined && Date.now() - Date.parse(generatedAt) > STALE_AFTER_MS;
  ui.updated.textContent = generatedAt
    ? `Prix relevés ${timeAgo(generatedAt)}${stale ? " : la vérification automatique a du retard" : ""}`
    : "Pas encore de relevé des prix";
  ui.updated.classList.toggle("stale", stale);
}

/** @param {string} today */
function renderDeals(today) {
  const { config, snapshot } = state;
  if (!config) return ui.deals.replaceChildren();
  const currency = config.currency;
  const deals = currentDeals(config, snapshot, today);

  if (deals.length === 0) {
    const closest = closestToThreshold(config, snapshot, today);
    ui.deals.replaceChildren(
      el(
        "div",
        { class: "empty" },
        el("p", { text: "Aucun bon plan pour le moment. Tu recevras une notification dès qu'un prix passe sous un de tes seuils." }),
        closest
          ? el(
              "p",
              { class: "muted" },
              `Le plus proche : ${closest.watch.label} à ${formatPrice(closest.offer.price, currency)} `,
              `(${formatDay(closest.offer.departDate)} → ${formatDay(closest.offer.returnDate)}), `,
              `seuil ${formatPrice(closest.watch.maxPrice, currency)}.`,
            )
          : null,
      ),
    );
    return;
  }
  /** @type {Map<string, { watch: Watch, cards: HTMLElement[] }>} */
  const byWatch = new Map();
  for (const { watch, deal } of deals) {
    const group = byWatch.get(watch.id) ?? { watch, cards: [] };
    group.cards.push(dealCard(watch, deal, currency));
    byWatch.set(watch.id, group);
  }
  ui.deals.replaceChildren(
    ...[...byWatch.values()].flatMap(({ watch, cards }) => {
      const hidden = cards.slice(DEALS_SHOWN_PER_WATCH);
      if (hidden.length === 0) return cards;
      const summary = hidden.length === 1 ? "Voir 1 autre bon plan" : `Voir les ${hidden.length} autres bons plans`;
      return [
        ...cards.slice(0, DEALS_SHOWN_PER_WATCH),
        el("details", { class: "more" }, el("summary", { text: `${summary} pour ${watch.label}` }), el("div", { class: "stack" }, ...hidden)),
      ];
    }),
  );
}

/** @param {Watch} watch @param {SnapshotOffer} deal @param {string} currency */
function dealCard(watch, deal, currency) {
  const link = safeOfferLink(deal.link);
  const below = watch.maxPrice - deal.price;
  return el(
    "article",
    { class: "card deal" },
    el("div", { class: "card-head" }, el("h3", { text: watch.label }), el("strong", { class: "price", text: formatPrice(deal.price, currency) })),
    el("p", { text: `${formatDay(deal.departDate)} → ${formatDay(deal.returnDate)} · ${deal.stayDays}\u00a0jours` }),
    el(
      "p",
      { class: "muted" },
      `${deal.originAirport} → ${deal.destinationAirport} · ${deal.airline} · `,
      `aller ${transfersLabel(deal.transfers)}, retour ${transfersLabel(deal.returnTransfers)}`,
    ),
    el("p", { class: "saving", text: below > 0 ? `${formatPrice(below, currency)} sous ton seuil de ${formatPrice(watch.maxPrice, currency)}` : "Pile à ton seuil" }),
    link ? el("a", { class: "button primary", href: link, target: "_blank", rel: "noopener", text: "Voir l'offre ↗" }) : null,
  );
}

/** @param {string} today */
function renderWatches(today) {
  const { config, snapshot } = state;
  if (!config) return ui.watches.replaceChildren();
  if (config.watches.length === 0) {
    ui.watches.replaceChildren(el("p", { class: "empty", text: "Aucune surveillance. Ajoute une destination pour commencer." }));
    return;
  }
  ui.watches.replaceChildren(
    ...config.watches.map((watch) => watchCard(watch, snapshot?.watches.find((read) => read.id === watch.id), today, config.currency)),
  );
}

/** @param {Watch} watch @param {SnapshotWatch | undefined} read @param {string} today @param {string} currency */
function watchCard(watch, read, today, currency) {
  const status = watchState(watch, read, today);
  const edit = el("button", { class: "button", type: "button", text: "Modifier" });
  const remove = el("button", { class: "button danger", type: "button", text: "Supprimer" });
  edit.addEventListener("click", () => openWatchDialog(watch));
  remove.addEventListener("click", () => void deleteWatch(watch));

  return el(
    "article",
    { class: `card watch ${status}` },
    el(
      "div",
      { class: "card-head" },
      el("h3", {}, watch.label, " ", el("span", { class: "code", text: watch.to })),
      el("span", { class: "badge", text: `≤ ${formatPrice(watch.maxPrice, currency)}` }),
    ),
    el("p", {
      text: `Départ du ${formatDay(watch.departFrom)} au ${formatDay(watch.departTo)} · séjour de ${watch.minDays} à ${watch.maxDays}\u00a0jours`,
    }),
    watchSummary(watch, read, status, currency),
    status === "ready" && read ? monthsTable(read, currency) : null,
    el("div", { class: "actions" }, edit, remove),
  );
}

/**
 * @param {Watch} watch @param {SnapshotWatch | undefined} read
 * @param {"expired" | "pending" | "ready"} status @param {string} currency
 */
function watchSummary(watch, read, status, currency) {
  if (status === "expired") return el("p", { class: "muted", text: "Période de départ terminée : modifie les dates ou supprime la surveillance." });
  if (status === "pending" || !read) {
    return el("p", { class: "muted", text: state.searching.has(watch.id) ? "Recherche des prix en cours…" : "Premiers prix au prochain relevé." });
  }
  const best = read.months
    .map((month) => month.best)
    .filter((offer) => offer !== null)
    .sort((a, b) => a.price - b.price)[0];
  const failed = read.months.some((month) => month.failed);
  return el(
    "div",
    {},
    best
      ? el(
          "p",
          { class: best.price <= watch.maxPrice ? "best deal-price" : "best" },
          "Meilleur prix : ",
          el("strong", { text: formatPrice(best.price, currency) }),
          ` · ${formatDay(best.departDate)} → ${formatDay(best.returnDate)} (${best.stayDays}\u00a0j)`,
        )
      : el("p", { class: "muted", text: "Aucun prix trouvé pour l'instant sur cette période." }),
    failed ? el("p", { class: "warning-text", text: "Certaines recherches ont échoué au dernier relevé." }) : null,
  );
}

/** @param {SnapshotWatch} read @param {string} currency */
function monthsTable(read, currency) {
  const rows = read.months.map(({ month, best }) =>
    el(
      "tr",
      {},
      el("th", { scope: "row", text: formatMonth(month) }),
      el("td", { class: best && best.price <= read.maxPrice ? "deal-price" : "", text: best ? formatPrice(best.price, currency) : "—" }),
      el("td", { class: "muted", text: best ? `${formatDay(best.departDate)} → ${formatDay(best.returnDate)}` : "" }),
    ),
  );
  return el("details", {}, el("summary", { text: "Meilleur prix par mois de départ" }), el("table", {}, el("tbody", {}, ...rows)));
}

// ---- Watch form ----

/** @type {Watch | null} watch being edited, null when adding one */
let editing = null;
/** @type {City | null} */
let chosenCity = null;
/** @type {AbortController | null} */
let citySearch = null;
let citySearchTimer = 0;

function setUpWatchDialog() {
  ui.cityInput.addEventListener("input", () => {
    chosenCity = null;
    window.clearTimeout(citySearchTimer);
    citySearchTimer = window.setTimeout(() => void suggestCities(ui.cityInput.value.trim()), 250);
  });
  ui.watchForm.addEventListener("submit", (event) => {
    if (event.submitter instanceof HTMLButtonElement && event.submitter.value === "cancel") return;
    event.preventDefault();
    void submitWatch();
  });
  for (const input of [ui.minDays, ui.maxDays]) input.max = String(MAX_STAY_DAYS);
}

/** @param {Watch | null} watch */
function openWatchDialog(watch) {
  const today = localToday();
  editing = watch;
  chosenCity = watch ? { code: watch.to, name: watch.label, country: "" } : null;
  ui.watchTitle.textContent = watch ? `Modifier ${watch.label}` : "Nouvelle surveillance";
  ui.cityInput.value = watch ? `${watch.label} (${watch.to})` : "";
  ui.departFrom.value = watch?.departFrom ?? today;
  ui.departTo.value = watch?.departTo ?? addDays(today, 90);
  ui.departFrom.min = today;
  ui.departTo.min = today;
  ui.minDays.value = String(watch?.minDays ?? 14);
  ui.maxDays.value = String(watch?.maxDays ?? 21);
  ui.maxPrice.value = watch ? String(watch.maxPrice) : "";
  ui.watchErrors.replaceChildren();
  hideSuggestions();
  setBusy(ui.watchSubmit, false, "Enregistrer");
  ui.watchDialog.showModal();
  if (!watch) ui.cityInput.focus();
}

/** @param {string} term */
async function suggestCities(term) {
  citySearch?.abort();
  if (term.length < 2) return hideSuggestions();
  citySearch = new AbortController();
  try {
    const url = `${AUTOCOMPLETE_URL}?term=${encodeURIComponent(term)}&locale=fr&types[]=city`;
    const cities = parseCities(await fetchJson(url, citySearch.signal)).slice(0, 6);
    if (cities.length === 0) {
      ui.citySuggestions.replaceChildren(el("li", { class: "muted", text: "Aucune ville trouvée" }));
    } else {
      ui.citySuggestions.replaceChildren(
        ...cities.map((city) => {
          const option = el("button", { type: "button" }, city.name, " ", el("span", { class: "muted", text: `${city.code} · ${city.country}` }));
          option.addEventListener("click", () => chooseCity(city));
          return el("li", {}, option);
        }),
      );
    }
    ui.citySuggestions.hidden = false;
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) hideSuggestions();
  }
}

/** @param {City} city */
function chooseCity(city) {
  chosenCity = city;
  ui.cityInput.value = `${city.name} (${city.code})`;
  hideSuggestions();
  ui.departFrom.focus();
}

function hideSuggestions() {
  ui.citySuggestions.hidden = true;
  ui.citySuggestions.replaceChildren();
}

async function submitWatch() {
  const config = state.config;
  if (!config) return;
  const label = chosenCity?.name ?? "";
  /** @type {Watch} */
  const watch = {
    id: editing?.id ?? newWatchId(label, config.watches.map((current) => current.id)),
    label,
    to: chosenCity?.code ?? "",
    maxPrice: ui.maxPrice.valueAsNumber,
    departFrom: ui.departFrom.value,
    departTo: ui.departTo.value,
    minDays: ui.minDays.valueAsNumber,
    maxDays: ui.maxDays.valueAsNumber,
  };
  const errors = validateWatch(watch, localToday());
  if (errors.length > 0) {
    ui.watchErrors.replaceChildren(...errors.map((error) => el("span", { text: error })));
    return;
  }

  setBusy(ui.watchSubmit, true, "Enregistrement…");
  const message = editing ? `config: modification de la surveillance ${label}` : `config: nouvelle surveillance ${label}`;
  const failure = await saveConfig(upsertWatch(config, watch), message, watch.id);
  setBusy(ui.watchSubmit, false, "Enregistrer");
  if (failure) ui.watchErrors.replaceChildren(el("span", { text: failure }));
  else ui.watchDialog.close();
}

/** @param {Watch} watch */
async function deleteWatch(watch) {
  if (!state.config || !(await confirmAction(`Supprimer la surveillance « ${watch.label} » ?`))) return;
  const failure = await saveConfig(removeWatch(state.config, watch.id), `config: suppression de la surveillance ${watch.label}`, null);
  if (failure) showBanner(failure, "error");
}

/**
 * Commits config.json, then starts a price check when a watch was added or edited.
 * @param {Config} next @param {string} message @param {string | null} searchFor id of the watch to search prices for
 * @returns {Promise<string | null>} why the configuration was not saved, null once saved
 */
async function saveConfig(next, message, searchFor) {
  if (site.local) return "Aperçu local : les modifications se font depuis la page publiée sur GitHub Pages.";
  if (!state.token || !state.configSha) {
    openSettings("Pour enregistrer une modification, la page a besoin de ta clé GitHub.");
    return "Ajoute ta clé GitHub, puis enregistre à nouveau.";
  }
  const github = gitHub();
  try {
    state.configSha = await github.writeFile(CONFIG_FILE, serializeConfig(next), state.configSha, message);
  } catch (error) {
    if (error instanceof GitHubError && (error.status === 409 || error.status === 422)) await refresh();
    return `Modification non enregistrée : ${describeError(error)}`;
  }
  state.config = next;

  if (searchFor) {
    try {
      await github.runWorkflow(WORKFLOW);
      state.searching.add(searchFor);
      showBanner("Enregistré. Recherche des prix lancée : résultats dans 2 minutes environ.", "info");
      pollForNewPrices();
    } catch (error) {
      showBanner(`Enregistré, mais la recherche n'a pas pu être lancée (${describeError(error)}). Elle se fera au prochain passage automatique.`, "warning");
    }
  } else {
    showBanner("Enregistré.", "success");
  }
  render();
  return null;
}

let pollTimer = 0;

/** Waits for the check started from the page to publish a new data/latest.json. */
function pollForNewPrices() {
  const previous = state.snapshot?.generatedAt;
  const deadline = Date.now() + POLL_FOR_MS;
  window.clearInterval(pollTimer);
  pollTimer = window.setInterval(async () => {
    if (Date.now() > deadline) {
      window.clearInterval(pollTimer);
      state.searching.clear();
      render();
      showBanner("La recherche prend plus de temps que prévu : recharge la page dans quelques minutes.", "warning");
      return;
    }
    try {
      const snapshot = JSON.parse((await gitHub().readFile(SNAPSHOT_FILE)).text);
      if (snapshot.generatedAt === previous) return;
      window.clearInterval(pollTimer);
      state.snapshot = snapshot;
      state.searching.clear();
      render();
      showBanner("Prix à jour.", "success");
    } catch {
      // Not published yet: try again at the next tick.
    }
  }, POLL_EVERY_MS);
}

// ---- GitHub key ----

function setUpSettingsDialog() {
  const tokenUrl = new URL("https://github.com/settings/personal-access-tokens/new");
  tokenUrl.search = new URLSearchParams({
    name: `fare-radar ${site.repo}`,
    description: "Page fare-radar : modifier les surveillances (config.json) et lancer la vérification des prix.",
    target_name: site.owner,
    expires_in: "366",
    contents: "write",
    actions: "write",
  }).toString();
  ui.tokenLink.href = tokenUrl.href;
  ui.repoName.textContent = site.repo;

  ui.settingsForm.addEventListener("submit", (event) => {
    if (event.submitter instanceof HTMLButtonElement && event.submitter.value === "cancel") return;
    event.preventDefault();
    void saveToken();
  });
  ui.tokenRemove.addEventListener("click", () => {
    writeToken(null);
    ui.settingsDialog.close();
    showBanner("Clé oubliée sur cet appareil. Pense à la révoquer sur GitHub si tu ne t'en sers plus.", "info");
    void refresh();
  });
}

/** @param {string} [reason] */
function openSettings(reason) {
  ui.settingsReason.hidden = !reason;
  ui.settingsReason.textContent = reason ?? "";
  ui.tokenInput.value = "";
  ui.tokenInput.placeholder = state.token ? "Clé enregistrée : colle une nouvelle clé pour la remplacer" : "github_pat_…";
  ui.tokenRemove.hidden = !state.token;
  ui.settingsErrors.replaceChildren();
  setBusy(ui.tokenSave, false, "Enregistrer");
  ui.settingsDialog.showModal();
}

async function saveToken() {
  const token = ui.tokenInput.value.trim();
  if (!token) {
    ui.settingsErrors.replaceChildren(el("span", { text: "Colle la clé générée sur GitHub." }));
    return;
  }
  setBusy(ui.tokenSave, true, "Vérification…");
  try {
    await gitHub(token).readFile(CONFIG_FILE);
  } catch (error) {
    setBusy(ui.tokenSave, false, "Enregistrer");
    ui.settingsErrors.replaceChildren(el("span", { text: `Clé refusée : ${describeError(error)}` }));
    return;
  }
  writeToken(token);
  ui.settingsDialog.close();
  showBanner("Clé enregistrée sur cet appareil : tu peux modifier tes surveillances.", "success");
  await refresh();
}

// ---- Helpers ----

/** @param {string} [token] */
function gitHub(token = state.token ?? "") {
  return createGitHub({ owner: site.owner, repo: site.repo, token, branch: BRANCH });
}

/** @param {unknown} error */
function describeError(error) {
  if (error instanceof GitHubError) {
    if (error.status === 401) return "clé GitHub refusée (expirée ou révoquée ?)";
    if (error.status === 403) return "la clé n'a pas les droits nécessaires (Contents et Actions en écriture)";
    if (error.status === 404) return `dépôt introuvable avec cette clé : a-t-elle accès au dépôt ${site.repo} ?`;
    if (error.status === 409 || error.status === 422) return "la configuration a changé entre-temps, la page vient d'être rechargée : recommence";
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

let bannerTimer = 0;

/**
 * Success messages fade after a few seconds; the others stay until replaced.
 * @param {string} message @param {"info" | "success" | "warning" | "error"} kind
 */
function showBanner(message, kind) {
  window.clearTimeout(bannerTimer);
  ui.banner.textContent = message;
  ui.banner.className = `banner ${kind}`;
  ui.banner.hidden = false;
  if (kind === "success") bannerTimer = window.setTimeout(() => (ui.banner.hidden = true), 6_000);
}

/** @param {HTMLButtonElement} button @param {boolean} busy @param {string} label */
function setBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = label;
}

/** @param {string} message @returns {Promise<boolean>} */
function confirmAction(message) {
  ui.confirmMessage.textContent = message;
  ui.confirmDialog.returnValue = "";
  ui.confirmDialog.showModal();
  return new Promise((resolve) => {
    ui.confirmDialog.addEventListener("close", () => resolve(ui.confirmDialog.returnValue === "confirm"), { once: true });
  });
}

/** @param {string} url @param {AbortSignal} [signal] */
async function fetchJson(url, signal) {
  const response = await fetch(url, { cache: "no-cache", signal });
  if (!response.ok) throw new Error(`HTTP ${response.status} sur ${url}`);
  return response.json();
}

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** @param {string | null} token */
function writeToken(token) {
  state.token = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked: the key only lasts for this visit.
  }
}

/** Repository served by this page (<owner>.github.io/<repo>/); any other host is a local preview. @param {Location} where */
function locateSite(where) {
  const owner = /^([a-z0-9-]+)\.github\.io$/i.exec(where.hostname)?.[1];
  const repo = where.pathname.split("/").filter(Boolean)[0];
  return owner && repo ? { owner, repo, local: false } : { owner: "CantinDeBrunoy", repo: "Hublot", local: true };
}

/**
 * @template {typeof HTMLElement} T
 * @param {string} id @param {T} type @returns {InstanceType<T>}
 */
function byId(id, type) {
  const node = document.getElementById(id);
  if (!(node instanceof type)) throw new Error(`Élément #${id} introuvable`);
  return /** @type {InstanceType<T>} */ (node);
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag @param {Record<string, string>} [props] "class" and "text" are shortcuts, the rest are attributes
 * @param {...(Node | string | null)} children
 * @returns {HTMLElementTagNameMap[K]}
 */
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) if (child !== null) node.append(child);
  return node;
}
