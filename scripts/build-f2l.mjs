import { readFileSync, writeFileSync } from "node:fs";
import { Alg } from "cubing/alg";
import { cube3x3x3 } from "cubing/puzzles";

const SCRAPE = String.raw`C:\Users\Phil\.cursor\projects\c-Users-Phil-Philippe\agent-tools\fc42e3fd-0d4d-433f-a72b-1f22dffd12a2.txt`;
const CORNER_COLS = [["W","R","G"],["W","B","R"],["W","O","B"],["W","G","O"],["Y","G","R"],["Y","O","G"],["Y","B","O"],["Y","R","B"]];
const EDGE_COLS = [["W","G"],["W","R"],["W","B"],["W","O"],["Y","G"],["Y","R"],["Y","B"],["Y","O"],["G","R"],["G","O"],["B","R"],["B","O"]];
const CENTER_COLS = ["W","O","G","R","B","Y"];
const GROUPS = ["",
  "Free Pairs","Free Pairs","Free Pairs","Free Pairs",
  "Disconnected Pairs","Disconnected Pairs","Disconnected Pairs","Disconnected Pairs","Disconnected Pairs","Disconnected Pairs",
  "Connected Pairs","Connected Pairs","Connected Pairs","Connected Pairs","Connected Pairs","Connected Pairs","Connected Pairs","Connected Pairs",
  "Disconnected Pairs","Disconnected Pairs","Disconnected Pairs","Disconnected Pairs",
  "Connected Pairs","Connected Pairs",
  "Corner In Slot","Corner In Slot","Corner In Slot","Corner In Slot","Corner In Slot","Corner In Slot",
  "Edge In Slot","Edge In Slot","Edge In Slot","Edge In Slot","Edge In Slot","Edge In Slot",
  "Pieces In Slot","Pieces In Slot","Pieces In Slot","Pieces In Slot","Pieces In Slot",
];
const ALLOWED = new Set(["U","R","L","r","l","M"]);
const SLOTS = ["FR","FL","BR","BL"];
const SLOT = {
  FR: { faces: ["F","R"], corner: 4, edge: 8 },
  FL: { faces: ["F","L"], corner: 5, edge: 9 },
  BR: { faces: ["B","R"], corner: 7, edge: 10 },
  BL: { faces: ["B","L"], corner: 6, edge: 11 },
};

