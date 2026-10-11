/**
 * La partie filmée dans la démo de l'API REST .NET (Shard) : de vraies requêtes envoyées à l'API qui tourne en local,
 * et ses vraies réponses, enregistrées avec leur heure. Le montage (scripts/demo-montage.ts) les rejoue ensuite dans
 * une console (scripts/demo/api-console.html), en sautant les attentes.
 *
 * Le code de Shard reste dans le dépôt GitLab de l'école, privé : on le lance à part (branche v6, .NET 7),
 *   dotnet ProjetEnCShard.dll   avec ASPNETCORE_URLS=http://127.0.0.1:5293
 * puis :
 *   node scripts/demo/shard-capture.ts [adresse]   → scripts/.demo-sources/shard.json
 *
 * Une partie dure un peu plus de sept minutes, à l'horloge réelle : un vaisseau met une minute pour changer de système,
 * un bâtiment cinq minutes pour se construire, une mine extrait une unité de minerai par minute.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "./lib.ts";

const API = process.argv[2] ?? "http://127.0.0.1:5293";
// L'administrateur des tests du cours : il crée des unités où il veut (ici, pour le combat).
const ADMIN = { authorization: `Basic ${Buffer.from("admin:password").toString("base64")}` };

interface Step {
  /** Secondes depuis le début de la partie. */
  at: number;
  method: string;
  path: string;
  body?: unknown;
  admin?: boolean;
  status: number;
  ms: number;
  response: unknown;
}

const steps: Step[] = [];
const t0 = Date.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = (seconds: number) => sleep(Math.max(0, t0 + seconds * 1000 - Date.now()));

async function call(method: string, path: string, body?: unknown, admin = false) {
  const start = Date.now();
  const res = await fetch(API + path, {
    method,
    headers: { ...(body ? { "content-type": "application/json" } : {}), ...(admin ? ADMIN : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let response: unknown = text;
  try {
    response = JSON.parse(text);
  } catch {
    // Une réponse en texte brut (une erreur), gardée telle quelle.
  }
  const step = { at: (start - t0) / 1000, method, path, body, admin: admin || undefined, status: res.status, ms: Date.now() - start, response };
  steps.push(step);
  console.log(`${step.at.toFixed(1).padStart(6)} s  ${method} ${path} → ${res.status}`);
  return response as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// L'univers.
const systems = await call("GET", "/systems");
const home = systems[0];
await call("GET", `/systems/${home.name}/planets/${home.planets[0].name}`);

// Un joueur : il reçoit un éclaireur et un constructeur, quelque part dans l'univers.
await call("PUT", "/users/cantin", { id: "cantin", pseudo: "cantin", dateOfCreation: new Date().toISOString() });
const units = await call("GET", "/users/cantin/units");
const scout = units.find((u: { type: string }) => u.type === "scout");
const builder = units.find((u: { type: string }) => u.type === "builder");
const start = systems.find((s: { name: string }) => s.name === builder.system);
const elsewhere = systems.find((s: { name: string }) => s.name !== scout.system);

// Le voyage : l'éclaireur part pour un autre système (une minute), le constructeur se pose sur une planète (15 s).
// Comme dans les tests du cours, on renvoie l'unité telle que l'API l'a donnée, avec sa destination.
await call("PUT", `/users/cantin/units/${scout.id}`, { ...scout, destinationSystem: elsewhere.name });
const planet = start.planets[0].name;
await call("PUT", `/users/cantin/units/${builder.id}`, { ...builder, destinationSystem: builder.system, destinationPlanet: planet });
await sleep(16_000);
await call("GET", `/users/cantin/units/${builder.id}`);

// La mine : cinq minutes de construction.
const mine = await call("POST", "/users/cantin/buildings", { type: "mine", builderId: builder.id, resourceCategory: "solid" });
const mineAt = (Date.now() - t0) / 1000;

// L'éclaireur arrive.
await until(steps.find((s) => s.path === `/users/cantin/units/${scout.id}`)!.at + 62);
await call("GET", `/users/cantin/units/${scout.id}`);

// La mine est construite, puis extrait son minerai, minute après minute.
await until(mineAt + 302);
await call("GET", `/users/cantin/buildings/${mine.id}`);
await call("GET", "/users/cantin");
await sleep(61_000);
await call("GET", "/users/cantin");
await sleep(61_000);
await call("GET", "/users/cantin");

// Le combat, en dernier : un rival, un croiseur contre un chasseur, dans le même système. Deux défauts du code de
// l'époque, que les tests du cours (à l'horloge avancée à la main) ne voient pas : un vaisseau ne tire que si le
// minuteur des combats, réglé à 6 s depuis le démarrage, tombe sur une seconde multiple de 6 (le serveur est lancé
// au bon moment pour ça) ; et un vaisseau resté sans cible fait planter le serveur au tir suivant.
await call("PUT", "/users/rival", { id: "rival", pseudo: "rival", dateOfCreation: new Date().toISOString() }, true);
const arena = systems[1].name;
await call("PUT", "/users/cantin/units/croiseur-1", { id: "croiseur-1", type: "cruiser", system: arena }, true);
await call("PUT", "/users/rival/units/chasseur-1", { id: "chasseur-1", type: "fighter", system: arena }, true);
for (let k = 0; k < 8; k++) {
  await sleep(6_000);
  await call("GET", "/users/rival/units/chasseur-1");
  if (steps.at(-1)!.status === 404) break;
}
await call("GET", "/users/cantin/units/croiseur-1");

const out = join(ROOT, "scripts/.demo-sources");
await mkdir(out, { recursive: true });
await writeFile(join(out, "shard.json"), JSON.stringify({ api: "Shard v6", capturedAt: new Date(t0).toISOString(), steps }, null, 2));
console.log(`✓ ${steps.length} requêtes → scripts/.demo-sources/shard.json`);
