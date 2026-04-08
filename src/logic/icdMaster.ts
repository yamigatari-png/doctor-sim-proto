import type { DiagnosisCategory, DiagnosisOption } from "./types";

export const DIAGNOSIS_CATEGORY_TABS: {
  key: DiagnosisCategory;
  label: string;
}[] = [
  { key: "all", label: "すべて" },
  { key: "respiratory", label: "呼吸器" },
  { key: "infection", label: "感染症" },
  { key: "urinary", label: "尿路" },
  { key: "digestive", label: "消化器" },
  { key: "cardiovascular", label: "循環器" },
  { key: "neurology", label: "神経" },
  { key: "endocrine", label: "代謝・内分泌" },
  { key: "hematology", label: "血液・腫瘍" },
  { key: "ent", label: "耳鼻科・眼" },
  { key: "musculoskeletal", label: "皮膚・筋骨格" },
  { key: "mental", label: "精神" },
  { key: "other", label: "その他" },
];

function splitIcdCode(code: string): { letter: string; nums: number[] } {
  const m = code.trim().toUpperCase().match(/^([A-Z])(\d+(?:\.\d+)?)$/);

  if (!m) {
    return { letter: code.trim().toUpperCase(), nums: [] };
  }

  const letter = m[1];
  const nums = m[2].split(".").map((v) => Number(v));
  return { letter, nums };
}

export function compareIcdCode(a: string, b: string): number {
  const aa = splitIcdCode(a);
  const bb = splitIcdCode(b);

  if (aa.letter < bb.letter) return -1;
  if (aa.letter > bb.letter) return 1;

  const len = Math.max(aa.nums.length, bb.nums.length);
  for (let i = 0; i < len; i++) {
    const av = aa.nums[i] ?? -1;
    const bv = bb.nums[i] ?? -1;
    if (av !== bv) return av - bv;
  }

  return a.localeCompare(b, "ja");
}

export function inferDiagnosisCategory(opt: DiagnosisOption): DiagnosisCategory {
  const code = opt.code.toUpperCase();
  const label = opt.label;

  if (code.startsWith("J")) return "respiratory";

  if (
    code.startsWith("A") ||
    code.startsWith("B") ||
    label.includes("感染症") ||
    label.includes("敗血症") ||
    label.includes("菌血症") ||
    label.includes("結核") ||
    label.includes("真菌") ||
    label.includes("梅毒") ||
    label.includes("淋菌") ||
    label.includes("クラミジア") ||
    label.includes("ヘルペス") ||
    label.includes("HIV") ||
    label.includes("AIDS") ||
    label.includes("カンジダ") ||
    label.includes("アスペルギルス") ||
    label.includes("クリプトコックス") ||
    label.includes("PCP") ||
    label.includes("ニューモシスチス") ||
    label.includes("寄生虫") ||
    label.includes("マラリア")
  ) {
    return "infection";
  }

  if (code.startsWith("N")) return "urinary";
  if (code.startsWith("K")) return "digestive";
  if (code.startsWith("I")) return "cardiovascular";
  if (code.startsWith("G")) return "neurology";
  if (code.startsWith("E")) return "endocrine";
  if (code.startsWith("D") || code.startsWith("C")) return "hematology";
  if (code.startsWith("H")) return "ent";
  if (code.startsWith("L") || code.startsWith("M")) return "musculoskeletal";
  if (code.startsWith("F")) return "mental";

  return "other";
}

