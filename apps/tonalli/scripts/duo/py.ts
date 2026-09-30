/**
 * Les quelques endroits où Python et JavaScript ne calculent pas pareil.
 *
 * Le générateur des scènes a d'abord été écrit en Python ; ces fonctions
 * reproduisent son arithmétique là où elle diffère de celle de JavaScript. Sans
 * elles, une feuille sur dix changerait d'un centième ici ou là : invisible à
 * l'œil, mais on ne pourrait plus vérifier qu'une retouche n'a rien déplacé
 * d'autre. Rien ici ne dépend des scènes.
 */

/**
 * `x` à `n` décimales, comme `f"{x:.nf}"`. `toFixed` arrondit les égalités
 * exactes en s'éloignant de zéro (0.125 → « 0.13 ») ; Python les arrondit au
 * pair (« 0.12 »). Une égalité exacte n'existe que si `x · 2^(n+1)` est entier
 * et impair — les deux produits sont exacts, une puissance de deux ne perd rien.
 */
export function pyFixed(x: number, n: number): string {
  const s = x.toFixed(n);
  const tie = Number.isInteger(x * 2 ** (n + 1)) && !Number.isInteger(x * 2 ** n);
  if (!tie) return s;
  const q = Math.abs(x) * 10 ** n;
  const low = Math.floor(q);
  const even = low % 2 === 0 ? low : low + 1;
  const digits = String(even).padStart(n + 1, '0');
  const body = n ? `${digits.slice(0, -n)}.${digits.slice(-n)}` : digits;
  return (x < 0 ? '-' : '') + body;
}

/** `round(x, n)` : arrondi décimal au pair, relu en nombre ; sans `n`, un entier. */
export function pyRound(x: number, n?: number): number {
  if (n !== undefined) return Number(pyFixed(x, n));
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : r;
}

/** `a % b` : le reste prend le signe du diviseur, pas celui du dividende. */
export function pyMod(a: number, b: number): number {
  const m = a % b;
  return m !== 0 && b < 0 !== m < 0 ? m + b : m;
}

/** `s.rstrip(chars)`. */
export function pyRstrip(s: string, chars: string): string {
  let end = s.length;
  while (end > 0 && chars.includes(s[end - 1])) end -= 1;
  return s.slice(0, end);
}

/** `math.radians`, calculé comme CPython : un seul produit par π/180. */
export function radians(deg: number): number {
  return deg * (Math.PI / 180);
}

export function range(a: number, b?: number, step = 1): number[] {
  const [start, stop] = b === undefined ? [0, a] : [a, b];
  const out: number[] = [];
  for (let i = start; step > 0 ? i < stop : i > stop; i += step) out.push(i);
  return out;
}

export function zip<A, B>(a: readonly A[], b: readonly B[]): [A, B][] {
  return a.slice(0, Math.min(a.length, b.length)).map((x, i) => [x, b[i]]);
}

/** Ordre de Python : nombres, chaînes, puis n-uplets comparés terme à terme. */
function compare(a: unknown, b: unknown): number {
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
      const c = compare(a[i], b[i]);
      if (c) return c;
    }
    return a.length - b.length;
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  throw new Error(`comparaison impossible : ${String(a)} / ${String(b)}`);
}

/** `sorted(xs, key=…)` : un tri stable, sur une copie. */
export function sorted<T>(xs: Iterable<T>, key?: (x: T) => unknown): T[] {
  const k = key ?? ((x: T) => x);
  return [...xs].sort((a, b) => compare(k(a), k(b)));
}

/** `d.get(key, dflt)` : une clé présente mais vide rend sa valeur, pas le défaut. */
export function get<T>(d: Record<string, T>, key: string, dflt: T | null = null): T | null {
  return key in d ? d[key] : dflt;
}

/**
 * Le hasard de Python (Mersenne Twister), pour que `seed(7)` rende les mêmes
 * confettis qu'avant. Seul ce qu'emploient les scènes est repris.
 */
export class PyRandom {
  private mt = new Uint32Array(624);
  private index = 624;

  /** `random.seed(n)` pour un entier positif de moins de 32 bits. */
  seed(n: number): void {
    this.initGenrand(19650218);
    const key = [n >>> 0];
    const mt = this.mt;
    let i = 1;
    let j = 0;
    for (let k = Math.max(624, key.length); k; k -= 1) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1664525)) + key[j] + j) >>> 0;
      i += 1;
      j += 1;
      if (i >= 624) {
        mt[0] = mt[623];
        i = 1;
      }
      if (j >= key.length) j = 0;
    }
    for (let k = 623; k; k -= 1) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0;
      i += 1;
      if (i >= 624) {
        mt[0] = mt[623];
        i = 1;
      }
    }
    mt[0] = 0x80000000;
    this.index = 624;
  }

  private initGenrand(s: number): void {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < 624; i += 1) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (Math.imul(prev, 1812433253) + i) >>> 0;
    }
  }

  private next(): number {
    const mt = this.mt;
    if (this.index >= 624) {
      for (let k = 0; k < 624; k += 1) {
        const y = (mt[k] & 0x80000000) | (mt[(k + 1) % 624] & 0x7fffffff);
        mt[k] = mt[(k + 397) % 624] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      this.index = 0;
    }
    let y = mt[this.index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** Un réel dans [0, 1), sur 53 bits comme Python. */
  random(): number {
    const a = this.next() >>> 5;
    const b = this.next() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  }

  uniform(a: number, b: number): number {
    return a + (b - a) * this.random();
  }
}
