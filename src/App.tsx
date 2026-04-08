import React, { useMemo, useState, useEffect, useCallback } from "react";
import { case01 } from "./data/case01";
import type {
  ChatMessage,
  DiagnosisCategory,
  DiagnosisOption,
  EndingId,
  Flags,
  Stats,
  TestCategory,
  TestKey,
  TestResult,
} from "./logic/types";
import { StatBar } from "./ui/StatBar";
import { ChatLog } from "./ui/ChatLog";
import { patientReplyEngine } from "./logic/patientEngine";
import { getTest } from "./logic/tests";
import {
  compareIcdCode,
  DIAGNOSIS_CATEGORY_TABS,
  ICD_MASTER,
  inferDiagnosisCategory,
} from "./logic/icdMaster";

function uid() {
  return Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function formatClock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SPECIAL_SCAM_OPTION: DiagnosisOption = {
  code: "SPECIAL_SCAM",
  label: "恋の病",
  aliases: ["詐欺", "美人局", "ハニートラップ", "いただき女子"],
};

const CATEGORY_LABELS: Record<TestCategory, string> = {
  vital: "バイタルサイン",
  physical: "身体診察",
  blood: "血液検査",
  image: "画像検査",
  physiology: "生理学的検査",
  tumor: "腫瘍マーカー",
  autoantibody: "自己抗体",
  endocrine: "内分泌",
  urine: "尿検査",
  infection: "感染症",
  culture: "培養検査",
};

const CATEGORY_KEYS: Record<TestCategory, TestKey[]> = {
  vital: ["VITAL_SET"],
  physical: [
    "CHEST_AUSCULTATION",
    "THROAT_EXAM",
    "NASAL_EXAM",
    "CERVICAL_LN",
    "CHEST_EXPANSION",
    "CHEST_PERCUSSION",
  ],
  blood: [
    "CBC",
    "WBC_DIFF",
    "PT",
    "APTT",
    "FIBRINOGEN",
    "FDP",
    "D_DIMER",
    "CRP",
    "AST",
    "ALT",
    "LDH",
    "CR",
    "BUN",
    "ALP",
    "GGT",
    "CK",
    "NA",
    "K",
    "CL",
    "GLU",
    "KL_6",
    "SP_D",
    "NT_PROBNP",
  ],
  image: [
  "CXR",
  "AXR",
  "CT_HEAD",
  "CT_CHEST",
  "CT_ABDOMEN",
  "CT_PELVIS",
  "CECT_HEAD",
  "CECT_CHEST",
  "CECT_ABDOMEN",
  "CECT_PELVIS",
],
physiology: [
  "ECG",
  "PULMONARY_FUNCTION_TEST",
  "FENO",
  "ECHO_HEART",
  "ECHO_ABDOMEN",
],
  tumor: ["CEA", "CA19_9", "PSA", "AFP"],
  autoantibody: ["ANA", "RF", "ANCA", "ANTI_CCP"],
  endocrine: ["TSH", "FT4", "CORTISOL", "HBA1C"],

  urine: ["UA_QUAL", "UA_SEDIMENT"],
  infection: [
    "INFLUENZA_RAPID",
    "COVID_ANTIGEN",
    "SPUTUM_GRAM",
  ],
  culture: ["SPUTUM_CULTURE", "BLOOD_CULTURE"],
};

const TEST_TURNAROUND_MINUTES: Partial<Record<TestKey, number>> = {
  CBC: 30,
  WBC_DIFF: 30,
  PT: 45,
  APTT: 45,
  FIBRINOGEN: 60,
  FDP: 60,
  D_DIMER: 60,

  CRP: 60,
  AST: 60,
  ALT: 60,
  LDH: 60,
  CR: 60,
  BUN: 60,
  ALP: 60,
  GGT: 60,
  CK: 60,
  NA: 60,
  K: 60,
  CL: 60,
  GLU: 60,
  TP: 60,
  ALB: 60,

  KL_6: 75,
  SP_D: 60,
  NT_PROBNP: 60,

  CXR: 30,
  ECG: 15,

  CEA: 70,
  CA19_9: 70,
  PSA: 70,
  AFP: 60,

  ANA: 60,
  RF: 60,
  ANCA: 60,
  ANTI_CCP: 60,

  TSH: 60,
  FT4: 60,
  CORTISOL: 60,
  HBA1C: 60,

  AXR: 20,
  CT_HEAD: 30,
  CT_CHEST: 30,
  CT_ABDOMEN: 30,
  CT_PELVIS: 30,
  CECT_HEAD: 45,
  CECT_CHEST: 45,
  CECT_ABDOMEN: 45,
  CECT_PELVIS: 45,

  PULMONARY_FUNCTION_TEST: 30,
  FENO: 15,
  ECHO_HEART: 30,
  ECHO_ABDOMEN: 30,

  PCT: 60,
  BETA_D_GLUCAN: 60,

  LEGIONELLA_URINARY_ANTIGEN: 30,
  LEGIONELLA_LAMP: 20,
  MYCOPLASMA_ANTIGEN: 20,
  MYCOPLASMA_LAMP: 20,
  BIOFIRE_SPOTFIRE_R_PANEL: 30,
  HBS_AG: 30,
  HCV_AB: 30,
  HIV_1_2: 30,
  TP_AB: 30,
  RPR: 30,

  PNEUMOCOCCAL_URINARY_ANTIGEN: 20,
  INFLUENZA_ANTIGEN: 20,
  COVID_ANTIGEN_QUANT: 30,
  PERTUSSIS_PCR: 60,

  CHLAMYDIA_PNEUMONIAE_IGM: 60,
  CHLAMYDIA_PNEUMONIAE_IGA: 60,
  CHLAMYDIA_PNEUMONIAE_IGG: 60,
  MEASLES_IGM: 60,
  MEASLES_IGG: 60,
  RUBELLA_IGM: 60,
  RUBELLA_IGG: 60,
  MUMPS_IGM: 60,
  MUMPS_IGG: 60,

  CMV_ANTIGENEMIA: 60,
  ASPERGILLUS_ANTIGEN: 60,
  ASPERGILLUS_IGG: 60,
  HSV_IGG: 60,
  HSV_IGM: 60,
  EBV_IGG: 60,
  EBV_IGM: 60,
  EBNA: 60,
  VZV_IGG: 60,
  VZV_IGM: 60,

  SCC: 60,
  PRO_GRP: 60,
  NSE: 60,
  CYFRA: 60,
  SIL2R: 60,

  CA: 60,
  IP: 60,
  MG: 60,
  TBIL: 60,
  DBIL: 60,
  AMMONIA: 60,
  TCHO: 60,
  HDL_C: 60,
  LDL_C: 60,
  TG: 60,
  UA: 60,
  FE: 60,
  TIBC: 60,
  UIBC: 60,
  FERRITIN: 60,

  ACTH: 60,
  RENIN_ACTIVITY: 60,
  RENIN_CONCENTRATION: 60,
  ALDOSTERONE: 60,
  ADH: 60,
  PTH_INTACT: 60,
  PTHRP: 60,
  CALCITONIN: 60,
  INSULIN: 60,
  GROWTH_HORMONE: 60,

  ANTI_DS_DNA_IGG: 60,
  ANTI_SS_DNA_IGG: 60,
  ANTI_SS_A: 60,
  ANTI_SS_B: 60,
  ANTI_RNP: 60,
  ANTI_SCL70: 60,
  ANTI_JO1: 60,
  ANTI_ARS: 60,
  ANTI_MDA5: 60,
  ANTI_MI2: 60,
  ANTI_TIF1_GAMMA: 60,
  ANTI_CENTROMERE: 60,
  MPO_ANCA: 60,
  PR3_ANCA: 60,
  ANTI_GBM: 60,
  ANTI_GM_CSF: 60,
  IGG: 60,
  IGG4: 60,
  IGA: 60,
  IGM: 60,
  IGE: 60,
  C3: 60,
  C4: 60,
  CH50: 60,

  UA_QUAL: 15,
  UA_SEDIMENT: 30,
  INFLUENZA_RAPID: 15,
  COVID_ANTIGEN: 15,
  SPUTUM_GRAM: 30,
  SPUTUM_CULTURE: 30,
  BLOOD_CULTURE: 45,
  BLOOD_CULTURE_2SET: 20,
  SPUTUM_AFB_SMEAR: 30,
  SPUTUM_AFB_CULTURE: 30,
  URINE_GRAM: 30,
  URINE_CULTURE: 30,
  URINE_AFB_SMEAR: 30,
  URINE_AFB_CULTURE: 30,
};

const BLOOD_COLUMN_1: TestKey[] = [
  "CBC",
  "WBC_DIFF",
  "PT",
  "APTT",
  "FIBRINOGEN",
  "FDP",
  "D_DIMER",
];

const SEND_OUT_TEST_KEYS: TestKey[] = [
  "SP_D",
  "ANA",
  "RF",
  "ANCA",
  "ANTI_CCP",
  "CORTISOL",
  "LEGIONELLA_LAMP",
  "MYCOPLASMA_LAMP",
  "CMV_ANTIGENEMIA",
  "ASPERGILLUS_ANTIGEN",
  "ASPERGILLUS_IGG",
  "HSV_IGG",
  "HSV_IGM",
  "EBV_IGG",
  "EBV_IGM",
  "EBNA",
  "VZV_IGG",
  "VZV_IGM",
  "CHLAMYDIA_PNEUMONIAE_IGM",
"CHLAMYDIA_PNEUMONIAE_IGA",
"CHLAMYDIA_PNEUMONIAE_IGG",
"MEASLES_IGM",
"MEASLES_IGG",
"RUBELLA_IGM",
"RUBELLA_IGG",
"MUMPS_IGM",
"MUMPS_IGG",
"ACTH",
"CORTISOL",
"RENIN_ACTIVITY",
"RENIN_CONCENTRATION",
"ALDOSTERONE",
"ADH",
"PTH_INTACT",
"PTHRP",
"CALCITONIN",
"INSULIN",
"GROWTH_HORMONE",

"ANTI_DS_DNA_IGG",
"ANTI_SS_DNA_IGG",
"ANTI_SS_A",
"ANTI_SS_B",
"ANTI_RNP",
"ANTI_SCL70",
"ANTI_JO1",
"ANTI_ARS",
"ANTI_MDA5",
"ANTI_MI2",
"ANTI_TIF1_GAMMA",
"ANTI_CENTROMERE",
"MPO_ANCA",
"PR3_ANCA",
"ANTI_GBM",
"ANTI_GM_CSF",
"IGG",
"IGG4",
"IGA",
"IGM",
"IGE",
"C3",
"C4",
"CH50",
];

const OTHER_GROUP_INFECTION_RAPID: TestKey[] = [
  "PNEUMOCOCCAL_URINARY_ANTIGEN",
  "INFLUENZA_ANTIGEN",
  "COVID_ANTIGEN_QUANT",
  "PERTUSSIS_PCR",
  "LEGIONELLA_URINARY_ANTIGEN",
  "MYCOPLASMA_ANTIGEN",
  "BIOFIRE_SPOTFIRE_R_PANEL",
  "HBS_AG",
  "HCV_AB",
  "HIV_1_2",
  "TP_AB",
  "RPR",
];

const OTHER_GROUP_INFECTION_SENDOUT: TestKey[] = [
  "LEGIONELLA_LAMP",
  "MYCOPLASMA_LAMP",
  "CMV_ANTIGENEMIA",
  "ASPERGILLUS_ANTIGEN",
  "ASPERGILLUS_IGG",
  "HSV_IGG",
  "HSV_IGM",
  "EBV_IGG",
  "EBV_IGM",
  "EBNA",
  "VZV_IGG",
  "VZV_IGM",
  "CHLAMYDIA_PNEUMONIAE_IGM",
  "CHLAMYDIA_PNEUMONIAE_IGA",
  "CHLAMYDIA_PNEUMONIAE_IGG",
  "MEASLES_IGM",
  "MEASLES_IGG",
  "RUBELLA_IGM",
  "RUBELLA_IGG",
  "MUMPS_IGM",
  "MUMPS_IGG",
];

const CULTURE_SPUTUM_KEYS: TestKey[] = [
  "SPUTUM_GRAM",
  "SPUTUM_CULTURE",
  "SPUTUM_AFB_SMEAR",
  "SPUTUM_AFB_CULTURE",
];

const CULTURE_URINE_KEYS: TestKey[] = [
  "URINE_GRAM",
  "URINE_CULTURE",
  "URINE_AFB_SMEAR",
  "URINE_AFB_CULTURE",
];

const CULTURE_BLOOD_KEYS: TestKey[] = [
  "BLOOD_CULTURE_2SET",
];

const BLOOD_BIOCHEM_1: TestKey[] = [
  "NA",
  "K",
  "CL",
  "CA",
  "IP",
  "MG",
  "TP",
  "ALB",
  "TBIL",
  "DBIL",
  "AST",
  "ALT",
  "LDH",
  "ALP",
  "GGT",
  "BUN",
  "CR",
  "CK",
];

const BLOOD_BIOCHEM_2: TestKey[] = [
  "CRP",
  "GLU",
  "UA",
  "TCHO",
  "HDL_C",
  "LDL_C",
  "TG",
];

const BLOOD_BIOCHEM_3: TestKey[] = [
  "FE",
  "TIBC",
  "UIBC",
  "FERRITIN",
  "KL_6",
  "SP_D",
  "NT_PROBNP",
  "PCT",
  "BETA_D_GLUCAN",
  "AMMONIA",
];

const OTHER_GROUP_TUMOR: TestKey[] = [
  "CEA",
  "CA19_9",
  "PSA",
  "AFP",
  "SCC",
  "PRO_GRP",
  "NSE",
  "CYFRA",
  "SIL2R",
];

const OTHER_GROUP_AUTOANTIBODY: TestKey[] = [
  "ANA",
  "RF",
  "ANCA",
  "ANTI_CCP",
  "ANTI_DS_DNA_IGG",
  "ANTI_SS_DNA_IGG",
  "ANTI_SS_A",
  "ANTI_SS_B",
  "ANTI_RNP",
  "ANTI_SCL70",
  "ANTI_JO1",
  "ANTI_ARS",
  "ANTI_MDA5",
  "ANTI_MI2",
  "ANTI_TIF1_GAMMA",
  "ANTI_CENTROMERE",
  "MPO_ANCA",
  "PR3_ANCA",
  "ANTI_GBM",
  "ANTI_GM_CSF",
  "IGG",
  "IGG4",
  "IGA",
  "IGM",
  "IGE",
  "C3",
  "C4",
  "CH50",
];

const OTHER_GROUP_ENDOCRINE: TestKey[] = [
  "TSH",
  "FT4",
  "HBA1C",
  "ACTH",
  "CORTISOL",
  "RENIN_ACTIVITY",
  "RENIN_CONCENTRATION",
  "ALDOSTERONE",
  "ADH",
  "PTH_INTACT",
  "PTHRP",
  "CALCITONIN",
  "INSULIN",
  "GROWTH_HORMONE",
];

const TEST_HELP_TEXT: Partial<Record<TestKey, string>> = {
  CBC: "白血球、赤血球、ヘモグロビン、血小板などを評価します。",
  WBC_DIFF: "白血球の内訳を評価し、細菌感染やウイルス感染などの鑑別に役立ちます。",
  PT: "外因系を中心とした凝固能の評価に用います。",
  APTT: "内因系を中心とした凝固能の評価に用います。",
  FIBRINOGEN: "炎症や凝固異常の評価に用います。",
  FDP: "線溶亢進や血栓形成の評価に用います。",
  D_DIMER: "血栓形成・線溶の指標として用います。",

  CRP: "急性炎症や細菌感染で上昇しやすく、病勢の変化を比較的速く反映する炎症マーカーです。",
  AST: "肝障害や筋障害などで上昇しうる酵素です。",
  ALT: "主に肝細胞障害で上昇しやすい酵素です。",
  LDH: "組織障害や炎症などで上昇しうる酵素です。",
  CR: "腎機能の評価に用います。",
  BUN: "腎機能や脱水の評価に用います。",
  ALP: "胆道系疾患や骨代謝異常で上昇しうる酵素です。",
  GGT: "胆道系障害や飲酒関連で上昇しやすい酵素です。",
  CK: "筋障害などで上昇しうる酵素です。",
  NA: "ナトリウム異常の評価に用います。",
  K: "カリウム異常の評価に用います。",
  CL: "クロール異常の評価に用います。",
  GLU: "血糖の評価に用います。",
  TP: "血清中の総蛋白量を評価し、栄養状態や慢性炎症、肝機能の指標として用います。",
  ALB: "主要な血清蛋白であり、栄養状態や肝機能、炎症の影響を評価する指標です。",

  KL_6: "間質性肺疾患などで上昇しうる肺由来マーカーです。",
  SP_D: "肺障害や間質性肺炎の評価で参考になることがあります。",
  NT_PROBNP: "心不全の評価に用いられる心負荷マーカーです。",

  CEA: "悪性腫瘍などで上昇しうる腫瘍マーカーです。",
  CA19_9: "消化器系腫瘍などで用いられる腫瘍マーカーです。",
  PSA: "前立腺関連の評価に用いる腫瘍マーカーです。",
  AFP: "肝細胞癌などで用いられる腫瘍マーカーです。",

  ANA: "膠原病のスクリーニングで用いられる自己抗体です。",
  RF: "関節リウマチなどで参考になる自己抗体です。",
  ANCA: "血管炎の評価で用いられる自己抗体です。",
  ANTI_CCP: "関節リウマチで特異度の高い自己抗体です。",

  TSH: "甲状腺機能評価に用います。",
  FT4: "甲状腺ホルモンの評価に用います。",
  CORTISOL: "副腎皮質機能の評価に用います。",
  HBA1C: "過去1〜2か月程度の血糖コントロールを反映します。",

  UA_QUAL: "尿蛋白、尿糖、潜血などを簡便に評価する基本的な尿検査です。",
  UA_SEDIMENT: "尿中の赤血球、白血球、細菌、円柱などを評価します。",
  INFLUENZA_RAPID: "インフルエンザ抗原を迅速に評価する検査です。",
  COVID_ANTIGEN: "COVID-19 の抗原を迅速に評価する検査です。",
  SPUTUM_GRAM: "喀痰中の細菌の形態や染色性を評価し、起因菌推定に役立ちます。",
  SPUTUM_CULTURE: "喀痰から起因菌を培養・同定する検査です。",
  BLOOD_CULTURE: "菌血症の有無を評価するための培養検査です。",

    LEGIONELLA_URINARY_ANTIGEN: "レジオネラ尿中抗原を迅速に評価する検査です。",
  LEGIONELLA_LAMP: "レジオネラの核酸増幅検査です。",
  MYCOPLASMA_ANTIGEN: "マイコプラズマ抗原を迅速に評価する検査です。",
  MYCOPLASMA_LAMP: "マイコプラズマの核酸増幅検査です。",
  BIOFIRE_SPOTFIRE_R_PANEL: "呼吸器病原体を多項目同時に評価するPCR検査です。",
  CMV_ANTIGENEMIA: "サイトメガロウイルス感染の評価に用います。",
  ASPERGILLUS_ANTIGEN: "侵襲性アスペルギルス症の補助診断に用います。",
  ASPERGILLUS_IGG: "慢性アスペルギルス関連疾患の参考になります。",
  HBS_AG: "B型肝炎ウイルス感染の評価に用います。",
  HCV_AB: "C型肝炎ウイルス感染の評価に用います。",
  HIV_1_2: "HIV感染のスクリーニングに用います。",
  TP_AB: "梅毒トレポネーマ抗体です。",
  RPR: "梅毒の活動性評価の参考になります。",
  HSV_IGG: "単純ヘルペス既感染の参考になります。",
  HSV_IGM: "単純ヘルペス急性感染の参考になります。",
  EBV_IGG: "EBV既感染の参考になります。",
  EBV_IGM: "EBV急性感染の参考になります。",
  EBNA: "EBV既感染の参考になります。",
  VZV_IGG: "水痘・帯状疱疹ウイルス既感染の参考になります。",
  VZV_IGM: "水痘・帯状疱疹ウイルス急性感染の参考になります。",
  SPUTUM_AFB_SMEAR: "喀痰の抗酸菌塗抹検査です。",
  SPUTUM_AFB_CULTURE: "喀痰の抗酸菌培養検査です。",
  URINE_GRAM: "尿の一般細菌塗抹検査です。",
  URINE_CULTURE: "尿の一般細菌培養検査です。",
  URINE_AFB_SMEAR: "尿の抗酸菌塗抹検査です。",
  URINE_AFB_CULTURE: "尿の抗酸菌培養検査です。",
  BLOOD_CULTURE_2SET: "血液培養 2セットです。",

AXR: "腹部単純X線検査です。",
CT_HEAD: "頭部単純CTです。",
CT_CHEST: "胸部単純CTです。",
CT_ABDOMEN: "腹部単純CTです。",
CT_PELVIS: "骨盤単純CTです。",
CECT_HEAD: "頭部造影CTです。クレアチニン確認後に実施します。",
CECT_CHEST: "胸部造影CTです。クレアチニン確認後に実施します。",
CECT_ABDOMEN: "腹部造影CTです。クレアチニン確認後に実施します。",
CECT_PELVIS: "骨盤造影CTです。クレアチニン確認後に実施します。",

PULMONARY_FUNCTION_TEST: "肺活量や1秒率などを評価する検査です。",
FENO: "気道炎症の指標として呼気一酸化窒素を測定します。",
ECHO_HEART: "心機能や弁膜症の有無などを評価します。",
ECHO_ABDOMEN: "腹部臓器を超音波で評価します。",

PNEUMOCOCCAL_URINARY_ANTIGEN: "肺炎球菌感染の補助診断に用いる迅速検査です。",
INFLUENZA_ANTIGEN: "インフルエンザ抗原検査です。",
COVID_ANTIGEN_QUANT: "新型コロナ抗原定量検査です。",
PERTUSSIS_PCR: "百日咳菌のPCR検査です。",

PCT: "細菌感染の重症度評価に参考となる炎症マーカーです。",
BETA_D_GLUCAN: "真菌感染の補助診断に用います。",

SCC: "扁平上皮癌関連の腫瘍マーカーです。",
PRO_GRP: "小細胞肺癌などで参考になる腫瘍マーカーです。",
NSE: "神経内分泌系腫瘍などで参考になる腫瘍マーカーです。",
CYFRA: "肺癌などで参考になる腫瘍マーカーです。",
SIL2R: "リンパ系疾患や炎症性疾患で上昇しうるマーカーです。",

CHLAMYDIA_PNEUMONIAE_IGM: "クラミジア・ニューモニエ急性感染の参考になる抗体です。",
CHLAMYDIA_PNEUMONIAE_IGA: "クラミジア・ニューモニエ感染の参考になる抗体です。",
CHLAMYDIA_PNEUMONIAE_IGG: "クラミジア・ニューモニエ既感染の参考になる抗体です。",
MEASLES_IGM: "麻疹急性感染の参考になる抗体です。",
MEASLES_IGG: "麻疹既感染・免疫の参考になる抗体です。",
RUBELLA_IGM: "風疹急性感染の参考になる抗体です。",
RUBELLA_IGG: "風疹既感染・免疫の参考になる抗体です。",
MUMPS_IGM: "ムンプス急性感染の参考になる抗体です。",
MUMPS_IGG: "ムンプス既感染・免疫の参考になる抗体です。",
CA: "カルシウムの評価に用います。",
IP: "リンの評価に用います。",
MG: "マグネシウムの評価に用います。",
TBIL: "総ビリルビンの評価に用います。",
DBIL: "直接ビリルビンの評価に用います。",
AMMONIA: "高アンモニア血症の評価に用います。",
TCHO: "総コレステロールの評価に用います。",
HDL_C: "HDLコレステロールの評価に用います。",
LDL_C: "LDLコレステロールの評価に用います。",
TG: "中性脂肪の評価に用います。",
UA: "尿酸の評価に用います。",
FE: "血清鉄の評価に用います。",
TIBC: "総鉄結合能の評価に用います。",
UIBC: "不飽和鉄結合能の評価に用います。",
FERRITIN: "貯蔵鉄の評価に用います。",
ACTH: "下垂体・副腎系評価に用います。",
RENIN_ACTIVITY: "レニン活性を評価します。",
RENIN_CONCENTRATION: "レニン定量を評価します。",
ALDOSTERONE: "アルドステロンを評価します。",
ADH: "抗利尿ホルモンを評価します。",
PTH_INTACT: "副甲状腺ホルモンを評価します。",
PTHRP: "PTHrPを評価します。",
CALCITONIN: "カルシトニンを評価します。",
INSULIN: "インスリン分泌を評価します。",
GROWTH_HORMONE: "成長ホルモンを評価します。",
ANTI_DS_DNA_IGG: "SLEの評価で参考になる自己抗体です。",
ANTI_SS_DNA_IGG: "自己免疫疾患評価の参考となる自己抗体です。",
ANTI_SS_A: "シェーグレン症候群などで参考になる自己抗体です。",
ANTI_SS_B: "シェーグレン症候群などで参考になる自己抗体です。",
ANTI_RNP: "混合性結合組織病などで参考になる自己抗体です。",
ANTI_SCL70: "全身性強皮症で参考になる自己抗体です。",
ANTI_JO1: "筋炎関連自己抗体です。",
ANTI_ARS: "抗ARS症候群の評価で参考になります。",
ANTI_MDA5: "皮膚筋炎関連自己抗体です。",
ANTI_MI2: "皮膚筋炎関連自己抗体です。",
ANTI_TIF1_GAMMA: "皮膚筋炎関連自己抗体です。",
ANTI_CENTROMERE: "強皮症関連自己抗体です。",
MPO_ANCA: "ANCA関連血管炎の評価に用います。",
PR3_ANCA: "ANCA関連血管炎の評価に用います。",
ANTI_GBM: "抗GBM病の評価に用います。",
ANTI_GM_CSF: "肺胞蛋白症などで参考になる自己抗体です。",
IGG: "免疫グロブリンGを評価します。",
IGG4: "IgG4関連疾患で参考になります。",
IGA: "免疫グロブリンAを評価します。",
IGM: "免疫グロブリンMを評価します。",
IGE: "アレルギー関連評価で参考になります。",
C3: "補体C3を評価します。",
C4: "補体C4を評価します。",
CH50: "補体活性を評価します。",
};

const IMAGE_PLAIN_XRAY_KEYS: TestKey[] = [
  "CXR",
  "AXR",
];

const IMAGE_PLAIN_CT_KEYS: TestKey[] = [
  "CT_HEAD",
  "CT_CHEST",
  "CT_ABDOMEN",
  "CT_PELVIS",
];

const IMAGE_CONTRAST_CT_KEYS: TestKey[] = [
  "CECT_HEAD",
  "CECT_CHEST",
  "CECT_ABDOMEN",
  "CECT_PELVIS",
];

const PATIENT_FRONT_SRC = "/patient_front.webp";
const PATIENT_FRONT_TALK_SRC = "/patient_front_talk.webp";
const PATIENT_BACK_SRC = "/patient_back.webp";
const EXAM_ROOM_BG_SRC = "/exam_room_bg.webp";
const RESULT_BG_SRC = "/result_bg.webp";
const STETHOSCOPE_CURSOR_SRC = "/stethoscope_cursor.webp";

const TITLE_BGM_SRC = "/title_bgm.mp3";
const GAME_BGM_SRC = "/game_bgm.mp3";
const RESULT_BGM_SRC = "/result_bgm.mp3";

const SE_BUTTON_SRC = "/se_button.mp3";
const SE_SEND_SRC = "/se_send.mp3";
const SE_TALK_SRC = "/se_talk.mp3";
const SE_END_GOOD_SRC = "/se_end_good.mp3";
const SE_END_BAD_SRC = "/se_end_bad.mp3";
const SE_TEST_RESULT_SRC = "/se_test_result.mp3";

const SPECIALIST_COMMENT_MAP: Record<EndingId, string> = {
  normal_pneumonia:
    "発熱、咳嗽、黄色痰、炎症反応高値、白血球増多、好中球優位、胸部X線およびCTでの右下肺野浸潤影、さらに肺炎球菌尿中抗原陽性という流れから、細菌性肺炎、特に肺炎球菌性肺炎を強く疑う症例です。\n\n外来で帰宅可能と判断するなら、バイタル、SpO₂、全身状態、内服可能かどうか、基礎疾患の有無を総合して判断します。\n\nこの症例では、必要な問診・診察・検査を押さえたうえで正しい方向に到達できています。",
  admission_condition:
    "このルートでは、病状悪化により外来での継続診療が困難になっています。重症度評価や早期介入の重要性を意識したい場面です。",
  admission_time:
    "時間経過による悪化は、外来診療での優先順位判断の重要性を示しています。必要な情報を早めに取りに行くことが大切です。",
  trust_break:
    "患者との信頼関係が崩れると、必要な情報が得られず診断精度も下がります。問診の姿勢そのものが診療の一部です。",
  misdiagnosis:
    "鑑別を十分に詰めずに診断を確定すると、見逃しにつながります。症状、身体所見、検査所見の整合性を最後まで確認する必要があります。",
  father_truth:
    "主訴の背後にある家族歴や患者背景へ踏み込んだことで到達できる特殊ルートです。疾患だけでなく物語の深掘りとして機能しています。",
  honeytrap_scam:
    "医学的診断ではなく、会話の流れから別の真相に到達したルートです。情報の拾い方によって見えるものが変わる例です。",
  soccer_end:
    "診療の正確さに加えて、関係性構築の結果として到達する特殊ルートです。",
};

const ENDING_HINT_MAP: Record<EndingId, string> = {
  normal_pneumonia: "発熱、咳、黄色痰があります。喉や鼻の症状がなければ肺や気管支の病気を考えます。\nそこまで来たら画像所見を確認するのもひとつです。",
  admission_condition: "患者さんの体力が尽きてしまう前に診断しないと大変なことに！",
  admission_time: "時間をかけすぎたら体調悪化してしまうかも……",
  trust_break: "失礼な発言や雑なふるまいは信頼をなくしちゃうよ。",
  misdiagnosis: "必要情報が足りないまま診断すると誤診につながってしまうかも。",
  father_truth: "病気そのものだけでなく、患者背景や家族の話まで深掘ると違ったことが見えるかも。\n（信頼とハードルの低さがないと深い話をする気にならないかも）",
  honeytrap_scam: "女性関係はいつの時代も……。\n（信頼とハードルの低さがないと深い話をする気にならないかも）",
  soccer_end: "信頼度、ノリ、深度をMAXにし、趣味の話をしたうえで正しい診断をしよう。",
};

const ENDING_TITLE_MAP: Record<EndingId, string> = {
  normal_pneumonia: "エンド１：診断的中！",
  admission_condition: "バッドエンド１：緊急入院",
  admission_time: "バッドエンド２：時間オーバー",
  trust_break: "バッドエンド３：失礼だな！",
  misdiagnosis: "バッドエンド４：誤診",
  father_truth: "エンド２：父の真実",
  honeytrap_scam: "エンド３：恋の落とし穴",
  soccer_end: "エンド４：先生に出会えたことが奇跡",
};

const SPECIALIST_IMAGE_MAP: Record<EndingId, string> = {
  normal_pneumonia: "/specialist_normal_pneumonia.webp",
  admission_condition: "/specialist_admission_condition.webp",
  admission_time: "/specialist_admission_time.webp",
  trust_break: "/specialist_trust_break.webp",
  misdiagnosis: "/specialist_misdiagnosis.webp",
  father_truth: "/specialist_father_truth.webp",
  honeytrap_scam: "/specialist_honeytrap_scam.webp",
  soccer_end: "/specialist_soccer_end.webp",
};

const PARAMETER_LABELS: { key: keyof Stats; label: string }[] = [
  { key: "trust", label: "信頼度" },
  { key: "validation", label: "ノリ" },
  { key: "defense", label: "ガード" },
  { key: "openness", label: "深度" },
  { key: "condition", label: "体調" },
];

export default function App() {
  const cp = case01;

  const [stats, setStats] = useState<Stats>({ ...cp.initialStats });
  const [flags, setFlags] = useState<Flags>({ ...cp.initialFlags });
  const [seconds, setSeconds] = useState<number>(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [input, setInput] = useState<string>("");
  const [testsDone, setTestsDone] = useState<Partial<Record<TestKey, boolean>>>({});
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TestCategory | null>(null);
  const [examMode, setExamMode] = useState<null | "inspection" | "auscultation" | "palpation" | "percussion">(null);
  const [examSide, setExamSide] = useState<"front" | "back">("front");
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [screen, setScreen] = useState<"splash" | "title" | "game" | "ending" | "result">("splash");
  const [endingId, setEndingId] = useState<EndingId | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  const [examCursorPos, setExamCursorPos] = useState<{ x: number; y: number } | null>(null);
  
const [patientBubbleText, setPatientBubbleText] = useState("");
const [patientSpeechFullText, setPatientSpeechFullText] = useState("");
const [patientSpeechMessageId, setPatientSpeechMessageId] = useState<string | null>(null);
const [isPatientTalking, setIsPatientTalking] = useState(false);
const [patientMouthOpen, setPatientMouthOpen] = useState(false);
const [patientSpeechSilent, setPatientSpeechSilent] = useState(false);
const [doctorMonologueFullText, setDoctorMonologueFullText] = useState("");
const [doctorMonologueBubbleText, setDoctorMonologueBubbleText] = useState("");
const [doctorMonologueVisible, setDoctorMonologueVisible] = useState(false);

  const clockText = useMemo(() => formatClock(seconds), [seconds]);
  const latestPatientMessage = useMemo(() => {
  return [...messages].reverse().find((m) => m.speaker === "PATIENT") ?? null;
}, [messages]);

const [viewportWidth, setViewportWidth] = useState<number>(
  typeof window !== "undefined" ? window.innerWidth : 1280
);

const isResultCompact = viewportWidth <= 980;
const isResultPhone = viewportWidth <= 640;

const isPhone = viewportWidth <= 820;
const isTablet = viewportWidth <= 1180;

const modalCols3 = isPhone
  ? "1fr"
  : isTablet
  ? "repeat(2, minmax(0, 1fr))"
  : "repeat(3, minmax(0, 1fr))";

const modalCols4 = isPhone
  ? "1fr"
  : isTablet
  ? "repeat(2, minmax(0, 1fr))"
  : "repeat(4, minmax(0, 1fr))";

const [audioUnlocked, setAudioUnlocked] = useState(false);
const [splashPhase, setSplashPhase] = useState<"logo" | "notice">("logo");
const [splashLogoVisible, setSplashLogoVisible] = useState(true);

const SPLASH_LOGO_SRC = "/tebeneko_logo.webp";
const TITLE_LOGO_SRC = "/title_logo.webp";
const TITLE_BG_SRC = "/title_bg.webp";
const CREDIT_IMAGE_SRC = "/credit.webp";
const TEBENEKO_GAMES_URL = "https://tbcatgames.mystrikingly.com/";

const [titleBgm] = useState(() => new Audio(TITLE_BGM_SRC));
const [gameBgm] = useState(() => new Audio(GAME_BGM_SRC));
const [resultBgm] = useState(() => new Audio(RESULT_BGM_SRC));

const [buttonSe] = useState(() => new Audio(SE_BUTTON_SRC));
const [sendSe] = useState(() => new Audio(SE_SEND_SRC));
const [talkSe] = useState(() => new Audio(SE_TALK_SRC));
const [endGoodSe] = useState(() => new Audio(SE_END_GOOD_SRC));
const [endBadSe] = useState(() => new Audio(SE_END_BAD_SRC));
const [testResultSe] = useState(() => new Audio(SE_TEST_RESULT_SRC));

const commonSubButtonStyle: React.CSSProperties = {
  padding: "12px 22px",
  borderRadius: 18,
  border: "1px solid rgba(0,0,0,0.16)",
  background: "rgba(255,255,255,0.72)",
  color: "#111",
  fontWeight: 800,
  fontSize: 22,
  cursor: "pointer",
  minWidth: 132,
  backdropFilter: "blur(2px)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.14)",
};

const patientDisplayImageSrc =
  examSide === "front"
    ? patientMouthOpen
      ? PATIENT_FRONT_TALK_SRC
      : PATIENT_FRONT_SRC
    : PATIENT_BACK_SRC;

    const bgmList = useMemo(() => [titleBgm, gameBgm, resultBgm], [titleBgm, gameBgm, resultBgm]);
const seList = useMemo(
  () => [buttonSe, sendSe, talkSe, endGoodSe, endBadSe, testResultSe],
  [buttonSe, sendSe, talkSe, endGoodSe, endBadSe, testResultSe]
);

const stopAllBgm = useCallback(() => {
  bgmList.forEach((a) => {
    a.pause();
    a.currentTime = 0;
  });
}, [bgmList]);

const playBgm = useCallback(
  (target: HTMLAudioElement | null) => {
    if (!audioUnlocked || !target) return;

    bgmList.forEach((a) => {
      if (a !== target) {
        a.pause();
        a.currentTime = 0;
      }
    });

    target.currentTime = 0;
    target.play().catch((e) => {
      console.error("BGM play failed", e, target.src);
    });
  },
  [audioUnlocked, bgmList]
);

const playSe = useCallback(
  (audio: HTMLAudioElement | null) => {
    if (!audioUnlocked || !audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch((e) => {
      console.error("SE play failed", e, audio.src);
    });
  },
  [audioUnlocked]
);

const unlockAudio = useCallback(() => {
  if (audioUnlocked) return;
  setAudioUnlocked(true);
}, [audioUnlocked]);

const isHappyEnding = useCallback((id: EndingId) => {
  return (
    id === "normal_pneumonia" ||
    id === "father_truth" ||
    id === "honeytrap_scam" ||
    id === "soccer_end"
  );
}, []);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderCategory, setOrderCategory] = useState<TestCategory | null>(null);
  const [draftOrderKeys, setDraftOrderKeys] = useState<TestKey[]>([]);
  const [pendingOrderKeys, setPendingOrderKeys] = useState<TestKey[]>([]);
  const [otherLabGroup, setOtherLabGroup] = useState<
    null | "urine" | "infection" | "tumor" | "autoantibody" | "endocrine"
  >(null);
  const [examResultModalOpen, setExamResultModalOpen] = useState(false);
  const [examResultModalTitle, setExamResultModalTitle] = useState("");
  const [examResultModalItems, setExamResultModalItems] = useState<TestResult[]>([]);
  const [isBlackout, setIsBlackout] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);

  const [infectionSubModalOpen, setInfectionSubModalOpen] = useState(false);
  const [cultureSubModalOpen, setCultureSubModalOpen] = useState(false);
  const [showOrderedTestsModal, setShowOrderedTestsModal] = useState(false);
  const [confirmOrderModalOpen, setConfirmOrderModalOpen] = useState(false);
  const [confirmOrderKeys, setConfirmOrderKeys] = useState<TestKey[]>([]);

const [diagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
const [diagnosisQuery, setDiagnosisQuery] = useState("");
const [diagnosisCandidates, setDiagnosisCandidates] = useState<DiagnosisOption[]>([]);
const [selectedDiagnosis, setSelectedDiagnosis] = useState<DiagnosisOption | null>(null);
const [activeDiagnosisTab, setActiveDiagnosisTab] = useState<DiagnosisCategory>("all");

const [specialistCommentModalOpen, setSpecialistCommentModalOpen] = useState(false);

const [settingsModalOpen, setSettingsModalOpen] = useState(false);
const [endingCollectionModalOpen, setEndingCollectionModalOpen] = useState(false);

const [bgmVolume, setBgmVolume] = useState<number>(() => {
  const saved = localStorage.getItem("sim_bgm_volume");
  return saved ? Number(saved) : 0.35;
});

const [seVolume, setSeVolume] = useState<number>(() => {
  const saved = localStorage.getItem("sim_se_volume");
  return saved ? Number(saved) : 0.75;
});

const [unlockedEndings, setUnlockedEndings] = useState<Partial<Record<EndingId, boolean>>>(() => {
  const saved = localStorage.getItem("sim_unlocked_endings");
  return saved ? JSON.parse(saved) : {};
});

const [endingPreviewId, setEndingPreviewId] = useState<EndingId | null>(null);

const [isEndingLibraryMode, setIsEndingLibraryMode] = useState(false);
const [hintTargetEndingId, setHintTargetEndingId] = useState<EndingId | null>(null);
const [hintModalOpen, setHintModalOpen] = useState(false);
const [chartReviewText, setChartReviewText] = useState("");
const [chartReviewPosted, setChartReviewPosted] = useState(false);

const PORTAL_URL = "https://doctor-portal.pages.dev/";

type ResultFeedback = "interesting" | "difficult" | "confusing" | null;
type DevLogAction =
  | "start"
  | "chat"
  | "body_exam"
  | "open_order_modal"
  | "submit_order"
  | "run_test"
  | "open_diagnosis"
  | "confirm_diagnosis"
  | "ending"
  | "result"
  | "title_return";

type DevPlayLog = {
  sessionId: string;
  startedAt: number;
  endedAt?: number;
  durationSec?: number;
  endingId?: EndingId | null;
  diagnosisLabel?: string;
  questionCount: number;
  testsCount: number;
  hasAnyExam: boolean;
  hasAnyTest: boolean;
  chartReviewLength: number;
  chartReviewPosted: boolean;
  feedback: ResultFeedback;
  lastAction: DevLogAction;
  dropPoint?: string;
};

const [sessionId, setSessionId] = useState<string>(() => uid());
const [resultFeedback, setResultFeedback] = useState<ResultFeedback>(null);
const [lastAction, setLastAction] = useState<DevLogAction>("start");

// 制限用
const [questionCount, setQuestionCount] = useState(0);
const [hasAnyExam, setHasAnyExam] = useState(false);
const [hasAnyTest, setHasAnyTest] = useState(false);
const isDiagnosisRecommended = useMemo(() => {
    return !!flags.father_diag_ready || !!flags.scam_diag_ready;
  }, [flags]);

const normalizeDiagnosisText = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, "").replace(/　/g, "");

const filteredDiagnosisOptions = useMemo(() => {
  const q = normalizeDiagnosisText(diagnosisQuery);

  let list = [...ICD_MASTER];

  if (activeDiagnosisTab !== "all") {
    list = list.filter((opt) => inferDiagnosisCategory(opt) === activeDiagnosisTab);
  }

  if (q) {
    list = list.filter((opt) => {
      const targets = [
        opt.code,
        opt.label,
        ...(opt.aliases ?? []),
      ].map(normalizeDiagnosisText);

      return targets.some((t) => t.includes(q));
    });
  }

  if (
  q.includes("詐欺") ||
  q.includes("美人局") ||
  q.includes("ハニートラップ") ||
  q.includes("いただき女子")
) {
  return [SPECIAL_SCAM_OPTION];
}

  list.sort((a, b) => compareIcdCode(a.code, b.code));
  return list;
}, [diagnosisQuery, activeDiagnosisTab]);

useEffect(() => {
  if (!timerStarted) return;

  const id = setInterval(() => {
    setSeconds((s) => s + 1);
  }, 1000);

  return () => clearInterval(id);
}, [timerStarted]);

useEffect(() => {
  if (!diagnosisModalOpen) return;

  setDiagnosisCandidates(filteredDiagnosisOptions);
}, [diagnosisModalOpen, filteredDiagnosisOptions]);

useEffect(() => {
  bgmList.forEach((a) => {
    a.loop = true;
    a.volume = 0.35;
    a.preload = "auto";
  });

  seList.forEach((a) => {
    a.volume = 0.75;
    a.preload = "auto";
  });

  return () => {
  [...bgmList, ...seList].forEach((a) => {
    a.pause();
    a.currentTime = 0;
  });
};
}, [bgmList, seList]);

useEffect(() => {
  if (screen !== "result") return;

  setLastAction("result");
  saveDevLog({
    endedAt: Date.now(),
    durationSec: seconds,
    endingId,
    diagnosisLabel: getDiagnosisShareLabel(),
    lastAction: "result",
  });
}, [screen]);

useEffect(() => {
  if (!audioUnlocked) return;

  if (screen === "title") {
    playBgm(titleBgm);
    return;
  }

  if (screen === "game") {
    playBgm(gameBgm);
    return;
  }

  if (screen === "result") {
    playBgm(resultBgm);
    return;
  }

  if (screen === "ending") {
    stopAllBgm();
  }
}, [screen, audioUnlocked, playBgm, stopAllBgm, titleBgm, gameBgm, resultBgm]);

useEffect(() => {
  const onResize = () => setViewportWidth(window.innerWidth);
  onResize();
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);

useEffect(() => {
  const onVisibilityChange = () => {
    if (document.hidden) {
      bgmList.forEach((a) => a.pause());
      return;
    }

    if (!audioUnlocked) return;

    if (screen === "title") playBgm(titleBgm);
    if (screen === "game") playBgm(gameBgm);
    if (screen === "result") playBgm(resultBgm);
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}, [audioUnlocked, screen, playBgm, bgmList, titleBgm, gameBgm, resultBgm]);

useEffect(() => {
  if (!patientSpeechMessageId) return;

  setPatientBubbleText("");
  setIsPatientTalking(!patientSpeechSilent);

  const text = patientSpeechFullText;
  let index = 0;
  let finished = false;

  if (!patientSpeechSilent && audioUnlocked) {
    talkSe.pause();
    talkSe.currentTime = 0;
    talkSe.loop = true;
    talkSe.play().catch((e) => {
      console.error("talkSe start failed", e, talkSe.src);
    });
  } else {
    talkSe.pause();
    talkSe.currentTime = 0;
    setPatientMouthOpen(false);
  }

  const timer = window.setInterval(() => {
    index += 1;
    setPatientBubbleText(text.slice(0, index));

    if (index >= text.length) {
      finished = true;
      window.clearInterval(timer);

      talkSe.pause();
      talkSe.currentTime = 0;

      window.setTimeout(() => {
        setIsPatientTalking(false);
        setPatientMouthOpen(false);
      }, 180);
    }
  }, 35);

  return () => {
    window.clearInterval(timer);

    if (!finished) {
      talkSe.pause();
      talkSe.currentTime = 0;
    }
  };
}, [
  patientSpeechMessageId,
  patientSpeechFullText,
  patientSpeechSilent,
  talkSe,
  audioUnlocked,
]);

useEffect(() => {
  if (!doctorMonologueVisible || !doctorMonologueFullText) return;

  setDoctorMonologueBubbleText("");

  const text = doctorMonologueFullText;
  let index = 0;

  const timer = window.setInterval(() => {
    index += 1;
    setDoctorMonologueBubbleText(text.slice(0, index));

    if (index >= text.length) {
      window.clearInterval(timer);
    }
  }, 35);

  return () => {
    window.clearInterval(timer);
  };
}, [doctorMonologueVisible, doctorMonologueFullText]);

useEffect(() => {
  if (!isPatientTalking) {
    setPatientMouthOpen(false);
    return;
  }

  const timer = window.setInterval(() => {
    setPatientMouthOpen((prev) => !prev);
  }, 90);

  return () => {
    window.clearInterval(timer);
  };
}, [isPatientTalking]);

useEffect(() => {
  const imgs = [SPLASH_LOGO_SRC, TITLE_LOGO_SRC, TITLE_BG_SRC];
  imgs.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}, []);

useEffect(() => {
  if (screen !== "splash") return;

  setSplashPhase("logo");
  setSplashLogoVisible(true);

  const fadeTimer = window.setTimeout(() => {
    setSplashLogoVisible(false);
  }, 1000);

  const noticeTimer = window.setTimeout(() => {
    setSplashPhase("notice");
  }, 1600);

  return () => {
    window.clearTimeout(fadeTimer);
    window.clearTimeout(noticeTimer);
  };
}, [screen]);

useEffect(() => {
  bgmList.forEach((a) => {
    a.volume = bgmVolume;
  });
  localStorage.setItem("sim_bgm_volume", String(bgmVolume));
}, [bgmList, bgmVolume]);

useEffect(() => {
  seList.forEach((a) => {
    a.volume = seVolume;
  });
  localStorage.setItem("sim_se_volume", String(seVolume));
}, [seList, seVolume]);

useEffect(() => {
  localStorage.setItem("sim_unlocked_endings", JSON.stringify(unlockedEndings));
}, [unlockedEndings]);

function highlightAbnormalResultText(r: TestResult): React.ReactNode {
  const text = r.resultText ?? "";

  const redStyle: React.CSSProperties = {
    color: "#ff5a5f",
    fontWeight: 900,
  };

  // CRP → 全体赤
  if (r.key === "CRP") {
    return <span style={redStyle}>{text}</span>;
  }

  // CBC → WBCブロック全体赤
  if (r.key === "CBC") {
    return text.split(/(WBC\s*[0-9]+(?:\.[0-9]+)?\/\S*(?:\s*\([^)]*\))?)/i).map((part, i) =>
      /(WBC\s*[0-9]+(?:\.[0-9]+)?\/\S*(?:\s*\([^)]*\))?)/i.test(part) ? (
        <span key={i} style={redStyle}>{part}</span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
  }

  // 好中球 → ラベル＋値まとめて赤
  if (r.key === "WBC_DIFF") {
    return text.split(/(好中球\s*[0-9]+(?:\.[0-9]+)?%)/).map((part, i) =>
      /(好中球\s*[0-9]+(?:\.[0-9]+)?%)/.test(part) ? (
        <span key={i} style={redStyle}>{part}</span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
  }

  // 画像 → 異常なら全文赤
  if (r.key === "CXR" || r.key === "CT_CHEST" || r.key === "CECT_CHEST") {
    const normal =
      text.includes("異常なし") ||
      text.includes("明らかな異常なし") ||
      text.includes("特記すべき異常なし") ||
      text.includes("所見なし");

    if (normal) return text;
    return <span style={redStyle}>{text}</span>;
  }

  // 尿中肺炎球菌抗原 → 陽性全体赤
  if (
    r.key === "PNEUMOCOCCAL_URINARY_ANTIGEN"
  ) {
    if (text.includes("陽性")) {
      return <span style={redStyle}>{text}</span>;
    }
    return text;
  }

  return text;
}

    const sortedResults = useMemo(() => {
    const order: TestCategory[] = [
      "vital",
      "physical",
      "blood",
      "image",
      "physiology",
      "tumor",
      "autoantibody",
      "endocrine",
      "urine",
      "infection",
      "culture",
    ];
    return [...results].sort((a, b) => {
      const catDiff = order.indexOf(a.category) - order.indexOf(b.category);
      if (catDiff !== 0) return catDiff;
      return a.label.localeCompare(b.label, "ja");
    });
  }, [results]);

  function beginEnding(reason: EndingId) {
  if (gameOver) return;

  setTimerStarted(false);
  stopAllBgm();

  if (isHappyEnding(reason)) {
    playSe(endGoodSe);
  } else {
    playSe(endBadSe);
  }

  setUnlockedEndings((prev) => ({
    ...prev,
    [reason]: true,
  }));

  setGameOver(true);
  setEndingId(reason);
  setIsBlackout(true);

    saveDevLog({
    endingId: reason,
    endedAt: Date.now(),
    durationSec: seconds,
    diagnosisLabel: getDiagnosisShareLabel(),
    dropPoint: reason,
    lastAction: "ending",
  });

  window.setTimeout(() => {
    setIsBlackout(false);
    setScreen("ending");
  }, 1000);
}

function getDevLogs(): DevPlayLog[] {
  try {
    const raw = localStorage.getItem("sim_dev_logs");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDevLog(partial: Partial<DevPlayLog>) {
  const logs = getDevLogs();

  const currentBase: DevPlayLog = {
    sessionId,
    startedAt: Date.now(),
    questionCount,
    testsCount: results.length,
    hasAnyExam,
    hasAnyTest,
    chartReviewLength: chartReviewText.trim().length,
    chartReviewPosted,
    feedback: resultFeedback,
    lastAction,
  };

  const nextLog: DevPlayLog = {
    ...currentBase,
    ...partial,
    sessionId,
    questionCount,
    testsCount: results.length,
    hasAnyExam,
    hasAnyTest,
    chartReviewLength: chartReviewText.trim().length,
    chartReviewPosted,
    feedback: resultFeedback,
    lastAction: partial.lastAction ?? lastAction,
  };

  const idx = logs.findIndex((x) => x.sessionId === sessionId);
  if (idx >= 0) {
    logs[idx] = {
      ...logs[idx],
      ...nextLog,
    };
  } else {
    logs.push(nextLog);
  }

  localStorage.setItem("sim_dev_logs", JSON.stringify(logs.slice(-200)));
}

function getFeedbackLabel(value: ResultFeedback) {
  switch (value) {
    case "interesting":
      return "面白かった";
    case "difficult":
      return "難しかった";
    case "confusing":
      return "よく分からなかった";
    default:
      return "未評価";
  }
}

function getDiagnosisShareLabel() {
  if (selectedDiagnosis?.label) return selectedDiagnosis.label;
  if (endingId === "honeytrap_scam") return "恋の病";
  return "診断未入力";
}

function buildChartShareText() {
  const endingTitle = endingId ? ENDING_TITLE_MAP[endingId] : "不明";
  const diagnosisLabel = getDiagnosisShareLabel();
  const memo = chartReviewText.trim();

  return [
    "【症例考察ノート】",
    `エンド：${endingTitle}`,
    `診断：${diagnosisLabel}`,
    `経過時間：${clockText}`,
    memo ? `診療メモ：${memo}` : "",
    resultFeedback ? `評価：${getFeedbackLabel(resultFeedback)}` : "",
    "#問診シミュレーター",
    "#この患者おかしい",
  ]
    .filter(Boolean)
    .join("\n");
}

function shareChartToX() {
  const text = encodeURIComponent(buildChartShareText());
  const url = encodeURIComponent(PORTAL_URL);

  window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    "_blank",
    "noopener,noreferrer"
  );

  setChartReviewPosted(true);
  saveDevLog({ chartReviewPosted: true, lastAction: "result" });
}

function shareChartToFacebook() {
  const shareUrl = encodeURIComponent(PORTAL_URL);
  const quote = encodeURIComponent(buildChartShareText());

  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${quote}`,
    "_blank",
    "noopener,noreferrer"
  );

  setChartReviewPosted(true);
  saveDevLog({ chartReviewPosted: true, lastAction: "result" });
}

function triggerGameOver(reason: EndingId) {
  beginEnding(reason);
}

  function evaluateEndConditions(nextStats: Stats, nextSeconds: number) {
  if (nextStats.trust <= 0) {
    triggerGameOver("trust_break");
    return true;
  }
  if (nextStats.condition <= 0) {
    triggerGameOver("admission_condition");
    return true;
  }
  if (nextSeconds >= 10800) {
    triggerGameOver("admission_time");
    return true;
  }
  return false;
}

function startPatientSpeech(
  messageId: string,
  text: string,
  options?: { silent?: boolean }
) {
  const silent = !!options?.silent;

  setPatientSpeechMessageId(messageId);
  setPatientSpeechFullText(text);
  setPatientBubbleText("");
  setPatientSpeechSilent(silent);
  setIsPatientTalking(!silent);

  if (silent) {
    setPatientMouthOpen(false);
  }
}

function startDoctorMonologueBubble(text: string) {
  setDoctorMonologueFullText(text);
  setDoctorMonologueBubbleText("");
  setDoctorMonologueVisible(true);
}

function pushMessage(
  speaker: ChatMessage["speaker"],
  text: string,
  options?: { color?: string }
) {
  const message: ChatMessage = {
    id: uid(),
    speaker,
    text,
    ts: Date.now(),
    ...(options ?? {}),
  };

  setMessages((prev) => [...prev, message]);

    if (speaker === "DOCTOR") {
    setLastAction("chat");
  }

  if (speaker === "PATIENT") {
    setDoctorMonologueVisible(false);
    setDoctorMonologueFullText("");
    setDoctorMonologueBubbleText("");
    startPatientSpeech(message.id, text);
  }
}

  function resetToTitle() {
  playSe(buttonSe);

    saveDevLog({
    endedAt: Date.now(),
    durationSec: seconds,
    endingId,
    diagnosisLabel: getDiagnosisShareLabel(),
    dropPoint: screen === "result" ? "result_return" : "manual_return",
    lastAction: "title_return",
  });

  setStats({ ...cp.initialStats });
  setFlags({ ...cp.initialFlags });
  setSeconds(0);
  setTimerStarted(false);
  setInput("");
  setTestsDone({});
  setResults([]);
  setSelectedCategory(null);
  setExamMode(null);
  setExamSide("front");
  setShowResultsModal(false);
  setGameOver(false);
  setEndingId(null);
  setMessages([]);
  setOrderModalOpen(false);
  setOrderCategory(null);
  setDraftOrderKeys([]);
  setPendingOrderKeys([]);
  setOtherLabGroup(null);
  setExamResultModalOpen(false);
  setExamResultModalTitle("");
  setExamResultModalItems([]);
  setIsBlackout(false);
  setInfectionSubModalOpen(false);
  setCultureSubModalOpen(false);
  setShowOrderedTestsModal(false);
  setConfirmOrderModalOpen(false);
  setConfirmOrderKeys([]);
  setDiagnosisModalOpen(false);
  setDiagnosisQuery("");
  setDiagnosisCandidates([]);
  setSelectedDiagnosis(null);
  setActiveDiagnosisTab("all");
  setQuestionCount(0);
  setHasAnyExam(false);
  setHasAnyTest(false);
  setPatientBubbleText("");
  setPatientSpeechFullText("");
  setPatientSpeechMessageId(null);
  setIsPatientTalking(false);
  setPatientMouthOpen(false);
  setSpecialistCommentModalOpen(false);
  setSettingsModalOpen(false);
  setEndingCollectionModalOpen(false);
  setEndingPreviewId(null);
  setIsEndingLibraryMode(false);
  setHintTargetEndingId(null);
  setHintModalOpen(false);
  setScreen("title");
  setPatientSpeechSilent(false);
  setDoctorMonologueVisible(false);
  setDoctorMonologueFullText("");
  setDoctorMonologueBubbleText("");
  setChartReviewText("");
  setChartReviewPosted(false);
  setChartReviewText("");
  setChartReviewPosted(false);
  setResultFeedback(null);
  setLastAction("start");
  setSessionId(uid());
}

function startGameFromTitle() {
  unlockAudio();

buttonSe.pause();
buttonSe.currentTime = 0;
buttonSe.play().catch((e) => {
  console.error("buttonSe first play failed", e, buttonSe.src);
});

  setStats({ ...cp.initialStats });
  setFlags({
    ...cp.initialFlags,
    trust_bonus_vital_done: false,
    trust_bonus_exam_done: false,
    trust_bonus_test_done: false,
  });
  setSeconds(0);
  setTimerStarted(false);
  setInput("");
  setTestsDone({});
  setResults([]);
  setSelectedCategory(null);
  setExamMode(null);
  setExamSide("front");
  setShowResultsModal(false);
  setGameOver(false);
  setEndingId(null);
  setMessages([]);
  setOrderModalOpen(false);
  setOrderCategory(null);
  setDraftOrderKeys([]);
  setPendingOrderKeys([]);
  setOtherLabGroup(null);
  setExamResultModalOpen(false);
  setExamResultModalTitle("");
  setExamResultModalItems([]);
  setIsBlackout(false);
  setInfectionSubModalOpen(false);
  setCultureSubModalOpen(false);
  setShowOrderedTestsModal(false);
  setConfirmOrderModalOpen(false);
  setConfirmOrderKeys([]);
  setDiagnosisModalOpen(false);
  setDiagnosisQuery("");
  setDiagnosisCandidates([]);
  setSelectedDiagnosis(null);
  setActiveDiagnosisTab("all");
  setQuestionCount(0);
  setHasAnyExam(false);
  setHasAnyTest(false);
  setPatientBubbleText("");
  setPatientSpeechFullText("");
  setPatientSpeechMessageId(null);
  setIsPatientTalking(false);
  setPatientMouthOpen(false);
  setSpecialistCommentModalOpen(false);
  setScreen("game");
  setPatientSpeechSilent(false);
  setDoctorMonologueVisible(false);
  setDoctorMonologueFullText("");
  setDoctorMonologueBubbleText("");
}

  function startTimerIfNeeded() {
  if (!timerStarted) {
    setTimerStarted(true);
  }
}

function getOrderModalKeys(category: TestCategory): TestKey[] {
  if (category === "blood") {
    return [
      ...BLOOD_COLUMN_1,
      ...BLOOD_BIOCHEM_1,
      ...BLOOD_BIOCHEM_2,
      ...BLOOD_BIOCHEM_3,
      "UA_QUAL",
      "UA_SEDIMENT",
      ...OTHER_GROUP_TUMOR,
      ...OTHER_GROUP_AUTOANTIBODY,
      ...OTHER_GROUP_ENDOCRINE,
      ...OTHER_GROUP_INFECTION_RAPID,
      ...OTHER_GROUP_INFECTION_SENDOUT,
      ...CULTURE_SPUTUM_KEYS,
      ...CULTURE_URINE_KEYS,
      ...CULTURE_BLOOD_KEYS,
    ];
  }

  return CATEGORY_KEYS[category] ?? [];
}

function openOrderModal(category: TestCategory) {
  if (gameOver) return;

  const modalKeys = getOrderModalKeys(category);
  const seeded = pendingOrderKeys.filter((key) => modalKeys.includes(key));

  setOrderCategory(category);
  setDraftOrderKeys(seeded);
  setOtherLabGroup(null);
  setOrderModalOpen(true);
}

function mergeUniqueTestKeys(base: TestKey[], extra: TestKey[]) {
  const merged = [...base];
  for (const key of extra) {
    if (!merged.includes(key) && !testsDone[key]) {
      merged.push(key);
    }
  }
  return merged;
}

function isQueuedOrDrafted(key: TestKey) {
  return draftOrderKeys.includes(key) || pendingOrderKeys.includes(key);
}

function isContrastCTKey(key: TestKey) {
  return (
    key === "CECT_HEAD" ||
    key === "CECT_CHEST" ||
    key === "CECT_ABDOMEN" ||
    key === "CECT_PELVIS"
  );
}

function hasCreatinineResult() {
  return !!testsDone["CR"];
}

function toggleDraftOrderKey(key: TestKey) {
  setDraftOrderKeys((prev) =>
    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
  );
}

function addDraftToPendingOrders() {
  if (!orderCategory) return;

  const modalKeys = getOrderModalKeys(orderCategory);

  const nextPending = pendingOrderKeys.filter((key) => {
    // 今開いているモーダルの対象検査はいったん全部外す
    return !modalKeys.includes(key);
  });

  const merged = mergeUniqueTestKeys(nextPending, draftOrderKeys);
  setPendingOrderKeys(merged);

  setLastAction("submit_order");
  saveDevLog({ lastAction: "submit_order" });

  setOrderModalOpen(false);
  setOrderCategory(null);
  setDraftOrderKeys([]);
  setOtherLabGroup(null);
  setInfectionSubModalOpen(false);
  setCultureSubModalOpen(false);
}

function openResultWindowAfterBlackout(performedTests: TestResult[]) {
  setIsBlackout(true);

  window.setTimeout(() => {
    setIsBlackout(false);
    playSe(testResultSe);
    setExamResultModalTitle("検査結果");
    setExamResultModalItems(performedTests);
    setExamResultModalOpen(true);
  }, 1000);
}

function submitOrders(keys: TestKey[]) {
  setHasAnyTest(true);
  if (gameOver) return;
  if (keys.length === 0) return;

  setLastAction("run_test");
  saveDevLog({ lastAction: "run_test" });

  startTimerIfNeeded();

  const selectedTests = keys.map((key) => getTest(cp, key));
  const durations = selectedTests.map(
    (tr) => TEST_TURNAROUND_MINUTES[tr.key] ?? tr.minutes
  );
  const addedMinutes = Math.max(...durations);
  const nextSeconds = seconds + addedMinutes * 60;

  const nextStats: Stats = {
    ...stats,
    condition: Math.max(0, stats.condition - 10),
  };

  setTestsDone((prev) => {
    const next = { ...prev };
    for (const tr of selectedTests) next[tr.key] = true;
    return next;
  });

  const visibleResults = selectedTests.filter(
    (tr) =>
      !SEND_OUT_TEST_KEYS.includes(tr.key) &&
      tr.category !== "culture"
  );

  setResults((prev) => {
    const existing = new Set(prev.map((r) => r.key));
    const additions = visibleResults.filter((tr) => !existing.has(tr.key));
    return [...prev, ...additions];
  });

  setSeconds(nextSeconds);
  setStats(nextStats);

  pushMessage(
    "SYSTEM",
    `【検査実施】${selectedTests.map((t) => t.label).join("、")}\n（同時実施 +${addedMinutes}分）`
  );

  const sendOutLabels = selectedTests
    .filter((tr) => SEND_OUT_TEST_KEYS.includes(tr.key))
    .map((tr) => tr.label);

  if (sendOutLabels.length > 0) {
    pushMessage(
      "SYSTEM",
      `【外注検査】${sendOutLabels.join("、")}\n結果はこのシミュレーター中には返却されません。`
    );
  }

  const cultureLabels = selectedTests
    .filter((tr) => tr.category === "culture")
    .map((tr) => tr.label);

  if (cultureLabels.length > 0) {
    pushMessage(
      "SYSTEM",
      `【培養検査】${cultureLabels.join("、")}\n結果はこのシミュレーター中には返却されません。`
    );
  }

  if (visibleResults.length > 0) {
    openResultWindowAfterBlackout(visibleResults);
  }

  evaluateEndConditions(nextStats, nextSeconds);
}

function calcOrderMinutes(keys: TestKey[]) {
  if (keys.length === 0) return 0;
  const selectedTests = keys.map((key) => getTest(cp, key));
  const durations = selectedTests.map(
    (tr) => TEST_TURNAROUND_MINUTES[tr.key] ?? tr.minutes
  );
  return Math.max(...durations);
}

function openConfirmOrderModal(keys: TestKey[]) {
  const merged = mergeUniqueTestKeys([], keys.filter((key) => !testsDone[key]));
  if (merged.length === 0) return;
  setConfirmOrderKeys(merged);
  setConfirmOrderModalOpen(true);
}

function submitPendingOrders() {
  openConfirmOrderModal(pendingOrderKeys);
}

function openDiagnosisModal() {
  if (gameOver) return;

  setDiagnosisQuery("");
  setActiveDiagnosisTab("all");
  setDiagnosisCandidates([...ICD_MASTER].sort((a, b) => compareIcdCode(a.code, b.code)));
  setSelectedDiagnosis(null);
  setDiagnosisModalOpen(true);
  setLastAction("open_diagnosis");
}

function queuePatientEndingLines(lines: string[], onDone: () => void) {
  if (lines.length === 0) {
    onDone();
    return;
  }

  let delay = 0;

  lines.forEach((line, index) => {
    window.setTimeout(() => {
      pushMessage("PATIENT", line);

      // 最後の行だけ終了処理
      if (index === lines.length - 1) {
        window.setTimeout(() => {
          onDone();
        }, 2500); // ← 最後は余韻長め
      }
    }, delay);

    // ▼ここが重要（間を長くする）
    const base = 2000; // ← 全体的にゆっくり
    const perChar = 65; // ← 文字に応じてさらに遅く

    delay += base + line.length * perChar;
  });
}

  function onSend() {
  if (gameOver) return;

  const text = input.trim();
  if (!text) return;

  unlockAudio();

  setInput("");

  pushMessage("DOCTOR", text);

  setQuestionCount((prev) => prev + 1);

  const out = patientReplyEngine({ text, stats, flags });

const nextStats: Stats = {
  ...out.stats,
  condition: Math.max(0, out.stats.condition - 5),
};

let nextFlags = out.flags;

setStats(nextStats);
pushMessage("PATIENT", out.reply);

// father診断導線がこのターンで初めて成立したら、医師の独白を1回だけ出す
const fatherDiagJustUnlocked =
  !Boolean((flags as any).father_diag_ready) &&
  Boolean((nextFlags as any).father_diag_ready) &&
  !Boolean((nextFlags as any).father_diag_prompted);

if (fatherDiagJustUnlocked) {
  window.setTimeout(() => {
    const text =
      "（ふらつき、嘔吐、頭痛、性格変化。そして父方はがんの家系。もしかしたら、お父さんは……？）";

    startDoctorMonologueBubble(text);
    pushMessage("DOCTOR", text, { color: "#ff4d4f" });
  }, 3000);

  nextFlags = {
    ...(nextFlags as any),
    father_diag_prompted: true,
  } as Flags;
}

const scamDiagJustUnlocked =
  !Boolean((flags as any).scam_diag_ready) &&
  Boolean((nextFlags as any).scam_diag_ready) &&
  !Boolean((nextFlags as any).scam_diag_prompted);

if (scamDiagJustUnlocked) {
  window.setTimeout(() => {
    const text = "（これって、あの病なんじゃ……。）";

    startDoctorMonologueBubble(text);
    pushMessage("DOCTOR", text, { color: "#ff4d4f" });
  }, 3300);

  nextFlags = {
    ...(nextFlags as any),
    scam_diag_prompted: true,
  } as Flags;
}

setFlags(nextFlags);

evaluateEndConditions(nextStats, seconds);
}

function confirmDiagnosis() {
  if (!selectedDiagnosis) return;

  setLastAction("confirm_diagnosis");
saveDevLog({
  diagnosisLabel: selectedDiagnosis?.label ?? getDiagnosisShareLabel(),
  lastAction: "confirm_diagnosis",
});

  const insufficient =
    questionCount <= 2 &&
    !hasAnyExam &&
    !hasAnyTest;

  if (insufficient) {
    pushMessage("PATIENT", "ちゃんと診察してくれませんか？");

    setStats((prev) => ({
      ...prev,
      trust: Math.max(0, prev.trust - 10),
    }));

    setDiagnosisModalOpen(false);
    return;
  }

  // 診断が受理された時点で時間停止
  setTimerStarted(false);

  pushMessage(
    "SYSTEM",
    `診断：${selectedDiagnosis.label}（${selectedDiagnosis.code}）`
  );

  const fatherReady = !!flags.father_diag_ready;

  const soccerReady =
    stats.trust >= 100 &&
    stats.validation >= 100 &&
    stats.openness >= 100 &&
    !!flags.talked_soccer;

const scamReady =
  !!flags.scam_diag_ready ||
  (
    !!flags.scam_route_unlocked &&
    !!flags.heard_other_partner &&
    !!flags.heard_money_request &&
    !!flags.heard_money_support_intent
  );

  const allNames = [
  selectedDiagnosis.code,
  selectedDiagnosis.label,
  ...(selectedDiagnosis.aliases ?? []),
].map(normalizeDiagnosisText);

const exactTruthHit =
  selectedDiagnosis.label === cp.truth.diagnosis ||
  (selectedDiagnosis.aliases ?? []).includes(cp.truth.diagnosis);

const pneumoniaHit = exactTruthHit || allNames.some((name) =>
  ["肺炎", "市中肺炎", "細菌性肺炎", "肺炎球菌肺炎", "肺炎球菌性肺炎"].includes(name)
);

  const fatherHit = allNames.some((name) =>
  ["脳腫瘍", "脳腫瘍疑い", "脳腫瘍の可能性", "脳腫瘍性病変"].includes(name)
);

  const scamHit = allNames.some((name) =>
  [
    "special_scam",
    "恋の病",
    "詐欺",
    "美人局",
    "ハニートラップ",
    "いただき女子",
  ].map(normalizeDiagnosisText).includes(name)
);

  if (fatherReady && fatherHit) {
  setDiagnosisModalOpen(false);

  queuePatientEndingLines(
    [
      "そうですか……父は病気だったかもしれないんですね。",
      "良かった。父は嫌な人じゃなかったんだ。\n俺も親になったら、嫌なヤツになっちゃうんじゃないかって、気にしてたんです。",
      "もちろん想像だから断定できないのは理解してます。\nでも今日それを聞けて良かったです。",
      "ありがとうございました。",
    ],
    () => {
  setFlags((prev) => ({
    ...prev,
    pending_ending_id: "father_truth",
  }));
  setShowNextButton(true);
}
  );

  return;
}

  if (soccerReady && pneumoniaHit) {
    setDiagnosisModalOpen(false);

    queuePatientEndingLines(
  [
    "肺炎ですか！てっきり風邪だと思ってました。",
    "先生と話してるとすごい楽しいし、気もあいますよね。\n今度、フットサルあるとき誘っていいっすか？",
  ],
  () => {
    setShowNextButton(true);
    setFlags((prev) => ({
      ...prev,
      pending_ending_id: "soccer_end",
    }));
  }
);

return;
  }

if (scamReady && scamHit) {
  setDiagnosisModalOpen(false);

  queuePatientEndingLines(
  [
    "そんな！詐欺なんかじゃありませんよ！彼女はウソをつくような人じゃない！",
    "先生は会ったことないから分からないんですよ！\n俺は彼女を助けたいだけなんで、決めました。\nこれからお金を渡しに行きます！",
  ],
  () => {
    setShowNextButton(true);
    setFlags((prev) => ({
      ...prev,
      pending_ending_id: "honeytrap_scam",
    }));
  }
);

return;
}

  if (exactTruthHit || pneumoniaHit) {
  setDiagnosisModalOpen(false);
  beginEnding("normal_pneumonia");
  return;
}

  setDiagnosisModalOpen(false);
  beginEnding("misdiagnosis");

  setDiagnosisModalOpen(false);
}

    function pushExamFinding(text: string) {
    pushMessage("SYSTEM", `【身体診察】${text}`);
  }

    function handleBodyExamClick(x: number, y: number) {
    setHasAnyExam(true);
    if (!Boolean((flags as any).trust_bonus_exam_done)) {
      setStats((prev) => ({
        ...prev,
        trust: Math.min(100, prev.trust + 10),
      }));
      setFlags((prev) => ({
        ...prev,
        trust_bonus_exam_done: true,
      }));
    }
    
    if (!examMode) return;

    // 視診・触診・打診はどこでも異常なし
    if (examMode === "inspection") {
      pushExamFinding("視診：異常なし");
      return;
    }

    if (examMode === "palpation") {
      pushExamFinding("触診：異常なし");
      return;
    }

    if (examMode === "percussion") {
      pushExamFinding("打診：異常なし");
      return;
    }

    // 聴診
    if (examMode !== "auscultation") return;

    if (examSide === "back") {
      // 600 x 700 想定
      // 右背部肺底部：右寄り下部
      if (x >= 320 && x <= 520 && y >= 380 && y <= 620) {
        pushExamFinding("聴診：右背部肺底部で水泡性ラ音（coarse crackles）");
        return;
      }

      pushExamFinding("聴診：呼吸音清／副雑音なし");
      return;
    }

    // 前面：中央やや左下を心臓領域とみなす
    if (x >= 220 && x <= 360 && y >= 260 && y <= 430) {
      pushExamFinding("聴診：心音異常なし／雑音なし");
      return;
    }

    pushExamFinding("聴診：呼吸音清／副雑音なし");
  }

  if (screen === "splash") {
  return (
    <div
      onClick={() => {
        if (splashPhase !== "notice") return;
        unlockAudio();
        playSe(buttonSe);
        setScreen("title");
      }}
      style={{
        width: "100vw",
        height: "100vh",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        cursor: splashPhase === "notice" ? "pointer" : "default",
      }}
    >
      {splashPhase === "logo" && (
        <img
          src={SPLASH_LOGO_SRC}
          alt="てべ猫GAMES"
          style={{
            width: 600,
            maxWidth: "72vw",
            height: "auto",
            opacity: splashLogoVisible ? 1 : 0,
            transition: "opacity 0.6s ease",
            display: "block",
          }}
        />
      )}

      {splashPhase === "notice" && (
        <div
          style={{
            width: "min(980px, 88vw)",
            padding: "34px 38px",
            borderRadius: 24,
            background: "rgba(255,255,255,0.96)",
            border: "2px solid rgba(0,0,0,0.12)",
            boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
            color: "#111111",
            textAlign: "center",
            lineHeight: 1.9,
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 1000,
              marginBottom: 18,
              letterSpacing: "0.04em",
            }}
          >
            ご注意
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              whiteSpace: "pre-wrap",
            }}
          >
            本作はフィクションであり、実在の人物・団体とは一切関係ありません。
            {"\n"}
            また医療をモチーフにしていますが、実際の医療行為や診断を目的としたものではありません。
          </div>
        </div>
      )}
    </div>
  );
}

    if (screen === "title") {
  return (
    <div
  style={{
    width: "100vw",
    height: "100vh",
    backgroundColor: "#dff6f8",
    backgroundImage: `url(${TITLE_BG_SRC})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
    position: "relative",
    overflow: "hidden",
  }}
>
  <div
  style={{
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.16)",
    pointerEvents: "none",
  }}
/>

      {/* ロゴ */}
      <img
  src={TITLE_LOGO_SRC}
  alt="タイトルロゴ"
  style={{
    width: "min(1400px, 100vw)",
    height: "auto",
    display: "block",
    marginTop: -90,
    marginBottom: 4,
    position: "relative",
    zIndex: 1,
  }}
/>

{/* サブテキスト */}
<div
  style={{
    color: "#000000",
    fontSize: 28,
    fontWeight: 900,
    textShadow: "0 2px 4px rgba(255,255,255,0.5)",
    marginBottom: 4,
    position: "relative",
    zIndex: 1,
    letterSpacing: "0.04em",
  }}
>
  ＜問診、診察、検査から診断へ辿り着け！＞
</div>

      {/* ボタンエリア */}
      <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 16,
    alignItems: "center",
    marginTop: 4,
    position: "relative",
    zIndex: 1,
  }}
>
        {/* ゲーム開始 */}
        <button
          onClick={startGameFromTitle}
          style={{
  padding: "16px 50px",
  fontSize: 35,
  fontWeight: 1000,
  color: "#000000",
  background: "rgba(132, 195, 255, 0.94)",
  border: "3px solid rgba(39, 39, 39, 0.7)",
  borderRadius: 30,
  cursor: "pointer",
  backdropFilter: "blur(2px)",
}}
        >
          ゲーム開始
        </button>

        {/* 横並び3ボタン */}
        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => {
              unlockAudio();
              playSe(buttonSe);
              setSettingsModalOpen(true);
            }}
            style={commonSubButtonStyle}
          >
            設定
          </button>

          <button
            onClick={() => {
              unlockAudio();
              playSe(buttonSe);
              setEndingCollectionModalOpen(true);
            }}
            style={commonSubButtonStyle}
          >
            エンド集
          </button>

<button
  onClick={() => {
    unlockAudio();
    playSe(buttonSe);
    setCreditModalOpen(true);
  }}
  style={commonSubButtonStyle}
>
  クレジット
</button>

          <button
            onClick={() =>
              window.open(TEBENEKO_GAMES_URL, "_blank", "noopener,noreferrer")
            }
            style={commonSubButtonStyle}
          >
            公式サイト
          </button>
        </div>
      </div>

      {settingsModalOpen && (
        <Modal
          onClose={() => {
            playSe(buttonSe);
            setSettingsModalOpen(false);
          }}
          title="設定"
        >
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 800 }}>
                BGM音量：{Math.round(bgmVolume * 100)}%
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(bgmVolume * 100)}
                onChange={(e) => setBgmVolume(Number(e.target.value) / 100)}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 800 }}>
                SE音量：{Math.round(seVolume * 100)}%
              </div>
              <input
  type="range"
  min={0}
  max={100}
  step={1}
  value={Math.round(seVolume * 100)}
  onChange={(e) => {
    const v = Number(e.target.value) / 100;
    setSeVolume(v);

    // 👇これ追加
    if (audioUnlocked) {
      buttonSe.pause();
      buttonSe.currentTime = 0;
      buttonSe.play().catch(() => {});
    }
  }}
