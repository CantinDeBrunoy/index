// Contrôle local d'un artboard : la logique se compile, renderVals() rend les valeurs du gabarit,
// et chaque {{trou}} du gabarit trouve sa valeur (à l'écran d'intro et sur une escale).
const fs = require("fs");
const file = process.argv[2];
const html = fs.readFileSync(file, "utf8");
const code = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
class DCLogic {
  constructor(props) {
    this.props = props || {};
  }
  setState(p) {
    this.state = { ...this.state, ...p };
  }
}
const Component = new Function("DCLogic", "setTimeout", "clearTimeout", `${code}; return Component;`)(DCLogic, () => 0, () => {});
const c = new Component({});
const template = html.match(/<x-dc>([\s\S]*?)<\/x-dc>/)[1];
const holes = [...new Set([...template.matchAll(/\{\{\s*([\w.$]+)\s*\}\}/g)].map((m) => m[1]))];
const lookup = (vals, p) => p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), vals);
// L'intro, une escale du début, une du milieu, l'avant-dernière et la dernière.
const last = Component.DATA.length - 1;
for (const i of [0, 1, 7, last - 1, last]) {
  c.state = { ...c.state, i };
  const vals = c.renderVals();
  // Les trous de boucle (d.*) et les littéraux sont résolus ailleurs.
  const missing = holes.filter((h) => !/^(d\.|true|false)/.test(h) && lookup(vals, h) === undefined);
  console.log(`écran ${i} (${vals.s.place}${vals.isLast ? ", dernière" : ""}) : ${missing.length ? "trous sans valeur → " + missing.join(", ") : "tous les trous ont une valeur"} · ${vals.s.cta || "—"}`);
}
console.log("points :", c.renderVals().dots.length, "· classe :", c.renderVals().stageClass);
