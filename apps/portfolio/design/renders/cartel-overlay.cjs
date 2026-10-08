// Pose sur un aperçu la place du cartel (bas gauche de l'artboard) et de l'anneau, pour vérifier ce qu'ils cachent.
// node cartel-overlay.cjs entrée.png sortie.png [x% y%]  (x%, y% : point cliquable, en % de l'artboard)
const { createRequire } = require("module");
const path = require("path");
const sharp = createRequire(path.join(process.env.REPO_DIR, "apps/portfolio/package.json"))("sharp");
const [input, out, sx, sy] = process.argv.slice(2);
(async () => {
  const { width: W, height: H } = await sharp(input).metadata();
  // Artboard 1440 × 900, rendu posé à 45 px du haut sur 810 px : on ramène tout aux coordonnées du rendu.
  const toY = (by) => ((by - 45) / 810) * H;
  const cx = (40 / 1440) * W, cw = (460 / 1440) * W, cy = toY(900 - 40 - 255), ch = toY(900 - 40) - cy;
  let spot = "";
  if (sx) {
    const x = (Number(sx) / 100) * W, y = toY((Number(sy) / 100) * 900);
    spot = `<circle cx="${x}" cy="${y}" r="${(26 / 1440) * W}" fill="none" stroke="#b08a4f" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${(6 / 1440) * W}" fill="#b08a4f"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="14" fill="#fbf7f0" fill-opacity=".85" stroke="#e3d8c8"/>${spot}</svg>`;
  await sharp(input).composite([{ input: Buffer.from(svg) }]).png().toFile(out);
  console.log("ok");
})();
