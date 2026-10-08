/**
 * Lien commun « ← Index » : relie chaque app au portfolio sans toucher à son design.
 *
 * Un petit onglet fixe dans un coin, dans la matière du voyage : une pilule de nuit, « Index » en italique
 * et le numéro de l'entrée en laiton. Rendu en Shadow DOM (aucun style ne fuit vers l'app hôte, et
 * inversement), sans police à charger : Georgia, la police système et sa chasse fixe. Il reste masqué quand
 * l'app tourne en PWA installée et à l'impression.
 *
 *   import { mountIndexBar } from "@index/ui/index-bar";
 *   mountIndexBar({ href: "https://…/008-tonalli", entry: "008", corner: "bottom-left" });
 *
 * Sans danger hors navigateur (rendu statique d'Expo, tests) : la fonction ne fait rien.
 * Écrit en JavaScript sans dépendance pour être utilisable tel quel, avec ou sans bundler.
 */

const TAG = "index-bar";
const CORNERS = ["bottom-left", "bottom-right", "top-left", "top-right"];

const STYLE = `
:host {
  all: initial;
  position: fixed;
  z-index: 2147483000;
}
:host([corner="bottom-left"]), :host(:not([corner])) {
  left: max(8px, env(safe-area-inset-left));
  bottom: max(8px, env(safe-area-inset-bottom));
}
:host([corner="bottom-right"]) {
  right: max(8px, env(safe-area-inset-right));
  bottom: max(8px, env(safe-area-inset-bottom));
}
:host([corner="top-left"]) {
  left: max(8px, env(safe-area-inset-left));
  top: max(8px, env(safe-area-inset-top));
}
:host([corner="top-right"]) {
  right: max(8px, env(safe-area-inset-right));
  top: max(8px, env(safe-area-inset-top));
}
/* La pilule de nuit : son liseré clair et son ombre la détachent sur un fond sombre comme sur un clair. */
a {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  box-sizing: border-box;
  height: 34px;
  padding: 0 13px 0 11px;
  border-radius: 999px;
  background: rgba(14, 16, 24, 0.9);
  color: #f1e8da;
  box-shadow: 0 0 0 1px rgba(241, 232, 218, 0.3), 0 8px 22px rgba(0, 0, 0, 0.22);
  font: 500 13px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  -webkit-font-smoothing: antialiased;
  transition: background 0.2s, color 0.2s;
}
.brand {
  font: italic 400 17px/1 Georgia, "Times New Roman", serif;
}
.sep {
  width: 1px;
  height: 14px;
  background: rgba(241, 232, 218, 0.3);
}
.entry {
  font: 400 11px/1 ui-monospace, "Cascadia Mono", Consolas, monospace;
  letter-spacing: 0.08em;
  color: #d9b475;
}
/* Au survol, la crème : le numéro passe au laiton sombre (6:1 sur la crème). */
a:hover {
  background: #f1e8da;
  color: #0e1018;
  box-shadow: 0 0 0 1px rgba(14, 16, 24, 0.2), 0 8px 22px rgba(0, 0, 0, 0.22);
}
a:hover .entry {
  color: #6e5226;
}
a:hover .sep {
  background: rgba(14, 16, 24, 0.25);
}
a:focus-visible {
  outline: 2px solid #d9b475;
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  a { transition: none; }
}
@media print {
  :host { display: none; }
}
`;

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    /** @type {any} */ (window.navigator).standalone === true
  );
}

/** @param {string} className @param {string} [text] */
function span(className, text) {
  const el = document.createElement("span");
  el.className = className;
  if (text) el.textContent = text;
  return el;
}

function define() {
  if (customElements.get(TAG)) return;

  class IndexBar extends HTMLElement {
    static get observedAttributes() {
      return ["href", "entry"];
    }

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }

    render() {
      const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
      const href = this.getAttribute("href") ?? "#";
      const entry = this.getAttribute("entry");

      const style = document.createElement("style");
      style.textContent = STYLE;

      const link = document.createElement("a");
      link.href = href;
      link.lang = "fr";
      link.setAttribute(
        "aria-label",
        entry ? `Retour au portfolio INDEX, entrée ${entry}` : "Retour au portfolio INDEX",
      );
      const arrow = span("arrow", "←");
      arrow.setAttribute("aria-hidden", "true");
      link.append(arrow, span("brand", "Index"));
      if (entry) {
        const sep = span("sep");
        sep.setAttribute("aria-hidden", "true");
        link.append(sep, span("entry", entry));
      }

      root.replaceChildren(style, link);
    }
  }

  customElements.define(TAG, IndexBar);
}

/**
 * Ajoute (ou met à jour) l'onglet « ← Index » dans la page.
 * @param {import("./index-bar.js").IndexBarOptions} options
 * @returns {HTMLElement | null} l'élément, ou null s'il n'a pas été affiché
 */
export function mountIndexBar({ href, entry, corner = "bottom-left" }) {
  if (typeof window === "undefined" || typeof customElements === "undefined") return null;
  if (!href || isStandalone()) return null;

  define();
  let el = document.querySelector(TAG);
  if (!el) {
    el = document.createElement(TAG);
    document.body.append(el);
  }
  el.setAttribute("href", href);
  el.setAttribute("corner", CORNERS.includes(corner) ? corner : "bottom-left");
  if (entry) el.setAttribute("entry", entry);
  else el.removeAttribute("entry");
  return /** @type {HTMLElement} */ (el);
}
