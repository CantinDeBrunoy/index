/**
 * La session du propriétaire : un jeton signé (HMAC-SHA256) dans un cookie que le hub (Worker « index »)
 * pose sur tout <sous-domaine>.workers.dev, pour que Magellan et Hublot le reçoivent aussi. workers.dev
 * figure dans la liste des suffixes publics : chaque compte Cloudflare a son propre site, que les apps
 * d'un autre compte ne partagent pas.
 *
 * Une seule personne peut l'obtenir : le compte GitHub du propriétaire (OWNER), vérifié à la connexion
 * puis à chaque lecture du cookie.
 */

/** Le compte GitHub du propriétaire : son identifiant numérique, qui ne change pas avec le pseudo. */
export const OWNER = { githubId: 90508998, login: "CantinDeBrunoy" } as const;

export const SESSION_COOKIE = "index_session";
export const SESSION_DAYS = 30;

export interface Session {
  /** Identifiant GitHub, en texte. */
  sub: string;
  login: string;
  /** Expiration, en secondes depuis l'epoch. */
  exp: number;
}

const encoder = new TextEncoder();

function toBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Une valeur aléatoire, pour l'état OAuth. */
export function randomToken(bytes = 32): string {
  return toBase64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** `<charge utile en base64url>.<signature>` */
export async function signToken(payload: object, secret: string): Promise<string> {
  const body = toBase64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(body));
  return `${body}.${toBase64url(new Uint8Array(signature))}`;
}

/** La charge utile si la signature est bonne (comparaison à temps constant par WebCrypto), sinon null. */
export async function verifyToken<T>(token: string, secret: string): Promise<T | null> {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromBase64url(signature), encoder.encode(body));
    return valid ? (JSON.parse(new TextDecoder().decode(fromBase64url(body))) as T) : null;
  } catch {
    return null;
  }
}

export function createSession(user: { id: number; login: string }, secret: string, now = Date.now()): Promise<string> {
  const session: Session = { sub: String(user.id), login: user.login, exp: Math.floor(now / 1000) + SESSION_DAYS * 86_400 };
  return signToken(session, secret);
}

/** La session du propriétaire portée par la requête, ou null (absente, falsifiée, expirée, autre compte). */
export async function readSession(request: Request, secret: string, now = Date.now()): Promise<Session | null> {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (!token) return null;
  const session = await verifyToken<Session>(token, secret);
  if (!session || typeof session.exp !== "number" || session.exp * 1000 <= now) return null;
  return session.sub === String(OWNER.githubId) ? session : null;
}

export function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const at = part.indexOf("=");
    if (at > 0 && part.slice(0, at).trim() === name) return part.slice(at + 1).trim();
  }
  return undefined;
}

/**
 * Le domaine du cookie de session : tout <sous-domaine>.workers.dev quand on y est, sinon l'hôte seul
 * (localhost, ou un futur domaine personnalisé).
 */
export function cookieDomain(host: string, workersSubdomain: string | undefined): string | undefined {
  const parent = workersSubdomain ? `${workersSubdomain}.workers.dev` : undefined;
  return parent && host.endsWith(`.${parent}`) ? parent : undefined;
}

export function serializeCookie(name: string, value: string, options: { maxAge: number; domain?: string; path?: string }): string {
  return [
    `${name}=${value}`,
    `Path=${options.path ?? "/"}`,
    options.domain ? `Domain=${options.domain}` : undefined,
    `Max-Age=${options.maxAge}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ]
    .filter(Boolean)
    .join("; ");
}

/** Une réponse JSON jamais mise en cache : elle dépend de qui la demande. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