export const ICD_MASTER: DiagnosisOption[] = [
  // =========================
  // 呼吸器
  // =========================
  { code: "J13", label: "肺炎球菌性肺炎", aliases: ["肺炎球菌肺炎"] },
  { code: "J15.7", label: "マイコプラズマ肺炎" },
  { code: "J15.9", label: "細菌性肺炎" },
  { code: "J16.0", label: "クラミジア肺炎" },
  { code: "J18.9", label: "肺炎", aliases: ["市中肺炎"] },
  { code: "A48.1", label: "レジオネラ肺炎" },
  { code: "J69.0", label: "誤嚥性肺炎" },
  { code: "J85.1", label: "肺膿瘍" },
  { code: "J86.9", label: "膿胸" },
  { code: "J20.9", label: "急性気管支炎", aliases: ["気管支炎"] },
  { code: "J21.9", label: "急性細気管支炎" },
  { code: "J22", label: "急性下気道感染症" },
  { code: "J00", label: "急性鼻咽頭炎", aliases: ["かぜ", "風邪"] },
  { code: "J06.9", label: "感冒", aliases: ["上気道炎"] },
  { code: "J02.9", label: "急性咽頭炎", aliases: ["咽頭炎"] },
  { code: "J03.9", label: "急性扁桃炎", aliases: ["扁桃炎"] },
  { code: "J04.0", label: "急性喉頭炎" },
  { code: "J04.2", label: "急性喉頭気管炎" },
  { code: "J05.0", label: "急性閉塞性喉頭炎", aliases: ["クループ"] },
  { code: "J32.9", label: "慢性副鼻腔炎" },
  { code: "J01.9", label: "急性副鼻腔炎", aliases: ["副鼻腔炎", "蓄膿症"] },
  { code: "J30.4", label: "アレルギー性鼻炎" },
  { code: "J45.9", label: "気管支喘息", aliases: ["喘息"] },
  { code: "J45.901", label: "喘息増悪" },
  { code: "J44.9", label: "COPD" },
  { code: "J44.1", label: "COPD増悪" },
  { code: "J84.9", label: "間質性肺炎" },
  { code: "J84.1", label: "肺線維症" },
  { code: "J96.0", label: "急性呼吸不全" },
  { code: "J96.1", label: "慢性呼吸不全" },
  { code: "J96.9", label: "呼吸不全" },
  { code: "R04.2", label: "喀血" },
  { code: "J90", label: "胸水" },
  { code: "J93.9", label: "気胸" },
  { code: "I26.9", label: "肺塞栓症", aliases: ["肺血栓塞栓症", "PE"] },
  { code: "G47.3", label: "睡眠時無呼吸症候群", aliases: ["SAS"] },

  // =========================
  // 感染症
  // =========================
  { code: "U07.1", label: "COVID-19", aliases: ["新型コロナ感染症", "コロナ"] },
  { code: "J10.1", label: "インフルエンザ", aliases: ["インフル"] },
  { code: "A37.9", label: "百日咳" },
  { code: "B27.9", label: "伝染性単核球症" },
  { code: "B34.9", label: "ウイルス感染症" },
  { code: "B33.8", label: "その他のウイルス感染症" },
  { code: "A41.9", label: "敗血症" },
  { code: "R78.81", label: "菌血症" },
  { code: "A49.9", label: "細菌感染症" },
  { code: "A09", label: "感染性腸炎", aliases: ["感染性胃腸炎"] },
  { code: "A08.4", label: "ウイルス性腸炎" },
  { code: "A04.7", label: "クロストリディオイデス・ディフィシル腸炎", aliases: ["CDI"] },
  { code: "A02.0", label: "サルモネラ腸炎" },
  { code: "A03.9", label: "細菌性赤痢" },
  { code: "A04.0", label: "病原性大腸菌感染症" },
  { code: "A04.5", label: "カンピロバクター腸炎" },
  { code: "A07.1", label: "ジアルジア症" },
  { code: "A06.0", label: "急性アメーバ赤痢" },
  { code: "B37.0", label: "口腔カンジダ症" },
  { code: "B37.9", label: "カンジダ症" },
  { code: "B44.9", label: "アスペルギルス症" },
  { code: "B44.1", label: "肺アスペルギルス症" },
  { code: "B45.9", label: "クリプトコックス症" },
  { code: "A15.0", label: "肺結核" },
  { code: "A16.9", label: "結核" },
  { code: "A18.8", label: "結核性胸膜炎" },
  { code: "A31.0", label: "肺MAC症" },
  { code: "B59", label: "ニューモシスチス肺炎", aliases: ["PCP"] },
  { code: "B02.9", label: "帯状疱疹" },
  { code: "B01.9", label: "水痘" },
  { code: "B00.9", label: "単純ヘルペス感染症" },
  { code: "B25.9", label: "サイトメガロウイルス感染症", aliases: ["CMV感染症"] },
  { code: "B26.9", label: "流行性耳下腺炎", aliases: ["ムンプス", "おたふくかぜ"] },
  { code: "B05.9", label: "麻疹" },
  { code: "B06.9", label: "風疹" },
  { code: "A90", label: "デング熱" },
  { code: "A92.5", label: "ジカウイルス感染症" },
  { code: "A75.9", label: "リケッチア症" },
  { code: "A69.2", label: "ライム病" },
  { code: "A27.9", label: "レプトスピラ症" },
  { code: "A39.9", label: "髄膜炎菌感染症" },
  { code: "G00.9", label: "細菌性髄膜炎" },
  { code: "G03.9", label: "髄膜炎" },
  { code: "G04.9", label: "脳炎" },
  { code: "I33.0", label: "感染性心内膜炎", aliases: ["IE"] },
  { code: "L03.9", label: "蜂窩織炎" },
  { code: "L02.9", label: "皮膚膿瘍" },
  { code: "M00.9", label: "化膿性関節炎" },
  { code: "M46.2", label: "椎体骨髄炎" },
  { code: "M86.9", label: "骨髄炎" },
  { code: "N73.9", label: "骨盤内炎症性疾患", aliases: ["PID"] },

  // =========================
  // 尿路
  // =========================
  { code: "N39.0", label: "尿路感染症", aliases: ["UTI", "尿路感染"] },
  { code: "N30.0", label: "急性膀胱炎", aliases: ["膀胱炎"] },
  { code: "N10", label: "急性腎盂腎炎", aliases: ["腎盂腎炎"] },
  { code: "N12", label: "尿細管間質性腎炎", aliases: ["腎盂腎炎 NOS"] },
  { code: "N20.0", label: "腎結石" },
  { code: "N20.1", label: "尿管結石" },
  { code: "N20.9", label: "尿路結石" },
  { code: "N13.2", label: "水腎症" },
  { code: "R31", label: "血尿" },
  { code: "R33", label: "尿閉" },
  { code: "N17.9", label: "急性腎障害", aliases: ["AKI"] },
  { code: "N18.9", label: "慢性腎臓病", aliases: ["CKD"] },
  { code: "N04.9", label: "ネフローゼ症候群" },
  { code: "N05.9", label: "糸球体腎炎" },
  { code: "N48.1", label: "亀頭包皮炎" },
  { code: "N34.1", label: "非特異的尿道炎" },
  { code: "A54.0", label: "淋菌性尿道炎" },
  { code: "A56.0", label: "クラミジア尿道炎" },

  // =========================
  // 消化器
  // =========================
  { code: "K52.9", label: "胃腸炎" },
  { code: "K29.7", label: "胃炎" },
  { code: "K25.9", label: "胃潰瘍" },
  { code: "K26.9", label: "十二指腸潰瘍" },
  { code: "K27.9", label: "消化性潰瘍" },
  { code: "K21.9", label: "胃食道逆流症", aliases: ["GERD"] },
  { code: "K35.9", label: "急性虫垂炎", aliases: ["虫垂炎"] },
  { code: "K36", label: "その他の虫垂炎" },
  { code: "K57.9", label: "憩室炎" },
  { code: "K56.6", label: "イレウス", aliases: ["腸閉塞"] },
  { code: "K59.1", label: "機能性下痢" },
  { code: "K59.0", label: "便秘症" },
  { code: "K80.2", label: "胆石症" },
  { code: "K81.0", label: "急性胆嚢炎", aliases: ["胆嚢炎"] },
  { code: "K83.0", label: "胆管炎" },
  { code: "K85.9", label: "急性膵炎", aliases: ["膵炎"] },
  { code: "K86.1", label: "慢性膵炎" },
  { code: "K70.1", label: "アルコール性肝炎" },
  { code: "K71.9", label: "薬物性肝障害" },
  { code: "K72.9", label: "肝不全" },
  { code: "K74.6", label: "肝硬変" },
  { code: "B18.2", label: "慢性C型肝炎" },
  { code: "B18.1", label: "慢性B型肝炎" },
  { code: "K75.9", label: "肝炎" },
  { code: "K76.0", label: "脂肪肝" },
  { code: "R17", label: "黄疸" },
  { code: "K92.0", label: "吐血" },
  { code: "K92.1", label: "下血" },
  { code: "R10.4", label: "腹痛" },
  { code: "R11", label: "嘔吐" },

  // =========================
  // 循環器
  // =========================
  { code: "I50.9", label: "心不全" },
  { code: "I50.0", label: "うっ血性心不全" },
  { code: "I11.0", label: "高血圧性心不全" },
  { code: "I20.9", label: "狭心症" },
  { code: "I21.9", label: "急性心筋梗塞", aliases: ["心筋梗塞"] },
  { code: "I24.9", label: "急性冠症候群", aliases: ["ACS"] },
  { code: "I48.9", label: "心房細動" },
  { code: "I47.1", label: "上室頻拍", aliases: ["SVT"] },
  { code: "I47.2", label: "心室頻拍", aliases: ["VT"] },
  { code: "I49.0", label: "心室細動", aliases: ["VF"] },
  { code: "I44.1", label: "房室ブロック" },
  { code: "I10", label: "高血圧症" },
  { code: "I16.1", label: "高血圧緊急症" },
  { code: "I95.9", label: "低血圧" },
  { code: "R55", label: "失神" },
  { code: "I30.9", label: "急性心膜炎" },
  { code: "I31.9", label: "心膜疾患" },
  { code: "I40.9", label: "心筋炎" },
  { code: "I42.9", label: "心筋症" },
  { code: "I71.9", label: "大動脈瘤" },
  { code: "I71.0", label: "大動脈解離" },
  { code: "I73.9", label: "末梢動脈疾患", aliases: ["PAD"] },
  { code: "I82.9", label: "静脈血栓症", aliases: ["DVT"] },
  { code: "R07.9", label: "胸痛" },

  // =========================
  // 神経
  // =========================
  { code: "G43.9", label: "片頭痛" },
  { code: "G44.2", label: "緊張型頭痛" },
  { code: "R51", label: "頭痛" },
  { code: "I63.9", label: "脳梗塞" },
  { code: "I61.9", label: "脳出血" },
  { code: "I60.9", label: "くも膜下出血" },
  { code: "G45.9", label: "一過性脳虚血発作", aliases: ["TIA"] },
  { code: "G40.9", label: "てんかん" },
  { code: "R56.9", label: "けいれん" },
  { code: "G51.0", label: "ベル麻痺" },
  { code: "G61.0", label: "ギラン・バレー症候群" },
  { code: "G35", label: "多発性硬化症" },
  { code: "G93.4", label: "脳症" },
  { code: "F05", label: "せん妄" },
  { code: "F03", label: "認知症" },
  { code: "G20", label: "パーキンソン病" },
  { code: "G25.3", label: "ミオクローヌス" },
  { code: "G62.9", label: "末梢神経障害" },
  { code: "G57.1", label: "坐骨神経痛" },
  { code: "M54.5", label: "腰痛症" },
  { code: "M54.2", label: "頚部痛" },
  { code: "C71.9", label: "脳腫瘍" },
  { code: "G93.6", label: "脳浮腫" },

  // =========================
  // 全身・代謝・内分泌
  // =========================
  { code: "E86", label: "脱水" },
  { code: "R50.9", label: "発熱" },
  { code: "R53", label: "倦怠感" },
  { code: "E11.9", label: "2型糖尿病" },
  { code: "E10.9", label: "1型糖尿病" },
  { code: "E14.9", label: "糖尿病" },
  { code: "E16.2", label: "低血糖" },
  { code: "E87.1", label: "低ナトリウム血症" },
  { code: "E87.5", label: "高カリウム血症" },
  { code: "E87.6", label: "低カリウム血症" },
  { code: "E83.5", label: "低カルシウム血症" },
  { code: "E83.52", label: "高カルシウム血症" },
  { code: "E05.9", label: "甲状腺機能亢進症" },
  { code: "E03.9", label: "甲状腺機能低下症" },
  { code: "E27.1", label: "副腎不全" },
  { code: "E24.9", label: "クッシング症候群" },
  { code: "E23.2", label: "尿崩症" },

  // =========================
  // 血液・腫瘍
  // =========================
  { code: "D50.9", label: "鉄欠乏性貧血", aliases: ["貧血"] },
  { code: "D64.9", label: "貧血" },
  { code: "D69.6", label: "血小板減少症" },
  { code: "D72.8", label: "白血球増多症" },
  { code: "C34.9", label: "肺癌", aliases: ["肺がん"] },
  { code: "C18.9", label: "大腸癌", aliases: ["大腸がん"] },
  { code: "C16.9", label: "胃癌", aliases: ["胃がん"] },
  { code: "C25.9", label: "膵癌", aliases: ["膵がん"] },
  { code: "C22.9", label: "肝癌", aliases: ["肝がん"] },
  { code: "C61", label: "前立腺癌", aliases: ["前立腺がん"] },
  { code: "C64", label: "腎癌", aliases: ["腎がん"] },
  { code: "C56.9", label: "卵巣癌", aliases: ["卵巣がん"] },
  { code: "C50.9", label: "乳癌", aliases: ["乳がん"] },
  { code: "C92.0", label: "急性骨髄性白血病", aliases: ["AML"] },
  { code: "C91.0", label: "急性リンパ性白血病", aliases: ["ALL"] },
  { code: "C83.9", label: "悪性リンパ腫" },
  { code: "C90.0", label: "多発性骨髄腫" },

  // =========================
  // 耳鼻科・眼
  // =========================
  { code: "H66.9", label: "急性中耳炎", aliases: ["中耳炎"] },
  { code: "H60.9", label: "外耳炎" },
  { code: "H81.1", label: "良性発作性頭位めまい症", aliases: ["BPPV"] },
  { code: "H81.0", label: "メニエール病" },
  { code: "H10.9", label: "結膜炎" },
  { code: "H16.9", label: "角膜炎" },

  // =========================
  // 皮膚・筋骨格
  // =========================
  { code: "L50.9", label: "蕁麻疹" },
  { code: "L27.0", label: "薬疹" },
  { code: "L40.9", label: "乾癬" },
  { code: "M10.9", label: "痛風" },
  { code: "M79.1", label: "筋痛症" },
  { code: "M25.5", label: "関節痛" },

  // =========================
  // 精神・その他
  // =========================
  { code: "F41.9", label: "不安症" },
  { code: "F32.9", label: "うつ病" },
  { code: "F45.9", label: "身体症状症" },
  { code: "R07.0", label: "咽頭痛" },
  { code: "R05", label: "咳嗽" },
  { code: "R06.0", label: "呼吸困難" },
  { code: "R11.0", label: "悪心" },
  { code: "R19.7", label: "下痢" },
  { code: "R35", label: "頻尿" },
  { code: "R30.0", label: "排尿痛" },

  // =========================
  // ゲーム固有
  // =========================
  { code: "Z73.9", label: "恋の病" },
];