/**
 * Lien commun « ← INDEX » : relie chaque app au portfolio sans toucher à son design.
 *
 * Un petit onglet fixe dans un coin, rendu en Shadow DOM (aucun style ne fuit vers l'app
 * hôte, et inversement). Il reste masqué quand l'app tourne en PWA installée et à l'impression.
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
a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font: 700 11px/1 "JetBrains Mono", ui-monospace, "Cascadia Mono", Consolas, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  color: #fff;
  background: #000;
  border: 2px solid #fff;
  /* Anneau noir net (pas une ombre) : l'onglet reste lisible sur fond clair comme sur fond sombre. */
  box-shadow: 0 0 0 2px #000;
  cursor: pointer;
}
a:hover {
  color: #000;
  background: #fff;
}
a:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 4px;
  color: #000;
  background: #fff;
}
.sep {
  width: 2px;
  align-self: stretch;
  background: currentColor;
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
      link.append("← INDEX");
      if (entry) {
        const sep = document.createElement("span");
        sep.className = "sep";
        sep.setAttribute("aria-hidden", "true");
        link.append(sep, entry);
      }

      root.replaceChildren(style, link);
    }
  }

  customElements.define(TAG, IndexBar);
}

/**
 * Ajoute (ou met à jour) l'onglet « ← INDEX » dans la page.
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