/>
            </div>
          </div>
        </Modal>
      )}

      {endingCollectionModalOpen && (
        <Modal
          onClose={() => {
            playSe(buttonSe);
            setEndingCollectionModalOpen(false);
          }}
          title="エンド集"
        >
          {(() => {
  const goodEndings: EndingId[] = [
    "normal_pneumonia",
    "father_truth",
    "honeytrap_scam",
    "soccer_end",
  ];

  const badEndings: EndingId[] = [
    "admission_condition",
    "admission_time",
    "trust_break",
    "misdiagnosis",
  ];

  return (
          <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    alignItems: "start",
  }}
>
  {/* 左：通常エンド */}
  <div style={{ display: "grid", gap: 12 }}>
    <div style={{ fontWeight: 900, fontSize: 18, color: "#6bdcff" }}>
      エンド
    </div>

    {goodEndings.map((id) => {
      const unlocked = !!unlockedEndings[id];

      return (
        <div
          key={id}
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            border: unlocked
              ? "1px solid rgba(120,200,255,0.55)"
              : "1px solid rgba(255,255,255,0.08)",
            background: unlocked ? "rgba(70,110,180,0.25)" : "#2b2b38",
            color: "#fff",
            opacity: unlocked ? 1 : 0.8,
            display: "grid",
            gap: 10,
          }}
        >
          <button
            onClick={() => {
              if (!unlocked) return;
              playSe(buttonSe);
              setEndingCollectionModalOpen(false);
              setIsEndingLibraryMode(true);
              setEndingId(id);
              setScreen("ending");
            }}
            disabled={!unlocked}
            style={{
              textAlign: "left",
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: unlocked ? "pointer" : "default",
              padding: 0,
              opacity: unlocked ? 1 : 0.55,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {unlocked ? ENDING_TITLE_MAP[id] : "？？？"}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
              {unlocked ? "クリックでエンド画面表示" : "未解放"}
            </div>
          </button>

          {!unlocked && (
            <button
              onClick={() => {
  playSe(buttonSe);
  setHintTargetEndingId(id);
  setHintModalOpen(true);
}}
              style={{
                justifySelf: "start",
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              ヒント
            </button>
          )}
        </div>
      );
    })}
  </div>

  {/* 右：バッドエンド */}
  <div style={{ display: "grid", gap: 12 }}>
    <div style={{ fontWeight: 900, fontSize: 18, color: "#ff6b6b" }}>
      バッドエンド
    </div>

    {badEndings.map((id) => {
      const unlocked = !!unlockedEndings[id];

      return (
        <div
          key={id}
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            border: unlocked
              ? "1px solid rgba(255,200,200,0.35)"
              : "1px solid rgba(255,255,255,0.08)",
            background: unlocked ? "rgba(120,60,60,0.22)" : "#2b2b38",
            color: "#fff",
            opacity: unlocked ? 1 : 0.8,
            display: "grid",
            gap: 10,
          }}
        >
          <button
            onClick={() => {
              if (!unlocked) return;
              playSe(buttonSe);
              setEndingCollectionModalOpen(false);
              setIsEndingLibraryMode(true);
              setEndingId(id);
              setScreen("ending");
            }}
            disabled={!unlocked}
            style={{
              textAlign: "left",
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: unlocked ? "pointer" : "default",
              padding: 0,
              opacity: unlocked ? 1 : 0.55,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {unlocked ? ENDING_TITLE_MAP[id] : "？？？"}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
              {unlocked ? "クリックでエンド画面表示" : "未解放"}
            </div>
          </button>

          {!unlocked && (
            <button
              onClick={() => {
  playSe(buttonSe);
  setHintTargetEndingId(id);
  setHintModalOpen(true);
}}
              style={{
                justifySelf: "start",
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              ヒント
            </button>
          )}
        </div>
      );
    })}
  </div>
</div>
  );
})()}
        </Modal>
      )}

{creditModalOpen && (
  <Modal
    onClose={() => {
      playSe(buttonSe);
      setCreditModalOpen(false);
    }}
    title=""
  >
    <div
      style={{
        display: "grid",
        placeItems: "center",
      }}
    >
      <img
        src={CREDIT_IMAGE_SRC}
        alt="クレジット"
        style={{
          maxWidth: "100%",
          maxHeight: "70vh",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  </Modal>
)}

      {endingPreviewId && (
        <Modal
          onClose={() => {
            playSe(buttonSe);
            setEndingPreviewId(null);
          }}
          title={ENDING_TITLE_MAP[endingPreviewId]}
        >
          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                padding: 18,
                borderRadius: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 18,
                lineHeight: 1.8,
                whiteSpace: "pre-line",
              }}
            >
              {SPECIALIST_COMMENT_MAP[endingPreviewId]}
            </div>

            <button
              onClick={() => {
                playSe(buttonSe);
                setEndingPreviewId(null);
              }}
              style={{
                justifySelf: "center",
                padding: "12px 22px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#2b3242",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              閉じる
            </button>
          </div>
        </Modal>
      )}

      {hintModalOpen && hintTargetEndingId && (
        <Modal
          onClose={() => {
            playSe(buttonSe);
            setHintModalOpen(false);
            setHintTargetEndingId(null);
          }}
          title="解放ヒント"
        >
          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                padding: 18,
                borderRadius: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 18,
                lineHeight: 1.8,
                whiteSpace: "pre-line",
              }}
            >
              {ENDING_HINT_MAP[hintTargetEndingId]}
            </div>

            <button
              onClick={() => {
                playSe(buttonSe);
                setHintModalOpen(false);
                setHintTargetEndingId(null);
              }}
              style={{
                justifySelf: "center",
                padding: "12px 22px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#2b3242",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              閉じる
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

  if (screen === "ending" && endingId) {
  const endingTitleMap: Record<EndingId, string> = {
    normal_pneumonia: "エンド１：診断的中！",
    admission_condition: "バッドエンド１：緊急入院",
    admission_time: "バッドエンド２：時間オーバー",
    trust_break: "バッドエンド３：失礼だな！",
    misdiagnosis: "バッドエンド４：誤診",
    father_truth: "エンド２：父の真実",
    honeytrap_scam: "エンド３：恋の落とし穴",
    soccer_end: "エンド４：先生に出会えたことが奇跡",
  };

  const endingNarrationMap: Record<EndingId, string> = {
    normal_pneumonia:
      "細菌性肺炎と判断し、抗菌薬を処方した。\n外来フォローの方針となり、数日で病状は改善した。",
    admission_condition:
      "体調がすぐれず、入院となってしまった。もっと効率的な診察をしなきゃ。",
    admission_time:
      "時間をかけすぎて上司に怒られてしまった。結局、何の病気だったんだろう……？",
    trust_break:
      "患者は不信感を示し、席を立って帰って行った……",
    misdiagnosis:
      "薬を処方し帰宅したけど、後日緊急入院したと聞いた。\n診断が間違っていたのだろうか……",
    father_truth:
      "患者は父を“嫌な人”として見ることをやめられた。",
    honeytrap_scam:
      "それは病気ではなく、人間関係の罠だった。",
    soccer_end:
      "診療の先に、患者との強い絆が生まれた。",
  };

  const endingImageMap: Record<EndingId, string> = {
    normal_pneumonia: "/normal_pneumonia.webp",
    admission_condition: "/admission_condition.webp",
    admission_time: "/admission_time.webp",
    trust_break: "/trust_break.webp",
    misdiagnosis: "/misdiagnosis.webp",
    father_truth: "/father_truth.webp",
    honeytrap_scam: "/honeytrap_scam.webp",
    soccer_end: "/soccer_end.webp",
  };

  const isBadEnding =
  endingId === "admission_condition" ||
  endingId === "admission_time" ||
  endingId === "trust_break" ||
  endingId === "misdiagnosis";

const endingMainTitle = isBadEnding ? "診察失敗" : "診断完了";

return (
  <div
    style={{
      width: "100vw",
      height: "100vh",
      background: "#000",
      color: "#fff",
      display: "grid",
      placeItems: "start center",
      paddingTop: 60,
    }}
  >
    <div
  style={{
    textAlign: "center",
    display: "grid",
    gap: 14,
    maxWidth: 980,
    padding: 20,
  }}
>
      {/* 一番上の文言 */}
<div
  style={{
    fontSize: 22,
    fontWeight: 800,
    opacity: 0.9,
    letterSpacing: "0.08em",
  }}
>
  {endingTitleMap[endingId]}
</div>

{/* メイン見出し */}
<div
  style={{
    fontSize: 46,
    fontWeight: 900,
    color: isBadEnding ? "#ff6b6b" : "#fdd628dc",
  }}
>
  {endingMainTitle}
</div>

{/* 画像 ←ここに移動 */}
<img
  src={endingImageMap[endingId]}
  style={{
    width: "min(900px, 86vw)",
    maxHeight: "52vh",
    objectFit: "contain",
    margin: "0 auto",
    borderRadius: 16,
  }}
/>

{/* ナレーション */}
<div
  style={{
    fontSize: 26,
    lineHeight: 1.9,
    opacity: 0.95,
    whiteSpace: "pre-line",
  }}
>
  {endingNarrationMap[endingId]}
</div>

      <div
  style={{
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 12,
  }}
>
  {!isBadEnding && (
  <button
  onClick={() => {
    playSe(buttonSe);
    setSpecialistCommentModalOpen(true);
  }}
  style={{
    padding: "20px 30px",
    borderRadius: 20,
    border: "2px solid rgba(255,255,255,0.16)",
    background: "#263042",
    color: "#fff",
    fontWeight: 1000,
    fontSize: 24,
    cursor: "pointer",
  }}
>
  専門医の解説
</button>
)}

  {!isEndingLibraryMode && (
    <button
      onClick={() => {
        playSe(buttonSe);
        setScreen("result");
      }}
      style={{
        padding: "20px 30px",
        borderRadius: 20,
        border: "2px solid rgba(255,255,255,0.16)",
        background: "#2b3242",
        color: "#fff",
        fontWeight: 1000,
        fontSize: 24,
        cursor: "pointer",
      }}
    >
      リザルトへ
    </button>
  )}

  {isEndingLibraryMode && (
    <button
      onClick={() => {
        playSe(buttonSe);
        setIsEndingLibraryMode(false);
        setEndingId(null);
        setScreen("title");
      }}
      style={{
        padding: "20px 30px",
        borderRadius: 20,
        border: "2px solid rgba(255,255,255,0.16)",
        background: "#2b3242",
        color: "#fff",
        fontWeight: 1000,
        fontSize: 24,
        cursor: "pointer",
      }}
    >
      タイトルへ戻る
    </button>
  )}
</div>

{specialistCommentModalOpen && endingId && (
  <Modal
    title="専門医の解説"
    onClose={() => {
      playSe(buttonSe);
      setSpecialistCommentModalOpen(false);
    }}
    width="min(1200px, 96vw)"
  >
    <div
      style={{
        display: "grid",
        gap: 16,
        maxHeight: "82vh",
        overflowY: "auto",
        justifyItems: "center",
      }}
    >
      <img
        src={SPECIALIST_IMAGE_MAP[endingId]}
        alt={`専門医の解説 ${ENDING_TITLE_MAP[endingId]}`}
        style={{
          width: "100%",
          height: "auto",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          background: "#fff",
        }}
      />
    </div>
  </Modal>
)}
    </div>
  </div>
);
}

  if (screen === "result" && endingId) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${RESULT_BG_SRC})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "grid",
        placeItems: "center",
        padding: isResultPhone ? 8 : 14,
        boxSizing: "border-box",
      }}
    >
      <div
        className="card"
        style={{
          width: "min(1100px, 96vw)",
          maxHeight: "94vh",
          overflowY: "auto",
          padding: isResultPhone ? 12 : isResultCompact ? 16 : 18,
          display: "grid",
          gap: isResultPhone ? 10 : 12,
          background: "rgba(7,12,24,0.74)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: isResultPhone ? 16 : 22,
          boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
          color: "#fff",
          backdropFilter: "blur(4px)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: isResultPhone ? 28 : isResultCompact ? 38 : 46,
            fontWeight: 1000,
            letterSpacing: "0.08em",
            lineHeight: 1,
          }}
        >
          RESULT
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isResultCompact ? "1fr" : "1fr 320px",
            gap: isResultPhone ? 10 : 12,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: isResultPhone ? 6 : 8,
              alignContent: "start",
              justifyItems: "center",
              textAlign: "center",
              padding: isResultPhone ? "2px" : "4px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: isResultPhone ? 24 : isResultCompact ? 32 : 38,
                fontWeight: 1000,
                lineHeight: 1.3,
                textShadow: "0 2px 10px rgba(0,0,0,0.28)",
                whiteSpace: isResultPhone ? "normal" : "nowrap",
              }}
            >
              {ENDING_TITLE_MAP[endingId]}
            </div>

            <div
              style={{
                display: "grid",
                gap: isResultPhone ? 4 : 6,
                fontSize: isResultPhone ? 16 : isResultCompact ? 18 : 20,
                lineHeight: 1.55,
                opacity: 0.96,
              }}
            >
              <div>経過時間: {clockText}</div>
              <div>問診数: {questionCount}</div>
              <div>検査数: {results.length}</div>
              <div>診断: {getDiagnosisShareLabel()}</div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: isResultPhone ? 10 : 12,
              display: "grid",
              gap: isResultPhone ? 6 : 8,
              width: "100%",
              margin: "0 auto",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 16,
              boxSizing: "border-box",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontWeight: 900,
                fontSize: isResultPhone ? 18 : 22,
                textAlign: "center",
              }}
            >
              状態
            </div>

            <div style={{ display: "grid", gap: isResultPhone ? 6 : 8 }}>
              {PARAMETER_LABELS.map((item) => (
                <StatBar
                  key={item.key}
                  label={item.label}
                  value={stats[item.key]}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: isResultPhone ? 12 : 14,
            display: "grid",
            gap: isResultPhone ? 10 : 12,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            boxSizing: "border-box",
            minWidth: 0,
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <div
              style={{
                fontSize: isResultPhone ? 20 : 24,
                fontWeight: 1000,
                letterSpacing: "0.04em",
              }}
            >
              症例カルテ
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: isResultPhone ? 8 : 12,
                fontSize: isResultPhone ? 13 : 15,
                lineHeight: 1.6,
                opacity: 0.9,
              }}
            >
              <span>・見逃したかもしれないポイント</span>
              <span>・判断が難しかった場面</span>
              <span>・追加で知りたかった情報</span>
            </div>
          </div>

          <textarea
            value={chartReviewText}
            onChange={(e) => setChartReviewText(e.target.value.slice(0, 180))}
            placeholder="例：発症時期をもう少し詳しく聞くべきだった。咳と痰の経過を時系列で確認したかった。"
            style={{
              width: "100%",
              minHeight: isResultPhone ? 82 : 96,
              resize: "none",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(0,0,0,0.22)",
              color: "#fff",
              padding: isResultPhone ? "10px 12px" : "12px 14px",
              fontSize: isResultPhone ? 15 : 17,
              lineHeight: 1.55,
              boxSizing: "border-box",
              outline: "none",
            }}
          />

          <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    fontSize: isResultPhone ? 12 : 15,
    lineHeight: 1.7,
    opacity: 0.76,
    minWidth: 0,
  }}
