export type Speaker = "SYSTEM" | "DOCTOR" | "PATIENT";

export type ChatMessage = {
  id: string;
  speaker: Speaker;
  text: string;
  ts: number;
  color?: string;
};

export type Stats = {
  trust: number;       // 距離
  validation: number;  // ノリ
  defense: number;     // ガード
  openness: number;    // 深度
  condition: number;   // 体調
};

export type Flags = Record<string, boolean | number | string>;

export type AiReplyContext = {
  enabled: boolean;
  userQuestion: string;
  baseReply: string;
  topic?: string;
  detail?: string;
  stats: {
    trust: number;
    validation: number;
    defense: number;
    openness: number;
    condition: number;
  };
  facts: string[];
  constraints: string[];
};

export type EndingId =
  | "normal_pneumonia"
  | "admission_condition"
  | "admission_time"
  | "trust_break"
  | "misdiagnosis"
  | "father_truth"
  | "honeytrap_scam"
  | "soccer_end";

export type DiagnosisCategory =
  | "all"
  | "respiratory"
  | "infection"
  | "urinary"
  | "digestive"
  | "cardiovascular"
  | "neurology"
  | "endocrine"
  | "hematology"
  | "ent"
  | "musculoskeletal"
  | "mental"
  | "other";

export type DiagnosisOption = {
  code: string;
  label: string;
  aliases?: string[];
};

export type TestKey =
  | "VITAL_SET"
  | "CHEST_AUSCULTATION"
  | "THROAT_EXAM"
  | "NASAL_EXAM"
  | "CERVICAL_LN"
  | "CHEST_EXPANSION"
  | "CHEST_PERCUSSION"
  | "CBC"
  | "WBC_DIFF"
  | "PT"
  | "APTT"
  | "FIBRINOGEN"
  | "FDP"
  | "D_DIMER"
  | "CRP"
  | "AST"
  | "ALT"
  | "LDH"
  | "CR"
  | "BUN"
  | "ALP"
  | "GGT"
  | "CK"
  | "NA"
  | "K"
  | "CL"
  | "GLU"
  | "KL_6"
  | "SP_D"
  | "NT_PROBNP"
  | "CXR"
  | "ECG"
  | "CEA"
  | "CA19_9"
  | "PSA"
  | "AFP"
  | "ANA"
  | "RF"
  | "ANCA"
  | "ANTI_CCP"
  | "TSH"
  | "FT4"
  | "CORTISOL"
  | "HBA1C"
  | "UA_QUAL"
  | "UA_SEDIMENT"
  | "INFLUENZA_RAPID"
  | "COVID_ANTIGEN"
  | "SPUTUM_GRAM"
  | "SPUTUM_CULTURE"
  | "BLOOD_CULTURE"
  | "LEGIONELLA_URINARY_ANTIGEN"
| "LEGIONELLA_LAMP"
| "MYCOPLASMA_ANTIGEN"
| "MYCOPLASMA_LAMP"
| "BIOFIRE_SPOTFIRE_R_PANEL"
| "CMV_ANTIGENEMIA"
| "ASPERGILLUS_ANTIGEN"
| "ASPERGILLUS_IGG"
| "HBS_AG"
| "HCV_AB"
| "HIV_1_2"
| "TP_AB"
| "RPR"
| "HSV_IGG"
| "HSV_IGM"
| "EBV_IGG"
| "EBV_IGM"
| "EBNA"
| "VZV_IGG"
| "VZV_IGM"
| "SPUTUM_AFB_SMEAR"
| "SPUTUM_AFB_CULTURE"
| "URINE_GRAM"
| "URINE_CULTURE"
| "URINE_AFB_SMEAR"
| "URINE_AFB_CULTURE"
| "BLOOD_CULTURE_2SET"
// 画像
| "AXR"
| "CT_HEAD"
| "CT_CHEST"
| "CT_ABDOMEN"
| "CT_PELVIS"
| "CECT_HEAD"
| "CECT_CHEST"
| "CECT_ABDOMEN"
| "CECT_PELVIS"

// 生理
| "PULMONARY_FUNCTION_TEST"
| "FENO"
| "ECHO_HEART"
| "ECHO_ABDOMEN"

// 感染症（院内結果あり）
| "PNEUMOCOCCAL_URINARY_ANTIGEN"
| "INFLUENZA_ANTIGEN"
| "COVID_ANTIGEN_QUANT"
| "PERTUSSIS_PCR"

// 感染症（外注）
| "CHLAMYDIA_PNEUMONIAE_IGM"
| "CHLAMYDIA_PNEUMONIAE_IGA"
| "CHLAMYDIA_PNEUMONIAE_IGG"
| "MEASLES_IGM"
| "MEASLES_IGG"
| "RUBELLA_IGM"
| "RUBELLA_IGG"
| "MUMPS_IGM"
| "MUMPS_IGG"

// 血液
| "PCT"
| "BETA_D_GLUCAN"

// 腫瘍マーカー
| "SCC"
| "PRO_GRP"
| "NSE"
| "CYFRA"
| "SIL2R"

// 生化学 追加
| "CA"
| "IP"
| "MG"
| "TBIL"
| "DBIL"
| "AMMONIA"
| "TCHO"
| "HDL_C"
| "LDL_C"
| "TG"
| "UA"
| "FE"
| "TIBC"
| "UIBC"
| "FERRITIN"
| "TP"
| "ALB"

// 内分泌（外注）
| "ACTH"
| "CORTISOL"
| "RENIN_ACTIVITY"
| "RENIN_CONCENTRATION"
| "ALDOSTERONE"
| "ADH"
| "PTH_INTACT"
| "PTHRP"
| "CALCITONIN"
| "INSULIN"
| "GROWTH_HORMONE"

// 自己抗体・免疫（外注）
| "ANTI_DS_DNA_IGG"
| "ANTI_SS_DNA_IGG"
| "ANTI_SS_A"
| "ANTI_SS_B"
| "ANTI_RNP"
| "ANTI_SCL70"
| "ANTI_JO1"
| "ANTI_ARS"
| "ANTI_MDA5"
| "ANTI_MI2"
| "ANTI_TIF1_GAMMA"
| "ANTI_CENTROMERE"
| "MPO_ANCA"
| "PR3_ANCA"
| "ANTI_GBM"
| "ANTI_GM_CSF"
| "IGG"
| "IGG4"
| "IGA"
| "IGM"
| "IGE"
| "C3"
| "C4"
| "CH50";

export type TestCategory =
  | "vital"
  | "physical"
  | "blood"
  | "image"
  | "physiology"
  | "tumor"
  | "autoantibody"
  | "endocrine"
  | "urine"
  | "infection"
  | "culture";

export type TestResult = {
  key: TestKey;
  label: string;
  category: TestCategory;
  minutes: number;
  resultText: string;
};

export type CaseProfile = {
  id: string;
  title: string;
  season: string;
  patientCard: {
    age: number;
    sex: "M" | "F";
    summary: string;
  };
  truth: {
    diagnosis: string;
  };
  initialStats: Stats;
  initialFlags: Flags;
  tests: Record<TestKey, TestResult>;
  teachingPoints: string[];
};