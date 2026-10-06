/**
 * Régénère les feuilles des scènes à deux (`src/lib/duo/scenes/*.css`).
 *   npm run duo            écrit les feuilles
 *   npm run duo -- --check vérifie seulement qu'elles sont à jour
 *
 * Chaque livre de `scenes/` chorégraphie une émotion avec les onze autres et
 * empile ses règles dans `css` (voir `lib.ts`). L'ordre des imports est celui
 * de la feuille : un livre peut reprendre les outils d'un livre précédent
 * (`smooth`, `path`, `mv`…), jamais d'un suivant.
 *
 * Les feuilles sont ensuite réparties par scène, pour que l'app ne charge que
 * celles du couple affiché : une classe `du-xy-…` va dans `xy.css`, le socle
 * (`du-stage`, les poses de base, le mouvement réduit) dans `base.css`. Une
 * animation va avec chaque scène qui la nomme, ou au socle s'il la nomme.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

import { css, report } from './lib.ts';
import './scenes/joie.ts';
import './scenes/serenite.ts';
import './scenes/amour.ts';
import './scenes/gratitude.ts';
import './scenes/fierte.ts';
import './scenes/excitation.ts';
import './scenes/nostalgie.ts';
import './scenes/fatigue.ts';
import './scenes/tristesse.ts';
import './scenes/anxiete.ts';
import './scenes/colere.ts';

// Mouvement réduit : tout s'arrête sur une image lisible de la scène.
css.push('@media (prefers-reduced-motion: reduce){.du-stage *{animation:none!important}.du-motion-only{display:none}}');

const OUT = new URL('../../src/lib/duo/scenes/', import.meta.url);

/** Les règles de premier niveau, accolades imbriquées comprises (`@media`, `@keyframes`). */
function rulesOf(text: string): string[] {
  const rules: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    current += ch;
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        rules.push(current.trim());
        current = '';
      }
    }
  }
  return rules;
}

/** `du-jj-bx` → `jj` ; `du-bounce` et `du-motion-only` → le socle. */
function sceneOf(cls: string): string {
  const parts = cls.split('-');
  return parts.length > 2 && cls !== 'du-motion-only' ? parts[1] : 'base';
}

function split(text: string): Map<string, string> {
  const groups = new Map<string, string[]>();
  const owners = new Map<string, Set<string>>();
  const keyframes = new Map<string, string>();
  const push = (group: string, rule: string) => {
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(rule);
  };
  for (const rule of rulesOf(text)) {
    const kf = /^@keyframes (\w+)\{/.exec(rule);
    if (kf) {
      keyframes.set(kf[1], rule);
      continue;
    }
    if (rule.startsWith('@media')) {
      push('base', rule);
      continue;
    }
    const cls = /^\.([\w-]+)/.exec(rule)![1];
    const group = sceneOf(cls);
    push(group, rule);
    for (const m of rule.matchAll(/animation:(\w+)/g)) {
      if (!owners.has(m[1])) owners.set(m[1], new Set());
      owners.get(m[1])!.add(group);
    }
  }
  for (const [name, groupsOf] of owners) {
    const kf = keyframes.get(name);
    if (!kf) throw new Error(`images clés manquantes : ${name}`);
    if (groupsOf.has('base')) groups.get('base')!.push(kf);
    else for (const group of groupsOf) groups.get(group)!.push(kf);
  }
  const orphans = [...keyframes.keys()].filter((name) => !owners.has(name));
  if (orphans.length) throw new Error(`images clés que personne n'emploie : ${orphans.join(', ')}`);
  return new Map([...groups].map(([group, rules]) => [group, rules.join('\n') + '\n']));
}

const sheets = split(css.join('\n'));
if (css.join('\n').includes('{{')) throw new Error('double accolade dans la feuille');

const existing = readdirSync(OUT).filter((name) => name.endsWith('.css'));
const stale = [
  ...[...sheets].filter(([group, text]) => {
    try {
      return readFileSync(new URL(`${group}.css`, OUT), 'utf8') !== text;
    } catch {
      return true;
    }
  }).map(([group]) => `${group}.css`),
  ...existing.filter((name) => !sheets.has(name.slice(0, -4))),
];

if (process.argv.includes('--check')) {
  if (stale.length) {
    console.error(`Feuilles pas à jour (npm run duo) : ${stale.join(', ')}`);
    process.exit(1);
  }
  console.log(`${sheets.size} feuilles à jour`);
} else {
  if (process.argv.includes('--report')) console.log(report.join('\n'));
  mkdirSync(OUT, { recursive: true });
  for (const [group, text] of sheets) writeFileSync(new URL(`${group}.css`, OUT), text);
  const total = [...sheets.values()].reduce((sum, text) => sum + text.length, 0);
  console.log(`${sheets.size} feuilles, ${Math.round(total / 1024)} Ko${stale.length ? ` — modifiées : ${stale.join(', ')}` : ', rien de changé'}`);
}