>
  <div style={{ minWidth: 0 }}>
    この症例は、プレイヤーの考察や記録の積み重ねによって少しずつ理解が深まっていきます。
    {chartReviewPosted ? "　投稿済み" : ""}
  </div>

  <div
    style={{
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}
  >
    （{chartReviewText.length} / 180）
  </div>
</div>

         <div
  style={{
    display: "grid",
    gridTemplateColumns: isResultCompact ? "1fr" : "1.7fr 0.8fr 0.8fr",
    gap: 10,
    alignItems: "center",
  }}
>
  <div
    style={{
      display: "grid",
      gap: 8,
      padding: isResultPhone ? "10px" : "12px",
      borderRadius: 14,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      minWidth: 0,
    }}
  >
    <div
      style={{
        fontSize: isResultPhone ? 15 : 16,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      この症例どうだった？
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 8,
      }}
    >
      {[
        { key: "interesting", label: "👍 面白かった" },
        { key: "difficult", label: "🤔 難しかった" },
        { key: "confusing", label: "😵 よく分からない" },
      ].map((item) => {
        const active = resultFeedback === item.key;
        return (
          <button
            key={item.key}
            onClick={() => {
              playSe(buttonSe);
              setResultFeedback(item.key as ResultFeedback);
              saveDevLog({
                feedback: item.key as ResultFeedback,
                lastAction: "result",
              });
            }}
            style={{
              width: "100%",
              padding: isResultPhone ? "8px 8px" : "9px 10px",
              borderRadius: 999,
              border: active
                ? "1px solid rgba(96,165,250,0.9)"
                : "1px solid rgba(255,255,255,0.14)",
              background: active
                ? "rgba(59,130,246,0.22)"
                : "rgba(255,255,255,0.06)",
              color: "#fff",
              fontWeight: 800,
              fontSize: isResultPhone ? 12 : 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  </div>

  <button
    onClick={() => {
      playSe(buttonSe);
      shareChartToX();
    }}
    style={{
      width: "100%",
      height: isResultPhone ? 48 : 50,
      padding: "0 10px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "#111",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 900,
      fontSize: isResultPhone ? 14 : 15,
      whiteSpace: "nowrap",
    }}
  >
    Xで共有
  </button>

  <button
    onClick={() => {
      playSe(buttonSe);
      shareChartToFacebook();
    }}
    style={{
      width: "100%",
      height: isResultPhone ? 48 : 50,
      padding: "0 10px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "#4267B2",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 900,
      fontSize: isResultPhone ? 14 : 15,
      whiteSpace: "nowrap",
    }}
  >
    Facebookで共有
  </button>
</div>
</div>
<div
  style={{
    display: "grid",
    gridTemplateColumns: isResultCompact ? "1fr" : "1fr auto auto",
    gap: 12,
    alignItems: "center",
    padding: isResultPhone ? "12px 4px 0" : "14px 4px 0",
    minWidth: 0,
  }}
>
  <div
    style={{
      fontSize: isResultPhone ? 14 : 18,
      lineHeight: 1.6,
      opacity: 0.92,
      minWidth: 0,
      textAlign: "right",
      justifySelf: "end",
    }}
  >
    医療知識を使って戦うカードゲーム『レギュレア』も公開中
  </div>

  <button
    onClick={() => {
      playSe(buttonSe);
      window.open(PORTAL_URL, "_blank", "noopener,noreferrer");
      saveDevLog({ lastAction: "result" });
    }}
    style={{
      padding: isResultPhone ? "10px 18px" : "11px 22px",
      borderRadius: 12,
      border: "1px solid rgba(96,165,250,0.36)",
      background:
        "linear-gradient(135deg, rgba(37,99,235,0.92), rgba(29,78,216,0.92))",
      color: "#fff",
      fontWeight: 900,
      fontSize: isResultPhone ? 14 : 15,
      cursor: "pointer",
      whiteSpace: "nowrap",
      minWidth: isResultPhone ? 108 : 160,
    }}
  >
    作品一覧
  </button>

  <button
    onClick={() => {
      playSe(buttonSe);
      resetToTitle();
    }}
    style={{
      padding: isResultPhone ? "10px 18px" : "11px 22px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.18)",
      background: "rgba(43,50,66,0.92)",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 900,
      fontSize: isResultPhone ? 14 : 15,
      whiteSpace: "nowrap",
      minWidth: isResultPhone ? 108 : 160,
    }}
  >
    タイトルへ
  </button>
</div>
          </div>
        </div>

  );
}

  return (
  <div
    onPointerDownCapture={() => {
      if (!gameOver) startTimerIfNeeded();
    }}
    style={{
  minHeight: "100vh",
  height: isPhone ? "auto" : "100vh",
  overflowX: "hidden",
  overflowY: isPhone ? "auto" : "hidden",
  padding: isPhone ? 8 : 12,
  display: "grid",
  gridTemplateColumns: isPhone ? "1fr" : "320px minmax(520px, 1fr) 420px",
  gridTemplateRows: isPhone
    ? "auto minmax(320px, 46vh) minmax(220px, 30vh) auto"
    : "1fr 120px",
  gap: isPhone ? 8 : 12,
  background: "#0b0d12",
  cursor:
    examMode === "auscultation"
      ? `url(${STETHOSCOPE_CURSOR_SRC}) 16 16, auto`
      : examMode === "inspection"
      ? "zoom-in"
      : examMode === "palpation" || examMode === "percussion"
      ? "pointer"
      : "default",
  boxSizing: "border-box",
}}
  >
      {/* LEFT */}
      <div
        className="card"
        style={{
  padding: isPhone ? 10 : 12,
  display: "grid",
  gridTemplateRows: "auto auto auto 1fr auto auto",
  gap: isPhone ? 8 : 10,
  minHeight: 0,
  gridRow: isPhone ? "auto" : "1 / span 2",
  order: isPhone ? 1 : undefined,
}}
      >
        <div style={{ fontSize: 22, fontWeight: 900 }}>28歳男性　主訴：発熱</div>

<div style={{ fontSize: 16, opacity: 0.85 }}>
  経過時間：{clockText}
</div>

                <div className="card" style={{ padding: 10, display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>状態</div>
          <div style={{ display: "grid", gap: 8 }}>
            {PARAMETER_LABELS.map((item) => (
              <StatBar key={item.key} label={item.label} value={stats[item.key]} />
            ))}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 10,
            display: "grid",
            gap: 8,
            alignContent: "start",
            overflow: "auto",
            minHeight: 0,
          }}
        >
          <button
  onClick={() => {
    playSe(buttonSe);
    openOrderModal("vital");
  }}
  disabled={!!gameOver}
>
  バイタルサイン
</button>
          <button
  onClick={() => {
    playSe(buttonSe);
    if (selectedCategory === "physical") {
      setSelectedCategory(null);
      setExamMode(null);
      setLastAction("body_exam");
      setExamSide("front");
    } else {
      setSelectedCategory("physical");
      setExamMode(null);
      setExamSide("front");
    }
  }}
  disabled={!!gameOver}
  style={{
    border:
      selectedCategory === "physical"
        ? "2px solid rgba(120,200,255,0.9)"
        : undefined,
    background:
      selectedCategory === "physical"
        ? "rgba(70,110,180,0.35)"
        : undefined,
  }}
>
  身体診察
</button>

{selectedCategory === "physical" && (
  <div
    className="card"
    style={{
      marginTop: 12,
      padding: 10,
      display: "grid",
      gap: 8,
    }}
  >
    <div style={{ fontWeight: 700, fontSize: 14 }}>身体診察</div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <button
  onClick={() => {
    playSe(buttonSe);
    setExamMode("inspection");
  }}
  disabled={!!gameOver}
  style={{
    border: examMode === "inspection" ? "2px solid rgba(120,200,255,0.9)" : undefined,
    background: examMode === "inspection" ? "rgba(70,110,180,0.35)" : undefined,
  }}
>
  視診
</button>
     <button
  onClick={() => {
    playSe(buttonSe);
    setExamMode("auscultation");
  }}
  disabled={!!gameOver}
  style={{
    border: examMode === "auscultation" ? "2px solid rgba(120,200,255,0.9)" : undefined,
    background: examMode === "auscultation" ? "rgba(70,110,180,0.35)" : undefined,
  }}
>
  聴診
</button>
      <button
  onClick={() => {
    playSe(buttonSe);
    setExamMode("palpation");
  }}
  disabled={!!gameOver}
  style={{
    border: examMode === "palpation" ? "2px solid rgba(120,200,255,0.9)" : undefined,
    background: examMode === "palpation" ? "rgba(70,110,180,0.35)" : undefined,
  }}
>
  触診
</button>
      <button
  onClick={() => {
    playSe(buttonSe);
    setExamMode("percussion");
  }}
  disabled={!!gameOver}
  style={{
    border: examMode === "percussion" ? "2px solid rgba(120,200,255,0.9)" : undefined,
    background: examMode === "percussion" ? "rgba(70,110,180,0.35)" : undefined,
  }}
>
  打診
</button>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
  <button
    onClick={() => {
      playSe(buttonSe);
      setExamSide("front");
    }}
    disabled={!!gameOver}
    style={{
      border: examSide === "front" ? "2px solid rgba(120,200,255,0.9)" : undefined,
      background: examSide === "front" ? "rgba(70,110,180,0.35)" : undefined,
      padding: "10px 0",
    }}
  >
    前面
  </button>

  <button
    onClick={() => {
      playSe(buttonSe);
      setExamSide("back");
    }}
    disabled={!!gameOver}
    style={{
      border: examSide === "back" ? "2px solid rgba(120,200,255,0.9)" : undefined,
      background: examSide === "back" ? "rgba(70,110,180,0.35)" : undefined,
      padding: "10px 0",
    }}
  >
    後面
  </button>
</div>

    <button
      onClick={() => {
        playSe(buttonSe);
        setSelectedCategory(null);
        setExamMode(null);
        setExamSide("front");
      }}
      disabled={!!gameOver}
    >
      身体診察を閉じる
    </button>
  </div>
)}
          <button
  onClick={() => {
    playSe(buttonSe);
    openOrderModal("blood");
  }}
  disabled={!!gameOver}
>
  血液検査
</button>
          <button
  onClick={() => {
    playSe(buttonSe);
    openOrderModal("image");
  }}
  disabled={!!gameOver}
>
  画像検査
</button>
          <button
  onClick={() => {
    playSe(buttonSe);
    openOrderModal("physiology");
  }}
  disabled={!!gameOver}
>
  生理学的検査
</button>
          <button
  onClick={() => {
    playSe(buttonSe);
    setCultureSubModalOpen(true);
  }}
  disabled={!!gameOver}
>
  培養検査
</button>
        </div>

<div className="card" style={{ padding: 10, display: "grid", gap: 8 }}>
  <div style={{ fontWeight: 700, fontSize: 14 }}>検査一覧</div>

  <button
  onClick={() => {
    playSe(buttonSe);
    setShowOrderedTestsModal(true);
  }}
>
  オーダー中の検査一覧
</button>

  <button
  onClick={() => {
    playSe(buttonSe);
    submitPendingOrders();
  }}
  disabled={pendingOrderKeys.length === 0}
>
  検査実施
</button>
</div>

<button
  onClick={() => {
    playSe(buttonSe);
    setShowResultsModal(true);
  }}
>
  検査結果一覧
</button>

 <button
  onClick={() => {
    playSe(buttonSe);
    openDiagnosisModal();
  }}
  disabled={!!gameOver}
  style={{
    border: isDiagnosisRecommended
      ? "2px solid rgba(255,215,90,0.95)"
      : undefined,
    background: isDiagnosisRecommended
      ? "rgba(120,90,20,0.55)"
      : undefined,
    boxShadow: isDiagnosisRecommended
      ? "0 0 18px rgba(255,215,90,0.45)"
      : undefined,
  }}
>
  診断
</button>
      </div>

            {/* CENTER : 患者表示 */}
      <div
        className="card"
        style={{
  minHeight: 0,
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
  padding: isPhone ? 10 : 16,
  gap: isPhone ? 8 : 12,
  order: isPhone ? 2 : undefined,
}}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "rgba(255,255,255,0.9)",
          }}
        >
        </div>

        <div
          style={{
  position: "relative",
  minHeight: 0,
  height: isPhone ? "46vh" : "auto",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  backgroundImage: `url(${EXAM_ROOM_BG_SRC})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundColor: "#141821",
  overflow: "hidden",
}}
        >
          {/* 患者本体表示エリア */}
<div
  style={{
    position: "absolute",
    inset: 0,
    zIndex: 1,
    cursor:
      examMode === "auscultation"
        ? "none"
        : examMode === "inspection"
        ? "zoom-in"
        : examMode === "palpation" || examMode === "percussion"
        ? "pointer"
        : "default",
  }}
  onMouseMove={(e) => {
    if (examMode !== "auscultation") {
      setExamCursorPos(null);
      return;
    }

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setExamCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }}
  onMouseLeave={() => {
    setExamCursorPos(null);
  }}
  onClick={(e) => {
    if (!examMode) return;

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normalizedX = (x / rect.width) * 600;
    const normalizedY = (y / rect.height) * 700;

    handleBodyExamClick(normalizedX, normalizedY);
  }}
>
    <div
    style={{
  position: "absolute",
  left: "50%",
  bottom: 0,
  transform: "translateX(-50%)",
  width: isPhone ? "min(92%, 520px)" : "min(92%, 700px)",
  height: "92%",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  pointerEvents: "none",
}}
  >
    <img
      src={patientDisplayImageSrc}
      alt={examSide === "front" ? "患者前面" : "患者後面"}
      draggable={false}
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        width: "auto",
        height: "auto",
        objectFit: "contain",
        display: "block",
        userSelect: "none",
        pointerEvents: "none",
      }}
    />
  </div>

  {examMode === "auscultation" && examCursorPos && (
    <img
      src={STETHOSCOPE_CURSOR_SRC}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        left: examCursorPos.x,
        top: examCursorPos.y,
        width: 40,
        height: 40,
        transform: "translate(-10px, -10px)",
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 5,
      }}
    />
  )}
</div>

{/* 患者＋独白の吹き出し */}
{(latestPatientMessage || doctorMonologueVisible) && (
  <div
    style={{
  position: "absolute",
  left: isPhone ? 12 : 24,
  top: isPhone ? 12 : 24,
  maxWidth: isPhone ? "84%" : "62%",
  display: "grid",
  gap: isPhone ? 8 : 12,
  zIndex: 6,
}}
  >
    {latestPatientMessage && (
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 18,
          background: "rgba(255,255,255,0.92)",
          color: "#111",
          lineHeight: 1.7,
          boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          whiteSpace: "pre-wrap",
        }}
      >
        {patientSpeechMessageId === latestPatientMessage.id
          ? patientBubbleText
          : latestPatientMessage.text}
      </div>
    )}

    {doctorMonologueVisible && (
      <div
        style={{
          marginLeft: 24,
          padding: "12px 14px",
          borderRadius: 18,
          background: "rgba(255,255,255,0.92)",
          color: "#ff4d4f",
          lineHeight: 1.7,
          boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
          whiteSpace: "pre-wrap",
          fontWeight: 800,
          maxWidth: "85%",
        }}
      >
        {doctorMonologueBubbleText}
      </div>
    )}
  </div>
)}
        </div>
      </div>

      {/* RIGHT : 会話ログ */}
      <div
        className="card"
        style={{
  minHeight: 0,
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "auto 1fr",
  order: isPhone ? 3 : undefined,
  height: isPhone ? "30vh" : "auto",
}}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          会話ログ
        </div>

        <div style={{ minHeight: 0, overflow: "hidden" }}>
          <ChatLog messages={messages} />
        </div>
      </div>

      {/* BOTTOM : 入力欄（中央〜右） */}
      <div
        className="card"
        style={{
  gridColumn: isPhone ? "auto" : "2 / 4",
  minHeight: 0,
  padding: isPhone ? 10 : 12,
  display: "grid",
  gridTemplateColumns: isPhone ? "1fr" : "1fr auto",
  gap: isPhone ? 8 : 10,
  alignItems: "stretch",
  order: isPhone ? 4 : undefined,
}}
      >
        <textarea
          disabled={!!gameOver}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="問診を入力"
          rows={3}
          style={{
  width: "100%",
  minWidth: 0,
  padding: isPhone ? "14px 16px" : undefined,
  fontSize: isPhone ? 18 : undefined,
}}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button
  onClick={() => {
    onSend();
  }}
  disabled={!!gameOver}
>
  送信
</button>
      </div>

            {examResultModalOpen && (
        <Modal
  title={examResultModalTitle}
  onClose={() => {
    playSe(buttonSe);
    setExamResultModalOpen(false);
  }}
>
          <div
  style={{
    display: "grid",
    gridTemplateColumns: modalCols3,
    gap: 10,
    maxHeight: "60vh",
    overflow: "auto",
    alignItems: "start",
  }}
>
  {examResultModalItems.map((r) => (
    <div
      key={r.key}
      className="card"
      style={{ padding: 10, display: "grid", gap: 6, height: "100%" }}
    >
      <div style={{ fontWeight: 700 }}>{r.label}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {r.resultText}
      </div>
    </div>
  ))}
</div>
        </Modal>
      )}

{orderModalOpen && orderCategory && (
  <Modal
    onClose={() => {
      playSe(buttonSe);
      addDraftToPendingOrders();
      setOrderModalOpen(false);
      setLastAction("open_order_modal");
      setOrderCategory(null);
      setDraftOrderKeys([]);
      setOtherLabGroup(null);
      setInfectionSubModalOpen(false);
      setCultureSubModalOpen(false);
    }}
    title={`${CATEGORY_LABELS[orderCategory]} オーダー`}
    width={
      orderCategory === "blood"
        ? "min(1180px, 94vw)"
        : orderCategory === "image"
        ? "min(860px, 92vw)"
        : orderCategory === "physiology"
        ? "min(760px, 92vw)"
        : orderCategory === "vital"
        ? "min(700px, 92vw)"
        : "min(760px, 92vw)"
    }
  >
    {orderCategory === "blood" ? (
<div
  style={{
    display: "grid",
    gap: 16,
    background: "rgba(18,20,28,0.96)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 16,
    opacity: 1,
    minHeight: 0,
    maxHeight: isPhone ? "70vh" : "none",
    overflowY: isPhone ? "auto" : "visible",
    overflowX: "hidden",
  }}
>
    <div style={{ fontSize: 13, opacity: 0.8 }}>
      検査項目を選択してください。まとめて実施した場合、経過時間は最長の検査時間のみ加算されます。
    </div>

    <div
  style={{
    display: "grid",
    gridTemplateColumns: modalCols4,
    gap: 12,
    alignItems: "start",
  }}
>

      {/* 1列目 */}
      <div
  className="card"
  style={{
    padding: 10,
    display: "grid",
    gap: 8,
    background: "#232330",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    opacity: 1,
  }}
>
        <div style={{ fontWeight: 700 }}>血算・凝固</div>
        {BLOOD_COLUMN_1.map((key) => {
          const tr = cp.tests[key];
          const checked = isQueuedOrDrafted(key);
          const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;

          return (
            <button
  key={key}
  title={TEST_HELP_TEXT[key] ?? ""}
  onClick={() => toggleDraftOrderKey(key)}
              disabled={!!testsDone[key]}
              style={{
  textAlign: "left",
  opacity: testsDone[key] ? 0.5 : 1,
  border: checked ? "2px solid rgba(120,200,255,0.9)" : "1px solid rgba(255,255,255,0.08)",
  background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
  borderRadius: 10,
}}
            >
              {checked ? "✓ " : ""}
              {tr.label}
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                {minutes}分
              </div>
            </button>
          );
        })}
      </div>

            {/* 生化学（1つのカラム内で3列） */}
      <div
  className="card"
  style={{
    padding: 10,
    display: "grid",
    gap: 8,
    background: "#232330",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    opacity: 1,
    gridColumn: isPhone ? "auto" : "2 / span 2",
    alignContent: "start",
    minWidth: 0,
  }}
>
        <div style={{ fontWeight: 700 }}>生化学</div>

        <div
  style={{
    display: "grid",
    gridTemplateColumns: isPhone ? "1fr" : "repeat(2, minmax(0, 1fr))",
    gap: 12,
    alignItems: "start",
    maxHeight: isPhone ? "58vh" : "62vh",
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: 4,
  }}
>
          {[BLOOD_BIOCHEM_1, [...BLOOD_BIOCHEM_2, ...BLOOD_BIOCHEM_3]].map((col, colIdx) => (
            <div key={colIdx} style={{ display: "grid", gap: 8 }}>
              {col.map((key) => {
                const tr = cp.tests[key];
                const checked = isQueuedOrDrafted(key);
                const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;

                return (
                  <button
                    key={key}
                    title={TEST_HELP_TEXT[key] ?? ""}
                    onClick={() => toggleDraftOrderKey(key)}
                    disabled={!!testsDone[key]}
                    style={{
                      textAlign: "left",
                      opacity: testsDone[key] ? 0.5 : 1,
                      border: checked
                        ? "2px solid rgba(120,200,255,0.9)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
                      borderRadius: 10,
                    }}
                  >
                    {checked ? "✓ " : ""}
                    {tr.label}
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                      {minutes}分
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

            {/* 5列目 */}
      <div
        className="card"
        style={{
          padding: 10,
          display: "grid",
          gap: 8,
          alignContent: "start",
          background: "#232330",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          opacity: 1,
        }}
      >
        {otherLabGroup === null ? (
          <>
            <div style={{ fontWeight: 700 }}>その他</div>

            <button onClick={() => setOtherLabGroup("urine")}>尿検査</button>
            <button onClick={() => setInfectionSubModalOpen(true)}>感染症</button>
            <button onClick={() => setOtherLabGroup("tumor")}>腫瘍マーカー</button>
            <button onClick={() => setOtherLabGroup("autoantibody")}>自己抗体</button>
            <button onClick={() => setOtherLabGroup("endocrine")}>内分泌</button>
          </>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {otherLabGroup === "urine" && "尿検査"}
                {otherLabGroup === "tumor" && "腫瘍マーカー"}
                {otherLabGroup === "autoantibody" && "自己抗体"}
                {otherLabGroup === "endocrine" && "内分泌"}
              </div>
              <button onClick={() => setOtherLabGroup(null)}>戻る</button>
            </div>

            {otherLabGroup === "urine" && (
              <div style={{ display: "grid", gap: 8 }}>
                {(["UA_QUAL", "UA_SEDIMENT"] as TestKey[]).map((key) => {
                  const tr = cp.tests[key];
                  const checked = isQueuedOrDrafted(key);
                  const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;

                  return (
                    <button
                      key={key}
                      title={TEST_HELP_TEXT[key] ?? ""}
                      onClick={() => toggleDraftOrderKey(key)}
                      disabled={!!testsDone[key]}
                      style={{
                        textAlign: "left",
                        opacity: testsDone[key] ? 0.5 : 1,
                        border: checked
                          ? "2px solid rgba(120,200,255,0.9)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
                        borderRadius: 10,
                      }}
                    >
                      {checked ? "✓ " : ""}
                      {tr.label}
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        {minutes}分
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {otherLabGroup === "tumor" && (
              <div
  style={{
    display: "grid",
    gap: 8,
    maxHeight: "52vh",
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: 4,
    alignContent: "start",
  }}
>
                {OTHER_GROUP_TUMOR.map((key) => {
                  const tr = cp.tests[key];
                  const checked = isQueuedOrDrafted(key);
                  const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;

                  return (
                    <button
                      key={key}
                      title={TEST_HELP_TEXT[key] ?? ""}
                      onClick={() => toggleDraftOrderKey(key)}
                      disabled={!!testsDone[key]}
                      style={{
                        textAlign: "left",
                        opacity: testsDone[key] ? 0.5 : 1,
                        border: checked
                          ? "2px solid rgba(120,200,255,0.9)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
                        borderRadius: 10,
                      }}
                    >
                      {checked ? "✓ " : ""}
                      {tr.label}
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        {minutes}分
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {otherLabGroup === "autoantibody" && (
              <div
  style={{
    display: "grid",
    gap: 8,
    maxHeight: "52vh",
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: 4,
    alignContent: "start",
  }}
>
                {OTHER_GROUP_AUTOANTIBODY.map((key) => {
                  const tr = cp.tests[key];
                  const checked = isQueuedOrDrafted(key);
                  const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;

                  return (
                    <button
                      key={key}
                      title={TEST_HELP_TEXT[key] ?? ""}
                      onClick={() => toggleDraftOrderKey(key)}
                      disabled={!!testsDone[key]}
                      style={{
                        textAlign: "left",
                        opacity: testsDone[key] ? 0.5 : 1,
                        border: checked
                          ? "2px solid rgba(120,200,255,0.9)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
                        borderRadius: 10,
                      }}
                    >
                      {checked ? "✓ " : ""}
                      {tr.label}
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        {minutes}分
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {otherLabGroup === "endocrine" && (
  <div
    style={{
      display: "grid",
      gap: 8,
      maxHeight: "52vh",
      overflowY: "auto",
      overflowX: "hidden",
      paddingRight: 4,
      alignContent: "start",
    }}
  >
    {OTHER_GROUP_ENDOCRINE.map((key) => {
      const tr = cp.tests[key];
      const checked = isQueuedOrDrafted(key);
      const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;

      return (
        <button
          key={key}
          title={TEST_HELP_TEXT[key] ?? ""}
          onClick={() => toggleDraftOrderKey(key)}
          disabled={!!testsDone[key]}
          style={{
            textAlign: "left",
            opacity: testsDone[key] ? 0.5 : 1,
            border: checked
              ? "2px solid rgba(120,200,255,0.9)"
              : "1px solid rgba(255,255,255,0.08)",
            background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
            borderRadius: 10,
          }}
        >
          {checked ? "✓ " : ""}
          {tr.label}
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            {minutes}分
          </div>
        </button>
      );
    })}
  </div>
)}
          </>
        )}
      </div>
    </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={addDraftToPendingOrders} disabled={draftOrderKeys.length === 0}>
            他の検査を追加
          </button>
          <button
  onClick={() => {
    playSe(buttonSe);
    const merged = mergeUniqueTestKeys(pendingOrderKeys, draftOrderKeys);
    openConfirmOrderModal(merged);
  }}
  disabled={mergeUniqueTestKeys(pendingOrderKeys, draftOrderKeys).length === 0}
>
  検査実施
</button>
        </div>
  </div>
) : orderCategory === "image" ? (
  <div
  style={{
    display: "grid",
    gap: 12,
    minHeight: 0,
    maxHeight: isPhone ? "70vh" : "none",
    overflowY: isPhone ? "auto" : "visible",
    overflowX: "hidden",
  }}
>
    <div style={{ fontSize: 13, opacity: 0.8 }}>
      実施したい検査項目を選択してください。
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: modalCols3,
        gap: 12,
        alignItems: "start",
      }}
    >
      {[
        { title: "単純写真", keys: IMAGE_PLAIN_XRAY_KEYS },
        { title: "単純CT", keys: IMAGE_PLAIN_CT_KEYS },
        { title: "造影CT", keys: IMAGE_CONTRAST_CT_KEYS },
      ].map((group) => (
        <div
  key={group.title}
  className="card"
  style={{
    padding: 10,
    display: "grid",
    gap: 8,
    background: "#232330",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    alignContent: "start",
    maxHeight: isPhone ? "58vh" : "none",
    overflowY: isPhone ? "auto" : "visible",
    overflowX: "hidden",
    minWidth: 0,
  }}
>
          <div style={{ fontWeight: 700 }}>{group.title}</div>

          {group.keys.map((key) => {
            const tr = cp.tests[key];
            const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;
            const checked = isQueuedOrDrafted(key);
            const contrastBlocked = isContrastCTKey(key) && !hasCreatinineResult();
            const disabled = !!testsDone[key] || contrastBlocked;

            return (
              <button
                key={key}
                title={
                  contrastBlocked
                    ? "造影CTはクレアチニン結果確認後に実施できます"
                    : TEST_HELP_TEXT[key] ?? ""
                }
                onClick={() => {
                  if (contrastBlocked) return;
                  toggleDraftOrderKey(key);
                }}
                disabled={disabled}
                style={{
                  textAlign: "left",
                  opacity: disabled ? 0.55 : 1,
                  border: checked
                    ? "2px solid rgba(120,200,255,0.9)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: checked
                    ? "rgba(70,110,180,0.35)"
                    : "#2b2b38",
                  borderRadius: 10,
                }}
              >
                {checked ? "✓ " : ""}
                {tr.label}
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  所要時間 {minutes}分
                </div>
                {contrastBlocked && (
                  <div style={{ fontSize: 12, color: "#ffb3b3", marginTop: 4 }}>
                    クレアチニン未確認のため実施不可
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>

    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
      <button onClick={addDraftToPendingOrders} disabled={draftOrderKeys.length === 0}>
        他の検査を追加
      </button>
      <button
  onClick={() => {
    playSe(buttonSe);
    const merged = mergeUniqueTestKeys(pendingOrderKeys, draftOrderKeys);
    openConfirmOrderModal(merged);
  }}
  disabled={mergeUniqueTestKeys(pendingOrderKeys, draftOrderKeys).length === 0}
>
  検査実施
</button>
    </div>
  </div>
) : (
  <div
  style={{
    width:
      orderCategory === "vital"
        ? "min(100%, 560px)"
        : "min(100%, 640px)",
    justifySelf: "start",
    display: "grid",
    gap: 12,
    minHeight: 0,
    maxHeight: isPhone ? "70vh" : "none",
    overflowY: isPhone ? "auto" : "visible",
    overflowX: "hidden",
  }}
>
    <div style={{ fontSize: 13, opacity: 0.8 }}>
      実施したい検査項目を選択してください。
    </div>

    <div
  style={{
    display: "grid",
    gap: 10,
    maxHeight: isPhone ? "58vh" : "62vh",
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: 4,
  }}
>
      
      {CATEGORY_KEYS[orderCategory].map((key) => {
        const tr = cp.tests[key];
        const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;
        const checked = isQueuedOrDrafted(key);
        const disabled = !!testsDone[key];

        return (
          <button
  key={key}
  title={TEST_HELP_TEXT[key] ?? ""}
  onClick={() => toggleDraftOrderKey(key)}
  disabled={disabled}
  style={{
    width: "100%",
    justifySelf: "stretch",
    textAlign: "left",
    opacity: disabled ? 0.5 : 1,
    border: checked
      ? "2px solid rgba(120,200,255,0.9)"
      : "1px solid rgba(255,255,255,0.08)",
    background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
    borderRadius: 10,
  }}
>
            {checked ? "✓ " : ""}
            {tr.label}
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              所要時間 {minutes}分
            </div>
          </button>
        );
      })}
    </div>

    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
      <button onClick={addDraftToPendingOrders} disabled={draftOrderKeys.length === 0}>
        他の検査を追加
      </button>
      <button
  onClick={() => {
    playSe(buttonSe);
    const merged = mergeUniqueTestKeys(pendingOrderKeys, draftOrderKeys);
    openConfirmOrderModal(merged);
  }}
  disabled={mergeUniqueTestKeys(pendingOrderKeys, draftOrderKeys).length === 0}
>
  検査実施
</button>
    </div>
  </div>
)}
  </Modal>
)}

      {/* TEST SELECT MODAL */}
      {gameOver && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: 20,
            transform: "translateX(-50%)",
            zIndex: 1200,
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(120,0,0,0.88)",
            color: "#fff",
            fontWeight: 800,
          }}
        >
          BAD END
        </div>
      )}

      {infectionSubModalOpen && (
        <Modal
          title="感染症検査"
          onClose={() => {
  playSe(buttonSe);
  addDraftToPendingOrders();
  setInfectionSubModalOpen(false);
}}
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              検査項目を選択してください。外注検査は実施できますが、このゲーム中には結果が返りません。
            </div>

            <div
  style={{
    display: "grid",
    gridTemplateColumns: modalCols3,
    gap: 12,
    alignItems: "start",
    maxHeight: "62vh",
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: 4,
  }}
>
              {/* 左：迅速・院内結果あり（全部ここ） */}
              <div className="card"
              style={{
  padding: 12,
  display: "grid",
  gap: 8,
  maxHeight: isPhone ? "58vh" : "none",
  overflowY: isPhone ? "auto" : "visible",
  overflowX: "hidden",
}}
              >
                <div style={{ fontWeight: 800 }}>迅速・院内結果あり</div>
                {OTHER_GROUP_INFECTION_RAPID.map((key) => {
                  const tr = cp.tests[key];
                  const checked = isQueuedOrDrafted(key);
                  const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;

                  return (
                    <button
                      key={key}
                      title={TEST_HELP_TEXT[key] ?? ""}
                      onClick={() => toggleDraftOrderKey(key)}
                      disabled={!!testsDone[key]}
                      style={{
                        textAlign: "left",
                        opacity: testsDone[key] ? 0.5 : 1,
                        border: checked
                          ? "2px solid rgba(120,200,255,0.9)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
                        borderRadius: 10,
                      }}
                    >
                      {checked ? "✓ " : ""}
                      {tr.label}
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        {minutes}分
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 中央：外注 前半 */}
              <div
  className="card"
  style={{
    padding: 12,
    display: "grid",
    gap: 8,
    maxHeight: isPhone ? "58vh" : "none",
    overflowY: isPhone ? "auto" : "visible",
    overflowX: "hidden",
  }}
>
                <div style={{ fontWeight: 800 }}>外注</div>
                {OTHER_GROUP_INFECTION_SENDOUT.slice(
                  0,
                  Math.ceil(OTHER_GROUP_INFECTION_SENDOUT.length / 2)
                ).map((key) => {
                  const tr = cp.tests[key];
                  const checked = isQueuedOrDrafted(key);
                  const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;

                  return (
                    <button
                      key={key}
                      title={TEST_HELP_TEXT[key] ?? ""}
                      onClick={() => toggleDraftOrderKey(key)}
                      disabled={!!testsDone[key]}
                      style={{
                        textAlign: "left",
                        opacity: testsDone[key] ? 0.5 : 1,
                        border: checked
                          ? "2px solid rgba(120,200,255,0.9)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
                        borderRadius: 10,
                      }}
                    >
                      {checked ? "✓ " : ""}
                      {tr.label}
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        {minutes}分 ／ 外注
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 右：外注 後半 */}
              <div
  className="card"
  style={{
    padding: 12,
    display: "grid",
    gap: 8,
    maxHeight: isPhone ? "58vh" : "none",
    overflowY: isPhone ? "auto" : "visible",
    overflowX: "hidden",
  }}
>
                <div style={{ fontWeight: 800, opacity: 0 }}>外注</div>
                {OTHER_GROUP_INFECTION_SENDOUT.slice(
                  Math.ceil(OTHER_GROUP_INFECTION_SENDOUT.length / 2)
                ).map((key) => {
                  const tr = cp.tests[key];
                  const checked = isQueuedOrDrafted(key);
                  const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;

                  return (
                    <button
                      key={key}
                      title={TEST_HELP_TEXT[key] ?? ""}
                      onClick={() => toggleDraftOrderKey(key)}
                      disabled={!!testsDone[key]}
                      style={{
                        textAlign: "left",
                        opacity: testsDone[key] ? 0.5 : 1,
                        border: checked
                          ? "2px solid rgba(120,200,255,0.9)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
                        borderRadius: 10,
                      }}
                    >
                      {checked ? "✓ " : ""}
                      {tr.label}
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        {minutes}分 ／ 外注
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
  onClick={() => {
    playSe(buttonSe);
    addDraftToPendingOrders();
    setInfectionSubModalOpen(false);
  }}
>
  戻る
</button>
            </div>
          </div>
        </Modal>
      )}

            {cultureSubModalOpen && (
        <Modal
          title="培養検査"
          onClose={() => {
  playSe(buttonSe);
  addDraftToPendingOrders();
  setCultureSubModalOpen(false);
}}
        >
                    <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: modalCols3,
                gap: 12,
                alignItems: "start",
              }}
            >
              <div className="card" 
              style={{
  padding: 12,
  display: "grid",
  gap: 8,
  maxHeight: isPhone ? "58vh" : "none",
  overflowY: isPhone ? "auto" : "visible",
  overflowX: "hidden",
}}
              >
                <div style={{ fontWeight: 800 }}>喀痰</div>
                {CULTURE_SPUTUM_KEYS.map((key) => {
                  const tr = cp.tests[key];
                  const checked = isQueuedOrDrafted(key);
                  const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;

                  return (
                    <button
                      key={key}
                      title={TEST_HELP_TEXT[key] ?? ""}
                      onClick={() => toggleDraftOrderKey(key)}
                      disabled={!!testsDone[key]}
                      style={{
                        textAlign: "left",
                        opacity: testsDone[key] ? 0.5 : 1,
                        border: checked
                          ? "2px solid rgba(120,200,255,0.9)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
                        borderRadius: 10,
                      }}
                    >
                      {checked ? "✓ " : ""}
                      {tr.label}
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        {minutes}分
                      </div>
                    </button>
                  );
                })}
              </div>

              <div
  className="card"
  style={{
    padding: 12,
    display: "grid",
    gap: 8,
    maxHeight: isPhone ? "58vh" : "none",
    overflowY: isPhone ? "auto" : "visible",
    overflowX: "hidden",
  }}
>
                <div style={{ fontWeight: 800 }}>尿</div>
                {CULTURE_URINE_KEYS.map((key) => {
                  const tr = cp.tests[key];
                  const checked = isQueuedOrDrafted(key);
                  const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;

                  return (
                    <button
                      key={key}
                      title={TEST_HELP_TEXT[key] ?? ""}
                      onClick={() => toggleDraftOrderKey(key)}
                      disabled={!!testsDone[key]}
                      style={{
                        textAlign: "left",
                        opacity: testsDone[key] ? 0.5 : 1,
                        border: checked
                          ? "2px solid rgba(120,200,255,0.9)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
                        borderRadius: 10,
                      }}
                    >
                      {checked ? "✓ " : ""}
                      {tr.label}
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        {minutes}分
                      </div>
                    </button>
                  );
                })}
              </div>

              <div
  className="card"
  style={{
    padding: 12,
    display: "grid",
    gap: 8,
    maxHeight: isPhone ? "58vh" : "none",
    overflowY: isPhone ? "auto" : "visible",
    overflowX: "hidden",
  }}
>
                <div style={{ fontWeight: 800 }}>血液培養検査</div>
                {CULTURE_BLOOD_KEYS.map((key) => {
                  const tr = cp.tests[key];
                  const checked = isQueuedOrDrafted(key);
                  const minutes = TEST_TURNAROUND_MINUTES[key] ?? tr.minutes;

                  return (
                    <button
                      key={key}
                      title={TEST_HELP_TEXT[key] ?? ""}
                      onClick={() => toggleDraftOrderKey(key)}
                      disabled={!!testsDone[key]}
                      style={{
                        textAlign: "left",
                        opacity: testsDone[key] ? 0.5 : 1,
                        border: checked
                          ? "2px solid rgba(120,200,255,0.9)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: checked ? "rgba(70,110,180,0.35)" : "#2b2b38",
                        borderRadius: 10,
                      }}
                    >
                      {checked ? "✓ " : ""}
                      {tr.label}
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        {minutes}分
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
  onClick={() => {
    playSe(buttonSe);
    addDraftToPendingOrders();
    setCultureSubModalOpen(false);
  }}
>
  閉じる
</button>
              <button
  onClick={() => {
    playSe(buttonSe);
    addDraftToPendingOrders();
  }}
  disabled={draftOrderKeys.length === 0}
>
  他の検査を追加
</button>
              <button
  onClick={() => {
    playSe(buttonSe);
    const merged = mergeUniqueTestKeys(pendingOrderKeys, draftOrderKeys);
    openConfirmOrderModal(merged);
  }}
  disabled={mergeUniqueTestKeys(pendingOrderKeys, draftOrderKeys).length === 0}
>
  検査実施
</button>
            </div>
          </div>
        </Modal>
      )}
      
            {showOrderedTestsModal && (
        <Modal
  onClose={() => {
    playSe(buttonSe);
    setShowOrderedTestsModal(false);
  }}
  title="オーダー済み検査一覧"
>
          {pendingOrderKeys.length === 0 ? (
            <div style={{ opacity: 0.7 }}>現在、オーダー済みの検査はありません。</div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: modalCols3,
                gap: 10,
                maxHeight: "60vh",
                overflow: "auto",
                alignItems: "start",
              }}
            >
              {pendingOrderKeys.map((key) => (
                <div
                  key={key}
                  className="card"
                  style={{ padding: 10, display: "grid", gap: 6 }}
                >
                  <div style={{ fontWeight: 700 }}>{cp.tests[key]?.label ?? key}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    所要時間 {TEST_TURNAROUND_MINUTES[key] ?? cp.tests[key]?.minutes ?? 0}分
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

{showNextButton && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      pointerEvents: "auto",
    }}
  >
    <button
      onClick={() => {
        playSe(buttonSe);

        // ← これを追加
        setDoctorMonologueVisible(false);
        setDoctorMonologueFullText("");
        setDoctorMonologueBubbleText("");

        setShowNextButton(false);
        setIsBlackout(true);

        const nextEnding = (flags as any).pending_ending_id as EndingId | undefined;

  if (!nextEnding) {
    return;
  }

  window.setTimeout(() => {
    beginEnding(nextEnding);

    setFlags((prev) => {
      const next = { ...(prev as any) };
      delete next.pending_ending_id;
      return next;
    });
  }, 150);
}}
      style={{
        padding: "20px 48px",
        fontSize: 28,
        lineHeight: 1,
        borderRadius: 20,
        background: "#ffffff",
        color: "#111111",
        border: "2px solid #222222",
        fontWeight: 900,
        cursor: "pointer",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 160,
      }}
    >
      次へ
    </button>
  </div>
)}

            {confirmOrderModalOpen && (
        <Modal
          onClose={() => {
            setConfirmOrderModalOpen(false);
            setConfirmOrderKeys([]);
          }}
          title="検査実施確認"
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ fontSize: 15, lineHeight: 1.7 }}>
              {calcOrderMinutes(confirmOrderKeys)}分かかりますが実施しますか？
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: modalCols3,
                gap: 10,
                maxHeight: "40vh",
                overflow: "auto",
              }}
            >
              {confirmOrderKeys.map((key) => (
                <div
                  key={key}
                  className="card"
                  style={{ padding: 10, display: "grid", gap: 6 }}
                >
                  <div style={{ fontWeight: 700 }}>{cp.tests[key]?.label ?? key}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    所要時間 {TEST_TURNAROUND_MINUTES[key] ?? cp.tests[key]?.minutes ?? 0}分
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
  onClick={() => {
    playSe(buttonSe);
    setConfirmOrderModalOpen(false);
    setConfirmOrderKeys([]);
  }}
>
  いいえ
</button>
              <button
  onClick={() => {
    playSe(buttonSe);
    submitOrders(confirmOrderKeys);
    setPendingOrderKeys((prev) =>
      prev.filter((key) => !confirmOrderKeys.includes(key))
    );
    setConfirmOrderModalOpen(false);
    setConfirmOrderKeys([]);
    setOrderModalOpen(false);
    setOrderCategory(null);
    setDraftOrderKeys([]);
    setOtherLabGroup(null);
    setInfectionSubModalOpen(false);
    setCultureSubModalOpen(false);
  }}
>
  はい
</button>
            </div>
          </div>
        </Modal>
      )}

{diagnosisModalOpen && (
  <Modal
  title="診断入力"
  onClose={() => {
    playSe(buttonSe);
    setDiagnosisModalOpen(false);
  }}
>
    <div
  style={{
    display: "grid",
    gridTemplateColumns: isPhone ? "1fr" : "220px minmax(0, 1fr)",
    gridTemplateAreas: isPhone
      ? `"main"
         "category"`
      : `"category main"`,
    gap: 16,
    minHeight: 0,
    height: isPhone ? "min(78vh, 860px)" : "min(68vh, 760px)",
  }}
>
      {/* 左カラム：カテゴリ */}
      <div
  className="card"
  style={{
    gridArea: "category",
    minHeight: 0,
    padding: 12,
    display: "grid",
    gridTemplateRows: "auto 1fr",
    gap: 10,
    background: "#232330",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    maxHeight: isPhone ? "22vh" : "none",
  }}
>
        <div style={{ fontSize: 14, fontWeight: 800 }}>
          カテゴリ
        </div>

        <div
  style={{
    minHeight: 0,
    overflowY: isPhone ? "hidden" : "auto",
    overflowX: isPhone ? "auto" : "hidden",
    display: isPhone ? "flex" : "grid",
    gap: 8,
    alignContent: "start",
    alignItems: "stretch",
    paddingBottom: isPhone ? 4 : 0,
  }}
>
          {DIAGNOSIS_CATEGORY_TABS.map((tab) => {
            const active = activeDiagnosisTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveDiagnosisTab(tab.key);
                  setSelectedDiagnosis(null);
                }}
                style={{
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 10,
  border: active
    ? "2px solid rgba(120,200,255,0.95)"
    : "1px solid rgba(255,255,255,0.12)",
  background: active ? "rgba(70,110,180,0.35)" : "#2b2b38",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  flex: isPhone ? "0 0 auto" : undefined,
  whiteSpace: "nowrap",
}}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 右カラム：検索 + 候補一覧 + 選択中 + 操作 */}
      <div
  style={{
    gridArea: "main",
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "auto auto minmax(0, 1fr) auto auto",
    gap: 12,
  }}
>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          病名で検索してください。
        </div>

        <input
          value={diagnosisQuery}
          onChange={(e) => {
            setDiagnosisQuery(e.target.value);
            setSelectedDiagnosis(null);
          }}
          placeholder="例：肺炎 / 咽頭炎 / 尿路感染"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "#1f2430",
            color: "#fff",
          }}
        />

        <div
  className="card"
  style={{
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    display: "grid",
    gridTemplateColumns: isPhone ? "1fr" : "repeat(2, minmax(0, 1fr))",
    gap: 8,
    padding: 10,
    background: "#232330",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    alignContent: "start",
  }}
>
  {diagnosisCandidates.length === 0 ? (
    <div
      style={{
        opacity: 0.7,
        padding: 8,
        gridColumn: "1 / -1",
      }}
    >
      候補がありません
    </div>
  ) : (
    diagnosisCandidates.map((opt) => {
      const active = selectedDiagnosis?.code === opt.code;

      return (
        <button
          key={opt.code}
          type="button"
          onClick={() => {
            setSelectedDiagnosis(opt);
          }}
          style={{
            textAlign: "left",
            padding: "10px 12px",
            cursor: "pointer",
            borderRadius: 10,
            border: active
              ? "2px solid rgba(120,200,255,0.9)"
              : "1px solid rgba(255,255,255,0.08)",
            background: active ? "rgba(70,110,180,0.35)" : "#2b2b38",
            color: "#fff",
            minHeight: 72,
            display: "grid",
            alignContent: "start",
          }}
        >
          <div style={{ fontWeight: 700, lineHeight: 1.35 }}>
            {opt.label}
          </div>

          {!!opt.aliases?.length && (
            <div
              style={{
                fontSize: 12,
                opacity: 0.7,
                marginTop: 4,
                lineHeight: 1.35,
              }}
            >
              別名: {opt.aliases.join(" / ")}
            </div>
          )}
        </button>
      );
    })
  )}
</div>

        <div
          className="card"
          style={{
            padding: 10,
            display: "grid",
            gap: 6,
            background: "#232330",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
          }}
        >
          <div style={{ fontWeight: 700 }}>選択中の診断</div>
          {selectedDiagnosis ? (
            <div>{selectedDiagnosis.label}</div>
          ) : (
            <div style={{ opacity: 0.7 }}>未選択</div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
  onClick={() => {
    playSe(buttonSe);
    setDiagnosisModalOpen(false);
  }}
>
  キャンセル
</button>
          <button disabled={!selectedDiagnosis} onClick={confirmDiagnosis}>
            診断確定
          </button>
        </div>
      </div>
    </div>
  </Modal>
)}

      {/* RESULTS MODAL */}
      {showResultsModal && (
        <Modal
  onClose={() => {
    playSe(buttonSe);
    setShowResultsModal(false);
  }}
  title="検査結果一覧"
>
          <div style={{ display: "grid", gap: 10, maxHeight: "60vh", overflow: "auto" }}>
                        {sortedResults.length === 0 ? (
              <div style={{ opacity: 0.7 }}>まだ検査結果はありません。</div>
            ) : (
              (
  [
    "vital",
    "physical",
    "blood",
    "image",
    "physiology",
    "tumor",
    "autoantibody",
    "endocrine",
    "urine",
    "infection",
    "culture",
  ] as TestCategory[]
).map((cat) => {
                const group = sortedResults.filter((r) => r.category === cat);
                if (group.length === 0) return null;

                return (
                  <div key={cat} style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>
                      {CATEGORY_LABELS[cat as TestCategory]}
                    </div>

                    <div
  style={{
    display: "grid",
    gridTemplateColumns: modalCols3,
    gap: 10,
    alignItems: "start",
  }}
>
  {group.map((r) => (
  <div
    key={r.key}
    className="card"
    style={{ padding: 10, display: "grid", gap: 6, height: "100%" }}
  >
    <div style={{ fontWeight: 700 }}>{r.label}</div>
    <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
      {highlightAbnormalResultText(r)}
    </div>
  </div>
))}
</div>
                  </div>
                );
              })
            )}
          </div>
        </Modal>
      )}
      
    {isBlackout && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            zIndex: 2000,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

function Modal(props: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}) {
  const { title, children, onClose, width } = props;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,6,10,0.92)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: width ?? "min(1080px, 92vw)",
          maxHeight: "85vh",
          padding: 16,
          display: "grid",
          gridTemplateRows: "auto 1fr",
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{title}</div>
          <button onClick={onClose}>閉じる</button>
        </div>
        <div style={{ minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}