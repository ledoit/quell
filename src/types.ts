export type SetId = "oll" | "pll";

export type AlgVariant = {
  moves: string;
  label: string;
  notes?: string;
};

export type CaseDef = {
  id: string;
  name: string;
  group: string;
  twoLook?: boolean;
  algs: AlgVariant[];
};
