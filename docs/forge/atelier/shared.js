/* Unsigned atelier data. PLL diagrams are the case perms (yellow face + arrows). */
(function () {
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

  function cycles(perm) {
    const seen = new Set();
    const out = [];
    for (let i = 0; i < perm.length; i++) {
      if (seen.has(i) || perm[i] === i) continue;
      const cycle = [];
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

  function arrow(from, to, bend) {
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const cx = mx - (dy / len) * bend;
    const cy = my + (dx / len) * bend;
    return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
  }

  function arrows(perm, pts, id, bendBase) {
    const parts = [];
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
          `<path d="${arrow(from, to, bend)}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" marker-end="url(#${id})"/>`,
        );
      }
    }
    return parts.join("");
  }

  function permFace(edgePerm, cornerPerm, id) {
    const mid = `mk-${id}`;
    const tiles = Array.from({ length: 9 }, () => `<i class="y"></i>`).join("");
    return `<div class="face perm">${tiles}<svg viewBox="0 0 100 100" aria-hidden="true">
      <defs><marker id="${mid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse"><path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="currentColor"/></marker></defs>
      ${arrows(edgePerm, edgePt, mid, 9)}${arrows(cornerPerm, cornerPt, mid, 11)}
    </svg></div>`;
  }

  const pll = [
    { id: "Aa", letter: "A", edges: [0, 1, 2, 3], corners: [2, 0, 1, 3], moves: "x R' U R' D2 R U' R' D2 R2 x'" },
    { id: "Ab", letter: "A", edges: [0, 1, 2, 3], corners: [1, 2, 0, 3], moves: "x R2 D2 R U R' D2 R U' R x'" },
    { id: "E", letter: "E", edges: [0, 1, 2, 3], corners: [3, 2, 1, 0], moves: "x (U R' U' L) (U R U' L') (U R U' L) (U R' U' L') x'" },
    { id: "F", letter: "F", edges: [2, 1, 0, 3], corners: [1, 0, 2, 3], moves: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
    { id: "Ga", letter: "G", edges: [1, 3, 0, 2], corners: [1, 0, 2, 3], moves: "R2 U R' U R' U' R U' R2 U' D R' U R D'" },
    { id: "Gb", letter: "G", edges: [2, 0, 3, 1], corners: [1, 0, 2, 3], moves: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
    { id: "Gc", letter: "G", edges: [2, 3, 1, 0], corners: [1, 0, 2, 3], moves: "R2 U' R U' R U R' U R2 U D' R U' R' D" },
    { id: "Gd", letter: "G", edges: [3, 2, 0, 1], corners: [1, 0, 2, 3], moves: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },
    { id: "H", letter: "H", edges: [2, 3, 0, 1], corners: [0, 1, 2, 3], moves: "(M2 U M2) U2 (M2 U M2)" },
    { id: "Ja", letter: "J", edges: [3, 1, 2, 0], corners: [0, 1, 3, 2], moves: "L' U' L F (L' U' L U) L F' L2 U L U" },
    { id: "Jb", letter: "J", edges: [1, 0, 2, 3], corners: [1, 0, 2, 3], moves: "R U R' F' (R U R' U') R' F R2 U' R' U'" },
    { id: "Na", letter: "N", edges: [0, 3, 2, 1], corners: [0, 3, 2, 1], moves: "(R U R' U) (R U R' F') (R U R' U') R' F R2 U' R' U2 (R U' R')" },
    { id: "Nb", letter: "N", edges: [0, 3, 2, 1], corners: [2, 1, 0, 3], moves: "(R' U R U') R' (F' U' F) (R U R' F) R' F' (R U' R)" },
    { id: "Ra", letter: "R", edges: [3, 1, 2, 0], corners: [0, 2, 1, 3], moves: "(L U2 L') U2 L F' (L' U' L U) L F L2 U" },
    { id: "Rb", letter: "R", edges: [1, 0, 2, 3], corners: [0, 2, 1, 3], moves: "(R' U2 R) U2 R' F (R U R' U') R' F' R2 U'" },
    { id: "T", letter: "T", edges: [0, 3, 2, 1], corners: [1, 0, 2, 3], moves: "(R U R' U') R' F R2 U' R' U' R U R' F'" },
    { id: "Ua", letter: "U", edges: [0, 3, 1, 2], corners: [0, 1, 2, 3], moves: "(R' U R' U') R' U' (R' U R) U R2" },
    { id: "Ub", letter: "U", edges: [0, 2, 3, 1], corners: [0, 1, 2, 3], moves: "R2 U' (R' U' R) U R U (R U' R)" },
    { id: "V", letter: "V", edges: [0, 2, 1, 3], corners: [2, 1, 0, 3], moves: "R' U R' U' R D' R' D R' U D' R2 U' R2 D R2" },
    { id: "Y", letter: "Y", edges: [0, 1, 3, 2], corners: [2, 1, 0, 3], moves: "(F R U' R') U' (R U R' F') (R U R' U') (R' F R F')" },
    { id: "Z", letter: "Z", edges: [1, 0, 3, 2], corners: [0, 1, 2, 3], moves: "M2 U M2 U M' U2 M2 U2 M'" },
  ];

  const oll = [
    { id: "oll7", label: "OLL 7", bits: "001110100", moves: "(r U R' U) R U2 r'" },
    { id: "oll8", label: "OLL 8", bits: "001011001", moves: "r' U' R U' R' U2 r" },
    { id: "oll11", label: "OLL 11", bits: "001110010", moves: "(r U R' U) (R' F R F') R U2 r'" },
    { id: "oll12", label: "OLL 12", bits: "010111001", moves: "F (R U R' U') F' U F (R U R' U') F'" },
  ];

  const letters = ["A", "E", "F", "G", "H", "J", "N", "R", "T", "U", "V", "Y", "Z"];

  window.QuellAtelier = { permFace, pll, oll, letters };
})();
