import type { CaseProfile } from "./types";

export type DiagnosisOption = {
  code: string;
  label: string;
  aliases?: string[];
};

// ICD候補（最低限）
export const DIAGNOSIS_MASTER: DiagnosisOption[] = [
  {
    code: "J18.9",
    label: "肺炎, 詳細不明",
    aliases: ["肺炎", "市中肺炎", "細菌性肺炎", "肺炎球菌肺炎"],
  },
  {
    code: "D49.6",
    label: "中枢神経系の新生物, 性状不詳",
    aliases: ["脳腫瘍"],
  },
];

// 検索用（入力→候補）
export function searchDiagnosis(query: string): DiagnosisOption[] {
  const q = query
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/　/g, "");

  if (!q) return [];

  return DIAGNOSIS_MASTER.filter((d) => {
    const label = d.label.toLowerCase().replace(/\s+/g, "");
    const code = d.code.toLowerCase();

    const aliasMatch = d.aliases?.some((a) =>
      a.toLowerCase().replace(/\s+/g, "").includes(q)
    );

    return (
      label.includes(q) ||
      code.startsWith(q) ||
      aliasMatch
    );
  }).slice(0, 10);
}

// 診断判定（コードベース）
export function judgeDiagnosis(
  _caseProfile: CaseProfile,
  selectedCode: string
): { ok: boolean; code: string } {
  // 今回は肺炎が正解
  const ok = selectedCode.startsWith("J18");

  return {
    ok,
    code: selectedCode,
  };
}