import type { Flags } from "./types";

export type ObjectiveItem = {
  id: string;
  label: string;
  weight: number;
  achieved: (flags: Flags) => boolean;
};

export const case01Objectives: ObjectiveItem[] = [
  {
    id: "obj_duration",
    label: "発症時期・経過",
    weight: 3,
    achieved: (flags) => !!flags.asked_duration,
  },
  {
    id: "obj_sputum",
    label: "痰の有無・性状",
    weight: 3,
    achieved: (flags) => !!flags.asked_sputum,
  },
  {
    id: "obj_chills",
    label: "悪寒・寒気",
    weight: 2,
    achieved: (flags) => !!flags.asked_chills,
  },
  {
    id: "obj_chest_pain",
    label: "胸痛・呼吸時痛",
    weight: 2,
    achieved: (flags) => !!flags.asked_chest_pain,
  },
  {
    id: "obj_dyspnea",
    label: "息切れ・呼吸苦",
    weight: 2,
    achieved: (flags) => !!flags.asked_dyspnea,
  },
  {
    id: "obj_rhinorrhea",
    label: "鼻症状",
    weight: 1,
    achieved: (flags) => !!flags.asked_rhinorrhea,
  },
  {
    id: "obj_sore_throat",
    label: "咽頭症状",
    weight: 1,
    achieved: (flags) => !!flags.asked_sore_throat,
  },
  {
    id: "obj_appetite",
    label: "食欲低下",
    weight: 1,
    achieved: (flags) => !!flags.asked_appetite,
  },
  {
    id: "obj_contact",
    label: "周囲の風邪症状・接触歴",
    weight: 2,
    achieved: (flags) => !!flags.asked_contact,
  },
  {
    id: "obj_past_history",
    label: "既往歴",
    weight: 2,
    achieved: (flags) => !!flags.asked_past_history,
  },
  {
    id: "obj_medications",
    label: "常用薬・内服薬",
    weight: 2,
    achieved: (flags) => !!flags.asked_medications,
  },
  {
    id: "obj_allergy",
    label: "アレルギー",
    weight: 2,
    achieved: (flags) => !!flags.asked_allergy,
  },
  {
    id: "obj_smoking",
    label: "喫煙歴",
    weight: 3,
    achieved: (flags) => !!flags.asked_smoking,
  },
  {
    id: "obj_vaccine",
    label: "ワクチン歴",
    weight: 2,
    achieved: (flags) => !!flags.asked_vaccine,
  },

  // ここから下は“意味深な指標”として混ぜておく
  {
    id: "obj_soccer",
    label: "雑談の入口（サッカー）",
    weight: 1,
    achieved: (flags) => !!flags.talked_soccer,
  },
  {
    id: "obj_father",
    label: "家族背景の入口",
    weight: 1,
    achieved: (flags) => !!flags.mentioned_father,
  },
];

export function calcObjectiveScore(flags: Flags) {
  const total = case01Objectives.reduce((sum, obj) => sum + obj.weight, 0);
  const achievedWeight = case01Objectives.reduce((sum, obj) => {
    return sum + (obj.achieved(flags) ? obj.weight : 0);
  }, 0);

  const percent = total > 0 ? Math.round((achievedWeight / total) * 100) : 0;

  return {
    total,
    achievedWeight,
    percent,
    items: case01Objectives.map((obj) => ({
      id: obj.id,
      label: obj.label,
      weight: obj.weight,
      done: obj.achieved(flags),
    })),
  };
}