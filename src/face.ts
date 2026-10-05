import type { LlStickers } from "./ll";

const c0 = 14.7;
const c1 = 50;
const c2 = 85.3;
const edgePt = [
  { x: c1, y: c2 },
  { x: c2, y: c1 },
  { x: c1, y: c0 },
  { x: c0, y: c1 },
];
const cornerPt = [
  { x: c2, y: c2 },
  { x: c2, y: c0 },
  { x: c0, y: c0 },
  { x: c0, y: c2 },
];

type Pt = { x: number; y: number };

function cycles(perm: number[]): number[][] {
  const seen = new Set<number>();
  const out: number[][] = [];
  for (let i = 0; i < perm.length; i++) {
    if (seen.has(i) || perm[i] === i) continue;
    const cycle: number[] = [];
    let cur = i;
    while (!seen.has(cur)) {
      seen.add(cur);
      cycle.push(cur);
      cur = perm[cur];
    }
    if (cycle.length > 1) out.push(cycle);
  }
  return out;
}

function arrow(from: Pt, to: Pt, bend: number): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bend;
  const cy = my + (dx / len) * bend;
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

function arrowMarkup(perm: number[], pts: Pt[], marker: string, bendBase: number): string {
  const parts: string[] = [];
  for (const cycle of cycles(perm)) {
    const bend = cycle.length === 2 ? 0 : bendBase;
    for (let i = 0; i < cycle.length; i++) {
      const a = pts[cycle[i]];
      const b = pts[cycle[(i + 1) % cycle.length]];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const pull = cycle.length === 2 ? 7 : 5;
      const from = { x: a.x + (dx / len) * pull, y: a.y + (dy / len) * pull };
      const to = { x: b.x - (dx / len) * pull, y: b.y - (dy / len) * pull };
      parts.push(
        `<path d="${arrow(from, to, bend)}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" marker-end="url(#${marker})"/>`,
      );
    }
  }
  return parts.join("");
}

function tiles(on: boolean[]): string {
  return on.map((lit) => `<i class="${lit ? "on" : ""}"></i>`).join("");
}

/** Top face only. OLL is yellow against empty. PLL is yellow plus the perm arrows. */
export function faceHtml(ll: LlStickers | undefined, set: "oll" | "pll", markerKey: string): string {
  if (!ll) return `<div class="face">${tiles(Array(9).fill(false))}</div>`;
  if (set === "oll") return `<div class="face">${tiles(ll.u.map((hue) => hue === "Y"))}</div>`;
  const marker = `mk-${markerKey.replace(/[^a-z0-9]/gi, "")}`;
  return `<div class="face perm">${tiles(Array(9).fill(true))}<svg viewBox="0 0 100 100" aria-hidden="true"><defs><marker id="${marker}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse"><path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="currentColor"/></marker></defs>${arrowMarkup(ll.edgePerm, edgePt, marker, 9)}${arrowMarkup(ll.cornerPerm, cornerPt, marker, 11)}</svg></div>`;
}
