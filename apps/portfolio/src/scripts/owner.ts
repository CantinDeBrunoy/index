/**
 * La connexion du propriétaire, en direct (/api/auth/session, servi par le Worker : @index/auth/hub).
 * - [data-auth] : le lien du pied de page, « Connexion » ou « Déconnexion », qui revient ensuite sur cette page ;
 * - [data-owner-note] : visible seulement une fois connecté.
 * Les textes viennent de la page (data-auth), dans sa langue. Sans réponse du Worker (astro dev), rien ne change.
 * Au voyage, une fiche posée sous son escale (scripts/voyage-fiche.ts) apporte les siens après coup : `scope` ; la
 * session n'est demandée qu'une fois, et seulement s'il y a un lien.
 */

interface SessionPayload {
  owner: boolean;
  login: string | null;
}

interface AuthStrings {
  logout: string;
  signedIn: string;
}

let request: Promise<SessionPayload | null> | undefined;
const sessionOf = () =>
  (request ??= fetch("/api/auth/session", { cache: "no-store" })
    .then((response) => (response.ok && response.headers.get("content-type")?.includes("json") ? (response.json() as Promise<SessionPayload>) : null))
    .catch(() => null));

export async function watchOwner(scope: Document | Element = document) {
  const links = [...scope.querySelectorAll<HTMLAnchorElement>("a[data-auth]")];
  const notes = [...scope.querySelectorAll<HTMLElement>("[data-owner-note]")];
  if (links.length === 0 && notes.length === 0) return;

  // Le lien part de la page actuelle, ancre comprise, au moment du clic.
  for (const link of links) {
    link.addEventListener("click", () => {
      const url = new URL(link.href);
      url.searchParams.set("next", location.pathname + location.search + location.hash);
      link.href = url.href;
    });
  }

  const session = await sessionOf();
  if (!session?.owner) return;

  for (const link of links) {
    const s = JSON.parse(link.dataset.auth ?? "{}") as AuthStrings;
    link.textContent = s.logout;
    link.title = s.signedIn.replace("{login}", session.login ?? "");
    link.href = "/api/auth/logout";
  }
  for (const note of notes) note.hidden = false;
}

void watchOwner();
