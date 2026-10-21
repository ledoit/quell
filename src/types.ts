export type SetId = "oll" | "pll" | "f2l";

export type SkillId = "basic" | "wide" | "front" | "extract" | "splitter";

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
  skill?: SkillId;
  caption?: string;
  reach?: string;
  open?: boolean;
};
