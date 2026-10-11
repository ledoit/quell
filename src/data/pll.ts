import type { AlgVariant, CaseDef } from "../types";

function a(moves: string): AlgVariant[] {
  return [{ moves, label: "SCDB" }];
}

function c(
  id: string,
  name: string,
  group: string,
  moves: string,
  twoLook = false,
): CaseDef {
  return { id: String(id), name, group, twoLook, algs: a(moves) };
}

/** SpeedCubeDB 3x3 standard algorithm and notation, 2026-10-11. */
export const PLL: CaseDef[] = [
  c("H", "H", "EPLL", "(M2 U' M2) U2 (M2 U' M2)", true),
  c("Z", "Z", "EPLL", "(M2 U) (M2 U) (M' U2) M2 (U2 M')", true),
  c("Ub", "Ub", "EPLL", "y2 (M2 U' M) U2 (M' U' M2)", true),
  c("Ua", "Ua", "EPLL", "y2 (M2 U M) U2 (M' U M2)", true),
  c("Aa", "Aa", "CPLL", "x (R' U R') D2 (R U' R') D2 R2 x'", true),
  c("Ab", "Ab", "CPLL", "x R2 D2 (R U R') D2 (R U' R) x'", true),
  c("E", "E", "CPLL", "y x' (R U' R' D) (R U R' D') (R U R' D) (R U' R' D') x", true),
  c("T", "T", "Adjacent", "(R U R' U') (R' F R2) (U' R' U') (R U R' F')"),
  c("Y", "Y", "Opposite", "F R (U' R' U') (R U R' F') (R U R' U') (R' F R F')"),
  c("F", "F", "Adjacent", "y (R' U' F') (R U R' U') R' F R2 (U' R' U') (R U R' U) R"),
  c("V", "V", "Opposite", "(R' U R' U') (R D' R' D) (R' U D') (R2 U' R2) D R2"),
  c("Ja", "Ja", "Adjacent", "y (R' U L') U2 (R U' R') U2 R L"),
  c("Jb", "Jb", "Adjacent", "(R U R' F') (R U R' U') R' F R2 U' R'"),
  c("Ra", "Ra", "Adjacent", "y (R U' R' U') (R U R D) (R' U' R D') (R' U2 R')"),
  c("Rb", "Rb", "Adjacent", "(R' U2) (R U2) (R' F R) (U R' U' R') F' R2"),
  c("Na", "Na", "Opposite", "(R U R' U) (R U R' F') (R U R' U') R' F R2 U' R' U2 (R U' R')"),
  c("Nb", "Nb", "Opposite", "(R' U R U' R') (F' U' F) (R U R') (F R' F') (R U' R)"),
  c("Ga", "Ga", "G", "R2 (U R' U R' U' R U') R2 D (U' R' U R) D'"),
  c("Gb", "Gb", "G", "(R' U' R U) D' R2 (U R' U R U' R U') R2 D"),
  c("Gc", "Gc", "G", "R2 (U' R U' R U R' U) R2 D' (U R U' R') D"),
  c("Gd", "Gd", "G", "(R U R' U') D R2 (U' R U' R' U R' U) R2 D'"),
];
