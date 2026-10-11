/** Named fragments SpeedCubeDB already groups with parentheses. Longest match wins. */
const TRIGGERS: [string, string[]][] = [
  ["sune", ["R", "U", "R'", "U", "R", "U2", "R'"]],
  ["antisune", ["R'", "U'", "R", "U'", "R'", "U2", "R"]],
  ["fat-sune", ["r", "U", "R'", "U", "R", "U2", "r'"]],
  ["fat-antisune", ["r'", "U'", "R", "U'", "R'", "U2", "r"]],
  ["front-sexy", ["F", "R", "U", "R'", "U'", "F'"]],
  ["wide-sexy", ["f", "R", "U", "R'", "U'", "f'"]],
  ["wide-sexy-back", ["f'", "L'", "U'", "L", "U", "f"]],
  ["sexy", ["R", "U", "R'", "U'"]],
  ["reverse-sexy", ["R", "U'", "R'", "U"]],
  ["reverse-sexy", ["U", "R", "U'", "R'"]],
  ["left-sexy", ["L'", "U'", "L", "U"]],
  ["left-reverse-sexy", ["L'", "U", "L", "U'"]],
  ["sledge", ["R'", "F", "R", "F'"]],
  ["hedge", ["F", "R'", "F'", "R"]],
  ["left-sledge", ["L", "F'", "L'", "F"]],
  ["left-hedge", ["F'", "L", "F", "L'"]],
  ["pair", ["R", "U2", "R'"]],
  ["antipair", ["R'", "U2", "R"]],
  ["left-pair", ["L'", "U2", "L"]],
  ["left-antipair", ["L", "U2", "L'"]],
];

function movesOf(text: string): string[] {
  return text
    .replace(/[()]/g, " ")
    .replace(/2'/g, "2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function stripTurns(moves: string[]): string[] {
  const copy = [...moves];
  const rot = /^[xyz](?:2|')?$/;
  while (copy.length && rot.test(copy[0])) copy.shift();
  while (copy.length && rot.test(copy[copy.length - 1])) copy.pop();
  return copy;
}

/** Trigger names, then leftover moves as `m:R`. Rotations at the ends are ignored. */
export function tokens(moves: string): string[] {
  const body = stripTurns(movesOf(moves));
  const out: string[] = [];
  let i = 0;
  while (i < body.length) {
    let hit: { name: string; n: number } | null = null;
    for (const [name, seq] of TRIGGERS) {
      if (seq.length <= (hit?.n ?? 0)) continue;
      if (body.slice(i, i + seq.length).join(" ") === seq.join(" ")) hit = { name, n: seq.length };
    }
    if (hit) {
      out.push(hit.name);
      i += hit.n;
    } else {
      out.push(`m:${body[i]}`);
      i += 1;
    }
  }
  return out;
}

const FAMILY: Record<string, string> = {
  sune: "sune",
  "fat-sune": "sune",
  antisune: "antisune",
  "fat-antisune": "antisune",
  sexy: "sexy",
  "reverse-sexy": "sexy",
  "left-sexy": "sexy",
  "left-reverse-sexy": "sexy",
  "front-sexy": "sexy",
  "wide-sexy": "sexy",
  "wide-sexy-back": "sexy",
  sledge: "sledge",
  hedge: "sledge",
  "left-sledge": "sledge",
  "left-hedge": "sledge",
  pair: "pair",
  antipair: "pair",
  "left-pair": "pair",
  "left-antipair": "pair",
};

function named(list: string[]): string[] {
  return list.filter((token) => !token.startsWith("m:"));
}

function takeMatch(token: string, bag: string[]): number {
  const exact = bag.indexOf(token);
  if (exact >= 0) {
    bag.splice(exact, 1);
    return 1;
  }
  const family = FAMILY[token];
  if (!family) return 0;
  const kin = bag.findIndex((other) => FAMILY[other] === family);
  if (kin >= 0) {
    bag.splice(kin, 1);
    return 0.55;
  }
  return 0;
}

/** 1 when the trigger bags match. A fat sune still counts as near a sune. */
export function closeness(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  const na = named(ta);
  const nb = named(tb);
  const bag = [...nb];
  let shared = 0;
  for (const token of na) shared += takeMatch(token, bag);
  const triggerScore = shared === 0 ? 0 : shared / Math.max(na.length, nb.length, 1);
  const ma = ta.filter((token) => token.startsWith("m:"));
  const mb = [...tb.filter((token) => token.startsWith("m:"))];
  let moveShared = 0;
  for (const token of ma) {
    const at = mb.indexOf(token);
    if (at >= 0) {
      moveShared += 1;
      mb.splice(at, 1);
    }
  }
  const moveScore = moveShared === 0 ? 0 : moveShared / Math.max(ma.length, mb.length, 1);
  return triggerScore + moveScore * 0.15;
}
