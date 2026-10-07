// Fabrique voyage.html : le moteur de anim.html + les scènes du voyage, dans le même module.
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const anim = fs.readFileSync(path.join(dir, "anim.html"), "utf8");
const scenes = fs.readFileSync(path.join(dir, "voyage-scenes.js"), "utf8");
const marker = "window.ready = true;";
if (!anim.includes(marker)) throw new Error("marqueur introuvable");
fs.writeFileSync(path.join(dir, "voyage.html"), anim.replace(marker, scenes + "\n" + marker));

// Encodeur : une scène par appel, rendu 1280 × 720.
let e = fs.readFileSync(path.join(dir, "encode.mjs"), "utf8");
e = e
  .replace(`join(dir, "anim.html")`, `join(dir, process.env.PAGE ?? "anim.html")`)
  .replace(
    `    if (name === "cabinet") await page.evaluate(([t, a]) => window.setupCabinet(t, a), [theme, accent]);`,
    `    if (process.env.PAGE === "voyage.html") await page.evaluate(([n, t, a]) => window.setupScene(n, t, a), [name, theme, accent]);
    else if (name === "cabinet") await page.evaluate(([t, a]) => window.setupCabinet(t, a), [theme, accent]);`,
  )
  .replace(`  for (const theme of ["light", "dark"]) {`, `  for (const theme of (process.env.THEMES ?? "light,dark").split(",")) {`)
  // Boucle plus longue possible (LOOP_MS) : le globe fait un tour complet sans saut.
  .replace(`delay: Math.round(4000 / N)`, `delay: Math.round(Number(process.env.LOOP_MS ?? 4000) / N)`);
fs.writeFileSync(path.join(dir, "encode-voyage.mjs"), e);
console.log("ok");