const tokens = (alg) => alg.match(/[A-Za-z](?:2'|2|')?/g) ?? [];
const flat = (alg) => alg.replace(/[()]/g, " ").replace(/2'/g, "2").replace(/\s+/g, " ").trim();
const isRot = (token) => /^[xyz](?:2|')?$/.test(token);
const legal = (alg) => { const list = tokens(flat(alg)); return list.length > 0 && list.every((token) => ALLOWED.has(token[0])); };
const lengthOf = (alg) => tokens(flat(alg)).length;
const hasDouble = (alg) => tokens(flat(alg)).some((token) => ["R2","L2","r2","l2"].includes(token));
const hasWide = (alg) => tokens(flat(alg)).some((token) => "rlM".includes(token[0]));
const usesFB = (alg) => tokens(alg).some((token) => "FBfb".includes(token[0]));

function sticker(pattern, orbit, loc, slot) {
  const data = pattern.patternData[orbit];
  const piece = data.pieces[loc];
  const ori = data.orientation[loc];
  const n = orbit === "CORNERS" ? 3 : orbit === "EDGES" ? 2 : 1;
  const src = (slot - ori + n * 8) % n;
  if (orbit === "CORNERS") return CORNER_COLS[piece][src];
  if (orbit === "EDGES") return EDGE_COLS[piece][src];
  return CENTER_COLS[piece];
}
function stateKey(pattern) {
  return ["CORNERS","EDGES","CENTERS"].map((orbit) => {
    const data = pattern.patternData[orbit];
    return `${[...data.pieces].join(",")}:${[...data.orientation].join(",")}`;
  }).join("|");
}
function parseCases(text) {
  const parts = text.split(/\r?\n## F2L (\d+)\s*\r?\n/);
  const cases = [];
  for (let i = 1; i < parts.length; i += 2) {
    const algs = [];
    for (const line of parts[i + 1].split(/\r?\n/)) {
      if (line.startsWith("- ") && !line.startsWith("- More")) {
        const alg = flat(line.slice(2).trim());
        if (alg && !/^more/i.test(alg)) algs.push(alg);
      }
    }
    cases.push({ num: Number(parts[i]), algs });
  }
  return cases;
}

const kp = await cube3x3x3.kpuzzle();
const home = kp.defaultPattern().applyAlg("z2");
const homeKey = stateKey(home);
const centerFace = {};
for (const [loc, face] of [[0,"U"],[1,"L"],[2,"F"],[3,"R"],[4,"B"],[5,"D"]]) {
  centerFace[sticker(home, "CENTERS", loc, 0)] = face;
}
const cornerFace = Array.from({ length: 8 }, (_, loc) => [0,1,2].map((slot) => centerFace[sticker(home, "CORNERS", loc, slot)]));
const edgeFace = Array.from({ length: 12 }, (_, loc) => [0,1].map((slot) => centerFace[sticker(home, "EDGES", loc, slot)]));

const ROTS = [];
for (const tilt of ["", "x", "x2", "x'", "z", "z'"]) {
  for (const spin of ["", "y", "y2", "y'"]) ROTS.push([tilt, spin].filter(Boolean).join(" "));
}
const rotByKey = new Map(ROTS.map((rot) => [stateKey(rot ? home.applyAlg(rot) : home), rot]));
const gens = [];
for (const face of ["U","D","F","B","R","L","u","d","f","b","r","l","M","E","S"]) gens.push(face, `${face}'`, `${face}2`);
const genByKey = new Map(gens.map((gen) => [stateKey(home.applyAlg(gen)), gen]));

function compose(pending, token) {
  const seq = [pending, token].filter(Boolean).join(" ");
  const hit = rotByKey.get(stateKey(home.applyAlg(seq)));
  if (hit === undefined) throw new Error(`rotation ${seq} left the 24`);
  return hit;
}
function conjugate(pending, token) {
  if (!pending) return token;
  const inv = new Alg(pending).invert().toString();
  const hit = genByKey.get(stateKey(home.applyAlg(`${pending} ${token} ${inv}`)));
  if (!hit) throw new Error(`no face for ${pending} ${token}`);
  return hit;
}
function expandAlg(alg) {
  let pending = "";
  const out = [];
  for (const token of tokens(flat(alg))) {
    if (isRot(token)) pending = compose(pending, token);
    else out.push(conjugate(pending, token));
  }
  return out.join(" ");
}

function findPiece(pattern, orbit, piece) {
  const pieces = pattern.patternData[orbit].pieces;
  for (let loc = 0; loc < pieces.length; loc++) if (pieces[loc] === piece) return loc;
  return -1;
}
function crossOk(pattern) {
  for (const loc of [4, 5, 6, 7]) {
    if (pattern.patternData.EDGES.pieces[loc] !== home.patternData.EDGES.pieces[loc]) return false;
    if (pattern.patternData.EDGES.orientation[loc] !== home.patternData.EDGES.orientation[loc]) return false;
  }
  return true;
}
function othersOk(pattern, slot) {
  for (const other of SLOTS) {
    if (other === slot) continue;
    const spec = SLOT[other];
    const corner = home.patternData.CORNERS.pieces[spec.corner];
    const edge = home.patternData.EDGES.pieces[spec.edge];
    const cLoc = findPiece(pattern, "CORNERS", corner);
    const eLoc = findPiece(pattern, "EDGES", edge);
    if (cLoc !== spec.corner || eLoc !== spec.edge) return false;
    if (pattern.patternData.CORNERS.orientation[cLoc] !== home.patternData.CORNERS.orientation[spec.corner]) return false;
    if (pattern.patternData.EDGES.orientation[eLoc] !== home.patternData.EDGES.orientation[spec.edge]) return false;
  }
  return true;
}
function localFace(face, slot) {
  const [a, b] = SLOT[slot].faces;
  const opp = { F: "B", B: "F", R: "L", L: "R" };
  if (face === "U" || face === "D") return face;
  if (face === a) return "A";
  if (face === b) return "B";
  if (face === opp[a]) return "a";
  if (face === opp[b]) return "b";
  return face;
}
function normSig(pattern, slot) {
  const spec = SLOT[slot];
  const [faceA, faceB] = spec.faces;
  const role = {};
  role[sticker(home, "CENTERS", 5, 0)] = "D";
  role[sticker(home, "CENTERS", { F: 2, R: 3, B: 4, L: 1 }[faceA], 0)] = "A";
  role[sticker(home, "CENTERS", { F: 2, R: 3, B: 4, L: 1 }[faceB], 0)] = "B";
  const cornerPiece = home.patternData.CORNERS.pieces[spec.corner];
  const edgePiece = home.patternData.EDGES.pieces[spec.edge];
  const cLoc = findPiece(pattern, "CORNERS", cornerPiece);
  const eLoc = findPiece(pattern, "EDGES", edgePiece);
  if (cLoc < 0 || eLoc < 0) return "";
  const corner = [0,1,2].map((index) => `${localFace(cornerFace[cLoc][index], slot)}=${role[sticker(pattern, "CORNERS", cLoc, index)] ?? "?"}`);
  const edge = [0,1].map((index) => `${localFace(edgeFace[eLoc][index], slot)}=${role[sticker(pattern, "EDGES", eLoc, index)] ?? "?"}`);
  const placed = cLoc === spec.corner || eLoc === spec.edge ? "in" : "out";
  return `${placed}|${corner.sort().join(",")}|${edge.sort().join(",")}`;
}
function picture(alg) {
  return home.applyAlg(new Alg(flat(alg)).invert().toString());
}
function affected(pattern) {
  return SLOTS.filter((slot) => {
    const spec = SLOT[slot];
    const corner = home.patternData.CORNERS.pieces[spec.corner];
    const edge = home.patternData.EDGES.pieces[spec.edge];
    const cLoc = findPiece(pattern, "CORNERS", corner);
    const eLoc = findPiece(pattern, "EDGES", edge);
    return cLoc !== spec.corner || eLoc !== spec.edge
      || pattern.patternData.CORNERS.orientation[cLoc] !== home.patternData.CORNERS.orientation[spec.corner]
      || pattern.patternData.EDGES.orientation[eLoc] !== home.patternData.EDGES.orientation[spec.edge];
  });
}

function captionFor(skill, alg, reach) {
  if (skill === "basic") return lengthOf(alg) <= 4 ? "3-move" : "Duck";
  if (skill === "wide") return "Wide insert";
  if (skill === "front") return reach && /R' F|F R'|F' R|R F'/.test(reach) ? "Sledgehammer" : "Front insert";
  if (skill === "extract") return hasDouble(alg) ? "R2 extract" : hasWide(alg) ? "Wide extract" : "Extract";
  return hasDouble(alg) ? "R2 setup" : "Setup";
}
function skillOf(alg, reach, slotCase) {
  if (slotCase) return "extract";
  if (hasWide(alg)) return "wide";
  if (hasDouble(alg)) return "splitter";
  if (reach && usesFB(reach)) return "front";
  const faces = new Set(tokens(flat(alg)).map((token) => token[0]));
  const plain = [...faces].every((face) => "URL".includes(face));
  if (plain && lengthOf(alg) <= 8) return "basic";
  return "splitter";
}
function pick(list, slotCase) {
  const shortest = Math.min(...list.map((item) => item.length));
  let pool = list.filter((item) => item.length === shortest);
  if (slotCase) {
    const doubled = list.filter((item) => hasDouble(item.alg) && item.length <= shortest + 2);
    if (doubled.length) pool = doubled;
  }
  const family = pool.find((item) => item.alg.includes("r' U' R U M'") || item.alg.includes("l U L' U' M'"));
  if (family) return family;
  pool.sort((a, b) => a.index - b.index || a.length - b.length);
  return pool[0];
}

const scraped = parseCases(readFileSync(SCRAPE, "utf8"));
if (scraped.length !== 41) throw new Error(`expected 41, got ${scraped.length}`);

const records = [];
for (const entry of scraped) {
  const expanded = entry.algs.map((alg) => expandAlg(alg));
  const pub = expanded[0];
  const drawn = picture(pub);
  const slots = affected(drawn);
  const slot = slots.length === 1 ? slots[0] : "FR";
  const canon = normSig(drawn, slot);
  const reach = usesFB(pub) ? pub : undefined;
  const inPlace = canon.startsWith("in");
  const pool = [];
  expanded.forEach((alg, index) => {
    if (!legal(alg) || !crossOk(picture(alg))) return;
    const hits = affected(picture(alg));
    if (hits.length !== 1) return;
    if (normSig(picture(alg), hits[0]) !== canon) return;
    if (!othersOk(picture(alg), hits[0])) return;
    pool.push({ alg, index, length: lengthOf(alg), slot: hits[0] });
  });
  const sameSlot = pool.filter((item) => item.slot === slot);
  const winner = sameSlot.length ? pick(sameSlot, inPlace) : pool.length ? pick(pool, inPlace) : null;
  const open = !winner;
  const homeSlot = winner?.slot ?? slot;
  const stored = winner?.alg ?? pub;
  const skill = skillOf(stored, reach, inPlace);
  const rows = [];
  const bySlot = new Map();
  for (const item of pool) {
    const prior = bySlot.get(item.slot);
    if (!prior || item.length < prior.length || (item.length === prior.length && item.index < prior.index)) bySlot.set(item.slot, item);
  }
  if (winner) bySlot.set(winner.slot, winner);
  else bySlot.set(slot, { alg: pub, slot, length: lengthOf(pub), index: -1 });
  for (const name of [homeSlot, ...SLOTS.filter((item) => item !== homeSlot)]) {
    const item = bySlot.get(name);
    if (!item) continue;
    rows.push({ slot: name, moves: item.alg });
  }
  records.push({
    num: entry.num,
    group: GROUPS[entry.num],
    skill,
    caption: captionFor(skill, rows[0].moves, reach),
    reach,
    open,
    rows,
    slot,
  });
  console.log(String(entry.num).padStart(2), skill.padEnd(9), open ? "OPEN" : "    ", slot, records.at(-1).caption.padEnd(16), rows.map((row) => row.slot).join(""), "|", rows[0].moves);
}

const tally = {};
for (const record of records) tally[record.skill] = (tally[record.skill] ?? 0) + 1;
console.log(tally);
for (const skill of ["basic","wide","front","extract","splitter"]) {
  console.log(skill, records.filter((record) => record.skill === skill).map((record) => record.num).join(","));
}

const body = records.map((record) => {
  const algs = record.rows.map((row) => `    { moves: ${JSON.stringify(row.moves)}, label: ${JSON.stringify(row.slot)} },`).join("\n");
  const reach = record.reach ? `\n    reach: ${JSON.stringify(record.reach)},` : "";
  const open = record.open ? `\n    open: true,` : "";
  return `  {
    id: ${JSON.stringify(String(record.num))},
    name: ${JSON.stringify(`F2L ${record.num}`)},
    group: ${JSON.stringify(record.group)},
    skill: ${JSON.stringify(record.skill)},
    caption: ${JSON.stringify(record.caption)},${reach}${open}
    algs: [
${algs}
    ],
  },`;
}).join("\n");

writeFileSync(new URL("../src/data/f2l.ts", import.meta.url), `import type { CaseDef } from "../types";

/** SpeedCubeDB F2L. Each case keeps the public pair picture. A legal line replaces it only when that line solves the same picture. */
export const F2L: CaseDef[] = [
${body}
];
`);
console.log("wrote", records.filter((record) => record.open).length, "open");
