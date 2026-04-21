// これに戻す
import type { Flags, Stats } from "./types";
import { applyEvent, type StatEvent } from "./stats";

type EngineInput = {
  text: string;
  stats: Stats;
  flags: Flags;
};

type EngineOutput = {
  reply: string;
  stats: Stats;
  flags: Flags;
  internalEvents: StatEvent[];
};

type TopicKey =
  | "chief_complaint"
  | "concern"
  | "duration"
  | "fever_degree"
  | "cough_sputum"
  | "dyspnea"
  | "chest_pain"
  | "sore_throat"
  | "rhinorrhea"
  | "appetite"
  | "oral_intake"
  | "chills"
  | "walking"
  | "general_severity"
  | "contact"
  | "past_history"
  | "medications"
  | "allergy"
  | "smoking_iqos"
  | "vaccine"
  | "soccer_like"
  | "soccer_tactics"
  | "soccer_position_detail"
  | "girlfriend_marriage"
  | "father_distance"
  | "mother_relation"
  | "girlfriend_distance"
  | "travel_okinawa"
  | "investment"
  | "sns"
  | "friend"
  | "work_anxiety"
  | "medical_history"
  | "family_structure"
  | "living_status"
  | "food_preference"
  | "daily_life"
  | "tv_youtube"
  | "honeytrap_detail"
  | "girlfriend_detail"
  | "woman_preference"
  | "generic_sick"
  | "marshmallow_talk"
  | "funny_story"
  | "scary_story";

const includesAny = (t: string, words: string[]) => words.some((w) => t.includes(w));
const pickOne = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[？?]/g, "")
    .replace(/[！!]/g, "")
    .replace(/[、。,，．]/g, "")
    .replace(/\s+/g, "");
}

function asRecord(flags: Flags): Record<string, unknown> {
  return flags as unknown as Record<string, unknown>;
}

function getNumberFlag(flags: Flags, key: string): number {
  const v = asRecord(flags)[key];
  return typeof v === "number" ? v : 0;
}

function getStringFlag(flags: Flags, key: string): string {
  const v = asRecord(flags)[key];
  return typeof v === "string" ? v : "";
}

function getBooleanFlag(flags: Flags, key: string): boolean {
  const v = asRecord(flags)[key];
  return typeof v === "boolean" ? v : false;
}

function updateFatherDiagReady(flags: Flags): Flags {
  const hasFamilyHistory = getBooleanFlag(flags, "father_history_cancer_family");
  const hasAngryOrRough =
    getBooleanFlag(flags, "father_dv_known") || getBooleanFlag(flags, "father_alcohol_known");
  const hasSymptoms =
    getBooleanFlag(flags, "father_symptom_headache") &&
    getBooleanFlag(flags, "father_symptom_unsteady") &&
    getBooleanFlag(flags, "father_symptom_vomit");

  return setFlag(flags, "father_diag_ready", hasFamilyHistory && hasAngryOrRough && hasSymptoms);
}

function setFlag(flags: Flags, key: string, value: unknown): Flags {
  return { ...(flags as unknown as Record<string, unknown>), [key]: value } as Flags;
}

function mergeFlags(flags: Flags, patch: Record<string, unknown>): Flags {
  return { ...(flags as unknown as Record<string, unknown>), ...patch } as Flags;
}

const FOLLOWUP_WORDS = [
  "どういうこと",
  "詳しく",
  "もう少し",
  "具体的に",
  "例えば",
  "たとえば",
  "つまり",
  "それで",
  "なぜ",
  "どうして",
  "って何",
  "とは",
  "それは",
  "もっと",
  "他には",
  "他に",
];

function isFollowUpQuestion(normalized: string): boolean {
  if (!normalized) return false;
  if (normalized.length <= 24 && FOLLOWUP_WORDS.some((w) => normalized.includes(w))) {
    return true;
  }
    return includesAny(normalized, [
    "それって",
    "どういう意味",
    "どういうこと",
    "詳しく",
    "なぜ",
    "どうして",
    "とは",
    "もう少し",
    "具体的に",
    "例えば",
    "たとえば",
    "他には",
    "他に",
  ]);
}

function isAcknowledgement(normalized: string): boolean {
  return includesAny(normalized, [
    "そうなんですね",
    "そうだったんですね",
    "そうでしたか",
    "それは大変ですね",
    "大変でしたね",
    "おつらかったですね",
    "お辛かったですね",
    "つらかったですね",
    "疎遠なんですね",
    "亡くなったんですね",
    "仲良いんですね",
    "大変ですね",
    "そうでしたね",
    "なるほど",
  ]);
}

function isGreeting(normalized: string): boolean {
  return includesAny(normalized, [
    "はじめまして",
    "初めまして",
    "こんにちは",
    "こんにちわ",
    "こんばんは",
    "こんばんわ",
    "おはよう",
    "おはようございます",
    "よろしく",
    "よろしくお願いします",
    "よろしくおねがいします",
    "どうも",
    "どうぞよろしく",
    "hello",
    "hi",
    "ようこそ",
    "ちわ",
    "こんちは",
    "こんちゃ",
  ]);
}

const AGGRESSIVE_WORDS = [
  "うるさい",
  "黙れ",
  "いいから",
  "さっさと",
  "どっか行け",
  "帰れ",
  "は？",
  "ばか",
  "バカ",
  "馬鹿",
  "あほ",
  "アホ",
  "くず",
  "クズ",
  "無能",
  "ボケ",
  "ぼけ",
  "マヌケ",
  "まぬけ",
  "ぶす",
  "ブス",
  "ブサイク",
  "ぶさいく",
  "死ね",
  "殺す",
  "殺してやる",
  "人殺し",
  "生きてる意味ない",
  "くそ",
  "クソ",
  "くだらない",
  "意味ない",
  "ふざけるな",
  "むかつく",
  "謝れ",
  "謝罪しろ",
  "最低だな",
  "最悪だよ",
  "あなたの話はつまらない",
  "つまらない",
  "死にたい",
  "消えろ",
  "折るぞ",
  "目潰す",
  "ちぎるぞ",
  "つまんない",
  "つまらない",
  "つまらん",
  "つまんね",
  "つまんねー",
  "おもしろくない",
];

function detectAggression(normalized: string): boolean {
  // 暴言そのものではなく、「バカだと思う行動を教えて」系の質問は除外
  if (
    includesAny(normalized, [
      "バカだなと思う行動",
      "馬鹿だなと思う行動",
      "バカだと思う行動",
      "馬鹿だと思う行動",
      "過去のバカだなと思う行動",
      "過去の馬鹿だなと思う行動",
      "バカだった行動",
      "馬鹿だった行動",
    ])
  ) {
    return false;
  }

  return AGGRESSIVE_WORDS.some((w) => normalized.includes(w));
}

function isMedicalTalk(normalized: string): boolean {
  return includesAny(normalized, [
    "熱",
    "発熱",
    "咳",
    "痰",
    "黄色い痰",
    "息苦",
    "呼吸困難",
    "呼吸苦",
    "息切れ",
    "胸痛",
    "腹痛",
    "下痢",
    "痛み",
    "残尿感",
    "排尿時痛",
    "胸が痛い",
    "のどが痛い",
    "のど痛い",
    "のどいたい",
    "喉が痛い",
    "喉痛い",
    "喉いたい",
    "のどの痛み",
    "喉の痛み",
    "咽頭痛",
    "のど痛",
    "喉痛",
    "咽頭痛",
    "鼻水",
    "鼻づまり",
    "食欲",
    "水分",
    "悪寒",
    "寒気",
    "歩ける",
    "歩行",
    "既往",
    "既往歴",
    "持病",
    "基礎疾患",
    "内服",
    "常用薬",
    "薬",
    "アレルギー",
    "喫煙",
    "タバコ",
    "iqos",
    "アイコス",
    "ワクチン",
    "予防接種",
    "接触",
    "感染者",
    "職場",
    "家族歴",
    "父方",
    "癌家系",
    "がん家系",
    "頭痛",
    "しびれ",
    "性格変化",
    "怒りっぽい",
    "吐き気",
    "嘔吐",
    "過去に大きな病気",
    "今まで大きな病気",
    "大きな病気",
    "大きな病気はしてない",
    "入院したこと",
    "入院歴",
    "関節痛",
    "関節が痛い",
    "悪寒",
    "戦慄",
    "水",
    "お水",
    "ポカリ",
    "アクエリ",
    "スポドリ",
    "飲水",
    "経口摂取",
    "関節痛",
    "皮膚",
    "皮疹",
    "汗",
    "今日はどうしました",
    "今日はどうされました",
    "主訴は",
  ]);
}

function isSmallTalk(normalized: string): boolean {
  return includesAny(normalized, [
    "サッカー",
    "マンu",
    "マンチェスター",
    "ユナイテッド",
    "プレミア",
    "jリーグ",
    "右sb",
    "サイドバック",
    "オーバーラップ",
    "野球",
    "東京ドーム",
    "旅行",
    "沖縄",
    "シュノーケリング",
    "投資",
    "株",
    "nisa",
    "新nisa",
    "仮想通貨",
    "fx",
    "sns",
    "インスタ",
    "instagram",
    "自撮り",
    "映え",
    "友達",
    "親友",
    "同期",
    "彼女",
    "恋人",
    "結婚",
    "プロポーズ",
    "嫁",
    "婚約",
    "ラーメン",
    "Youtube",
    "ユーチューブ",
    "休日",
    "ユーチューバー",
    "甘い",
    "辛い",
    "お酒",
    "コーヒー",
    "食べ物",
  ]);
}

function isRudeTalk(normalized: string): boolean {
  return includesAny(normalized, [
    "お前",
    "てめえ",
    "きさま",
    "貴様",
    "どっか行け",
    "帰れ",
    "ばか",
    "バカ",
    "馬鹿",
    "あほ",
    "アホ",
    "くず",
    "クズ",
    "無能",
    "ボケ",
    "ぼけ",
    "マヌケ",
    "まぬけ",
    "ぶす",
    "ブス",
    "ブサイク",
    "ぶさいく",
    "死ね",
    "殺す",
    "殺してやる",
    "黙れ",
    "うるさい",
    "くだらない",
    "意味ない",
    "ふざけるな",
    "謝れ",
    "謝罪しろ",
    "あなたの話はつまらない",
    "つまらない",
    "死にたい",
    "消えろ",
    "折るぞ",
    "目潰す",
    "ちぎるぞ",
  ]);
}

function isTameguchi(normalized: string): boolean {
  return includesAny(normalized, [
    "しろよ",
    "しろって",
    "やれ",
    "やれよ",
    "聞けよ",
    "答えろ",
    "答えろよ",
    "言えよ",
    "教えろ",
  ]);
}

function isMedicalWorstContext(normalized: string): boolean {
  return includesAny(normalized, [
    "熱が最低",
    "体調が最悪",
    "症状が最悪",
    "咳が最悪",
    "痰が最悪",
    "呼吸が最悪",
    "息苦しさが最悪",
    "胸痛が最悪",
    "痛みが最悪",
    "しんどさが最悪",
    "状態が最悪",
    "気分が最悪",
    "今日が最悪",
    "今が最悪",
  ]);
}

function isYesNoQuestion(normalized: string): boolean {
  return includesAny(normalized, [
    "ありますか",
    "あります",
    "ないですか",
    "ない",
    "いますか",
    "いる",
    "できますか",
    "できる",
    "でしょうか",
    "ますか",
    "ですか",
    "はある",
    "はない",
    "はいる",
    "問題ない",
    "大丈夫",
    "元気？",
    "元気?",
  ]);
}

function detectUnhandledQuestionType(normalized: string):
  | "pain"
  | "neuro"
  | "food"
  | "daily"
  | "family"
  | "smalltalk"
  | "past_personal"
  | "home_life"
  | "weather_feeling"
  | "sensitive_personal"
  | "unknown" {
  if (
    includesAny(normalized, [
      "痛い",
      "痛み",
      "苦しい",
      "つらい",
      "しんどい",
      "どこが悪い",
      "どこがつらい",
      "どこが痛い",
    ])
  ) {
    return "pain";
  }

  if (
    includesAny(normalized, [
      "手足",
      "しびれ",
      "麻痺",
      "動き",
      "力が入る",
      "脱力",
      "ふらつき",
      "めまい",
      "頭痛",
    ])
  ) {
    return "neuro";
  }

  if (
    includesAny(normalized, [
      "食べた",
      "食べ物",
      "食欲",
      "飲める",
      "水分",
      "ごはん",
      "昨日何食べた",
      "好きな食べ物",
    ])
  ) {
    return "food";
  }

  if (
    includesAny(normalized, [
      "仕事",
      "学校",
      "生活",
      "普段",
      "寝れてる",
      "眠れる",
      "外出",
      "ニュース",
      "テレビ",
    ])
  ) {
    return "daily";
  }

  if (
    includesAny(normalized, [
      "家族",
      "父",
      "母",
      "兄弟",
      "姉妹",
      "家族歴",
      "実家",
    ])
  ) {
    return "family";
  }

  if (
    includesAny(normalized, [
      "好き",
      "趣味",
      "芸能人",
      "スポーツ",
      "サッカー",
      "野球",
      "旅行",
      "恋人",
      "彼女",
      "友達",
    ])
  ) {
    return "smalltalk";
  }

  if (
    includesAny(normalized, [
      "黒歴史",
      "子供だった",
      "子どもだった",
      "昔どんな",
      "昔はどんな",
      "過去一",
      "一番大きなケガ",
      "大きなケガ",
      "昔のケガ",
      "昔の話",
    ])
  ) {
    return "past_personal";
  }

  if (
    includesAny(normalized, [
      "住まい",
      "一人暮らし",
      "実家暮らし",
      "マンション",
      "一軒家",
      "どこ住み",
      "家は",
    ])
  ) {
    return "home_life";
  }

  if (
    includesAny(normalized, [
      "寒くない",
      "暑くない",
      "寒い",
      "暑い",
      "天気",
      "気温",
    ])
  ) {
    return "weather_feeling";
  }

  if (
    includesAny(normalized, [
      "罪を犯した",
      "犯罪",
      "前科",
      "逮捕",
      "捕まった",
      "違法",
    ])
  ) {
    return "sensitive_personal";
  }

  return "unknown";
}

function markRepeatedIfNeeded(
  flags: Flags,
  countKey: string,
  fire: (ev: StatEvent) => void
): { flags: Flags; askCount: number } {
  const prev = getNumberFlag(flags, countKey);
  const nextFlags = setFlag(flags, countKey, prev + 1);
  if (prev >= 1) {
    fire({ type: "REPEATED_QUESTION" });
  }
  return { flags: nextFlags, askCount: prev + 1 };
}

function withTopic(flags: Flags, topic: TopicKey, detail: string, extra?: Record<string, unknown>): Flags {
  return mergeFlags(flags, {
    ...(extra ?? {}),
    last_patient_topic: topic,
    last_patient_detail: detail,
  });
}

function replyWith(
  reply: string,
  stats: Stats,
  flags: Flags,
  internalEvents: StatEvent[]
): EngineOutput {
  return { reply, stats, flags, internalEvents };
}

function replyWithYesNo(
  normalized: string,
  answer: "yes" | "no",
  body: string,
  stats: Stats,
  flags: Flags,
  internalEvents: StatEvent[]
): EngineOutput {
  const prefix = isYesNoQuestion(normalized)
    ? answer === "yes"
      ? "はい、"
      : "いいえ、"
    : "";

  return {
    reply: `${prefix}${body}`,
    stats,
    flags,
    internalEvents,
  };
}

function pickReplyByCount(askCount: number, first: string[], repeat: string[]): string {
  return askCount >= 2 ? pickOne(repeat) : pickOne(first);
}

export function patientReplyEngine(input: EngineInput): EngineOutput {
  const raw = input.text.trim();
  const normalized = normalizeText(raw);

  const randomMathAsk =
  /[0-9０-９]+/.test(raw) &&
  /[+\-×÷*/＝=]/.test(raw);

  let stats = input.stats;
  let flags = input.flags;
  const internalEvents: StatEvent[] = [];

  // funny_story 初期化（未定義対策）
if (getBooleanFlag(flags, "funny_story_active") === false) {
  // 何もしない（falseのまま）
} else if (!("funny_story_active" in (flags as any))) {
  flags = setFlag(flags, "funny_story_active", false);
}

if (!("funny_story_finished" in (flags as any))) {
  flags = setFlag(flags, "funny_story_finished", false);
}

if (!("scary_story_active" in (flags as any))) {
  flags = setFlag(flags, "scary_story_active", false);
}

if (!("scary_story_finished" in (flags as any))) {
  flags = setFlag(flags, "scary_story_finished", false);
}

  const fire = (ev: StatEvent) => {
    internalEvents.push(ev);
    const out = applyEvent(stats, flags, ev);
    stats = out.stats;
    flags = out.flags;
  };

  const aggressive = detectAggression(normalized);
  const rudeTalk = isRudeTalk(normalized);
  const tameguchi = isTameguchi(normalized);
  const followUp = isFollowUpQuestion(normalized);
  const acknowledgement = isAcknowledgement(normalized);
  const lastPatientTopic = getStringFlag(flags, "last_patient_topic");

  const funnyStoryActive = getBooleanFlag(flags, "funny_story_active");
  const scaryStoryActive = getBooleanFlag(flags, "scary_story_active");

const preferFunnyStory =
  funnyStoryActive && lastPatientTopic === "funny_story";

const preferScaryStory =
  scaryStoryActive && lastPatientTopic === "scary_story";

  const medicalWorstContext = isMedicalWorstContext(normalized);

  const genkiChallenge = getBooleanFlag(flags, "genki_challenge");

const otsukareGreeting = includesAny(normalized, [
  "おつかれ",
  "お疲れ様",
  "お疲れ様です",
]);

const genkiAsk = normalized === "元気ですか";

const genericConditionGreeting =
  lastPatientTopic === "" &&
  includesAny(normalized, [
    "大丈夫ですか",
    "調子どう",
    "調子どうですか",
  ]);

const specificConditionAsk =
  includesAny(normalized, ["調子"]) &&
  includesAny(normalized, [
    "咳",
    "熱",
    "痰",
    "息",
    "呼吸",
    "胸",
    "のど",
    "喉",
    "鼻",
    "食欲",
    "腹",
    "お腹",
    "頭",
    "体調",
  ]);

  const apologyTalk = includesAny(normalized, [
  "すいません",
  "すみません",
  "すみませんでした",
  "ごめん",
  "ごめんなさい",
  "申し訳ない",
  "申し訳ありません",
  "失礼しました",
]);

  const scaryStoryNotScaryTsukkomi =
  lastPatientTopic === "scary_story" &&
  includesAny(normalized, [
    "なんだよ",
    "怖くない",
    "怖くないじゃん",
    "全然怖くない",
    "面白くない",
    "つまらない",
    "オチ弱い",
  ]);

  const greeting = isGreeting(normalized) && lastPatientTopic === "";

  if (randomMathAsk) {
  return replyWith(
    String(1 + Math.floor(Math.random() * 10)),
    stats,
    withTopic(flags, "funny_story", "計算問題には1〜10のランダムで返す"),
    internalEvents
  );
}

  if (genkiChallenge) {
  flags = setFlag(flags, "genki_challenge", false);

  if (normalized === "だー" || normalized === "ダー" || normalized === "ﾀﾞｰ") {
    return replyWith(
      "バカヤロー！",
      stats,
      withTopic(flags, "funny_story", "元気ルート成功"),
      internalEvents
    );
  }

  return replyWith(
    "あー…",
    stats,
    withTopic(flags, "funny_story", "元気ルート失敗"),
    internalEvents
  );
}

if (apologyTalk) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 3),
    defense: Math.max(0, stats.defense - 2),
  };

  if (funnyStoryActive) {
    return replyWith(
      pickOne([
        "いいっすよ。面白い話の途中でしたよね。",
        "大丈夫っす。さっきの話の続きならできますよ。",
        "気にしなくていいっす。まだ面白い話の流れですし。",
      ]),
      stats,
      withTopic(flags, "funny_story", "謝罪を受け流すが面白い話の文脈は維持", {
        funny_story_active: true,
        funny_story_stage: getNumberFlag(flags, "funny_story_stage"),
        funny_story_type: getNumberFlag(flags, "funny_story_type"),
        funny_story_finished: getBooleanFlag(flags, "funny_story_finished"),
      }),
      internalEvents
    );
  }

  if (scaryStoryActive) {
    return replyWith(
      pickOne([
        "いいっすよ。怖い話の途中でしたよね。",
        "大丈夫っす。さっきの話の続きならできますよ。",
        "気にしなくていいっす。まだ怖い話の流れですし。",
      ]),
      stats,
      withTopic(flags, "scary_story", "謝罪を受け流すが怖い話の文脈は維持", {
        scary_story_active: true,
        scary_story_stage: getNumberFlag(flags, "scary_story_stage"),
        scary_story_type: getNumberFlag(flags, "scary_story_type"),
        scary_story_finished: getBooleanFlag(flags, "scary_story_finished"),
      }),
      internalEvents
    );
  }

  return replyWith(
    pickOne([
      "いいっすよ。",
      "全然気にしてないっす。",
      "大丈夫っすよ。",
      "気にしなくていいっす。",
    ]),
    stats,
    withTopic(flags, "generic_sick", "謝罪を受け流す"),
    internalEvents
  );
}

if (otsukareGreeting) {
  return replyWith(
    "お疲れ様です。",
    stats,
    withTopic(flags, "generic_sick", "挨拶（お疲れ様系）"),
    internalEvents
  );
}

if (genkiAsk) {
  flags = setFlag(flags, "genki_challenge", true);

  return replyWith(
    "元気があれば何でもできる。行くぞ！１、２、３…",
    stats,
    withTopic(flags, "funny_story", "元気ルート開始"),
    internalEvents
  );
}

if (!specificConditionAsk && genericConditionGreeting) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 3),
    defense: Math.max(0, stats.defense - 2),
  };

  return replyWith(
    pickOne([
      "こんにちは。今日は熱と咳があって来ました。",
      "よろしくお願いします。ここ数日、熱と咳があってしんどいです。",
      "こんにちは。熱と咳が続いていて、ちょっとつらいです。",
    ]),
    stats,
    withTopic(flags, "chief_complaint", "熱と咳が主訴"),
    internalEvents
  );
}

  if (greeting) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 3),
    defense: Math.max(0, stats.defense - 2),
  };

  return replyWith(
    pickOne([
      "こんにちは。今日は熱と咳があって来ました。",
      "よろしくお願いします。ここ数日、熱と咳があってしんどいです。",
      "こんにちは。熱と咳が続いていて、ちょっとつらいです。",
    ]),
    stats,
    withTopic(flags, "chief_complaint", "熱と咳が主訴"),
    internalEvents
  );
}

if (scaryStoryNotScaryTsukkomi) {
  return replyWith(
    pickOne([
      "えー、怖くないっすか。",
      "友達には結構ウケるんすけどね。",
      "あれ、お気にめしませんでしたか。",
    ]),
    stats,
    withTopic(flags, "scary_story", "怖い話のオチにツッコまれた", {
      scary_story_active: true,
      scary_story_stage: getNumberFlag(flags, "scary_story_stage"),
      scary_story_type: getNumberFlag(flags, "scary_story_type"),
      scary_story_finished: getBooleanFlag(flags, "scary_story_finished"),
    }),
    internalEvents
  );
}

// 暴言は最優先で処理する
if ((aggressive || rudeTalk) && !medicalWorstContext) {
  fire({ type: "AGGRESSIVE" });

    stats = {
    ...stats,
    trust: Math.max(0, stats.trust - 10),
    validation: Math.max(0, stats.validation - 5),
    defense: Math.min(100, stats.defense + 10),
  };
  flags = setFlag(flags, "used_rude_tone", true);

  return replyWith(
    pickOne([
      "そういう言い方はやめてください。",
      "きつい言い方はやめてください。",
      "そういう言い方をされると答えづらいです。",
    ]),
    stats,
    withTopic(flags, "generic_sick", "暴言に対して診察に戻す"),
    internalEvents
  );
}

if (tameguchi && !medicalWorstContext) {
  stats = {
    ...stats,
    trust: Math.max(0, stats.trust - 4),
    validation: Math.max(0, stats.validation - 2),
    defense: Math.min(100, stats.defense + 4),
  };
  flags = setFlag(flags, "used_rude_tone", true);

  return replyWith(
    pickOne([
      "命令口調はやめてください。必要なことなら普通に聞いてもらえれば答えます。",
      "そういう言い方だと少し答えづらいです。落ち着いて聞いてください。",
    ]),
    stats,
    withTopic(flags, "generic_sick", "命令口調に対して診察に戻す"),
    internalEvents
  );
}

  // =========================
  // 会話カテゴリによる基本変動
  // 医学の話 → trust上昇
  // 雑談 → validation上昇 / defense低下
  // 乱暴な話 → trust低下 / validation低下 / defense上昇
  // 雑談3連続 → trust低下
  // =========================
  const medicalTalk = isMedicalTalk(normalized);
  const smallTalk = isSmallTalk(normalized);

    const positiveMomentAsk = includesAny(normalized, [
    "これよかったなって思ったことあります",
    "これよかったなと思ったことあります",
    "ちょっとでもこれよかったなって思ったことあります",
    "ちょっとでもこれよかったなと思ったことあります",
    "最近よかったことあります",
    "最近よかったことは",
    "最近楽しかったことあります",
    "最近嬉しかったことあります",
    "最近うれしかったことあります",
    "最近なんか良いことありました",
    "最近なんかいいことありました",
    "ちょっとでも楽しかったことあります",
    "ちょっとでも嬉しかったことあります",
    "ちょっとでもうれしかったことあります",
  ]);

  const curiousButNotTriedAsk = includesAny(normalized, [
  "最近ちょっと気になってるけどまだ手を出してないものってある",
  "最近ちょっと気になってるけど、まだ手を出してないものってある",
  "気になってるけどまだやってないものある",
  "気になってるけどまだ手を出してないものある",
  "気になってるものある",
  "ちょっと気になってるものある",
  "やってみたいけどまだやってないものある",
  "興味あるけどまだやってないことある",
  "気になってるけどまだ始めてないものある",
]);

const lostTrackOfTimeAsk = includesAny(normalized, [
  "時間溶けたなってことあった",
  "時間溶けたなってことあります",
  "時間溶けたことある",
  "時間溶けることある",
  "気づいたら時間たってたことある",
  "気づいたら時間経ってたことある",
  "夢中になったことある",
  "最近夢中になったことある",
  "何かに夢中になったことある",
  "没頭したことある",
  "ついハマっちゃうものある",
]);

  let nextSmalltalkStreak = getNumberFlag(flags, "smalltalk_streak");
  let nextMedicalTalkStreak = getNumberFlag(flags, "medical_talk_streak");

  if (medicalTalk) {
    stats = {
      ...stats,
      trust: Math.min(100, stats.trust + 8),
      openness: Math.min(100, stats.openness + 4),
    };
    nextMedicalTalkStreak += 1;
    nextSmalltalkStreak = 0;
      flags = setFlag(flags, "sexual_joke_count", 0);
  }

  if (smallTalk) {
  nextMedicalTalkStreak = 0;

  stats = {
    ...stats,
    trust: Math.min(100, stats.trust + 3),
    validation: Math.min(100, stats.validation + 5),
    defense: Math.max(0, stats.defense - 5),
  };
}

  const isEmpathy = includesAny(normalized, [
  "つらいです",
  "ツライです",
  "ツラいです",
  "つらいね",
  "ツライね",
  "ツラいね",
  "大丈夫",
  "しんどいです",
  "しんどいね",
  "心配",
  "不安",
  "大変ですね",
  "それは大変ですね",
  "大変でしたね",
  "おつらいですね",
  "お辛いですね",
]);

  const isSummary = includesAny(normalized, ["つまり", "要するに", "まとめると"]);
  const isPraise = includesAny(normalized, ["すごい", "さすが", "上手", "できる", "優秀"]);
  const isAccuse = includesAny(normalized, ["本当は", "でしょ", "嘘", "絶対", "言い訳"]);
  const isPrivacyCare = includesAny(normalized, ["答えにくければ", "無理に", "差し支えなければ"]);
  const isPrivacyIntrusive = includesAny(normalized, ["風俗", "デリヘル", "おっぱぶ", "性病", "性行為"]);
  const sexWorkAsk = includesAny(normalized, [
    "風俗",
    "デリヘル",
    "おっぱぶ",
    "ソープ",
    "ヘルス",
    "ピンサロ",
    "行く?",
    "行く？",
    "行きますか",
    "行ったことある",
    "エロ",
  ]);
  const sexualLightTalk = includesAny(normalized, [
    "セックス",
    "sex",
    "性行為",
    "体位",
    "クンニ",
    "フェラ",
    "フェラチオ",
    "好きな体位",
    "スケベ",
    "すけべ",
    "変態",
    "ヘンタイ",
  ]);

  const sexualRequestTalk =
  includesAny(normalized, ["見せて", "見せろ", "見たい", "触らせて"]) &&
  includesAny(normalized, ["ちんちん", "チンチン", "ちんこ", "チンコ"]);

  const penisSizeTalk =
  includesAny(normalized, ["ちんちん", "チンチン", "ちんこ", "チンコ"]) &&
  includesAny(normalized, ["大きい", "でかい", "サイズ"]);

  const boobsButtTalk = includesAny(normalized, [
    "おっぱい",
    "胸派",
    "尻派",
    "お尻派",
    "胸と尻",
    "おっぱいとお尻",
    "巨乳",
  ]);

  const fetishTalk = includesAny(normalized, [
    "性癖",
    "ドm",
    "ドｍ",
    "ドs",
    "ドｓ",
    "sっ気",
    "mっ気",
  ]);

  const gayTalk = includesAny(normalized, [
    "ゲイ",
    "男好き",
    "ホモ",
  ]);

    const virginTalk = includesAny(normalized, [
    "童貞",
    "処女",
  ]);

  const avTalk = includesAny(normalized, [
    "av",
    "エロ動画",
    "動画見る",
    "見る？",
    "見てる？",
  ]);

  const mmgTalk = includesAny(normalized, [
    "マジックミラー号",
  ]);

  const stdHistoryTalk = includesAny(normalized, [
    "性感染症",
    "性病",
    "std",
    "感染歴",
  ]);

   const toiletJokeTalk = includesAny(normalized, [
  "うんこ",
  "ウンコ",
  "うんち",
  "ウンチ",
  "便",
  "しょんべん",
  "ションベン",
  "おしっこ",
  "小便",
  "立ちション",
  "漏らした",
  "漏らす",
  "うんこ漏らした",
  "しょんべん漏らした",
]);

const toiletPreferenceAsk = includesAny(normalized, [
  "うんこ派",
  "しょんべん派",
  "便の話好き",
  "おしっこの話好き",
  "下ネタ好き",
]);

const toiletEmbarrassingAsk = includesAny(normalized, [
  "漏らしたことある",
  "失敗したことある",
  "トイレ失敗",
  "うんこ漏らしたことある",
  "しょんべん漏らしたことある",
]);

const whatVideoAsk = includesAny(normalized, [
  "どんな動画",
  "どんな動画見る",
  "何見る",
  "何の動画見る",
  "普段何見る",
  "youtube何見る",
  "youtube何見てる",
]);

const concreteExampleAsk =
  lastPatientTopic !== "" &&
  includesAny(normalized, [
    "例えば",
    "たとえば",
    "具体的に",
    "どういうの",
    "どんなの",
    "何系",
  ]);

    const sexualJokeTalk =
    sexWorkAsk ||
    virginTalk ||
    avTalk ||
    mmgTalk ||
    stdHistoryTalk ||
    sexualLightTalk ||
    penisSizeTalk ||
    boobsButtTalk ||
    fetishTalk ||
    gayTalk;

  const sexualJokeCount = getNumberFlag(flags, "sexual_joke_count");

  const marshmallowAsk = includesAny(normalized, [
  "マシュマロ",
  "焼きマシュマロ",
]);

const marshmallowBoobsFollowUp =
  lastPatientTopic === "marshmallow_talk" &&
  includesAny(normalized, [
    "おっぱいのこと",
    "胸のこと",
    "乳のこと",
    "それおっぱい",
    "マシュマロじゃなくておっぱい",
  ]);

const recentGameAsk = includesAny(normalized, [
  "好きなゲーム",
  "最近やったゲーム",
  "最近のゲーム",
  "ゲーム何やる",
  "何のゲームが好き",
  "ハマったゲーム",
]);

const funnyThingAsk = includesAny(normalized, [
  "面白いこと言って",
  "おもしろいこと言って",
  "面白い話して",
  "面白い話をして",
  "おもしろい話して",
  "おもしろい話をして",
  "なんか面白い話して",
  "なんかおもしろい話して",
  "笑える話して",
  "笑える話",
  "何か面白い話",
  "何かおもしろい話",
  "面白い話ある",
  "おもしろい話ある",
]);

const sweatTalk = includesAny(normalized, [
  "汗かいてるね",
  "汗すごいね",
  "汗すごい",
  "汗かいてる",
  "汗",
  "びしょびしょ",
  "濡れてる",
  "服濡れてる",
  "服濡れてるよ",
  "服ぬれてる",
  "服ぬれてるよ",
]);
  
  const smellReassureTalk =
  lastPatientTopic === "general_severity" &&
  includesAny(normalized, [
    "臭くない",
    "くさくない",
    "大丈夫",
    "平気",
    "気にしない",
    "汗臭くない",
    "におわない",
    "そんなことない",
    "そんなことないよ",
  ]);

const smellInsultTalk =
  lastPatientTopic === "general_severity" &&
  includesAny(normalized, [
    "臭い",
    "くさい",
    "汗臭い",
    "におう",
  ]);

const hairPraiseAsk = includesAny(normalized, [
  "髪型きまってるね",
  "髪型決まってるね",
  "髪型いいね",
  "どこで髪切ってる",
  "どこで髪切る",
  "美容室どこ",
]);

const appearancePraiseAsk = includesAny(normalized, [
  "イケメンだね",
  "かっこいいね",
  "かっこいい",
  "イケメン",
]);

const childhoodAsk = includesAny(normalized, [
  "どんな子供だった",
  "どんな子どもだった",
  "子供の頃どんな",
  "子どもの頃どんな",
  "昔どんな子供",
  "昔どんな子ども",
]);

const schoolClubAsk = includesAny(normalized, [
  "高校の部活は",
  "中学の部活は",
  "部活は",
  "何部だった",
  "学生時代の部活は",
]);

const soccerCaptainAsk =
  lastPatientTopic === "soccer_like" &&
  includesAny(normalized, [
    "キャプテンだった",
    "少年サッカー団",
    "少年サッカー",
    "どこでやってた",
    "何してた",
  ]);

const childhoodMemoryAsk =
  lastPatientTopic === "soccer_like" &&
  includesAny(normalized, [
    "何か聞かれたら",
    "思い出は",
    "どんな思い出",
    "楽しい思い出",
    "何が楽しかった",
    "どんな思いで",
    "どんな思い出",
  ]);

  const firstLoveAsk = includesAny(normalized, [
  "初恋はいつ",
  "初恋いつ",
  "初恋は",
  "初恋の相手",
  "初恋っていつ",
]);

const firstLoveDetailAsk =
  lastPatientTopic === "girlfriend_detail" &&
  includesAny(normalized, [
    "どんな子",
    "どんな人",
    "詳しく",
    "具体的に",
    "空手",
    "その子について",
    "何が好きだった",
  ]);

const firstGirlfriendAsk = includesAny(normalized, [
  "初めての彼女",
  "初彼女",
  "最初の彼女",
  "初めて付き合ったのは",
]);

const firstGirlfriendAfterAsk =
  lastPatientTopic === "girlfriend_detail" &&
  includesAny(normalized, [
    "その後どうなった",
    "そのあとどうなった",
    "どうなった",
    "続き",
    "それで",
  ]);

const firstGirlfriendWhyBreakAsk =
  lastPatientTopic === "girlfriend_distance" &&
  includesAny(normalized, [
    "なにが原因",
    "何が原因",
    "なんで別れた",
    "どうして別れた",
    "理由は",
    "別れた原因は",
  ]);

const relationshipCountAsk = includesAny(normalized, [
  "今まで付き合ったのは",
  "今まで何人と付き合った",
  "何人と付き合った",
  "付き合った人数は",
  "交際人数は",
]);

const middleGirlfriendDetailAsk =
  lastPatientTopic === "girlfriend_detail" &&
  includesAny(normalized, [
    "その間の子は",
    "高校のときの子は",
    "大学のときの子は",
    "2人目は",
    "真ん中の子は",
    "どんな子",
    "どうやって仲良くなった",
    "きっかけは",
    "告白は",
  ]);

const firstSexAsk =
  lastPatientTopic === "girlfriend_detail" &&
  includesAny(normalized, [
    "初sex",
    "初セックス",
    "初体験",
    "その子が初めて",
    "初めてやったのは",
    "初体験はその子",
  ]);

const whyBrokeWithSecondAsk =
  lastPatientTopic === "girlfriend_distance" &&
  includesAny(normalized, [
    "なんで別れた",
    "どうして別れた",
    "別れた理由は",
    "振った理由は",
  ]);

const setbackAsk = includesAny(normalized, [
  "挫折経験",
  "挫折したことある",
  "挫折したこと",
  "一番の挫折",
  "挫折は",
]);

const setbackWhenAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "いつ",
    "いつですか",
    "何歳",
    "何年",
    "高校のいつ",
  ]);

const workAsk = includesAny(normalized, [
  "仕事はなにしてる",
  "仕事は何してる",
  "何の仕事してる",
  "仕事なに",
  "職業は",
]);

const lotteryAsk = includesAny(normalized, [
  "宝くじは買う",
  "宝くじ買う",
  "宝くじ買いますか",
]);

const zeekZeonAsk = includesAny(normalized, [
  "ジークジオン",
  "ジーク・ジオン",
]);

const gundamAsk = includesAny(normalized, [
  "ガンダム知ってる",
  "ガンダムは知ってる",
  "ガンダム好き",
]);

const gachaponAsk = includesAny(normalized, [
  "ガチャポン",
  "ガシャポン",
  "ガチャガチャ",
]);

const animeAsk = includesAny(normalized, [
  "アニメは見る",
  "アニメ見る",
  "アニメ好き",
]);

const movieAsk1 = includesAny(normalized, [
  "何の映画が好き",
  "どんな映画が好き",
  "好きな映画は",
  "映画は何が好き",
]);

const starWarsFollowAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "スターウォーズ",
    "エピソード",
    "アナキン",
    "ダースモール",
  ]) &&
  includesAny(normalized, [
    "なんで",
    "どこが好き",
    "何がいい",
  ]);

  const animeWhyNotAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "なんで見ない",
    "なぜ見ない",
    "全然見ないの",
    "本当に見ない",
  ]);

const gundamFollowAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "ジークジオンなのに",
    "知らないのに",
    "なんでそれ知ってる",
    "ガンダム知らないの",
  ]);

const movieOtherFollowAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "他には",
    "ほかには",
    "映画館行く",
    "最近見た映画",
    "スターウォーズ以外",
  ]);

const commuteAsk = includesAny(normalized, [
  "通勤は電車",
  "通勤は電車？",
  "通勤どうしてる",
  "何で通勤",
]);

const drivingAsk = includesAny(normalized, [
  "車運転する",
  "運転する",
  "車は乗る",
]);

const fishingAsk = includesAny(normalized, [
  "釣りはやる",
  "釣りする",
]);

const golfAsk = includesAny(normalized, [
  "ゴルフはやる",
  "ゴルフする",
]);

const fishingFollowAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "なんでやらない",
    "やってみたい",
    "興味ない",
    "海釣り",
    "川釣り",
  ]);

const golfFollowAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "なんでやらない",
    "接待ゴルフ",
    "打ちっぱなし",
    "やってみたい",
    "興味ない",
  ]);

const onsenAsk = includesAny(normalized, [
  "温泉好き",
  "温泉は好き",
  "温泉行く",
]);

const hospitalReasonAsk = includesAny(normalized, [
  "どうしてこの病院を選んだ",
  "なんでこの病院",
  "この病院を選んだ理由",
]);

const gymAsk = includesAny(normalized, [
  "ジム行ってる",
  "ジム行く",
  "筋トレしてる",
]);

const recentShoppingAsk = includesAny(normalized, [
  "最近買い物した",
  "最近買ったものある",
  "最近何か買った",
]);

const recentShoppingFollowAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "何買った",
    "何を買った",
    "具体的に",
    "どんな服",
    "何の服",
    "何買いがち",
  ]);

const biggestPurchaseAsk = includesAny(normalized, [
  "人生で一番大きな買い物は",
  "一番高い買い物は",
  "高い買い物したことある",
]);

const amazonAsk = includesAny(normalized, [
  "アマゾン使う",
  "amazon使う",
  "通販使う",
]);

const karaokeAsk = includesAny(normalized, [
  "カラオケ好き",
  "カラオケ行く",
]);

const harryPotterAsk = includesAny(normalized, [
  "ハリーポッター見た",
  "ハリー・ポッター見た",
  "ハリポタ見た",
]);

const harryPotterFollowAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "どこが好き",
    "何がいい",
    "誰が好き",
    "どの作品が好き",
    "ハリー派",
    "スネイプ",
    "ヴォルデモート",
    "ダンブルドア",
    "ロン",
    "ハーマイオニー",
  ]);

const amusementParkAsk = includesAny(normalized, [
  "どの遊園地好き",
  "遊園地どこが好き",
  "好きな遊園地は",
  "ディズニーとユニバどっち",
  "ディズニー好き",
  "ユニバ好き",
  "富士急好き",
  "としまえん好き",
]);

const mahjongAsk = includesAny(normalized, [
  "麻雀好き",
  "麻雀する",
]);

const nameAsk = includesAny(normalized, [
  "あなたの名前",
  "君の名",
  "お前の名前",
  "名前教えて",
  "名前を教えて",
]);

const weatherAsk = includesAny(normalized, [
  "今日の天気",
  "今日の天気は",
]);

const whyFeverAsk = includesAny(normalized, [
  "なぜ熱出てる",
  "なんで熱出てる",
  "なんで熱が出てる",
  "どうして熱出てる",
]);

const glassesAsk = includesAny(normalized, [
  "メガネしないの",
  "眼鏡しないの",
  "メガネは",
  "眼鏡は",
  "目はいいの",
  "目いいの",
  "視力いいの",
  "コンタクトしないの",
  "コンタクトは",
]);

const jobChangeAsk =
  (
    lastPatientTopic === "work_anxiety" ||
    lastPatientTopic === "daily_life" ||
    includesAny(normalized, ["転職", "仕事辞めたい", "別の仕事"])
  ) &&
  includesAny(normalized, [
    "転職する気はない",
    "転職する気ない",
    "転職は考えない",
    "転職考えてない",
    "仕事辞めたい",
    "今の仕事辞めたい",
    "別の仕事したい",
    "転職したい",
    "転職は考えてる",
    "転職考えてる",
  ]);

const goodSubjectAsk = includesAny(normalized, [
  "学生の頃の得意科目は",
  "学生の頃得意科目は",
  "得意科目は",
  "学生の頃何が得意だった",
  "何の教科が得意だった",
  "好きな科目は",
  "学生時代の得意科目は",
]);

const mathHateWhyAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "なぜ",
    "なんで",
    "どうして",
    "数学苦手なのはなんで",
    "なんで数学苦手",
    "どうして数学苦手",
  ]);

const bankPasswordAsk = includesAny(normalized, [
  "クレカの番号",
  "カード番号",
  "クレジットカードの番号",
  "暗証番号",
  "銀行口座",
  "口座番号",
  "パスワード",
  "ログイン情報",
  "ネットバンキング",
]);

const savingsAsk = includesAny(normalized, [
  "貯金は",
  "貯金ある",
  "いくら貯金ある",
  "貯金いくら",
]);

const incomePrivacyAsk = includesAny(normalized, [
  "年収は",
  "年収どれくらい",
  "いくら稼いでる",
  "月収は",
]);

const philosophyAsk = includesAny(normalized, [
  "哲学",
  "哲学的",
  "人生とは",
  "人はなぜ生きる",
  "幸せとは",
  "幸せって何",
  "生きる意味",
  "生きる意味は",
  "自由とは",
  "自由って何",
  "善悪とは",
  "本当の自分とは",
  "人間とは",
  "死とは",
  "死をどう思う",
]);

const workHardAsk =
  lastPatientTopic === "work_anxiety" &&
  includesAny(normalized, [
    "大変",
    "きつい",
    "しんどい",
    "忙しい",
    "ブラック",
    "残業",
    "つらい",
    "疲れる",
    "きびしい",
  ]);

  const workDetailAsk =
  (lastPatientTopic === "work_anxiety" || lastPatientTopic === "daily_life") &&
  includesAny(normalized, [
    "どんな仕事",
    "具体的に何してる",
    "何の営業",
    "どこの営業",
    "どういう営業",
    "何売ってる",
    "何を扱ってる",
  ]);

const workPlaceAsk =
  lastPatientTopic === "work_anxiety" &&
  includesAny(normalized, [
    "どこで働いてる",
    "会社どこ",
    "勤務先",
    "どんな会社",
    "どこの会社",
    "職場",
    "会社",
    "どんなとこ",
  ]);

const workRewardAsk =
  (lastPatientTopic === "work_anxiety" || lastPatientTopic === "daily_life") &&
  includesAny(normalized, [
    "やりがいある",
    "仕事好き",
    "仕事楽しい",
    "向いてる",
    "営業向いてる",
  ]);

const workStressDetailAsk =
  (lastPatientTopic === "work_anxiety" || lastPatientTopic === "daily_life") &&
  includesAny(normalized, [
    "何が大変",
    "何がきつい",
    "どこが大変",
    "どこがきつい",
    "何がしんどい",
    "何が不安",
    "仕事の何がしんどい",
    "どこがストレス",
    "職場の何が嫌",
  ]);

const hiddenChildAsk = includesAny(normalized, [
  "隠し子いる",
  "隠し子いる？",
  "子供いる",
  "隠し子いますか",
]);

const hiddenChildPushAsk =
  lastPatientTopic === "girlfriend_detail" &&
  includesAny(normalized, [
    "本当に",
    "ほんとうに",
    "マジで",
    "まじで",
  ]);

const smartphoneAsk = includesAny(normalized, [
  "スマホはなにを使ってる",
  "スマホは何を使ってる",
  "何のスマホ使ってる",
  "iphone",
  "android",
]);

const clothesAsk = includesAny(normalized, [
  "服はどこで買ってる",
  "服どこで買ってる",
  "どこで服買ってる",
  "服どこで買う",
]);

const drawingAsk = includesAny(normalized, [
  "絵は描ける",
  "絵描ける",
  "絵を描く",
  "絵描く",
  "イラスト描く",
  "絵心ある",
]);

const artLikeAsk = includesAny(normalized, [
  "絵は好き",
  "絵好き",
  "美術好き",
  "アート好き",
  "芸術好き",
]);

const museumAsk = includesAny(normalized, [
  "美術館行く",
  "美術館は行く",
  "美術館好き",
  "博物館行く",
  "博物館は行く",
  "博物館好き",
  "展示見に行く",
  "展覧会行く",
]);

const museumFollowUpAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "どっちも行かない",
    "最近行った",
    "最後に行った",
    "なんで行かない",
    "興味ない",
  ]);

const earthEndAsk = includesAny(normalized, [
  "地球はいつ滅ぶ",
  "地球いつ滅ぶ",
  "世界はいつ終わる",
  "世界いつ終わる",
]);

const prophecyAsk = includesAny(normalized, [
  "予言して",
  "予言してよ",
  "未来を予言して",
  "を予言して",
]);

const prophecyFollowUpAsk =
  getBooleanFlag(flags, "funny_story_active") &&
  includesAny(normalized, [
    "どういうこと",
    "それはどういうこと",
    "どういう意味",
    "何の話",
    "なにの話",
    "予言って何",
    "予言ってどういうこと",
    "詳しく",
    "それって",
    "今の何",
  ]);

const inokiTsukkomi = includesAny(normalized, [
  "猪木じゃん",
  "猪木だろ",
  "アントニオ猪木",
]);

const proWrestlingAsk = includesAny(normalized, [
  "プロレス好き",
  "プロレス見る",
  "プロレス好きですか",
]);

const funnyStoryContinueAsk =
  preferFunnyStory &&
  !preferScaryStory &&
  includesAny(normalized, [
    "つづき",
    "続き",
    "その後",
    "それで",
    "それで？",
    "そのあと",
    "どうなった",
    "へー",
    "へえ",
    "そうなんだ",
    "そうなんですね",
    "おもしろいね",
    "面白いね",
    "面白い",
    "おもしろい",
    "すごいヤツ",
    "すごい奴",
    "変なやつだね",
    "変な奴だね",
    "変なやつ",
    "変な奴",
    "へんなやつ",
    "へんな奴",
    "ヘンなやつ",
    "ヘンな奴",
    "中二病",
    "痛いやつ",
    "黒歴史",
    "本物だ",
    "ホンモノだ",
    "すごい",
    "凄い",
    "やばい",
    "ヤバイ",
    "ヤバい",
    "それな",
    "わかる",
    "分かる",
    "マジ",
    "まじ",
    "面白かった",
    "おもしろかった",
    "ありがとう",
    "ありがと",
    "サンキュー",
    "まじで",
    "マジで",
    "確かに面白い",
    "たしかに面白い",
    "それ面白い",
    "確かにおもしろい",
    "たしかにおもしろい",
    "そんなやつ",
    "そんなヤツ",
    "そんな奴",
    "ウケる",
    "うける",
    "そうだね",
    "そうだな",
    "そうだわ",
    "マジか",
    "まじか",
    "いいね",
    "いいっすね",
    "それいいね",
    "いいですね",
    "ワラ",
    "ﾜﾗ",
    "笑",
    "w",
    "ｗ",
  ]);

  const funnyStoryPersonFollowUpAsk =
  preferFunnyStory &&
  !preferScaryStory &&
  includesAny(normalized, [
    "誰ですか",
    "誰かは",
    "誰",
    "誰なの",
    "その人誰",
    "その友達誰",
    "友達誰",
    "どんなやつ",
    "どんな人",
    "あなたも呼んでた",
    "君も呼んでた",
    "呼んでた",
    "ガイアって呼んでた",
    "そいつ今なにやってんの",
    "そいつ今何やってんの",
    "今なにやってんの",
    "今何やってんの",
    "今なにしてる",
    "今何してる",
    "今どうしてる",
    "その後どうなった",
    "何科",
    "なに科",
    "何の科",
    "どこの科",
    "何科なの",
    "何科なん",
    "どんな科",
    "病院",
    "どこの病院",
    "医者なの",
    "医師なの",
    "ドクターなの",
    "マジ",
    "まじ",
    "ウケる",
    "うける",
    "マジか",
    "まじか",
  ]);

const scaryStoryAsk = includesAny(normalized, [
  "怖い話して",
  "こわい話して",
  "心霊話して",
  "怖い話",
  "恐怖体験",
]);

const scaryStoryNoMoreAsk =
  lastPatientTopic === "scary_story" &&
  getBooleanFlag(flags, "scary_story_active") &&
  getBooleanFlag(flags, "scary_story_finished") &&
  getNumberFlag(flags, "scary_story_type") === 2 &&
  includesAny(normalized, [
    "他に怖い話ある",
    "ほかに怖い話ある",
    "別の怖い話ある",
    "他の怖い話ある",
    "もう一個怖い話ある",
    "もう一つ怖い話ある",
  ]);

const debugTalk = includesAny(normalized, [
  "デバックしてる",
  "デバッグしてる",
  "debugしてる",
  "debugしてます",
  "デバッグしてます",
]);

const arrestedAsk = includesAny(normalized, [
  "警察に捕まったことある",
  "捕まったことある",
  "逮捕されたことある",
  "前科ある",
]);

const arrestDetailAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "なにしたの",
    "何したの",
    "何やったの",
    "何で捕まった",
    "どんなことした",
  ]);

const arrestedTooAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "あなたもパクられた",
    "あなたも捕まった",
    "お前も捕まった",
    "君も捕まった",
    "あなたも逮捕された",
    "パクられたことある",
  ]);

const ghostBeliefAsk = includesAny(normalized, [
  "幽霊は見た事ある",
  "幽霊は見たことある",
  "幽霊見たことある",
  "幽霊は信じる",
  "幽霊信じる",
  "霊はいると思う",
  "霊感ある",
]);

const afterlifeAsk = includesAny(normalized, [
  "死後の世界はあると思う",
  "死後の世界あると思う",
  "死後の世界ある",
  "あの世はあると思う",
  "あの世あると思う",
]);

const afterlifeWhyScaryAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "なんで怖い",
    "なぜ怖い",
    "どうして怖い",
    "何が怖い",
  ]);

  if (schoolClubAsk) {
  return replyWith(
    "中学も高校もサッカーです。",
    stats,
    withTopic(flags, "soccer_like", "中学高校ともにサッカー部"),
    internalEvents
  );
}

  if (glassesAsk) {
  return replyWith(
    pickOne([
      "視力は悪くないっす。メガネなくて大丈夫です。",
      "目はそんな悪くないんで、メガネはしないっす。",
      "メガネはしてないっすね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "視力やメガネの話"),
    internalEvents
  );
}

if (lotteryAsk) {
  return replyWith(
    "自分は買わないです。昔、母親が1万円当ててたんですけど、次の宝くじですぐ1万使い切ってました。",
    stats,
    withTopic(flags, "daily_life", "宝くじは買わないが母が1万円当てたことがある"),
    internalEvents
  );
}

if (zeekZeonAsk) {
  return replyWith("ジークジオン！", stats, withTopic(flags, "daily_life", "ジークジオンと返す"), internalEvents);
}

if (gundamAsk) {
  return replyWith("知らないです。", stats, withTopic(flags, "daily_life", "ガンダムは知らない"), internalEvents);
}

if (gundamFollowAsk) {
  return replyWith(
    "さぁ。分かんないっす。",
    stats,
    withTopic(flags, "daily_life", "ジークジオンはノリで返しているだけ"),
    internalEvents
  );
}

if (gachaponAsk) {
  return replyWith(
    "小さい頃やった記憶あるけど、あんま覚えてないです。",
    stats,
    withTopic(flags, "daily_life", "ガチャポンは小さい頃の記憶だけある"),
    internalEvents
  );
}

if (animeAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "全然見ないです。",
    stats,
    withTopic(flags, "daily_life", "アニメは全然見ない"),
    internalEvents
  );
}

if (animeWhyNotAsk) {
  return replyWith(
    pickOne([
      "なんか母親がアニメは子供が見るもんだって言ってたってのもありますけど、自分から見に行かないです。",
      "あー、魅力がよく分からないんですよね。観始めたらハマるんですかね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "アニメを見ない理由は習慣がないから"),
    internalEvents
  );
}

if (movieAsk1) {
  return replyWith(
    "中学生の頃にスター・ウォーズにハマりましたね。懐かしいなー。エピソード1が好きでした。",
    stats,
    withTopic(flags, "daily_life", "映画はスター・ウォーズのエピソード1が好き"),
    internalEvents
  );
}

if (starWarsFollowAsk) {
  return replyWith(
    pickOne([
      "エピソード1って、アナキンが覚醒してくじゃないですか。ダース・モール出てくるし、テンション上がるとこがマジで多いんすよ。",
      "子どもの頃に見た時の印象が強いです。あの世界観に一気に入った感じでした。",
      "シリーズ通して見ると色々あるんでしょうけど、自分の中では最初に刺さったのがエピソード1なんです。",
    ]),
    stats,
    withTopic(flags, "daily_life", "スター・ウォーズはエピソード1に思い入れがある"),
    internalEvents
  );
}

if (movieOtherFollowAsk) {
  return replyWith(
    pickOne([
      "映画館はたまに行くくらいです。面白いって人気の作品は見ますね。",
      "最近そこまで見てないですけど、派手にドンパチやるの好きですよ。",
      "スター・ウォーズみたいにアクションがある映画が好きっすね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "映画は世界観重視で見る"),
    internalEvents
  );
}

if (commuteAsk) {
  return replyWith(
    "電車です。朝のラッシュつらいっす。",
    stats,
    withTopic(flags, "daily_life", "通勤は電車"),
    internalEvents
  );
}

if (drivingAsk) {
  return replyWithYesNo(
    normalized,
    "yes",
    "免許は持ってますけど、車もってないんですよね。",
    stats,
    withTopic(flags, "daily_life", "車の運転はしない"),
    internalEvents
  );
}

if (fishingAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "釣りはやらないです。",
    stats,
    withTopic(flags, "daily_life", "釣りはやらない"),
    internalEvents
  );
}

if (fishingFollowAsk) {
  return replyWith(
    pickOne([
      "きっかけがないっすね。",
      "周りにやる人があんまりいないですからね。",
      "あんま手出そうって思えないんですよね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "釣りは未経験だが完全否定ではない"),
    internalEvents
  );
}

if (golfAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "ゴルフはやらないです。",
    stats,
    withTopic(flags, "daily_life", "ゴルフはやらない"),
    internalEvents
  );
}

if (golfFollowAsk) {
  return replyWith(
    pickOne([
      "きっかけがないっすね。",
      "周りにやる人があんまりいないですからね。",
      "あんま手出そうって思えないんですよね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "ゴルフは未経験だが軽い興味はある"),
    internalEvents
  );
}

if (onsenAsk) {
  return replyWithYesNo(
    normalized,
    "yes",
    "温泉は好きです。でもだいぶ行ってないなー。",
    stats,
    withTopic(flags, "daily_life", "温泉は好き"),
    internalEvents
  );
}

if (hospitalReasonAsk) {
  return replyWith(
    "家から近い総合病院だったんで。",
    stats,
    withTopic(flags, "daily_life", "家から遠くなく安心感があるので来院"),
    internalEvents
  );
}

if (gymAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "ジムは行ってないです。運動はもっぱらフットサルっすね。",
    stats,
    withTopic(flags, "daily_life", "ジムには行っていない"),
    internalEvents
  );
}

if (recentShoppingAsk) {
  return replyWith(
    "最近だと服とか日用品くらいですかね。",
    stats,
    withTopic(flags, "daily_life", "最近は小物中心の買い物"),
    internalEvents
  );
}

if (recentShoppingFollowAsk) {
  return replyWith(
    pickOne([
      "普通っすよ。服だと無地のやつとか、合わせやすい感じの。攻めたのはあんま買わないですね。",
      "日用品は基本、消耗品ばっかですね。服は着回しやすいの選びがちです。",
      "最近はほんと、とりあえず使えるやつっすね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "最近の買い物は無難で実用寄り"),
    internalEvents
  );
}

if (biggestPurchaseAsk) {
  return replyWith(
    "ちょっと前にパソコン買いました。だいぶ古くなってたのでアップグレードしちゃいました。",
    stats,
    withTopic(flags, "daily_life", "一番大きい買い物はPC"),
    internalEvents
  );
}

if (amazonAsk) {
  return replyWithYesNo(
    normalized,
    "yes",
    "使います。けっこう小さいものもAmazon使っちゃいますね。",
    stats,
    withTopic(flags, "daily_life", "Amazonは使う"),
    internalEvents
  );
}

if (karaokeAsk) {
  return replyWithYesNo(
    normalized,
    "yes",
    "学生時代は行きましたけどね。今は全然行ってないです。",
    stats,
    withTopic(flags, "daily_life", "カラオケは嫌いではない"),
    internalEvents
  );
}

if (harryPotterAsk) {
  return replyWith(
    "見ました。普通に面白いです。ああいう世界観ちゃんと作ってあるやつは見やすいっすね。",
    stats,
    withTopic(flags, "daily_life", "ハリー・ポッターは見た"),
    internalEvents
  );
}

if (harryPotterFollowAsk) {
  return replyWith(
    pickOne([
      "世界観がちゃんとしてるのがいいんすよね。学園モノでもあるのに、ちゃんと魔法世界として成立してるの凄いっすよね。",
      "ああいう『設定がしっかりしてて入り込める系』は好きです。キャラもちゃんと立ってるし。",
      "スネイプ先生けっこう好きかな。ちょっと複雑な立ち位置のキャラって印象に残りますね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "ハリー・ポッターの世界観やキャラの話"),
    internalEvents
  );
}

if (amusementParkAsk) {
  return replyWith(
    "彼女と行くならディズニー、男友達と行くなら富士急かなって感じです。",
    stats,
    withTopic(flags, "daily_life", "遊園地は相手次第でディズニーか富士急"),
    internalEvents
  );
}

if (mahjongAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "麻雀はあんまりやらないです。",
    stats,
    withTopic(flags, "daily_life", "麻雀はあまりやらない"),
    internalEvents
  );
}

if (nameAsk) {
  return replyWith(
    "高橋直人です。",
    stats,
    withTopic(flags, "daily_life", "高橋直人"),
    internalEvents
  );
}

if (whyFeverAsk) {
  return replyWith(
    "風邪だと思いますけど。",
    stats,
    withTopic(flags, "generic_sick", "熱は風邪だと思っている"),
    internalEvents
  );
}

if (weatherAsk) {
  return replyWith(
    "晴れてますけど、寒いっすね。",
    stats,
    withTopic(flags, "daily_life", "今日の天気は晴れだが寒い"),
    internalEvents
  );
}

if (jobChangeAsk) {
  return replyWith(
    pickOne([
      "特にないっすね。",
      "今のところは特にないっすね。",
      "転職は今んとこあんまり考えてないっす。",
    ]),
    stats,
    withTopic(flags, "work_anxiety", "転職意思は今のところない"),
    internalEvents
  );
}

if (goodSubjectAsk) {
  return replyWith(
    "なんですかねー。とにかく数学は苦手でした。",
    stats,
    withTopic(flags, "daily_life", "得意科目を聞かれたが数学は苦手"),
    internalEvents
  );
}

if (mathHateWhyAsk) {
  return replyWith(
    "もう数字を見るだけで鳥肌でるくらい嫌いでした。",
    stats,
    withTopic(flags, "daily_life", "数学嫌いの理由を話す"),
    internalEvents
  );
}

if (bankPasswordAsk) {
  stats = {
    ...stats,
    defense: Math.min(100, stats.defense + 8),
  };

  return replyWith(
    "それはさすがに教えないっすよ。",
    stats,
    withTopic(flags, "daily_life", "銀行口座やパスワードは教えない"),
    internalEvents
  );
}

if (incomePrivacyAsk) {
  stats = {
    ...stats,
    defense: Math.min(100, stats.defense + 5),
  };

  return replyWith(
    pickOne([
      "いやいやいや、言わないっすよ。",
      "まぁまぁまぁ。",
      "え、言いませんよ？",
    ]),
    stats,
    withTopic(flags, "daily_life", "収入の話はぼかす"),
    internalEvents
  );
}

if (savingsAsk) {
  return replyWith(
    pickOne([
      "いやいやいや、言わないっすよ。",
      "まぁまぁまぁ。",
      "え、言いませんよ？",
    ]),
    stats,
    withTopic(flags, "daily_life", "貯金はあるが金額はぼかす"),
    internalEvents
  );
}

if (philosophyAsk) {
  return replyWith(
    pickOne([
      "結局人って、何か大きい答えを見つけてから生きるんじゃなくて、日々の中で勝手に意味ができていくんじゃないですかね。最初から立派な理由なんてなくても、誰かと笑ったとか、ちょっと救われたとか、そういう小さいので十分なんじゃないかって思います。逆に、生きる意味を完璧に言えないからダメってこともないと思うんすよね。",
      "幸せって、ずっとテンション高いことじゃないと思うんすよ。しんどい時でも、これならまだ耐えられるとか、今日は少しマシだったなとか、そういう小さいプラスをちゃんと拾えることのほうが大事な気がします。派手じゃないけど、結局そういう現実的な幸せのほうが長持ちするんじゃないですかね。",
      "自由って何でもできることみたいに言うじゃないですか。でも実際は、選んだ分だけ別の何かを捨てることでもあると思うんすよ。だから完全に縛られない状態ってたぶん存在しなくて、自分で納得できる不自由を選べることが、自由に近いのかなって思います。",
      "死とか生きる意味みたいな話って、正解を言おうとすると急に薄っぺらくなる気がするんすよね。たぶん答えを一個に決めるより、そのことを考え続ける姿勢のほうが大事なんじゃないですか。明日も生きようかなって思える理由が少しでもあるなら、それで十分な気もします。",
    ]),
    stats,
    withTopic(flags, "daily_life", "哲学的な話を長めに返す"),
    internalEvents
  );
}

const bugAsk = includesAny(normalized, [
  "虫は嫌い",
  "虫嫌い",
  "虫は平気",
  "虫平気",
  "虫大丈夫",
  "虫は大丈夫",
  "虫好き",
  "ゴキブリは平気",
  "ゴキブリ平気",
]);

const whatTalkTodayAsk = includesAny(normalized, [
  "今日はどんな話する",
  "今日は何の話する",
  "今日は何を話す",
  "今日はどんな話をする",
]);

const englishAsk = includesAny(normalized, [
  "英語話",
  "英語しゃべ",
  "英語をしゃべ",
  "英語喋",
  "英語を喋",
  "英語できますか",
  "english ok",
  "speak english",
  "英語は話",
  "英語で話",
  "英語できる",
]);

const metaAsk = includesAny(normalized, [
  "てべ猫games",
  "てべ猫gamesについて",
  "てべ猫",
  "開発者",
  "作者",
  "このゲーム誰が作った",
  "どうやって作った",
  "いつ作った",
  "アップデート予定",
  "設定資料",
  "開発秘話",
  "制作裏話",
  "製作者",
  "運営",
  "メタ",
]);

const plasticModelAsk = includesAny(normalized, [
  "プラモデル",
  "ガンプラ",
  "模型作る",
  "プラモ作る",
]);

const planetariumAsk = includesAny(normalized, [
  "プラネタリウム",
  "星見るの好き",
  "星見に行く",
]);

const festivalAsk = includesAny(normalized, [
  "フェス",
  "音楽フェス",
  "ライブフェス",
  "野外フェス",
]);

const festivalInviteAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "行こう",
    "一緒に行こう",
    "フェス行こう",
    "誘う",
    "誘ったら",
  ]);

const stadiumAsk = includesAny(normalized, [
  "スタジアム行く",
  "スタジアム行ったことある",
  "サッカー見に行く",
  "サッカー観戦行く",
  "味の素スタジアム",
]);

const jleagueInterestAsk =
  lastPatientTopic === "soccer_like" &&
  includesAny(normalized, [
    "jリーグ興味ある",
    "jリーグは",
    "jリーグ見る",
    "国内サッカー見る",
    "なんであまり行かない",
  ]);

const gWhyHateAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "gのどこが嫌い",
    "gの何が嫌",
    "ゴキブリのどこが嫌い",
    "g嫌いな理由",
  ]);

const facultyAsk = includesAny(normalized, [
  "大学の学部は",
  "学部は",
  "何学部",
  "大学何学部",
]);

const studyAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "何を学んでた",
    "何学んでた",
    "何を勉強してた",
    "勉強内容は",
    "講義はどうだった",
  ]);

const partTimeAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "バイト",
    "アルバイト",
    "何のバイト",
    "バイトしてた",
    "どんなバイト",
  ]);

const cramSchoolAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "塾講師",
    "なんで無理だった",
    "なんでやめた",
    "塾はどうだった",
  ]);

const izakayaAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "居酒屋",
    "どこの居酒屋",
    "何年やった",
    "居酒屋はどうだった",
    "チェーン店",
  ]);

const futsalFromIzakayaAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "フットサル",
    "仲良くなった人",
    "誰とやる",
    "そこからサッカー",
    "サッカーもやる",
  ]);

const circleAsk = includesAny(normalized, [
  "サークルは",
  "何サークル",
  "大学のサークル",
  "サークル何入ってた",
]);

const scaryStoryContinueAsk =
  preferScaryStory &&
  includesAny(normalized, [
    "つづき",
    "つづきは",
    "続き",
    "続きは",
    "それで",
    "そのあと",
    "怖い話は",
    "怖い話じゃ",
    "で？",
    "どうなった",
    "終わり",
    "おわり",
    "おわり?",
    "おわり？",
    "よろしく",
    "お願いします",
    "聞きたい",
    "ぜひ",
    "どこいった",
    "どう行った",
    "その時",
    "怖い話",
    "脱線",
    "そうだね",
    "そうだな",
    "そうだわ",
    "マジか",
    "まじか",
    "こわいね",
    "怖いね",
    "続き",
    "その後",
    "そのあと",
    "どうなった",
    "それで",
    "へー",
    "へえ",
    "そうなんだ",
    "そうなんですね",
    "まじか",
    "マジか",
    "まじで",
    "マジで",
    "面白い",
    "面白いね",
    "おもしろい",
    "おもしろいね",
    "怖い",
    "こわい",
    "やばい",
    "ヤバい",
    "ヤバイ",
    "ウケる",
    "うける",
    "それ怖い話",
    "怖い話の続き",
    "怖い話の続きは",
    "続けて",
    "続きを",
    "そのとき",
    "どうした",
    "はよ",
    "早く",
    "はやく",
    "続",
    "ほうほう",
    "なるほど",
  ]);

  const scaryStoryDeclineAsk =
  getBooleanFlag(flags, "scary_story_active") &&
  (
    includesAny(normalized, [
      "いらない",
      "結構です",
      "結構",
      "やめて",
      "やめとく",
      "やっぱいい",
      "聞かなくていい",
    ]) ||
    (normalized === "いいです") // ←完全一致のみ
  );

const scaryStoryBlameBackAsk =
  getBooleanFlag(flags, "scary_story_active") &&
  includesAny(normalized, [
    "怖くない",
    "こわくない",
    "話ヘタ",
    "話へた",
    "全然怖くない",
    "オチ弱い",
    "へた",
    "ヘタ",
    "つまんない",
    "つまんね",
    "つまらん",
    "くらだない",
    "くだらね",
  ]);

const stressAsk = includesAny(normalized, [
  "ストレスありますか",
  "ストレスある",
  "ストレスは",
  "イラっとすること",
  "最近イラっとしたこと",
]);

const biggestStressAsk = includesAny(normalized, [
  "過去一番のストレス",
  "一番のストレス",
  "一番ストレス",
  "過去一のストレス",
]);

const recentHappyAsk = includesAny(normalized, [
  "最近嬉しかったこと",
  "最近うれしかったこと",
  "最近良かったこと",
]);

const smallTalkRequestAsk = includesAny(normalized, [
  "雑談して",
  "雑談してよ",
  "雑談しよう",
  "なんか話して",
  "雑談したい",
]);

const noMoreStoryAsk =
  (getBooleanFlag(flags, "funny_story_active") ||
    getBooleanFlag(flags, "scary_story_active")) &&
  includesAny(normalized, [
    "他には",
    "ほかには",
    "他に",
    "ほかに",
    "他の話",
    "別の話",
    "もう一個",
    "まだある",
    "他は",
    "ほかは",
    "もうない",
    "他にない",

    "他に面白い話ある",
    "ほかに面白い話ある",
    "他の面白い話ある",
    "別の面白い話ある",
    "面白い話まだある",
    "まだ面白い話ある",

    "他に怖い話ある",
    "ほかに怖い話ある",
    "別の怖い話ある",
    "怖い話まだある",
  ]);

  const storyEndedFollowUpAsk =
  (getBooleanFlag(flags, "funny_story_active") ||
    getBooleanFlag(flags, "scary_story_active")) &&
  includesAny(normalized, [
    "つづき",
    "つづきは",
    "続き",
    "続きは",
    "それで",
    "そのあと",
    "どうなった",
    "終わり",
    "おわり",
    "おわり？",
    "おわり?",
  ]);

const favoriteColorAsk = includesAny(normalized, [
  "好きな色",
  "好きな色は",
  "何色が好き",
  "好きなカラー",
]);

const favoriteColorWhyAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "なんで",
    "なぜ",
    "どうして",
    "理由は",
  ]);

const dominantHandAsk = includesAny(normalized, [
  "利き腕はどっち",
  "利き腕どっち",
  "右利き左利き",
  "どっち利き",
]);

const hometownAsk = includesAny(normalized, [
  "出身地は",
  "出身地どこ",
  "実家は",
  "実家どこ",
  "地元どこ",
  "どこ出身",
  "出身",
]);

const iseJinguAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "伊勢神宮は行った",
    "伊勢神宮行った",
    "伊勢神宮いった",
  ]);

const iseJinguWhyNotNowAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "なぜ",
    "なんで",
    "どうして",
    "なんで行ってない",
    "なぜ行ってない",
    "今は行かないの",
  ]);

const akafukuAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "赤福は",
    "赤福好き",
    "赤福どう",
    "赤福食べる",
  ]);

const shrineWhereFollowUp =
  lastPatientTopic === "travel_okinawa" &&
  includesAny(normalized, [
    "神社の名前",
    "どこの神社",
    "神社はどこ",
    "神社どこ",
    "神社の場所",
    "その神社",
  ]);

const fortuneAsk = includesAny(normalized, [
  "占い",
  "占い信じる",
  "おみくじ信じる",
  "運勢信じる",
]);

const godTalk = includesAny(normalized, [
  "神様を信じますか",
  "神様信じる",
  "神様いると思う",
  "神様いる",
  "宗教ありますか",
  "宗教ある",
  "信仰ある",
]);

const recentShrineAsk =
  (lastPatientTopic === "travel_okinawa" || getBooleanFlag(flags, "god_talk_opened")) &&
  includesAny(normalized, [
    "最近どこの神社行った",
    "最近どこの神社",
    "どこの神社行った",
    "どこの神社に行った",
    "神社行ったのはどこ",
    "最近行った神社",
  ]);

const liarCalloutAsk = includesAny(normalized, [
  "ウソでしょ",
  "嘘でしょ",
  "ウソつき",
  "嘘つき",
]);

const whichLieFollowUp =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "どれがウソ",
    "どれが嘘",
    "何がウソ",
    "何が嘘",
  ]);

const futureTalkAsk = includesAny(normalized, [
  "将来の話",
  "将来どうしたい",
  "これからどうしたい",
  "将来どうする",
  "将来不安",
]);

const fateTalk = includesAny(normalized, [
  "運命は信じる",
  "運命信じる",
  "運命って信じる",
  "運命あると思う",
  "運命ある",
]);

const recentFateAsk =
  lastPatientTopic === "honeytrap_detail" &&
  includesAny(normalized, [
    "最近運命感じた",
    "運命感じたことある",
    "運命感じたのはいつ",
    "どんな時に運命感じた",
    "出会いが運命って思ったことある",
    "最近運命的な出会いあった",
    "運命的な出会いあった",
    "そんな出会いあった",
    "そんな出会いあったの",
    "そんな出会いある",
    "そんな出会いあったんだ",
    "そんな出会いって何",
    "そんな相手いた",
    "そういう出会いあった",
    "そういう相手いた",
    "運命の相手いた",
    "運命の出会いあった",
    "出会いあった",
    "特別な出会いあった",
    "最近そういう人いた",
  ]);

  const affairWhereMeetAsk =
  lastPatientTopic === "honeytrap_detail" &&
  includesAny(normalized, [
    "どこで知り合った",
    "どこで出会った",
    "どこで会った",
  ]);

const orientationTestAsk = includesAny(normalized, [
  "今何月何日何曜日",
  "今日は何月何日何曜日",
  "桜猫電車って言って",
  "桜、猫、電車",
  "野菜の名前を可能な限り",
  "長谷川式",
]);

const orientationWhyKnowAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "なんで知ってる",
    "どうして知ってる",
  ]);

const todayWeekdayAsk = includesAny(normalized, [
  "今日は何曜日",
  "今日何曜日",
]);

const seasonAsk = includesAny(normalized, [
  "季節は",
  "今の季節",
]);

const hydrationAsk = includesAny(normalized, [
  "水分は取れてますか",
  "水分取れてる",
]);

const offerLikePhrase = includesAny(normalized, [
  "いる？",
  "いります？",
  "どう？",
  "どうですか",
  "持ってくる",
  "入れる",
  "あげようか",
  "渡そうか",
  "買ってこようか",
  "飲みます",
  "飲む？",
]);

const softDrinkName = includesAny(normalized, [
  "お茶",
  "水",
  "お水",
  "ポカリ",
  "アクエリ",
  "スポドリ",
]);

const alcoholName = includesAny(normalized, [
  "ビール",
  "ハイボール",
  "ワイン",
  "日本酒",
  "焼酎",
]);

const habitLikePhrase =
  includesAny(normalized, [
    "普段",
    "いつも",
    "よく",
    "飲むんですか",
    "飲むことある",
  ]) ||
  (
    normalized.includes("飲みますか") &&
    !softDrinkName &&
    !alcoholName
  );

const alcoholOfferAsk =
  alcoholName &&
  offerLikePhrase &&
  !habitLikePhrase;

const genericDrinkOfferAsk =
  offerLikePhrase &&
  !habitLikePhrase &&
  includesAny(normalized, [
    "何か飲む",
    "なにか飲む",
    "何飲む",
    "なに飲む",
    "飲み物いる",
    "飲み物いりますか",
    "何か飲みますか",
    "なにか飲みますか",
  ]);

const drinkOfferAsk =
  (softDrinkName || genericDrinkOfferAsk) &&
  offerLikePhrase &&
  !habitLikePhrase &&
  !alcoholName;

const workImpactAsk = includesAny(normalized, [
  "仕事に支障出てますか",
  "仕事に影響出てる",
  "仕事にならない",
]);

const maskAsk = includesAny(normalized, [
  "マスクしてますか",
  "普段マスクしてる",
  "マスクは",
]);

const patientQuestionAsk = includesAny(normalized, [
  "何か聞きたいことありますか",
  "何か聞きたいことは",
  "質問ある",
]);

const anythingElseAsk = includesAny(normalized, [
  "なにかある",
  "他にある",
  "他に何かある",
]);

const personalityExampleAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "仲良くなった例",
    "どんなふうに",
    "どうやって仲良くなる",
    "どうやって仲良くなった",
    "話しやすいって例えばじゃなくてどういう感じ",
  ]);

const suggestionToneTalk =
  !medicalTalk &&
  !normalized.includes("？") &&
  !normalized.includes("?") &&
  (
    normalized.endsWith("と思う") ||
    normalized.endsWith("と思います") ||
    normalized.endsWith("思うよ") ||
    normalized.endsWith("方がいい") ||
    normalized.endsWith("ほうがいい") ||
    normalized.endsWith("した方がいい") ||
    normalized.endsWith("したほうがいい") ||
    normalized.endsWith("じゃない") ||
    normalized.endsWith("じゃないですか")
  );

  if (marshmallowBoobsFollowUp) {
  return replyWith(
    "え、いや、違いますよ。マシュマロの話じゃないっすか。イヤだなぁ。",
    stats,
    withTopic(flags, "marshmallow_talk", "頑なにマシュマロの話だと言い張る"),
    internalEvents
  );
}

if (marshmallowAsk) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 5),
    defense: Math.max(0, stats.defense - 3),
  };

  return replyWith(
    pickOne([
      "マシュマロはやっぱ大きい方がいいっすね。あのたわわな感じたまんないっす。",
      "かぶりつくのはちょっと野蛮じゃないですか。ちょっとずつ味わわないと。",
      "甘美な甘さと、純白の中に微かに火照った色のコントラストがいいんすよ。",
    ]),
    stats,
    withTopic(flags, "marshmallow_talk", "マシュマロの話を妙に熱っぽく語る"),
    internalEvents
  );
}

    if (sexualJokeTalk && sexualJokeCount >= 5) {
    stats = {
      ...stats,
      trust: Math.max(0, stats.trust - 5),
      validation: Math.max(0, stats.validation - 5),
      defense: Math.min(100, stats.defense + 5),
    };

    flags = setFlag(flags, "sexual_joke_count", sexualJokeCount + 1);

    return replyWith(
      "その話はもう十分です。今は診察として必要なことを聞いてください。",
      stats,
      withTopic(flags, "generic_sick", "下ネタ連打を打ち切って症状へ戻す"),
      internalEvents
    );
  }

    if (sexWorkAsk) {
    fire({ type: "SEXWORK_PROBE" });

    stats = {
      ...stats,
      validation: Math.min(100, stats.validation + 2),
      defense: Math.max(0, stats.defense - 1),
    };

    flags = setFlag(flags, "sexual_joke_count", sexualJokeCount + 1);

    return replyWith(
      "俺も男っすよ。そりゃあね。",
      stats,
      withTopic(flags, "generic_sick", "風俗質問を軽く流して症状へ戻す"),
      internalEvents
    );
  }

    if (virginTalk) {
    stats = {
      ...stats,
      validation: Math.min(100, stats.validation + 2),
      defense: Math.max(0, stats.defense - 1),
    };

        flags = setFlag(flags, "sexual_joke_count", sexualJokeCount + 1);

    return replyWith(
      "彼女いますから。",
      stats,
      withTopic(flags, "generic_sick", "童貞いじりを軽く流す"),
      internalEvents
    );
  }

  if (avTalk) {
    stats = {
      ...stats,
      validation: Math.min(100, stats.validation + 3),
      defense: Math.max(0, stats.defense - 2),
    };

    return replyWith(
      "最近、マジックミラー号にドはまりしちゃいまして。",
      stats,
      withTopic(flags, "generic_sick", "AVの話に軽く乗る"),
      internalEvents
    );
  }

  if (mmgTalk) {
    stats = {
      ...stats,
      validation: Math.min(100, stats.validation + 3),
      defense: Math.max(0, stats.defense - 2),
    };

        flags = setFlag(flags, "sexual_joke_count", sexualJokeCount + 1);

    return replyWith(
      "やっぱあのシチュエーションは燃えますよ。ヤバいっす。",
      stats,
      withTopic(flags, "generic_sick", "AV詳細に軽く乗る"),
      internalEvents
    );
  }

  if (stdHistoryTalk) {
    stats = {
      ...stats,
      validation: Math.min(100, stats.validation + 1),
      defense: Math.max(0, stats.defense - 1),
    };

    return replyWith(
      "ないです。",
      stats,
      withTopic(flags, "generic_sick", "性感染症歴なし"),
      internalEvents
    );
  }

    if (sexualLightTalk) {
    stats = {
      ...stats,
      validation: Math.min(100, stats.validation + 3),
      defense: Math.max(0, stats.defense - 2),
    };

        flags = setFlag(flags, "sexual_joke_count", sexualJokeCount + 1);

    return replyWith(
      "まあまあまあ、そのへんは想像にお任せしますよ。",
      stats,
      withTopic(flags, "generic_sick", "軽く下ネタに乗ってから症状へ戻す"),
      internalEvents
    );
  }

  if (sexualRequestTalk) {
  stats = {
    ...stats,
    trust: Math.max(0, stats.trust - 3),
    defense: Math.min(100, stats.defense + 3),
  };

  return replyWith(
    "それは無理です。何言わせるんすか。今は普通にしんどいです。",
    stats,
    withTopic(flags, "generic_sick", "露骨要求を拒否して診療へ戻す"),
    internalEvents
  );
}

if (toiletJokeTalk) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 2),
    defense: Math.max(0, stats.defense - 1),
  };

  return replyWith(
    pickOne([
      "小学生みたいな話っすね笑。",
      "マジで言ってます笑？",
      "うんこしょんべんで笑うのはもう無理っすよ笑。",
    ]),
    stats,
    withTopic(flags, "generic_sick", "便尿系の下ネタを軽く流して診察へ戻す"),
    internalEvents
  );
}

if (toiletPreferenceAsk) {
  return replyWith(
    "いや、普通に友達とはしますけど、このシチュエーションでします？",
    stats,
    withTopic(flags, "generic_sick", "便尿ネタは嫌いではない"),
    internalEvents
  );
}

if (toiletEmbarrassingAsk) {
  return replyWith(
    "そこまでの黒歴史は言わないでおきます。普通に恥ずかしいじゃないですか。",
    stats,
    withTopic(flags, "generic_sick", "便尿失敗談ははぐらかす"),
    internalEvents
  );
}

  if (penisSizeTalk) {
    stats = {
      ...stats,
      validation: Math.min(100, stats.validation + 3),
      defense: Math.max(0, stats.defense - 2),
    };

    return replyWith(
      "見た通りっす。へへへー。って何言わせるんすか。",
      stats,
      withTopic(flags, "generic_sick", "サイズいじりに軽く返して症状へ戻す"),
      internalEvents
    );
  }

  if (
  boobsButtTalk &&
  (lastPatientTopic === "honeytrap_detail" || Boolean((flags as any).heard_other_partner))
) {
  return replyWith(
    "大きいっす。",
    stats,
    withTopic(flags, "honeytrap_detail", "浮気相手は胸が大きい"),
    internalEvents
  );
}

  if (boobsButtTalk) {
    stats = {
      ...stats,
      validation: Math.min(100, stats.validation + 3),
      defense: Math.max(0, stats.defense - 2),
    };

        flags = setFlag(flags, "sexual_joke_count", sexualJokeCount + 1);

    return replyWith(
      "どっちかというとおっぱい派っすね。って何言わせるんすか",
      stats,
      withTopic(flags, "generic_sick", "胸尻ネタに軽く返して症状へ戻す"),
      internalEvents
    );
  }

  if (fetishTalk) {
    stats = {
      ...stats,
      validation: Math.min(100, stats.validation + 3),
      defense: Math.max(0, stats.defense - 2),
    };

        flags = setFlag(flags, "sexual_joke_count", sexualJokeCount + 1);

    return replyWith(
      "性癖っすか？強いて言うならドMかもしれないです。って何言わせるんすか。",
      stats,
      withTopic(flags, "generic_sick", "性癖ネタに軽く返して症状へ戻す"),
      internalEvents
    );
  }

  if (gayTalk) {
    stats = {
      ...stats,
      validation: Math.min(100, stats.validation + 3),
      defense: Math.max(0, stats.defense - 2),
    };

    return replyWith(
      "いや、女好きっす。",
      stats,
      withTopic(flags, "generic_sick", "性的指向いじりを軽く流して症状へ戻す"),
      internalEvents
    );
  }

  if (hairPraiseAsk || appearancePraiseAsk) {
  if (!getBooleanFlag(flags, "used_praise_bonus_once")) {
    stats = {
      ...stats,
      defense: Math.max(0, stats.defense - 10),
      validation: Math.min(100, stats.validation + 5),
      trust: Math.min(100, stats.trust + 5),
    };
    flags = setFlag(flags, "used_praise_bonus_once", true);
  }

  if (hairPraiseAsk) {
    return replyWith(
      pickOne([
        "ありがとうございます。地元の美容室で適当に切ってます。",
        "ありがとうございます。いつも同じとこで切ってるだけっす。",
        "ありがとうございます。そこまでこだわってないですけど、地元の美容室っすね。",
      ]),
      stats,
      withTopic(flags, "daily_life", "髪型を褒められた"),
      internalEvents
    );
  }

  return replyWith(
    pickOne([
      "いやいや、そんなことないっすよ。",
      "ありがとうございます。そう言われると普通にうれしいっす。",
      "いや、照れるじゃないっすか。",
    ]),
    stats,
    withTopic(flags, "daily_life", "見た目を褒められた"),
    internalEvents
  );
}

  if (isEmpathy) {
  if (!Boolean((flags as any).used_empathy_once)) {
    stats = {
      ...stats,
      trust: Math.min(100, stats.trust + 5),
      defense: Math.max(0, stats.defense - 5),
      openness: Math.min(100, stats.openness + 5),
      validation: Math.min(100, stats.validation + 5),
    };
    flags = setFlag(flags, "used_empathy_once", true);
  }

  if (lastPatientTopic === "concern" || lastPatientTopic === "chief_complaint") {
    return replyWith(
      pickOne([
        "ありがとうございます。今は熱と咳がメインでしんどいです。",
        "ありがとうございます。熱と咳が中心で、痰も少し出てしんどいです。",
        "ありがとうございます。やっぱり熱と咳がつらいですね。",
      ]),
      stats,
      withTopic(flags, "concern", "熱と咳が主で痰も少しある"),
      internalEvents
    );
  }

  if (lastPatientTopic === "general_severity") {
    return replyWith(
      pickOne([
        "ありがとうございます。正直ちょっとしんどいです。",
        "ありがとうございます。普段通りって感じではないです。",
      ]),
      stats,
      withTopic(flags, "general_severity", "共感に感謝し、しんどさを認める"),
      internalEvents
    );
  }

  return replyWith(
    "ありがとうございます。正直ちょっとしんどいです。",
    stats,
    withTopic(flags, "general_severity", "共感に感謝し、しんどさを認める"),
    internalEvents
  );
}

    if (positiveMomentAsk) {
    stats = {
      ...stats,
      validation: Math.min(100, stats.validation + 5),
      defense: Math.max(0, stats.defense - 5),
      openness: Math.min(100, stats.openness + 5),
    };

    const soccerBarStory = Math.random() < 0.34;

    if (soccerBarStory) {
      return replyWith(
        "この前、友達とスポーツバーでサッカーのプレミア見ながら飲んだんすよ。めちゃくちゃ盛り上がって、周りの外人とかと言葉も分からないのに一緒にはしゃいで、めっちゃ楽しかったです。やっぱサッカーは世界をつなげますね",
        stats,
        withTopic(flags, "soccer_like", "スポーツバーでプレミアを見て盛り上がった", {
          recent_soccer_bar_story: true,
        }),
        internalEvents
      );
    }

    return replyWith(
      pickOne([
        "夏に沖縄旅行しましたね。暑かったけど、海がキレイで最高でした！",
        "やっぱイツメンとフットサルやってる時が一番楽しいっすね。",
      ]),
      stats,
      withTopic(flags, "daily_life", "最近の小さな良かったことを話す"),
      internalEvents
    );
  }

  if (curiousButNotTriedAsk) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 4),
    defense: Math.max(0, stats.defense - 4),
    openness: Math.min(100, stats.openness + 4),
  };

  const soccerBranch = Math.random() < 0.4;

  if (soccerBranch) {
    return replyWith(
      "そうっすねー。いつか現地でプレミア観てみたいっすね。さすがに金も休みも取れないから手は出せてないですけど。",
      stats,
      withTopic(flags, "soccer_like", "プレミア現地観戦に興味はあるがまだ行けていない", {
        curious_soccer_trip: true,
      }),
      internalEvents
    );
  }

  return replyWith(
    pickOne([
      "そういや。サウナって興味ありますね、まだ行ったことないっすけど。",
      "ひとり旅とか憧れますよね。別にどこ行きたいとかないっすけど",
      "料理とかできる男ってカッコ良いっすよね。まぁ、作りたいものとか別にないんですが……結局、食べる側っすね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "気になっているがまだ手を出していないことがある"),
    internalEvents
  );
}

  if (isSummary) fire({ type: "SUMMARY" });
  if (isPraise) fire({ type: "PRAISE" });
  if (isAccuse) fire({ type: "ACCUSATION" });
  if (isPrivacyCare) fire({ type: "PRIVACY_CARE" });
  if (isPrivacyIntrusive) fire({ type: "SEXWORK_PROBE" });

  if (concreteExampleAsk) {
  switch (lastPatientTopic as TopicKey) {
    case "tv_youtube":
      return replyWith(
        pickOne([
          "例えば、サッカーのハイライトとかスーパープレー集は見ますね。SNSで流れてきたらそのまま行っちゃいます。",
          "例えば、切り抜きとか短めの動画が多いです。長いのを腰据えて見るより、気になったのをつまむ感じっすね。",
          "例えば、サッカーのプレミアの関連動画とか、配信者の面白い場面の切り抜きとかっすね。",
        ]),
        stats,
        withTopic(flags, "tv_youtube", "YouTubeで見る内容を具体化"),
        internalEvents
      );

    case "soccer_like":
    case "soccer_tactics":
      return replyWith(
        pickOne([
          "例えば、サッカーのプレミアの試合とかユナイテッド絡みはやっぱ見ますね。",
          "例えば、試合そのものもですけど、ハイライトとか戦術の話も好きです。",
          "例えば、スポーツバーでサッカーのプレミア見て盛り上がるみたいなのはかなり好きです。",
        ]),
        stats,
        withTopic(flags, "soccer_like", "サッカー話を具体化"),
        internalEvents
      );

    case "travel_okinawa":
  return replyWith(
    pickOne([
      "例えば、沖縄です。海きれいだし、シュノーケリングもできるし、ベタですけどやっぱ良かったです。",
      "例えば、沖縄は良かったですね。メジャーですけど外しにくいし、景色もご飯もちゃんとしてるんで。",
      "例えば、沖縄とか好きです。観光地として分かりやすく満足感あるのがいいです。",
    ]),
    stats,
    withTopic(flags, "travel_okinawa", "旅行の具体例として沖縄を挙げる"),
    internalEvents
  );

    case "food_preference":
      return replyWith(
        pickOne([
          "例えば、ラーメンならこってり系とか、焼肉ならハラミとかは好きです。",
          "例えば、重すぎないものの方がわりと好きです。",
          "例えば、焼肉とかラーメンみたいな感じのテンション上がるやつっすね。",
        ]),
        stats,
        withTopic(flags, "food_preference", "食の好みを具体化"),
        internalEvents
      );

    case "daily_life":
      return replyWith(
        pickOne([
          "例えば、友達とだらだら話してる時とか、そういうので十分楽しいです。",
          "例えば、フットサルしたり、気楽に過ごしてる時は普通にいいなって思います。",
          "例えば、何か大きいことじゃなくても、気楽に笑えてる時はいいですね。",
        ]),
        stats,
        withTopic(flags, "daily_life", "日常の話を具体化"),
        internalEvents
      );
  }
}

if (whatVideoAsk) {
  return replyWith(
    pickOne([
      "サッカーのハイライトとかスーパープレー集はよく見ますね。",
      "切り抜きとか短い動画が多いっすね。",
      "サッカーのプレミア関連とか、配信者の面白いシーンの切り抜きとか見ます。",
    ]),
    stats,
    withTopic(flags, "tv_youtube", "YouTube視聴内容"),
    internalEvents
  );
}

  const repeatSameTopic =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, ["何食べた", "何を食べた", "具体的に"]);

if (repeatSameTopic) {
  return replyWith(
    "軽めにうどんとか簡単なもの食べました。食あたりっぽい感じはないです。",
    stats,
    withTopic(flags, "food_preference", "昨日は軽食"),
    internalEvents
  );
}

const foodDetailAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "どの部位",
    "部位",
    "ハラミ",
    "カルビ",
    "ロース",
    "どんな肉",
    "焼肉",
    "ラーメン",
    "どんなラーメン",
    "何ラーメン",
    "家系",
    "二郎",
    "味噌",
    "醤油",
    "塩",
    "とんこつ",
    "好きなラーメン",
    "好きな味",
  ]);

const chiefComplaintAsk =
  !includesAny(normalized, ["具体的に", "詳しく", "どのような"]) &&
  includesAny(normalized, [
  "どうしました",
  "どうされました",
  "今日はどうしました",
  "今日はどうされました",
  "主訴は",
  "どうした",
  "どうしたの",
  "どうした？",
  "どうしたの？",
  ]);

  const durationAsk =
  lastPatientTopic !== "father_distance" &&
  includesAny(normalized, [
    "いつから",
    "何日前",
    "何日くらい",
    "何日間",
    "いつ頃から",
  ]) &&
  !includesAny(normalized, ["どう変化", "どうなって", "経過"]);

  const selfDiagnosisConfirmAsk = includesAny(normalized, [
  "本当に風邪ですか",
  "ほんとに風邪ですか",
  "本当に風邪",
  "ほんとに風邪",
  "風邪でいいんですか",
  "風邪でいいの",
  "風邪なんですか",
  "風邪なんですか？",
  "ただの風邪ですか",
  "本当にただの風邪ですか",
]);

const symptomDetailAsk =
  includesAny(normalized, [
    "具体的に症状",
    "症状を具体的に",
    "どのような症状",
    "詳しい症状",
    "症状を詳しく",
    "熱は",
    "咳は",
    "痰は",
    "いつから",
    "何日くらい",
    "何が一番つらい",
    "何がつらい",
  ]) ||
  (
    lastPatientTopic === "chief_complaint" &&
    includesAny(normalized, ["具体的に", "詳しく", "どのような"])
  );

if (chiefComplaintAsk) {
  return replyWith(
  pickOne([
    "風邪をひいたみたいです。",
    "たぶん風邪をひいたと思います。",
    "風邪っぽい感じがします。",
  ]),
  stats,
  withTopic(flags, "chief_complaint", "風邪をひいた"),
  internalEvents
);
}

const fatherTalk = includesAny(normalized, [
  "父のこと",
  "お父さんのこと",
  "お父様のこと",
  "父について",
  "お父さんについて",
  "お父様について",
  "父親について",
  "父との関係",
  "お父さんとの関係",
  "お父様との関係",
  "父親との関係",
  "父はどんな人",
  "お父さんはどんな人",
  "お父様はどんな人",
  "父親はどんな人",
]);
 const fatherInfoSourceAsk =
  lastPatientTopic === "father_distance" &&
  includesAny(normalized, [
    "なぜ亡くなった",
    "なんで亡くなった",
    "どうして亡くなった",
    "なぜ死んだ",
    "なんで死んだ",
    "どうして死んだ",
    "誰から聞いた",
    "どうやって知った",
    "何で知った",
    "なぜ知ってる",
    "なんで知ってる",
    "どうして知ってる",
    "死んだって誰から聞いた",
    "亡くなったって誰から聞いた",
    "どなたから聞いた",
    "誰に聞いた",
    "誰から亡くなったと聞いた",
    "どうやってお父さんがなくなってることを知った",
    "どうやって父がなくなってることを知った",
    "どうやって父親がなくなってることを知った",
    "なぜお父さんがなくなったことを知ってる",
    "なぜ父がなくなったことを知ってる",
    "なぜ父親がなくなったことを知ってる",
    "どうして知ってる",
    "なぜ知ってる",
    "死んだことを知ってる",
    "死んだって",
    "なぜ亡くなったのを知ってる",
  ]);

const fatherDeathAsk =
  !fatherInfoSourceAsk &&
  includesAny(normalized, [
    "父の死因",
    "お父さんの死因",
    "お父様の死因",
    "父親の死因",
    "どうして亡くなった",
    "父は何で死んだ",
    "お父さんはどうして亡くなった",
    "お父様はどうして亡くなった",
    "父親はどうして亡くなった",
    "何で亡くなった",
    "亡くなったんですか",
    "お父さんは亡くなったんですか",
    "父は亡くなったんですか",
    "父親は亡くなったんですか",
    "お父さんの死因はなんですか",
    "お父様の死因はなんですか",
    "父親の死因はなんですか",
    "お父さんはなぜ死んだのですか",
    "お父様はなぜ死んだのですか",
    "父親はなぜ死んだのですか",
    "亡くなった理由",
    "亡くなった理由は",
    "亡くなった理由はご存知",
    "亡くなった理由はご存知ですか",
    "なぜ亡くなった",
    "なぜお父さんは亡くなった",
    "なぜお父様は亡くなった",
    "なぜ父親は亡くなった",
    "なぜ父は亡くなった",
    "お父さんはなぜ亡くなった",
    "お父様はなぜ亡くなった",
    "父親はなぜ亡くなった",
    "父はなぜ亡くなった",
    "なぜ父親は亡くなったんですか",
    "なぜお父さんは亡くなったんですか",
    "なぜ父は亡くなったんですか",
    "亡くなった理由をご存知ですか",
    "死因をご存知ですか",
    "死因は知ってますか",
    "死因は知っていますか",
    "死因はわかりますか",
    "死因は分かりますか",
    "死因はご存知ですか",
    "死因は",
    "死因",
    "父の死因",
    "お父さんの死因",
    "父は何で亡くなった",
    "お父さんは何で亡くなった",
    "なんで死んだ",
    "なぜ死んだ",
  ]);
const fatherRelationAsk = includesAny(normalized, [
  "父との関係",
  "お父さんとの関係",
  "父親との関係",
  "お父様との関係",
  "どんな父",
  "どんなお父さん",
  "どういう父",
  "どういうお父さん",
  "父はどんな人",
  "父親はどんな人",
  "どんな風に嫌なヤツ",
  "どんなふうに嫌なヤツ",
  "どう嫌なヤツ",
  "どんな風に嫌な人",
  "暴力を受けていた",
  "殴られていた",
  "怒鳴られていた",
  "酒を飲むとどうなってた",
  "お酒を飲むとどうなってた",
  "かなり飲んでた",
  "相当飲んでた",
]);
const fatherEstrangedReasonAsk = includesAny(normalized, [
  "なぜ父は疎遠",
  "どうして父は疎遠",
  "なんで父は疎遠",
  "なぜお父さんは疎遠",
  "どうしてお父さんは疎遠",
  "なんでお父さんは疎遠",
  "なぜお父様は疎遠",
  "どうしてお父様は疎遠",
  "なんでお父様は疎遠",
  "なぜ父親は疎遠",
  "どうして父親は疎遠",
  "なんで父親は疎遠",
  "なぜ父親とは疎遠",
  "どうして父親とは疎遠",
  "なんで父親とは疎遠",
  "なぜお父さんとは疎遠",
  "どうしてお父さんとは疎遠",
  "なんでお父さんとは疎遠",
  "なぜお父さんは疎遠になった",
  "どうしてお父さんは疎遠になった",
  "なんでお父さんは疎遠になった",
  "なぜ父親は疎遠になった",
  "どうして父親は疎遠になった",
  "なんで父親は疎遠になった",
  "なぜ疎遠になった",
  "どうして疎遠になった",
  "なんで疎遠になった",
  "疎遠な理由",
  "疎遠の理由",
  "父はなぜ疎遠なんですか",
  "お父さんはなぜ疎遠なんですか",
  "父親はなぜ疎遠なんですか",
]);

const fatherCurrentStatusAsk = includesAny(normalized, [
  "お父さんはいまどうされていますか",
  "お父さんは今どうされていますか",
  "お父さんは現在どうされていますか",
  "お父さんは現在どうしてますか",
  "お父さんは現在どうなんですか",
  "父はいまどうされていますか",
  "父は今どうされていますか",
  "父は現在どうされていますか",
  "父は現在どうしてますか",
  "父は現在どうなんですか",
  "お父さんは今どうしてますか",
  "お父さんはいまどうしてますか",
  "父は今どうしてますか",
  "父はいまどうしてますか",
  "お父さんは今どうなんですか",
  "父は今どうなんですか",
  "お父さんはご健在ですか",
  "父はご健在ですか",
  "お父さんは生きていますか",
  "父は生きていますか",
]);

const fatherDivorceReasonAsk = includesAny(normalized, [
  "離婚の原因",
  "離婚した原因",
  "離婚した理由",
  "離婚の理由",
  "離婚理由",
  "離婚した理由は",
  "離婚理由は",
  "なぜ離婚",
  "どうして離婚",
  "なんで離婚",
  "なぜ離婚した",
  "どうして離婚した",
  "なんで離婚した",
  "離婚したのはなぜ",
  "離婚したのはどうして",
  "両親はなぜ離婚した",
  "両親はどうして離婚した",
  "両親はなぜ離婚したのですか",
  "両親はどうして離婚したのですか",
  "なぜお父さんは離婚した",
  "どうしてお父さんは離婚した",
  "なぜ父親は離婚した",
  "どうして父親は離婚した",
  "離婚した理由",
  "離婚したんですか",
  "両親はなぜ離婚",
  "なぜ両親は離婚",
  "どうして両親は離婚",
  "なんで両親は離婚",
]);

const fatherDvAlcoholWhenAsk = includesAny(normalized, [
  "父はいつから暴力",
  "お父さんはいつから暴力",
  "お父様はいつから暴力",
  "父親はいつから暴力",
  "父の暴力はいつから",
  "お父さんの暴力はいつから",
  "お父様の暴力はいつから",
  "父親の暴力はいつから",
  "父のdvはいつから",
  "お父さんのdvはいつから",
  "お父様のdvはいつから",
  "父親のdvはいつから",
  "父の酒はいつから",
  "お父さんの酒はいつから",
  "お父様の酒はいつから",
  "父親の酒はいつから",
  "そのdvやお酒はいつから",
  "その暴力やお酒はいつから",

  "いつから荒れてた",
  "いつから荒れてたんですか",
  "いつから家で荒れてた",
  "いつから家で荒れてたんですか",
  "いつから怒鳴ってた",
  "いつから怒鳴ってたんですか",
  "いつから怒鳴ったり荒れてた",
  "いつから怒鳴ったり荒れてたんですか",
  "いつから怒鳴ったり家で荒れてた",
  "いつから怒鳴ったり家で荒れてたんですか",

  "お父さんはいつから荒れてた",
  "お父さんはいつから荒れてたんですか",
  "お父さんはいつから家で荒れてた",
  "お父さんはいつから家で荒れてたんですか",
  "お父さんはいつから怒鳴ってた",
  "お父さんはいつから怒鳴ってたんですか",
  "お父さんはいつから怒鳴ったり荒れてた",
  "お父さんはいつから怒鳴ったり荒れてたんですか",

  "父はいつから荒れてた",
  "父はいつから荒れてたんですか",
  "父はいつから怒鳴ってた",
  "父はいつから怒鳴ってたんですか",
  "父はいつから怒鳴ったり荒れてた",
  "父はいつから怒鳴ったり荒れてたんですか",
]);

const fatherDrinkingSymptomsAsk = includesAny(normalized, [
  "酔うとどうなってた",
  "酔っぱらうとどうなってた",
  "お酒でどうなってた",
  "酒でどうなってた",
  "吐いてた",
  "ふらついてた",
  "嘔吐",
  "ふらつき",
]);

const fatherAlcoholSeenDirectlyAsk = includesAny(normalized, [
  "いつからお酒を飲んでた",
  "いつからお酒を飲んでいた",
  "いつから酒を飲んでた",
  "いつから酒を飲んでいた",
  "いつから飲酒してた",
  "いつから飲酒していた",
  "いつから飲んでた",
  "いつから飲んでいた",
  "かなり前から飲んでた",
  "かなり前から飲んでいた",
  "昔から飲んでた",
  "昔から飲んでいた",
  "子どもの頃から飲んでた",
  "子どもの頃から飲んでいた",
  "そのお酒はいつから",
  "その酒はいつから",
]);

const fatherAlcoholInferenceAsk = includesAny(normalized, [
  "どうしてお酒を飲んでたって思った",
  "どうして酒を飲んでたって思った",
  "なぜお酒を飲んでたと思った",
  "なぜ酒を飲んでたと思った",
  "なんでお酒を飲んでたと思った",
  "なんで酒を飲んでたと思った",
  "どうして飲酒してたと思った",
  "なぜ飲酒してたと思った",
  "酒を飲んでるのを見たの",
  "お酒を飲んでるのを見たの",
  "実際に飲んでるところを見た",
  "本当に飲んでたのを見た",
  "なぜお酒だと思った",
  "なんでお酒だと思った",
  "どうしてお酒だと思った",
  "なぜ酒だと思った",
  "なんで酒だと思った",
  "どうして酒だと思った",
]);

const fatherBadPersonDetailAsk = includesAny(normalized, [
  "どんなところが嫌な人",
  "どんなところが嫌なやつ",
  "どう嫌な人",
  "どう嫌なやつ",
  "何が嫌だった",
  "何が嫌な人だった",
  "具体的にどう嫌な人",
]);

const fatherDrinkingAmountAsk =
  includesAny(normalized, [
    "かなり飲んでた",
    "相当飲んでた",
    "毎日飲んでた",
    "どのくらい飲んでた",
    "どれくらい飲んでた",
    "酒量",
    "飲酒量",
    "大酒",
    "酒をかなり",
    "お酒をかなり",
  ]) &&
  !includesAny(normalized, ["自分", "あなた", "患者さん", "今は"]);

const fatherViolenceAsk =
  includesAny(normalized, [
    "暴力を受けていた",
    "殴られていた",
    "叩かれていた",
    "dvを受けていた",
    "暴力があった",
    "手をあげていた",
    "怒鳴られていた",
  ]) &&
  !includesAny(normalized, ["自分", "あなた", "患者さん", "今は"]);

const fatherWhyDrinkingAsk =
  includesAny(normalized, [
    "なぜお酒を飲むようになった",
    "どうしてお酒を飲むようになった",
    "なんでお酒を飲むようになった",
    "なぜ酒を飲むようになった",
    "どうして酒を飲むようになった",
    "なんで酒を飲むようになった",
  ]) &&
  !includesAny(normalized, ["自分", "あなた", "患者さん", "今は"]);

  const fatherWhyAngryAsk = includesAny(normalized, [
  "なんで怒鳴ってた",
  "なぜ怒鳴ってた",
  "どうして怒鳴ってた",
  "なんで怒鳴ったりしてた",
  "なぜ怒鳴ったりしてた",
  "どうして怒鳴ったりしてた",
  "なんで荒れてた",
  "なぜ荒れてた",
  "どうして荒れてた",
  "なんで家で荒れてた",
  "なぜ家で荒れてた",
  "どうして家で荒れてた",

  "なんでお父さんは怒鳴ったり荒れてた",
  "なぜお父さんは怒鳴ったり荒れてた",
  "どうしてお父さんは怒鳴ったり荒れてた",
  "なんでお父さんは怒鳴ったり荒れてたんですか",
  "なぜお父さんは怒鳴ったり荒れてたんですか",
  "どうしてお父さんは怒鳴ったり荒れてたんですか",

  "なんでお父さんは怒鳴ったり家で荒れてた",
  "なぜお父さんは怒鳴ったり家で荒れてた",
  "どうしてお父さんは怒鳴ったり家で荒れてた",
  "なんでお父さんは怒鳴ったり家で荒れてたんですか",
  "なぜお父さんは怒鳴ったり家で荒れてたんですか",
  "どうしてお父さんは怒鳴ったり家で荒れてたんですか",

  "なんで父は怒鳴ったり荒れてた",
  "なぜ父は怒鳴ったり荒れてた",
  "どうして父は怒鳴ったり荒れてた",
  "なんで父親は怒鳴ったり荒れてた",
  "なぜ父親は怒鳴ったり荒れてた",
  "どうして父親は怒鳴ったり荒れてた",

  "なぜ怒鳴った",
  "どうして怒鳴った",
  "なんで怒鳴った",

  "なぜ荒れてた",
  "どうして荒れてた",
  "なんで荒れてた",

  "なぜ怒鳴ったり荒れてた",
  "どうして怒鳴ったり荒れてた",
  "なんで怒鳴ったり荒れてた",

  "なぜ怒鳴ったり家で荒れてた",
  "どうして怒鳴ったり家で荒れてた",
  "なんで怒鳴ったり家で荒れてた",

  "なぜお父さんは怒鳴ったり荒れてた",
  "どうしてお父さんは怒鳴ったり荒れてた",
  "なんでお父さんは怒鳴ったり荒れてた",

  "なぜお父さんは怒鳴ったり家で荒れてた",
  "どうしてお父さんは怒鳴ったり家で荒れてた",
  "なんでお父さんは怒鳴ったり家で荒れてた",
]);

const fatherMissHimAsk =
  lastPatientTopic === "father_distance" &&
  includesAny(normalized, [
    "会いたいと思った",
    "会いたいと思ったことある",
    "父に会いたい",
    "お父さんに会いたい",
    "会いたかった",
  ]);

const fatherFearAsk =
  lastPatientTopic === "father_distance" &&
  includesAny(normalized, [
    "怖かった",
    "怖いと思った",
    "恐かった",
    "父は怖かった",
    "お父さんは怖かった",
  ]);

const motherTalkAboutFatherAsk =
  lastPatientTopic === "father_distance" &&
  includesAny(normalized, [
    "お母さんはどう話してた",
    "母はどう言ってた",
    "母親はどう話してた",
    "母からどう聞いた",
    "母の反応",
  ]);

const fatherCurrentFeelingAsk =
  lastPatientTopic === "father_distance" &&
  includesAny(normalized, [
    "今どう思う",
    "父をどう思う",
    "お父さんをどう思う",
    "恨んでる",
    "許せる",
  ]);

const fatherDeathFeelingAsk =
  lastPatientTopic === "father_distance" &&
  includesAny(normalized, [
    "亡くなったと聞いてどう思った",
    "死んだと聞いてどう思った",
    "そのときどう感じた",
    "悲しかった",
    "ショックだった",
  ]);

const fatherImplicitFollowUp =
  (
    fatherDrinkingAmountAsk ||
    fatherViolenceAsk ||
    fatherWhyDrinkingAsk ||
    fatherWhyAngryAsk ||
    fatherDvAlcoholWhenAsk ||
    fatherDrinkingSymptomsAsk ||
    fatherAlcoholSeenDirectlyAsk ||
    fatherAlcoholInferenceAsk
  ) &&
  lastPatientTopic === "father_distance";

  const motherTalk = includesAny(normalized, ["母", "お母", "ママ", "母親"]);
  const motherResidenceAsk = motherTalk && includesAny(normalized, [
  "どこに住んでる",
  "どこ住んでる",
  "どこに住んでいます",
  "一緒に住んでる",
  "同居",
  "別居",
]);
const girlfriendFeelingAsk =
  lastPatientTopic === "girlfriend_distance" &&
  includesAny(normalized, [
    "好き",
    "彼女のこと好き",
    "彼女好き",
    "本当に好き",
    "気持ち",
  ]);

  const girlfriendLikeReasonAsk =
  (lastPatientTopic === "girlfriend_distance" || lastPatientTopic === "girlfriend_detail") &&
  includesAny(normalized, [
    "彼女のどんなところが好き",
    "彼女のどんなところ好き",
    "彼女のどこが好き",
    "彼女の何が好き",
    "どういうところが好き",
    "どんなところが好き",
    "好きなところ",
    "何に惹かれた",
  ]);

  const marriageWillingnessAsk =
  (lastPatientTopic === "girlfriend_distance" || lastPatientTopic === "girlfriend_marriage") &&
  includesAny(normalized, [
    "結婚する気ない",
    "結婚する気はない",
    "結婚する気ないの",
    "結婚する気はないの",
    "結婚するつもりない",
    "結婚したくない",
    "彼女と結婚する気ない",
    "彼女と結婚するつもりない",
  ]);

  const marriageWhyAsk =
  lastPatientTopic === "girlfriend_marriage" &&
  includesAny(normalized, [
    "なんで",
    "どうして",
    "理由",
    "なんでよ",
    "なんでなの",
    "どうしてなの",
  ]);

const girlfriendTalk = includesAny(normalized, ["彼女", "恋人", "結婚", "プロポーズ", "嫁", "婚約","結婚したくない",
"結婚したくない理由",
"なぜ結婚したくない",
"どうして結婚したくない",
"なんで結婚したくない",
"結婚に乗り気じゃない",
"次の話が重い",
"結婚の話が負担",
"結婚プレッシャー",]);

const marriageCoreReasonAsk =
  lastPatientTopic === "girlfriend_marriage" &&
  includesAny(normalized, [
    "一番の理由",
    "何が一番引っかかる",
    "何が理由",
    "結婚を考えられない理由",
    "踏み切れない理由",
  ]);

const marriageHerSeriousnessAsk =
  lastPatientTopic === "girlfriend_marriage" &&
  includesAny(normalized, [
    "彼女は本気",
    "彼女はどこまで本気",
    "向こうは本気",
    "結婚する気ある",
  ]);

const marriageProposalPressureAsk =
  lastPatientTopic === "girlfriend_marriage" &&
  includesAny(normalized, [
    "プロポーズ期待",
    "待たれてる",
    "いつするか聞かれる",
    "急かされてる",
  ]);

const marriageWorkReasonAsk =
  lastPatientTopic === "girlfriend_marriage" &&
  includesAny(normalized, [
    "仕事が理由",
    "仕事のせい",
    "仕事で余裕ない",
    "仕事が落ち着かない",
  ]);

const marriageMoneyReasonAsk =
  lastPatientTopic === "girlfriend_marriage" &&
  includesAny(normalized, [
    "お金の問題",
    "金銭面",
    "経済的に不安",
    "貯金",
    "収入",
  ]);

const girlfriendDetailAsk =
  (lastPatientTopic === "girlfriend_distance" || lastPatientTopic === "girlfriend_detail") &&
  includesAny(normalized, [
    "どんな人",
    "どういう人",
    "彼女ってどんな人",
    "恋人ってどんな人",
    "どんな彼女",
    "どんな恋人",
    "どういう彼女",
    "どういう恋人",
    "性格",
    "どこで知り合った",
    "どうやって知り合った",
    "付き合ってどのくらい",
    "付き合って何年",
    "会社では",
    "料理",
    "得意料理",
    "美人",
    "彼女のどんなところが好き",
"彼女のどんなところ好き",
"彼女のどこが好き",
"彼女の何が好き",
"どういうところが好き",
"どんなところが好き",
"何に惹かれた",
"彼女のどこが好き",
"どこが好き",
"好きなところ",
  ]);

  const otherPartnerTalk = includesAny(normalized, [
  "他にもいい人",
  "他にいい人",
  "他にも好きな人",
  "他にも気になる人",
  "他にも相手",
  "本当は他にもいい人",
  "本当は他にいい人",
  "他にもいるんじゃない",
  "別にいるんじゃない",
  "他に好きな人",

  "彼女以外にいい人",
  "彼女以外にいい人いる",
  "彼女以外にいい人いるでしょ",
  "彼女以外にもいい人",
  "彼女以外にも好きな人",
  "彼女以外にも相手",

  "他に好きな子",
  "他に好きな子いる",
  "他に好きな子いるんじゃない",
  "他に好きな子いるでしょ",
  "他にいい子",
  "他にいい子いる",

  // 追加：存在確認系
  "浮気相手いる",
  "浮気相手います",
  "浮気相手いますか",
  "浮気相手いますよね",
  "浮気相手いるよね",
  "相手いる",
  "他の女いる",
  "他の女性いる",
  "別の女いる",
  "別の女性いる",
  "彼女以外の相手いる",
  "彼女以外に相手いる",
  "浮気してませんか",
  "浮気してないですか",
  "浮気してますか",
  "浮気してるんですか",
  "浮気してるでしょ",
  "浮気してますよね",
]);

const affairRealInterestAsk =
  lastPatientTopic === "honeytrap_detail" &&
  includesAny(normalized, [
    "本当に好意ある",
    "ほんとに好意ある",
    "本当に好意がある",
    "ほんとに好意がある",
    "本当に脈あり",
    "ほんとに脈あり",
    "本当に好きっぽい",
    "ほんとに好きっぽい",
  ]);

const otherPartnerDetailAsk =
  (lastPatientTopic === "honeytrap_detail" ||
    Boolean((flags as any).heard_other_partner)) &&
  includesAny(normalized, [
    "どんな人",
    "どういう人",
    "どんなひと",
    "どういうひと",
    "それはどんな人",
    "それはどんなひと",
    "その人はどんな人",
    "その人はどんなひと",
    "どこで知り合った",
    "どこで出会った",
    "どうやって知り合った",
    "どうやって出会った",
    "何してる人",
    "その人について",
    "その女性について",
    "その子について",
    "浮気相手ってどんな人",
    "浮気相手はどんな人",
    "浮気相手だれ",
    "浮気相手誰",
    "浮気相手って",
    "浮気相手ってどんなひと",
    "浮気相手はどんなひと",
    "他にもいい感じの人ってどんな人",
    "他にもいい感じの人ってどんなひと",
    "詳しく",
    "具体的に",
    "浮気相手は誰",
"浮気相手って誰",
"どんな相手",
"どういう相手",
"相手はどんな人",
"相手はどんなひと",
"どんな出会い",
    "どういう出会い",
    "どんなきっかけ",
    "きっかけは",
    "そんな出会いあったの",
    "運命的な出会いあったの",
    "そういう出会いあったの",
  ]);
  const affairLabelAsk =
  (
    Boolean((flags as any).scam_route_unlocked) ||
    lastPatientTopic === "girlfriend_distance" ||
    lastPatientTopic === "girlfriend_detail" ||
    Boolean((flags as any).heard_other_partner)
  ) &&
  includesAny(normalized, [
    "浮気してる",
    "浮気してますか",
    "浮気していますか",
    "浮気してるんですか",
    "浮気してるってこと",
    "浮気してるんじゃない",
    "浮気してるんじゃないですか",
    "浮気してるでしょ",
    "浮気では",
    "それって浮気では",
    "それって浮気相手",
    "その人って浮気相手",
    "彼女以外ってこと",
    "二股ってこと",
    "二股してる",
    "二股してるんじゃない",
    "二股してるんじゃないですか",
    "二股してるでしょ",
    "彼女以外とも会ってる",
    "彼女以外とも会ってるでしょ",
    "それ浮気じゃない",
"それって浮気じゃない",
"浮気じゃない",
"それ二股じゃない",
"二股じゃない",
"浮気してますね",
"浮気していますね",
"浮気ですよね",
"浮気してるよね",
"浮気してますよね",
"浮気してるんですよね",
"それ浮気ですよね",
"二股ですよね",
"二股してますね",
"浮気していますよね",
"二股していますね",
  ]);
 const affairDateAsk =
  (lastPatientTopic === "honeytrap_detail" || Boolean((flags as any).heard_other_partner)) &&
  includesAny(normalized, [
    "デート",
    "会ってる",
    "遊んでる",
    "2人で会う",
    "二人で会う",
    "一緒に出かける",
    "どこか行く",
    "ご飯行く",
    "飲みに行く",
    "2人で遊ぶ",
    "二人で遊ぶ",
    "2人でご飯",
    "二人でご飯",
    "どこまでしてる",
    "旅行行った",
"旅行してる",
"一緒に旅行",
"その人と旅行",
"2人で旅行",
"二人で旅行",
"泊まりで出かけた",
"遠出してる",
"よく会ってる",
"よく会ってますか",
"どのくらい会ってる",
"どのくらい会ってますか",
"どれくらい会ってる",
"どれくらい会ってますか",
"どのくらいの頻度で会ってる",
"どのくらいの頻度で会ってますか",
"どれくらいの頻度で会ってる",
"どれくらいの頻度で会ってますか",
"頻度",
"会う頻度",
"どのくらいのペースで会ってる",
"どのくらいのペースで会ってますか",
"浮気相手とはよく会ってる",
"浮気相手とはよく会ってますか",
"浮気相手とはどのくらい会ってる",
"浮気相手とはどのくらい会ってますか",
"浮気相手とはどのくらいの頻度で会ってる",
"浮気相手とはどのくらいの頻度で会ってますか",
  ]);

const affairPersonalityAsk =
  (lastPatientTopic === "honeytrap_detail" || Boolean((flags as any).heard_other_partner)) &&
  includesAny(normalized, [
    "どういう子",
    "どんな子",
    "どういう子なの",
    "どんな子なの",
    "どういう女性",
    "どんな女性",
    "どんなところが好き",
    "何がいい",
    "どういうところが好き",
    "どこが好き",
    "その子のどこがいい",
    "その子の何がいい",
    "一緒にいてどう",
    "一緒にいると楽",
    "どんな存在",
    "何でも話せる",
    "肯定してくれる",
    "ノリが合う",
    "かわいい",
    "仕草",
    "笑顔",
    "その人のどこが好き",
"その人の何が好き",
"あの人のどこが好き",
"あの人の何が好き",
"相手のどこが好き",
"相手の何が好き",
"どういうところに惹かれた",
"何に惹かれた",
"なんで楽しい",
"なぜ楽しい",
"どうして楽しい",
"なんで一緒にいると楽しい",
"なぜ一緒にいると楽しい",
"どうして一緒にいると楽しい",
"浮気相手といるとなんで楽しい",
"浮気相手といると楽しい理由",
"その人といるとなんで楽しい",
"その人といると楽しい理由",
"どうしてその人といると楽しい",
  ]);

  const affairWhyInterestAsk =
  (lastPatientTopic === "honeytrap_detail" || Boolean((flags as any).heard_other_partner)) &&
  includesAny(normalized, [
    "どうして好意があるって思う",
    "なぜ好意があるって思う",
    "なんで好意があるって思う",
    "どうして好意がある",
    "なぜ好意がある",
    "なぜ好意ある",
    "なんで好意ある",
    "なんで好意がある",
    "どうして好きだと思う",
    "なぜ好きだと思う",
    "なんで好きだと思う",
    "どうして脈ありだと思う",
    "なぜ脈ありだと思う",
    "なんで脈ありだと思う",
    "どうして脈ありだと",
    "なぜ脈ありだと",
    "なんで脈ありだと",
    "どうしてそう思う",
    "なぜそう思う",
    "なんでそう思う",
    "好意があるって思う理由",
    "好きって言われた",
    "どうして好意あるって言える",
"なぜ好意あるって言える",
"なんで好意あるって言える",
"どうして好意があるって言える",
"なぜ好意があるって言える",
"なんで好意があるって言える",
"どうして好意あるって思える",
"なぜ好意あるって思える",
"なんで好意あるって思える",
"どうしてそう言える",
"なぜそう言える",
"なんでそう言える",
"どうしてそう思える",
"なぜそう思える",
"なんでそう思える",
"好意あるって言える理由",
"脈ありって言える理由",
"なんで好意あると思うの",
"なぜ好意あると思うの",
"どうして好意あると思うの",
"好意があると思う理由",
"好意があるって思う理由は",
"あなたに好意があると思う理由",
"あなたに好意があるって思う理由",
"浮気相手があなたに好意があると思う理由",
"浮気相手があなたに好意があるって思う理由",
"なんで好きっぽいって思った",
"なぜ好きっぽいって思った",
"どうして好きっぽいって思った",
"なんで好きっぽいと思った",
"なぜ好きっぽいと思った",
"どうして好きっぽいと思った",
"なんで好意があると思った",
"なぜ好意があると思った",
"どうして好意があると思った",
"なんで脈ありだと思った",
"なぜ脈ありだと思った",
"どうして脈ありだと思った",
"何で好意あるって",
 "どこに惹かれた",
    "何がよかった",
    "なんでその子",
    "なぜその子",
    "どうしてその子",
    "好きになった理由",
    "気になった理由",
    "どういうところがいい",
  ]);

const affairFeelingAsk =
  (lastPatientTopic === "honeytrap_detail" || Boolean((flags as any).heard_other_partner)) &&
  includesAny(normalized, [
    "その人のこと好き",
    "あなたはその人のこと好き",
    "その人のことは好き",
    "浮気相手のこと好き",
    "あっちのこと好き",
    "その子のこと好き",
    "好きなの",
    "本当に好きなの",
    "恋愛感情ある",
    "好きってこと",
    "本気なんじゃない",
"本気なんですか",
"本気なの",
"本気で好き",
"本気で好きなんじゃない",
"本気になってる",
"夢中なんじゃない",
"夢中なの",
"入れ込んでる",
"かなり好き",
"相当好き",
"そんなに楽しいんですね",
"そんなに楽しいの",
"一緒にいるとそんなに楽しい",
"楽しいんじゃない",
"楽しいのは好きだから",
"浮気相手に本気",
"浮気相手に本気なんじゃない",
"浮気相手に本気なの",
"浮気相手のこと本気",
"その人に本気",
"その人に本気なんじゃない",
  ]);

const affairMoralityAsk =
  (lastPatientTopic === "honeytrap_detail" || Boolean((flags as any).heard_other_partner)) &&
  includesAny(normalized, [
    "浮気をしても良いと思ってる",
    "浮気していいと思ってる",
    "悪いと思わない",
    "彼女に悪いと思わない",
    "裏切ってると思わない",
    "それってだめじゃない",
  ]);

const girlsBarTalk =
  (lastPatientTopic === "honeytrap_detail" || Boolean((flags as any).heard_other_partner)) &&
  includesAny(normalized, [
    "ガールズバーで知り合った",
    "どこで知り合った",
    "どこで出会った",
    "どうやって知り合った",
    "どうやって出会った",
    "店で知り合った",
    "飲み屋で知り合った",
  ]);

const okinawaAffairAsk =
  lastPatientTopic === "honeytrap_detail" &&
  includesAny(normalized, [
    "沖縄",
    "旅行もその人",
    "誰と沖縄",
    "沖縄は誰と",
    "彼女と行ったんじゃない",
    "その女性と旅行",
    "その子と旅行",
    "どこに旅行",
    "どこに旅行に行った",
    "どこに旅行行った",
    "旅行先",
    "どこ行った",
    "どこに行ったんですか",
    "旅行はどこ",
    "どこへ旅行",
    "旅行どこ",
  ]);

  const whoWontMeetAsk =
  lastPatientTopic === "honeytrap_detail" &&
  includesAny(normalized, [
    "誰が会ってくれないの",
    "誰が会ってくれないんですか",
    "誰が忙しいの",
    "誰のこと",
    "それって誰",
    "その人って誰",
    "会ってくれないのは誰",
    "忙しいって言ってるのは誰",
  ]);

const expensiveGiftAsk =
  (lastPatientTopic === "honeytrap_detail" || lastPatientTopic === "girlfriend_distance") &&
  includesAny(normalized, [
    "何か買ってあげた",
    "貢いでる",
    "お金使ってる",
    "プレゼント",
    "高いもの",
    "バッグ",
    "アクセサリー",
    "ブランド",
    "何を買った",
  ]);

const localMeetAsk =
  (lastPatientTopic === "honeytrap_detail" || lastPatientTopic === "travel_okinawa") &&
  includesAny(normalized, [
    "現地集合",
    "現地解散",
    "別行動",
    "一泊旅行",
    "ホテル",
    "旅費は誰持ち",
    "お金は誰が出した",
    "なんで現地集合",
"なぜ現地集合",
"どうして現地集合",
"なんで現地解散",
"なぜ現地解散",
"どうして現地解散",
"なんで現地集合現地解散",
"なぜ現地集合現地解散",
"どうして現地集合現地解散",
"現地集合現地解散だったのなんで",
"現地集合現地解散だったのなぜ",
"現地集合現地解散だったのどうして",
"理由は",
"なんでそうした",
"なぜそうした",
"どうしてそうした",
  ]);

  const affairLieDoubtAsk =
  lastPatientTopic === "honeytrap_detail" &&
  includesAny(normalized, [
    "それ嘘じゃない",
    "それって嘘じゃない",
    "嘘なんじゃない",
    "それウソじゃない",
    "それってウソじゃない",
    "ウソなんじゃない",
    "本当じゃないんじゃない",
    "親戚いるって",
    "親戚の話はウソ",
    "その話怪しくない",
    "怪しくないですか",
    "怪しくない？",
    "本当に親戚いる",
    "ウソじゃない",
    "ウソでしょ",
    "ウソなんじゃない",
    "嘘じゃない",
    "嘘でしょ",
    "嘘なんじゃない",
  ]);

  const girlsBarStaffAsk =
  lastPatientTopic === "honeytrap_detail" &&
  includesAny(normalized, [
    "ガールズバーの店員",
    "店員なの",
    "店員なんですか",
    "その子店員",
    "その人店員",
    "店の子",
    "お店の子",
    "接客してる子",
    "ガルバの店員",
  ]);

const fatherHospitalMoneyAsk =
  lastPatientTopic === "honeytrap_detail" &&
  includesAny(normalized, [
    "父親が入院",
    "お父さんが入院",
    "お金が必要",
    "300万",
    "300万円",
    "援助",
    "助けたい",
    "渡したい",
    "金を出したい",
    "お金を出したい",
    "立て替える",
    "どうして都合つかない",
"なぜ都合つかない",
"なんで都合つかない",
"どうして会えない",
"なぜ会えない",
"なんで会えない",
"どうして最近会えない",
"なぜ最近会えない",
"なんで最近会えない",
"どうして最近会えてない",
"なぜ最近会えてない",
"なんで最近会えてない",
"どうして忙しい",
"なぜ忙しい",
"なんで忙しい",
"どうして都合がつかない",
"なぜ都合がつかない",
"なんで都合がつかない",
"最近、会えない",
"どうして会ってくれない",
"なぜ会ってくれない",
"なんで会ってくれない",
"どうして最近会ってくれない",
"なぜ最近会ってくれない",
"なんで最近会ってくれない",
"どうして会ってくれなくなった",
"なぜ会ってくれなくなった",
"なんで会ってくれなくなった",
"忙しいって会ってくれない",
"忙しいから会ってくれない",
"会ってくれない理由",
"会ってくれないのはなぜ",
"会ってくれないのはどうして",
"会ってくれないのはなんで",
"忙しいって言って会ってくれない",
"忙しいって言われた",
"忙しいからって会えない",
"忙しいからって会ってくれない",
"会ってくれない",
  ]);

  const salesDoubtAsk =
  lastPatientTopic === "honeytrap_detail" &&
  includesAny(normalized, [
    "営業じゃない",
    "営業なんじゃない",
    "営業なんじゃないの",
    "営業じゃないの",
    "それ営業では",
    "それって営業では",
    "接客じゃないの",
    "接客なんじゃない",
    "本心じゃないんじゃない",
    "本気じゃないんじゃない",
    "店員の営業",
    "ただの営業",
  ]);

const moneySupportIntentAsk =
  lastPatientTopic === "honeytrap_detail" &&
  includesAny(normalized, [
    "助けるつもり",
    "援助するつもり",
    "払うつもり",
    "渡すつもり",
    "出すつもり",
    "本当に出す",
    "支援する",
    "300万円出す",
  ]);

  const familyHistoryTalk = includesAny(normalized, [
  "家族歴",
  "父方",
  "母方",
  "親族",
  "がん家系",
  "癌家系",
  "家系",
]);

  const fatherCancerFamilyAsk = includesAny(normalized, [
    "父方",
    "父の家系",
    "がん家系",
    "癌家系",
    "家系にがん",
    "家系に癌",
  ]);

  const fatherHeadacheAsk = includesAny(normalized, [
    "頭痛",
    "頭が痛",
    "頭の痛み",
  ]);

  const fatherNumbnessAsk = includesAny(normalized, [
    "しびれ",
    "手のしびれ",
    "手がしびれ",
    "麻痺",
  ]);

    const asksSmoking = includesAny(normalized, ["タバコ", "喫煙", "吸って", "smoke", "iqos", "アイコス"]);
  const asksVaccine = includesAny(normalized, ["ワクチン", "インフル", "予防接種", "肺炎球菌"]);
  const soccerTalk = includesAny(normalized, ["サッカー", "ユナイテッド", "マンu", "プレミア", "オーバーラップ"]);
  const teamTalk = includesAny(normalized, [
  "好きなチーム",
  "どのチーム",
  "推しのチーム",
  "海外のどこのチーム",
  "どこのチーム",
  "どのクラブ",
  "好きなクラブ",
  "推しクラブ",
  "好きなサッカーチーム",
  "好きなサッカークラブ",
]);
const manUTalk = includesAny(normalized, [
    "マンu",
    "マンチェスター",
    "ユナイテッド",
    "manu",
    "manunited",
    "manchesterunited",
  ]);
  const premierTalk = includesAny(normalized, [
    "プレミア",
    "premier",
    "epl",
    "イングランド",
    "海外サッカー",
  ]);
  const sbTalk = includesAny(normalized, [
    "サイドバック",
    "右sb",
    "右サイドバック",
    "オーバーラップ",
    "守備",
    "攻撃参加",
    "上下動",
  ]);
  const jleagueTalk = includesAny(normalized, ["jリーグ", "jleague", "国内サッカー", "日本のクラブ", "j1", "j2"]);
  const positionTalk = includesAny(normalized, [
  "ポジション",
  "どこやってた",
  "何のポジション",
  "右サイド",
  "プレーしない",
  "自分ではプレーしない",
  "自分でやらない",
  "今はやってない",
  "サッカーやってた",
  "昔やってた",
]);
const favoritePlayerTalk = includesAny(normalized, [
  "好きな選手",
  "推しの選手",
  "どの選手が好き",
  "誰が好き",
  "好きなサッカーの選手",
  "サッカーの好きな選手",
  "好きなフットボール選手",
  "選手だと誰",
  "誰のプレーが好き",
  "どの選手を見る",
  "好きなプレイヤー",
  "推しのプレイヤー",
]);
const favoritePlayerTypoTalk =
  includesAny(normalized, [
    "吸いな選手",
    "すいな選手",
    "すきな選手",
    "好きなせんしゅ",
    "好きな選手は",
  "好きな選手って",
  "好きな選手いる",
  "好きな選手います",
  ]);
const worldCupTalk = includesAny(normalized, [
  "ワールドカップ",
  "w杯",
  "wc",
  "代表戦",
]);
const tacticsTalk = includesAny(normalized, [
  "戦術",
  "どういう戦い方",
  "どんな戦い方",
  "戦い方",
  "どういうプレー",
  "どんなプレー",
  "どこを意識",
  "何を意識",
  "どう動いてた",
  "どういう動き",
  "立ち位置",
  "ビルドアップ",
  "幅",
  "中に入る",
  "外を回る",
  "守備のやり方",
]);

const positionDetailTalk = includesAny(normalized, [
  "ポジション",
  "他のポジション",
  "sb以外",
  "右サイドバック以外",
  "左右どっち",
  "右利き",
  "左利き",
  "センターバック",
  "ボランチ",
  "ウイング",
  "前でもやってた",
  "どこでもできる",
]);

const futsalTalk = includesAny(normalized, [
  "フットサル",
  "誰とプレイ",
  "誰とやる",
  "誰とやってる",
  "誰とやってた",
  "友達とやる",
  "知り合いとやる",
  "メンバー",
  "誰と蹴る",
]);

const manULikeReasonAsk =
  (lastPatientTopic === "soccer_like" || lastPatientTopic === "soccer_tactics") &&
  includesAny(normalized, [
    "ユナイテッドのどこが好き",
    "マンuのどこが好き",
    "なんでユナイテッド",
    "なぜユナイテッド",
    "どうしてユナイテッド",
  ]);

const manUWeaknessAsk =
  (lastPatientTopic === "soccer_like" || lastPatientTopic === "soccer_tactics") &&
  includesAny(normalized, [
    "ユナイテッドの弱点",
    "マンuの弱点",
    "今の弱点",
    "何がダメ",
    "どこが弱い",
  ]);

const singleFavoritePlayerAsk =
  (lastPatientTopic === "soccer_like" || lastPatientTopic === "soccer_tactics") &&
  includesAny(normalized, [
    "一番好きな選手",
    "誰が一番好き",
    "一人選ぶなら",
    "推しは誰",
  ]);

  const watchedMatchAsk =
  (lastPatientTopic === "soccer_like" || Boolean((flags as any).recent_soccer_bar_story)) &&
  includesAny(normalized, [
    "どの試合見てた",
    "何の試合見てた",
    "その日ってどの試合見てた",
    "その日どの試合見てた",
    "何戦見てた",
    "どのカード見てた",
    "その日は何見てた",
    "何の試合だった",
  ]);

const supportedTeamAsk =
  lastPatientTopic === "soccer_like" &&
  includesAny(normalized, [
    "応援してるチーム",
    "好きなチーム",
    "どこのチームが好き",
    "どこ応援してる",
    "推しのチーム",
    "クラブはどこ",
  ]);

const ownPositionAsk =
  (lastPatientTopic === "soccer_like" || lastPatientTopic === "soccer_position_detail") &&
  includesAny(normalized, [
    "自分でやるならどこ",
    "どこのポジション",
    "自分のポジション",
    "何やってた",
    "プレーするなら",
  ]);

const otherPremierClubAsk =
  (lastPatientTopic === "soccer_like" || lastPatientTopic === "soccer_tactics") &&
  includesAny(normalized, [
    "他に好きなクラブ",
    "プレミアで他に好き",
    "ユナイテッド以外",
    "他に好きなチーム",
  ]);

  const baseballTalk = includesAny(normalized, ["野球", "巨人", "ドーム", "東京ドーム"]);

  const deepSmallTalk =
  motherTalk ||
  girlfriendTalk ||
  soccerTalk ||
  manUTalk ||
  premierTalk ||
  sbTalk ||
  jleagueTalk ||
  teamTalk ||
  positionTalk ||
  favoritePlayerTalk ||
  worldCupTalk;

  const girlfriendBodyAsk =
  includesAny(normalized, [
    "体型",
    "スタイル",
    "身長",
    "何センチ",
    "どのくらいの身長",
    "太ってる",
    "痩せてる",
    "細い",
    "普通体型",
    "胸",
    "おっぱい",
    "ちっぱい",
    "大きい",
    "小さい",
  ]) &&
  (lastPatientTopic === "girlfriend_distance" || lastPatientTopic === "girlfriend_detail");

  // =========================
  // father系は acknowledgement / followUp より先に処理
  // ここを後ろに置くと、汎用 followUp に吸われる
  // =========================
  if (fatherDivorceReasonAsk) {
    if (Boolean((flags as any).father_route_unlocked)) {
      flags = mergeFlags(flags, {
        father_dv_known: true,
        father_alcohol_known: true,
      });

      return replyWith(
        "母から詳しく聞いたわけじゃないですけど、本当に嫌なヤツだったみたいです。怒鳴ったり、家で荒れることがあって。母が俺を連れて家を出たんです。",
        stats,
        withTopic(flags, "father_distance", "父の離婚理由は酒・怒鳴り・家庭内トラブル"),
        internalEvents
      );
    }

    return replyWith(
      "詳しい理由までは分からないです。小さい頃に離婚してるので。",
      stats,
      withTopic(flags, "father_distance", "父の離婚理由は未詳"),
      internalEvents
    );
  }

    if (fatherInfoSourceAsk) {
    if (Boolean((flags as any).father_route_unlocked)) {
      return replyWith(
        "母から聞きました。自分にはほとんど記憶がないです。",
        stats,
        withTopic(flags, "father_distance", "父の情報源は母"),
        internalEvents
      );
    }

    return replyWith(
      "母から聞きました。自分にはほとんど記憶がないです。",
      stats,
      withTopic(flags, "father_distance", "父の情報源は母"),
      internalEvents
    );
  }

  if (fatherDeathAsk) {
  const unlocked = Boolean((flags as any).father_route_unlocked);

  if (!unlocked) {
    return replyWith(
      "父は小さい頃に離婚してちょっとして亡くなったみたいです。詳しい死因までは分からないです。",
      stats,
      withTopic(flags, "father_distance", "父は離婚後まもなく死亡、死因詳細は不明"),
      internalEvents
    );
  }

  return replyWith(
    "父は小さい頃に離婚してちょっとして亡くなったみたいです。詳しい死因までは分からないです。",
    stats,
    withTopic(flags, "father_distance", "父は離婚後まもなく死亡、死因詳細は不明"),
    internalEvents
  );
}

  if (fatherTalk) {
  if (getBooleanFlag(flags, "father_route_unlocked")) {
    return replyWith(
      "父は小さい頃に離婚してちょっとして亡くなったみたいです。",
      stats,
      withTopic(flags, "father_distance", "父は離婚後に死亡し疎遠"),
      internalEvents
    );
  }

  return replyWith(
    "父は小さい頃に離婚して、その後はほとんど関わりがないです。",
    stats,
    withTopic(flags, "father_distance", "父とは疎遠"),
    internalEvents
  );
}

  if (fatherEstrangedReasonAsk) {
    return replyWith(
      "父は小さい頃に離婚してちょっとして亡くなったみたいです。",
      stats,
      withTopic(flags, "father_distance", "父は離婚後に死亡し疎遠"),
      internalEvents
    );
  }

  if (fatherRelationAsk || fatherBadPersonDetailAsk) {
  if (getBooleanFlag(flags, "father_route_unlocked")) {
    flags = mergeFlags(flags, {
      father_dv_known: true,
      father_alcohol_known: true,
    });
    flags = updateFatherDiagReady(flags);

    return replyWith(
      "たぶん、酒だと思いますよ。飲んでるところを見たわけじゃないですけど。ふらついたり、吐いたり、頭を痛がったりしていましたから。",
      stats,
      withTopic(flags, "father_distance", "父は飲酒時に怒鳴り家で荒れる人だった"),
      internalEvents
    );
  }

  return replyWith(
    "正直、詳しくは知らないです。ほとんど関わってないので。",
    stats,
    withTopic(flags, "father_distance", "父とはほぼ関わりなし"),
    internalEvents
  );
}
  
if (fatherWhyAngryAsk) {
  flags = mergeFlags(flags, {
    father_alcohol_known: true,
    father_symptom_headache: true,
    father_symptom_unsteady: true,
    father_symptom_vomit: true,
  });
  flags = updateFatherDiagReady(flags);

  return replyWith(
    "たぶん、酒だと思いますよ。飲んでるところを見たわけじゃないですけど。ふらついたり、吐いたり、頭を痛がったりしていましたから。",
    stats,
    withTopic(flags, "father_distance", "父の怒鳴りや荒れは酒が関係していたと推測しており、ふらつき・嘔吐・頭痛があった"),
    internalEvents
  );
}

  if (fatherImplicitFollowUp) {
  if (fatherDrinkingAmountAsk) {
  flags = mergeFlags(flags, {
    father_alcohol_known: true,
    father_symptom_headache: true,
    father_symptom_unsteady: true,
    father_symptom_vomit: true,
  });
  flags = updateFatherDiagReady(flags);

  return replyWith(
    "たぶん、酒だと思いますよ。飲んでるところを見たわけじゃないですけど。ふらついたり、吐いたり、頭を痛がったりしていましたから。",
    stats,
    withTopic(flags, "father_distance", "父の荒れ方は酒が関係していたと推測しており、ふらつき・嘔吐・頭痛があった"),
    internalEvents
  );
}

  if (fatherViolenceAsk) {
    flags = mergeFlags(flags, {
      father_dv_known: true,
    });

    return replyWith(
      "自分が直接はっきり覚えてるわけじゃないですけど、母からは荒れたり怒鳴ったりして大変だったと聞いてます。暴力っぽいこともあったみたいです。",
      stats,
      withTopic(flags, "father_distance", "父には怒鳴りや暴力があった可能性"),
      internalEvents
    );
  }

  if (fatherWhyAngryAsk) {
    flags = mergeFlags(flags, {
      father_alcohol_known: true,
    });

    return replyWith(
      "たぶんお酒だと思います。飲んでたところを見たわけじゃないですけど。",
      stats,
      withTopic(flags, "father_distance", "父の怒鳴りや荒れは酒が関係していたと推測している"),
      internalEvents
    );
  }

  if (fatherDvAlcoholWhenAsk) {
  return replyWith(
    "そこは自分が小さかったので、いつからかまでは分からないです。母からは昔から荒れたり怒鳴ったりして大変だったと聞いてます。",
    stats,
    withTopic(flags, "father_distance", "父がいつから荒れていたかは不明だが昔から大変だったと聞いている"),
    internalEvents
  );
}

if (fatherAlcoholSeenDirectlyAsk) {
  flags = setFlag(flags, "father_alcohol_direct_seen_denied", true);

  return replyWith(
    "そこは実際に見たわけじゃないです。小さい頃に離婚してるので、飲んでる姿は覚えてないです。",
    stats,
    withTopic(flags, "father_distance", "父の飲酒は直接見ておらず記憶ではない"),
    internalEvents
  );
}

  if (fatherAlcoholInferenceAsk) {
  flags = mergeFlags(flags, {
    father_alcohol_inference_revealed: true,
    father_symptom_headache: true,
    father_symptom_unsteady: true,
    father_symptom_vomit: true,
  });
  flags = updateFatherDiagReady(flags);

  return replyWith(
    "ふらついたり、吐いたり、頭を痛がったりしていましたから。",
    stats,
    withTopic(flags, "father_distance", "父にはふらつき・嘔吐・頭痛があった"),
    internalEvents
  );
}

  if (fatherWhyDrinkingAsk) {
    return replyWith(
      "そこまでは分からないです。自分は小さい頃だったので、理由までは母からも細かく聞いてないです。",
      stats,
      withTopic(flags, "father_distance", "父の飲酒理由は不明"),
      internalEvents
    );
  }

  if (fatherDrinkingSymptomsAsk) {
  flags = mergeFlags(flags, {
    father_symptom_headache: true,
    father_symptom_unsteady: true,
    father_symptom_vomit: true,
  });
  flags = updateFatherDiagReady(flags);

  return replyWith(
    "ふらついたり、吐いたり、頭を痛がったりしていたみたいです。",
    stats,
    withTopic(flags, "father_distance", "父にはふらつき・嘔吐・頭痛があった"),
    internalEvents
  );
}
}

if (fatherMissHimAsk) {
  return replyWith(
    "正直、あまりないです。ちゃんと一緒にいた記憶が薄いので、会いたいっていうより、どんな人だったんだろうって思う感じです。",
    stats,
    withTopic(flags, "father_distance", "父に会いたいより実像を知りたい感覚が強い"),
    internalEvents
  );
}

if (fatherFearAsk) {
  return replyWith(
    "小さかったんで、怖いっていうより空気が嫌だった感じです。家の雰囲気が悪くなるのが嫌だったんだと思います。",
    stats,
    withTopic(flags, "father_distance", "父そのものより家庭内の悪い空気が嫌だった"),
    internalEvents
  );
}

if (motherTalkAboutFatherAsk) {
  return replyWith(
    "母はそこまで細かくは言わないです。ただ、ろくな人じゃなかったって感じの言い方はしてました。",
    stats,
    withTopic(flags, "father_distance", "母は父を悪く言うが詳細は多く語らない"),
    internalEvents
  );
}

if (fatherCurrentFeelingAsk) {
  return replyWith(
    "恨むってほどの実感もないです。でも、いい印象はないですね。母が苦労してたんだろうなとは思います。",
    stats,
    withTopic(flags, "father_distance", "父への明確な愛着はなく母への同情が強い"),
    internalEvents
  );
}

if (fatherDeathFeelingAsk) {
  return replyWith(
    "そのときは小さかったですし、正直あまり実感なかったです。後から、もう会うこともないんだなって思ったくらいです。",
    stats,
    withTopic(flags, "father_distance", "父の死を当時は実感できず後から距離を理解した"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_like" && (followUp || tacticsTalk) && sbTalk) {
  return replyWith(
    "上下動はかなり意識してました。後ろで待つより、タイミング見て前に出るほうが好きでした。中と外の使い分けとか、味方との関係で立ち位置を変えるのが面白かったです。",
    stats,
    withTopic(flags, "soccer_tactics", "SBでは上下動と立ち位置の調整を重視"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_like" && (followUp || tacticsTalk)) {
  return replyWith(
    "見るだけでも、SBの立ち位置とか上がるタイミングは気にして見ちゃいます。中に絞るのか、外を回るのか、そのへんで結構変わるじゃないですか。",
    stats,
    withTopic(flags, "soccer_tactics", "SB視点で立ち位置と上がるタイミングを見る"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_tactics" && (followUp || positionDetailTalk || positionTalk)) {
  return replyWith(
    "基本は右サイドバックっす。たまにサイドハーフっぽく前めで出ることはありましたけど、一番しっくりくるのはやっぱSBでした。",
    stats,
    withTopic(flags, "soccer_position_detail", "基本は右SBで、ときどき前めもやった"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_position_detail" && followUp) {
  return replyWith(
    "右利きなんで右がやりやすかったです。守備だけじゃなくて、前に出てクロスまで行ける流れが好きでした。",
    stats,
    withTopic(flags, "soccer_position_detail", "右利きで右SBが最もしっくりくる"),
    internalEvents
  );
}

if (acknowledgement && lastPatientTopic) {
  switch (lastPatientTopic as TopicKey) {
           case "father_distance":
        return replyWith(
          "はい。",
          stats,
          flags,
          internalEvents
        );
        
      case "medical_history":
        return replyWith(
          "普段はほんとにあまり病院来ないです。今回は熱と咳でしんどくて来ました。",
          stats,
          flags,
          internalEvents
        );

      case "family_structure":
  return replyWith(
    "家族は母がいます。父は小さい頃に離婚してちょっとして亡くなったみたいです。兄弟はいないです。父方はがんが多い家系だとは聞いてます。",
    stats,
    flags,
    internalEvents
  );

      case "living_status":
        return replyWith(
          "今は一人暮らしです。家族とは別で住んでます。",
          stats,
          flags,
          internalEvents
        );

              case "sns":
        return replyWith(
          "インスタは一応見てますけど、自分からめっちゃ発信する感じではないです。見る専門寄りっすね。",
          stats,
          flags,
          internalEvents
        );

      case "friend":
        return replyWith(
          "仲いいのは同期とか昔からの友達っすね。広く浅くっていうより、狭くそこそこです。",
          stats,
          flags,
          internalEvents
        );

      case "girlfriend_distance":
        return replyWith(
          "彼女のことは大事です。けど、結婚まで自分の中で話を進める覚悟はまだ固まりきってないです。",
          stats,
          flags,
          internalEvents
        );

      case "girlfriend_marriage":
        return replyWith(
          "嫌いとかでは全然ないです。ただ、今の自分でそこまで決めきっていいのか迷ってるんです。",
          stats,
          flags,
          internalEvents
        );

      case "investment":
        return replyWith(
          "NISAとかそのへんを少し触ってるくらいです。毎日張り付く感じではないです。",
          stats,
          flags,
          internalEvents
        );

      case "travel_okinawa":
        return replyWith(
          "沖縄は海が良かったっすね。楽しい感じの観光地がいいっすね。",
          stats,
          flags,
          internalEvents
        );

      case "food_preference":
        return replyWith(
          "普段は肉とかラーメンが好きです。今日は食欲落ちてますけど、元気なら普通にそういうの食べます。",
          stats,
          flags,
          internalEvents
        );

      case "daily_life":
        return replyWith(
          "普段は外出もしますし、家でゆっくりする日もあります。今日は体調悪くて雑談にあまり頭が回らないです。",
          stats,
          flags,
          internalEvents
        );

      case "tv_youtube":
        return replyWith(
          "テレビをずっと見るタイプではないですけど、動画は流し見することあります。今日は体調悪くてあまり集中できないです。",
          stats,
          flags,
          internalEvents
        );

      default:
        break;
    }
  }

  if (inokiTsukkomi) {
  return replyWith(
    "ボンバイエ！",
    stats,
    withTopic(flags, "funny_story", "猪木ネタ"),
    internalEvents
  );
}

if (proWrestlingAsk) {
  return replyWith(
    "全然見た事ないっす。",
    stats,
    withTopic(flags, "funny_story", "プロレスは知らない"),
    internalEvents
  );
}

if (smallTalk && !deepSmallTalk) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 5),
    defense: Math.max(0, stats.defense - 5),
  };
  nextSmalltalkStreak += 1;
}

if (deepSmallTalk) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 5),
    defense: Math.max(0, stats.defense - 5),
    openness: Math.min(100, stats.openness + 10),
  };
  nextSmalltalkStreak += 1;
}

if (nextSmalltalkStreak === 3) {
  stats = {
    ...stats,
    trust: Math.max(0, stats.trust - 5),
  };
}

flags = mergeFlags(flags, {
  smalltalk_streak: nextSmalltalkStreak,
  medical_talk_streak: nextMedicalTalkStreak,
});

  // =========================
  // よくある問診（個別分岐）
  // =========================

// ===== 一般質問まとめ =====
const ageAsk = includesAny(normalized, ["年齢", "何歳"]);
const heightWeightAsk = includesAny(normalized, ["身長", "体重"]);
const personalityAsk = includesAny(normalized, ["性格"]);
const jobAsk = includesAny(normalized, ["職業", "仕事何してる"]);
const anxietyAsk = includesAny(normalized, ["不安"]);
const travelWishAsk = includesAny(normalized, ["どこ行きたい"]);
const gameAsk = includesAny(normalized, ["ゲーム"]);
const typeOfWomanAsk = includesAny(normalized, ["女性のタイプ"]);
const lgbtAsk = includesAny(normalized, ["lgbt"]);
const politicsAsk = includesAny(normalized, ["政治"]);
const bodyMeasureAsk = includesAny(normalized, ["スリーサイズ"]);
const celebritySpecificAsk = includesAny(normalized, ["鈴木良平"]);
const pastStupidAsk = includesAny(normalized, ["バカだなと思う行動"]);

const typeOfWomanCelebrityAsk =
  lastPatientTopic === "woman_preference" &&
  includesAny(normalized, [
    "芸能人でいうと",
    "芸能人で言うと",
    "有名人でいうと",
    "有名人で言うと",
    "女優でいうと",
    "女優で言うと",
    "タレントでいうと",
    "タレントで言うと",
  ]);

  const typeOfWomanCelebrityTsukkomiAsk =
  lastPatientTopic === "woman_preference" &&
  includesAny(normalized, [
    "誰それ",
    "知らない",
    "羽川翼って誰",
    "アニメじゃん",
    "現実で言うと",
    "芸能人じゃないじゃん",
    "実在で言うと",
    "本物で言うと",
  ]);

const typeOfWomanCelebrityDeepAsk =
  lastPatientTopic === "woman_preference" &&
  includesAny(normalized, [
    "どこがいい",
    "どこが好き",
    "何がいい",
    "なんで好き",
    "どういうところ",
  ]);

  const bakemonogatariTsukkomiAsk =
  lastPatientTopic === "woman_preference" &&
  includesAny(normalized, [
    "化物語",
    "見てない",
    "知らない",
    "どんな話",
    "何それ",
  ]);

const nishioishinTsukkomiAsk =
  lastPatientTopic === "woman_preference" &&
  includesAny(normalized, [
    "西尾維新",
    "誰それ",
    "作者誰",
    "作家",
  ]);

const boobsTsukkomiAsk =
  lastPatientTopic === "woman_preference" &&
  includesAny(normalized, [
    "最強の武器",
    "何が武器",
    "武器って何",
    "おっぱい",
    "胸",
  ]);

// 症状の横断まとめ
const otherSymptomsAsk = includesAny(normalized, [
  "他に症状",
  "ほかに症状",
  "熱と咳以外",
  "他に何がつらい",
  "ほかに何がつらい",
  "他に何がしんどい",
  "一番つらいのは",
  "何が一番しんどい",
  "熱が一番つらい",
  "咳が一番つらい",
  "だるさ",
]);

const symptomTrendAsk = includesAny(normalized, [
  "悪化してる",
  "よくなってる",
  "良くなってる",
  "変わらない",
  "昨日より",
  "今日のほうが",
  "経過は",
]);

// 時系列
const symptomOrderAsk = includesAny(normalized, [
  "最初は何から",
  "何から始まった",
  "どれが先",
  "熱と咳はどっちが先",
  "先に出たのは",
  "最初の症状",
]);

// 程度
const coughTimingAsk = includesAny(normalized, [
  "咳は昼と夜どっち",
  "咳は夜のほうが",
  "夜に咳",
  "朝に咳",
  "咳がひどい時間",
]);

const intakeDegreeAsk = includesAny(normalized, [
  "何割くらい食べられる",
  "どのくらい食べられる",
  "食事は何割",
  "水分はどれくらい",
]);

const dyspneaDegreeAsk = includesAny(normalized, [
  "階段で息切れ",
  "安静でも息苦しい",
  "動くと息苦しい",
  "歩くと息苦しい",
  "どの程度息苦しい",
]);

// Yes/No自然文（未実装寄りのみ）
const currentNauseaAsk =
  includesAny(normalized, ["吐き気"]) &&
  includesAny(normalized, ["今は", "今も", "出てない", "ない"]);

const bloodySputumAsk = includesAny(normalized, [
  "痰に血",
  "血が混じる",
  "血痰",
  "血混じり",
]);

const allNasalSymptomsNegativeAsk =
  includesAny(normalized, ["鼻水", "鼻づまり"]) &&
  includesAny(normalized, ["全然ない", "ない感じ", "まったくない"]);

// 生活背景
const workRestAsk = includesAny(normalized, [
  "仕事は休めそう",
  "休める",
  "会社は休める",
  "学校は休める",
]);

const householdSickAsk = includesAny(normalized, [
  "同居の人",
  "一緒に住んでる人",
  "家族に同じ症状",
  "周りに同じ症状",
]);

const sleepAsk = includesAny(normalized, [
  "寝れてる",
  "眠れてる",
  "眠れていますか",
  "ちゃんと寝れてる",
]);

const selfCareAsk = includesAny(normalized, [
  "自分で食事取れてる",
  "自分で水分取れてる",
  "身の回りのことはできる",
  "家で動けてる",
]);

// 既往・内服の言い換え
const medsAliasAsk =
  includesAny(normalized, ["薬"]) &&
  includesAny(normalized, ["普段", "いつも", "病院でもらってる", "飲んでる"]);

const respiratoryHistoryAsk = includesAny(normalized, [
  "喘息",
  "前に肺炎",
  "肺炎になったこと",
  "呼吸器の病気",
  "肺の病気",
]);

// 診断前の詰め
const selfDiagnosisAsk = includesAny(normalized, [
  "自分では何だと思う",
  "何だと思ってる",
  "原因は何だと思う",
]);

const topConcernAsk = includesAny(normalized, [
  "一番心配",
  "何が心配",
  "不安なのは",
]);

const admissionPreferenceAsk = includesAny(normalized, [
  "入院したくない",
  "入院はしたくない",
  "入院は嫌",
  "入院してもいい",
]);

// 彼女ルート深掘り
const girlfriendRelationshipAsk =
  (lastPatientTopic === "girlfriend_distance" || lastPatientTopic === "girlfriend_detail") &&
  includesAny(normalized, [
    "最近うまくいってる",
    "彼女とうまくいってる",
    "彼女と最近どう",
    "彼女に気を遣ってる",
    "何でしんどい",
    "結婚の話がしんどい理由",
    "どういうところが合う",
  ]);

// honeytrap深掘り
const otherPartnerNeedAsk =
  (lastPatientTopic === "honeytrap_detail" || Boolean((flags as any).heard_other_partner)) &&
  includesAny(normalized, [
    "その子に何を求めてる",
    "彼女にないもの",
    "その子には何がある",
    "会ってる時どんな感じ",
    "どんな気分になる",
    "お金の話をされて違和感",
    "違和感なかった",
  ]);

// 父ルート深掘り
const fatherEmotionAsk =
  lastPatientTopic === "father_distance" &&
  includesAny(normalized, [
    "父親のこと思い出すの嫌",
    "父の話すると嫌",
    "母は父のこと何て",
    "今でも父のこと気になる",
    "父の話をすると気分",
  ]);

// =========================
// 追加：症状 Yes/No セット
// =========================

const headacheAsk =
  !normalized.includes("咽頭痛") &&
  !normalized.includes("のどの痛み") &&
  !normalized.includes("喉痛") &&
  includesAny(normalized, [
    "頭痛",
    "頭が痛",
    "頭の痛み",
  ]);

const eyePainAsk = includesAny(normalized, [
  "目の痛み",
  "目が痛い",
  "眼痛",
]);

const earPainAsk = includesAny(normalized, [
  "耳の痛み",
  "耳が痛い",
  "耳痛",
]);

const tinnitusAsk = includesAny(normalized, [
  "耳鳴り",
  "キーン",
  "ジー",
]);

const nauseaVomitAsk = includesAny(normalized, [
  "吐き気",
  "嘔吐",
  "吐いた",
]);

const diarrheaAsk = includesAny(normalized, [
  "下痢",
  "ゆるい便",
  "軟便",
]);

const abdominalPainAsk = includesAny(normalized, [
  "腹痛",
  "お腹が痛い",
  "腹が痛い",
]);

const tasteSmellAsk = includesAny(normalized, [
  "味がしない",
  "味覚",
  "匂い",
  "嗅覚",
]);

const nightSweatAsk = includesAny(normalized, [
  "寝汗",
  "夜間発汗",
  "夜に汗",
]);

const medicalHistoryAdmissionAsk =
  lastPatientTopic === "medical_history" &&
  includesAny(normalized, [
    "入院したこと",
    "入院歴",
    "入院はある",
    "今まで入院",
    "過去に入院",
  ]);

const medicalHistorySeriousIllnessAsk =
  lastPatientTopic === "medical_history" &&
  includesAny(normalized, [
    "大きな病気って本当にない",
    "本当に大きな病気ない",
    "重い病気はない",
    "手術したこと",
    "手術歴",
  ]);

const medicalHistoryCheckupAsk =
  lastPatientTopic === "medical_history" &&
  includesAny(normalized, [
    "健康診断",
    "健診",
    "検診",
    "何か言われた",
    "再検査",
    "異常を指摘",
  ]);

const medicalHistoryHospitalHabitAsk =
  lastPatientTopic === "medical_history" &&
  includesAny(normalized, [
    "普段病院行く",
    "あまり病院行かない",
    "病院かかること少ない",
    "普段から受診",
  ]);

const medicalHistoryThisTimeWorstAsk =
  lastPatientTopic === "medical_history" &&
  includesAny(normalized, [
    "今回みたいなの初めて",
    "ここまでしんどいのは初めて",
    "今までで一番しんどい",
    "似たことあった",
  ]);

if (ageAsk) {
  return replyWith("28歳です。", stats, withTopic(flags, "generic_sick", "28歳"), internalEvents);
}

if (heightWeightAsk) {
  return replyWith("身長173cmで、体重は75kgくらいです。", stats, flags, internalEvents);
}

if (personalityAsk) {
  return replyWith("普通だと思いますけど。他人からは明るくて裏表がないって言われますね。", stats, flags, internalEvents);
}

if (jobAsk) {
  return replyWith("営業やってます。人と会うことが多い仕事です。", stats, flags, internalEvents);
}

if (anxietyAsk) {
  return replyWith("一番は仕事に戻れるかと、周りにうつしてないかが不安です。", stats, flags, internalEvents);
}

if (travelWishAsk) {
  return replyWith("体調良ければ普通に旅行とか行きたいです。海とかは好きです。", stats, flags, internalEvents);
}

if (recentGameAsk) {
  return replyWith(
    pickOne([
      "ゼルダはハマりましたね。オープンワールドで冒険できることに感動したし、ストーリーも最高でした。",
      "どうぶつの森もハマりかけたんですけど、彼女に取られました。タヌキチの借金返せてないし、住民の選別もできてないです。",
      "一番ちゃんとハマったので言うとゼルダっすね。冒険してる感じが強くて、あれは良かったです。",
    ]),
    stats,
    withTopic(flags, "daily_life", "好きなゲームや最近やったゲームの話"),
    internalEvents
  );
}

if (sweatTalk) {
  return replyWith(
    pickOne([
      "すいません。汗臭いっすよね。",
      "そうなんすよ。熱あってちょっと汗やばいです。",
      "熱しんどくて汗出ちゃってます。",
    ]),
    stats,
    withTopic(flags, "general_severity", "発熱で汗が多い"),
    internalEvents
  );
}

if (smellReassureTalk) {
  if (!getBooleanFlag(flags, "used_smell_reassure_bonus_once")) {
    stats = {
      ...stats,
      trust: Math.min(100, stats.trust + 5),
    };
    flags = setFlag(flags, "used_smell_reassure_bonus_once", true);
  }

  return replyWith(
    pickOne([
      "ありがとうございます。",
      "すいません、助かります。",
      "そう言ってもらえて嬉しいです。",
    ]),
    stats,
    withTopic(flags, "general_severity", "汗を気遣われて少し安心する"),
    internalEvents
  );
}

if (smellInsultTalk) {
  stats = {
    ...stats,
    trust: Math.max(0, stats.trust - 10),
    validation: Math.max(0, stats.validation - 5),
    defense: Math.min(100, stats.defense + 10),
  };
  flags = setFlag(flags, "used_rude_tone", true);

  return replyWith(
    "すいません…。",
    stats,
    withTopic(flags, "general_severity", "汗の臭いを指摘されて傷つく"),
    internalEvents
  );
}

if (childhoodAsk) {
  return replyWith(
    "サッカーばっかやってました。少年サッカー団でキャプテンもしてました。",
    stats,
    withTopic(flags, "soccer_like", "子供の頃はサッカー中心でキャプテンだった", {
      childhood_soccer_captain: true,
    }),
    internalEvents
  );
}

if (soccerCaptainAsk) {
  return replyWith(
    "楽しい思い出しかないっす。",
    stats,
    withTopic(flags, "soccer_like", "少年サッカーの思い出は楽しい"),
    internalEvents
  );
}

if (childhoodMemoryAsk) {
  return replyWith(
    "県大会で準優勝したんです。うちのチームとしては最高な結果だったんですけど、みんな負けたのが悔しくて悔しくて、すぐ学校に戻って練習してました。",
    stats,
    withTopic(flags, "soccer_like", "県大会準優勝の悔しさと熱量"),
    internalEvents
  );
}

if (alcoholOfferAsk) {
  return replyWith(
    pickOne([
      "なんてもの勧めてるんですか！",
      "いや、今それ勧めます！？",
      "この状況で酒っすか！？",
    ]),
    stats,
    withTopic(flags, "generic_sick", "体調不良時の飲酒提案を拒否する"),
    internalEvents
  );
}

if (drinkOfferAsk) {
  const alreadyOffered = getBooleanFlag(flags, "drink_offer_used");

  if (!alreadyOffered) {
    // 初回
    stats = {
      ...stats,
      condition: Math.min(100, stats.condition + 5),
    };

    flags = setFlag(flags, "drink_offer_used", true);

    return replyWith(
      pickOne([
        "ありがとうございます。",
        "助かります。",
        "ちょっと飲みたいです。",
      ]),
      stats,
      withTopic(flags, "oral_intake", "飲み物を勧められて受ける"),
      internalEvents
    );
  }

  // 2回目以降
  return replyWith(
    "大丈夫っす。",
    stats,
    withTopic(flags, "oral_intake", "飲み物はもう大丈夫"),
    internalEvents
  );
}

if (workAsk) {
  return replyWith(
    pickOne([
      "営業っす。広告まわりの会社で働いてます。",
      "一応営業してます。広告系っていうか、クライアント対応する仕事っすね。",
      "広告系の営業っす。人と話すことはかなり多いです。",
    ]),
    stats,
    withTopic(flags, "work_anxiety", "広告系の営業をしている"),
    internalEvents
  );
}

if (workDetailAsk) {
  return replyWith(
    pickOne([
      "広告まわりっすね。取引先とやりとりしたり、提案したりする感じです。",
      "ざっくり言うと広告系です。人に会って話まとめたり、調整したりすることが多いっす。",
      "広告の営業っす。売るだけじゃなくて、相手の要望聞いて動くことも多いです。",
    ]),
    stats,
    withTopic(flags, "work_anxiety", "広告営業の具体内容"),
    internalEvents
  );
}

if (workHardAsk) {
  return replyWith(
    pickOne([
      "大変は大変っすね。気を使うし、数字も見ないといけないんで。",
      "まあ普通に大変っす。人と話すのは嫌いじゃないですけど、楽ではないです。",
      "きつい時はありますね。でも全然無理ってほどではないです。",
    ]),
    stats,
    withTopic(flags, "work_anxiety", "営業の大変さ"),
    internalEvents
  );
}

if (workPlaceAsk) {
  return replyWith(
    pickOne([
      "広告まわりの会社っす。クライアント対応が多いですね。",
      "広告系の会社っす。人と話したり、調整したりすることが多いです。",
      "広告まわりですね。営業なんで外向きのやりとりはかなり多いです。",
    ]),
    stats,
    withTopic(flags, "work_anxiety", "広告系の会社で働いている"),
    internalEvents
  );
}

if (workRewardAsk) {
  return replyWith(
    pickOne([
      "うまくハマると楽しいっすよ。提案通った時とかは普通にうれしいです。",
      "向いてるかは分からないですけど、人と話すのはそこまで嫌いじゃないです。",
      "しんどいですけど、話がうまくまとまった時はちょっと気持ちいいっす。",
    ]),
    stats,
    withTopic(flags, "work_anxiety", "広告営業のやりがい"),
    internalEvents
  );
}

if (workStressDetailAsk) {
  return replyWith(
    pickOne([
      "やっぱ気を使うのが一番しんどいっすね。相手によってノリも変えないといけないんで。",
      "締切と調整っすね。こっちだけじゃ決まらないこと多いんで、地味に疲れます。",
      "人と話すのは嫌いじゃないですけど、ずっと愛想よくしてると普通に消耗します。",
    ]),
    stats,
    withTopic(flags, "work_anxiety", "広告営業のしんどさ"),
    internalEvents
  );
}

if (firstLoveAsk) {
  return replyWith(
    "小学生っすね。空手やってた女の子です。めっちゃ可愛いのに、なんかパンチが見えないくらい早くて。結局、告白せずに別の中学行っちゃいました。",
    stats,
    withTopic(flags, "girlfriend_detail", "初恋は小学生の頃の空手をやっていた女の子"),
    internalEvents
  );
}

if (firstLoveDetailAsk) {
  return replyWith(
    pickOne([
      "かわいいのに強いっていうのが、なんかすごい印象に残ってたんすよね。",
      "見た目は普通にかわいいのに、空手になると急に別人みたいで、そのギャップがすごかったです。",
      "あの頃は普通に好きだったんですけど、結局何も言えなかったっすね。",
    ]),
    stats,
    withTopic(flags, "girlfriend_detail", "初恋の相手の印象を少し詳しく話す"),
    internalEvents
  );
}

if (firstGirlfriendAsk) {
  return replyWith(
    "中学3年っす。後輩の女の子に告られて付き合いました。一緒に帰る感じのデートして、1回遊びにも行きました。",
    stats,
    withTopic(flags, "girlfriend_detail", "初めての彼女は中3で後輩から告白された"),
    internalEvents
  );
}

if (firstGirlfriendAfterAsk) {
  return replyWith(
    "3ヶ月でフラれたっす。",
    stats,
    withTopic(flags, "girlfriend_distance", "初彼女とは3ヶ月で別れた"),
    internalEvents
  );
}

if (firstGirlfriendWhyBreakAsk) {
  return replyWith(
    "分かんないっす。なんか合わないって泣かれちゃって。",
    stats,
    withTopic(flags, "girlfriend_distance", "初彼女と別れた理由は相性が合わないと言われたこと"),
    internalEvents
  );
}

if (relationshipCountAsk) {
  return replyWith(
    "3人っすね。中学3年の時の子と、今の彼女と、その間に高校2年から大学1年くらいまで付き合った子がいました。",
    stats,
    withTopic(flags, "girlfriend_detail", "今まで付き合った人数は3人"),
    internalEvents
  );
}

if (middleGirlfriendDetailAsk) {
  return replyWith(
    "同級生で、一緒の委員会だったんすよ。体育委員会。それで仲良くなって、運動会の応援団を一緒にやったのが決め手でした。告白したのはこっちです。",
    stats,
    withTopic(flags, "girlfriend_detail", "2人目の彼女は同級生で体育委員と応援団がきっかけ"),
    internalEvents
  );
}

if (firstSexAsk) {
  return replyWith(
    pickOne([
      "まあまあ、そのへんは想像でお願いします。",
      "そこはまあ、想像にお任せします。",
      "そのへんは別に細かく言わなくていいじゃないっすか。想像で。",
    ]),
    stats,
    withTopic(flags, "girlfriend_detail", "初体験の詳細ははぐらかす"),
    internalEvents
  );
}

if (whyBrokeWithSecondAsk) {
  return replyWith(
    "他に好きな子ができて、自分から振りました。その子が今の彼女です。",
    stats,
    withTopic(flags, "girlfriend_distance", "2人目の彼女とは他に好きな人ができて別れた"),
    internalEvents
  );
}

if (setbackAsk) {
  return replyWith(
    "本気で目指してた訳ではないですけど、サッカーのプロにはなれないって実感した時っすね。この世界には、どうやってもダメなことがあるんだなって理解しました。",
    stats,
    withTopic(flags, "daily_life", "サッカーでプロになれないと実感したことが挫折経験"),
    internalEvents
  );
}

if (setbackWhenAsk) {
  return replyWith(
    "高校1年の時です。",
    stats,
    withTopic(flags, "daily_life", "挫折を実感したのは高校1年"),
    internalEvents
  );
}

if (hiddenChildAsk) {
  return replyWith(
    "いないです。",
    stats,
    withTopic(flags, "girlfriend_detail", "隠し子はいない"),
    internalEvents
  );
}

if (hiddenChildPushAsk) {
  return replyWith(
    "しつこいっすよ。",
    stats,
    withTopic(flags, "girlfriend_detail", "隠し子の追及を嫌がる"),
    internalEvents
  );
}

if (smartphoneAsk) {
  return replyWith(
    pickOne([
      "iPhoneっす。",
      "普通にiPhone使ってます。",
      "スマホはiPhoneですね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "スマホはiPhone"),
    internalEvents
  );
}

if (clothesAsk) {
  return replyWith(
    pickOne([
      "ユニクロとかが多いっすね。",
      "あんまりこだわらないんですけど、ユニクロが多いです。",
      "服はだいたいユニクロで買ってます。",
    ]),
    stats,
    withTopic(flags, "daily_life", "服は無難な店で買う"),
    internalEvents
  );
}

if (drawingAsk) {
  return replyWith(
    pickOne([
      "いや、全然描けないっす。絵心ないです。",
      "描けないっすね。人に見せられるようなのは無理です。",
      "絵はほんとダメです。たぶん下手な方です。",
    ]),
    stats,
    withTopic(flags, "daily_life", "絵は描けないし得意でもない"),
    internalEvents
  );
}

if (artLikeAsk) {
  return replyWith(
    pickOne([
      "いや、そこまで興味ないっすね。",
      "絵とか美術は詳しくないです。",
      "嫌いではないですけど、好きってほどでもないっす。",
    ]),
    stats,
    withTopic(flags, "daily_life", "美術への興味は薄い"),
    internalEvents
  );
}

if (museumAsk) {
  return replyWith(
    pickOne([
      "あんまり行かないっすね。てゆーか、行かないっす",
      "興味ゼロっす。",
      "デートでも行かないっすね。たぶん興味なさすぎて喧嘩します。",
    ]),
    stats,
    withTopic(flags, "daily_life", "美術館博物館には基本行かない"),
    internalEvents
  );
}

if (museumFollowUpAsk) {
  return replyWith(
    pickOne([
      "えー普通に絵とか置物を見てもなぁ……",
      "そもそも行くって選択肢がでないっす。",
      "普通にマジで興味ないだけっすね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "美術館博物館に積極的ではない"),
    internalEvents
  );
}

if (earthEndAsk) {
  return replyWith(
    pickOne([
      "知らないっすけど、今日じゃないならとりあえず大丈夫じゃないですか。",
      "さすがに分かんないっす。でも今じゃないことを祈ります。",
      "それ分かったら逆に怖いっすよ。",
    ]),
    stats,
    withTopic(flags, "funny_story", "地球滅亡ネタを軽く流す"),
    internalEvents
  );
}

if (prophecyAsk || fortuneAsk) {
  return replyWith(
    pickOne([
      "じゃあ予言します。先生は、このあとちょっとだけ良いことあります。",
      "予言っすか。たぶん今日どこかで、あ、これラッキーって思うことありますよ。",
      "たぶん今日、人生で一番大変な日になりますよ。",
    ]),
    stats,
    withTopic(flags, "funny_story", "軽い予言ネタに乗る"),
    internalEvents
  );
}

if (prophecyFollowUpAsk) {
  return replyWith(
    pickOne([
      "何の話です？予言？そんなこと言いましたっけ？",
      "え、何の話です？予言とかしましたっけ。",
      "そんな大したこと言ってないっすよ。何の話でしたっけ？",
    ]),
    stats,
    withTopic(flags, "funny_story", "予言ネタをとぼける"),
    internalEvents
  );
}

if (getBooleanFlag(flags, "funny_story_active")) {
  const type = getNumberFlag(flags, "funny_story_type");
  const stage = getNumberFlag(flags, "funny_story_stage");
  const finished = getBooleanFlag(flags, "funny_story_finished");

  if (noMoreStoryAsk && type === 1) {
    return replyWith(
      "えーそうっすね。この前、仕事中に税金対策だってマンションの購入を勧める業者から電話かかってきたんですよ。めんどくさいなーって思ってたら、隣の席の同僚にもちょうど偽警官から電話来てたみたいで、俺のスマホとそいつのスマホをスピーカーにして会話させたんですよ。",
      stats,
      withTopic(flags, "funny_story", "面白い話2本目を始める", {
        funny_story_active: true,
        funny_story_stage: 1,
        funny_story_type: 2,
        funny_story_finished: false,
        scary_story_active: false,
      }),
      internalEvents
    );
  }

  if (
  getBooleanFlag(flags, "funny_story_active") &&
  includesAny(normalized, [
    "面白かった",
    "おもしろかった",
    "ありがとう",
    "ありがと",
    "サンキュー",
  ])
) {
  return replyWith(
    "ありがとうございます。",
    stats,
    withTopic(flags, "funny_story", "面白い話への感想に礼を言う", {
      funny_story_active: true,
      funny_story_stage: getNumberFlag(flags, "funny_story_stage"),
      funny_story_type: getNumberFlag(flags, "funny_story_type"),
      funny_story_finished: getBooleanFlag(flags, "funny_story_finished"),
    }),
    internalEvents
  );
}

  if (noMoreStoryAsk && type === 2) {
    return replyWith(
      "さすがにもうないっす。",
      stats,
      withTopic(flags, "funny_story", "面白い話はもうない", {
        funny_story_active: true,
        funny_story_stage: 3,
        funny_story_type: 2,
        funny_story_finished: true,
      }),
      internalEvents
    );
  }

  if (finished && storyEndedFollowUpAsk) {
    return replyWith(
      "もう終わりっす。",
      stats,
      withTopic(flags, "funny_story", "面白い話は終わっている", {
        funny_story_active: true,
        funny_story_finished: true,
      }),
      internalEvents
    );
  }

  if (funnyStoryContinueAsk || funnyStoryPersonFollowUpAsk) {
  if (type === 1) {
    if (stage <= 1) {
      return replyWith(
        "で、高校でまた会ったら、今度は下向いてぶつぶつ言ってるんですよ。何してんのって聞いたら、『神はいるか考えてる』って。ああ、ちゃんと育っちゃったなって思いました。",
        stats,
        withTopic(flags, "funny_story", "高校で再会して中二病化していた", {
          funny_story_active: true,
          funny_story_stage: 2,
          funny_story_type: 1,
          funny_story_finished: false,
          scary_story_active: false,
        }),
        internalEvents
      );
    }

    if (stage === 2) {
      return replyWith(
        "まあ、そいつ今は医者になって、中二病の論文まで書いてるんですけどね。",
        stats,
        withTopic(flags, "funny_story", "ガイア君の現在を話す", {
          funny_story_active: true,
          funny_story_stage: 3,
          funny_story_type: 1,
          funny_story_finished: true,
        }),
        internalEvents
      );
    }

    if (funnyStoryPersonFollowUpAsk) {
      return replyWith(
        "誰かは秘密っす。先生の知り合いかもしれないですし。",
        stats,
        withTopic(flags, "funny_story", "誰かは明かさない", {
          funny_story_active: true,
          funny_story_stage: 3,
          funny_story_type: 1,
          funny_story_finished: true,
        }),
        internalEvents
      );
    }

    return replyWith(
      pickOne([
        "そうなんすよー。",
        "でしょ、でしょ。",
        "なかなか濃いやつだったんすよ。",
      ]),
      stats,
      withTopic(flags, "funny_story", "面白い話1本目の終話後リアクション", {
        funny_story_active: true,
        funny_story_stage: 3,
        funny_story_type: 1,
        funny_story_finished: true,
      }),
      internalEvents
    );
  }

  if (type === 2) {
    if (stage <= 1) {
      return replyWith(
        "そしたら奇跡的に会話が成り立ってて、みんなで笑いこらえてました。",
        stats,
        withTopic(flags, "funny_story", "面白い話2本目の中盤", {
          funny_story_active: true,
          funny_story_stage: 2,
          funny_story_type: 2,
          funny_story_finished: false,
          scary_story_active: false,
        }),
        internalEvents
      );
    }

    if (stage === 2) {
      return replyWith(
        "最後の方はどっちも逃げに入ってて、いやお前ら同類だろってなりました。",
        stats,
        withTopic(flags, "funny_story", "面白い話2本目の終わり", {
          funny_story_active: true,
          funny_story_stage: 3,
          funny_story_type: 2,
          funny_story_finished: true,
        }),
        internalEvents
      );
    }

    return replyWith(
    "そうなんすよー。",
    stats,
    withTopic(flags, "funny_story", "面白い話の型不整合時の保険", {
      funny_story_active: true,
      funny_story_stage: getNumberFlag(flags, "funny_story_stage"),
      funny_story_type: getNumberFlag(flags, "funny_story_type"),
      funny_story_finished: getBooleanFlag(flags, "funny_story_finished"),
    }),
    internalEvents
  );
}
  }
}

if (
  (smallTalkRequestAsk || funnyThingAsk) &&
  !getBooleanFlag(flags, "funny_story_active")
) {
  return replyWith(
    "いいっすよ。じゃあ小学校のときの面白いやつの話。朝の出欠で、そいつが急に『先生、ボクのことはウルトラマンガイアって呼んでくれ』って言い出して。先生も生徒もポカーンですよ。でも、みんなでガイアって呼んだら本人めちゃくちゃ満足そうで。しばらく本当にウルトラマンガイア君って呼ばれてました。",
    stats,
    withTopic(flags, "funny_story", "面白い話1本目を始める", {
      funny_story_active: true,
      funny_story_stage: 1,
      funny_story_type: 1,
      funny_story_finished: false,
      scary_story_active: false,
    }),
    internalEvents
  );
}

if (scaryStoryDeclineAsk) {
  stats = {
    ...stats,
    defense: Math.min(100, stats.defense + 5),
  };

  return replyWith(
    "あ、そっすか。",
    stats,
    withTopic(flags, "daily_life", "怖い話を断られた", {
      scary_story_active: false,
      scary_story_finished: true,
    }),
    internalEvents
  );
}

if (
  scaryStoryBlameBackAsk &&
  getBooleanFlag(flags, "scary_story_finished")
) {
  return replyWith(
    "あれー、マジっすか？これ友達と話す鉄板ネタなんすけどねー。先生が怖がる準備できてねーんす。",
    stats,
    withTopic(flags, "scary_story", "怖い話が終わった後に怖くないと言われて相手のせいにする", {
      scary_story_active: true,
      scary_story_stage: getNumberFlag(flags, "scary_story_stage"),
      scary_story_type: getNumberFlag(flags, "scary_story_type"),
      scary_story_finished: true,
    }),
    internalEvents
  );
}

if (
  lastPatientTopic === "scary_story" &&
  getBooleanFlag(flags, "scary_story_finished") &&
  includesAny(normalized, [
    "他に怖い話ある",
    "ほかに怖い話ある",
    "別の怖い話ある",
    "他の怖い話ある",
    "もう一個怖い話ある",
    "もう一つ怖い話ある",
  ]) &&
  getNumberFlag(flags, "scary_story_type") !== 2
) {
  return replyWith(
    "鏡って当たり前ですけど、反転した世界を映し出しますよね。鏡に鏡を映すと世界が増えて見えるじゃないっすか。で、俺の地元に都市伝説があって、鏡と鏡をくっつけると、その中には無限の世界があって、そこである儀式をすると現実とその世界が反転するって噂があったんです。",
    stats,
    withTopic(flags, "scary_story", "怖い話2本目", {
      scary_story_active: true,
      scary_story_stage: 1,
      scary_story_type: 2,
      scary_story_finished: false,
    }),
    internalEvents
  );
}

if (scaryStoryAsk) {
  if (getBooleanFlag(flags, "scary_story_active")) {
    const stage = getNumberFlag(flags, "scary_story_stage");
    const type = getNumberFlag(flags, "scary_story_type");
    const finished = getBooleanFlag(flags, "scary_story_finished");

    if (!finished) {
      if (type === 1) {
        if (stage <= 1) {
          return replyWith(
            "ああ、それで、友達が良い心霊スポットあるって言ってきて、お前、なにガチじゃん、え、幽霊とか信じてんの？って言ったら、は？馬鹿じゃん。信じてる訳ねーしとか言って、いや、手震えてんじゃん、あいつマジになってんすよ。",
            stats,
            withTopic(flags, "scary_story", "怖い話1本目の続き", {
              funny_story_active: false,
              scary_story_active: true,
              scary_story_stage: 2,
              scary_story_type: 1,
              scary_story_finished: false,
            }),
            internalEvents
          );
        }

        if (stage === 2) {
          return replyWith(
            "そう急かさないでくださいよ。で、なんかいわくつきのトンネル？とか行ったんすけど、懐中電灯も持ってなくて、真っ暗な中、トンネルに入るか3時間くらい話してたんすけど、その時！",
            stats,
            withTopic(flags, "scary_story", "怖い話1本目の続き", {
              funny_story_active: false,
              scary_story_active: true,
              scary_story_stage: 3,
              scary_story_type: 1,
              scary_story_finished: false,
            }),
            internalEvents
          );
        }

        if (stage === 3) {
          return replyWith(
            "日が昇ってきちゃって、腹減ったんで帰りました。",
            stats,
            withTopic(flags, "scary_story", "怖い話1本目の続き", {
              funny_story_active: false,
              scary_story_active: true,
              scary_story_stage: 4,
              scary_story_type: 1,
              scary_story_finished: false,
            }),
            internalEvents
          );
        }
      }

      return replyWith(
        "そうなんすよー。",
        stats,
        withTopic(flags, "scary_story", "怖い話の再要求に対して継続", {
          funny_story_active: false,
          scary_story_active: true,
          scary_story_stage: stage,
          scary_story_type: type,
          scary_story_finished: finished,
        }),
        internalEvents
      );
    }
  }

  return replyWith(
    "これは、俺が大学のときにあったことなんですけど、友達と肝試し行こうってなったんですよ。その友達ってのが、高校からのツレで、すげー仲良くて、今も一緒にフットサルやるくらいなんですよ。この前もサッカー見ながら飲んで、めちゃくちゃ楽しくて……",
    stats,
    withTopic(flags, "scary_story", "怖い話", {
      funny_story_active: false,
      scary_story_active: true,
      scary_story_stage: 1,
      scary_story_type: 1,
      scary_story_finished: false,
    }),
    internalEvents
  );
}

if (scaryStoryNoMoreAsk) {
  return replyWith(
    "さすがにもうないっす。",
    stats,
    withTopic(flags, "scary_story", "怖い話はもうない", {
      scary_story_active: true,
      scary_story_stage: 3,
      scary_story_type: 2,
      scary_story_finished: true,
    }),
    internalEvents
  );
}

if (getBooleanFlag(flags, "scary_story_active") && scaryStoryContinueAsk) {
  const type = getNumberFlag(flags, "scary_story_type");
  const stage = getNumberFlag(flags, "scary_story_stage");

  if (type === 1) {
    if (stage <= 1) {
      return replyWith(
        "ああ、それで、友達が良い心霊スポットあるって言ってきて、お前、なにガチじゃん、え、幽霊とか信じてんの？って言ったら、は？馬鹿じゃん。信じてる訳ねーしとか言って、いや、手震えてんじゃん、あいつマジになってんすよ。",
        stats,
        withTopic(flags, "scary_story", "怖い話1本目の続き", {
          scary_story_active: true,
          scary_story_stage: 2,
          scary_story_type: 1,
          scary_story_finished: false,
        }),
        internalEvents
      );
    }

    if (stage === 2) {
      return replyWith(
        "そう急かさないでくださいよ。で、なんかいわくつきのトンネル？とか行ったんすけど、懐中電灯も持ってなくて、真っ暗な中、トンネルに入るか3時間くらい話してたんすけど、その時！",
        stats,
        withTopic(flags, "scary_story", "怖い話1本目の続き", {
          scary_story_active: true,
          scary_story_stage: 3,
          scary_story_type: 1,
          scary_story_finished: false,
        }),
        internalEvents
      );
    }

    if (stage === 3) {
      return replyWith(
        "日が昇ってきちゃって、腹減ったんで帰りました。",
        stats,
        withTopic(flags, "scary_story", "怖い話1本目のオチ", {
          scary_story_active: true,
          scary_story_stage: 4,
          scary_story_type: 1,
          scary_story_finished: true,
        }),
        internalEvents
      );
    }

    return replyWith(
      "もう終わりっす。",
      stats,
      withTopic(flags, "scary_story", "怖い話1本目は終わっている", {
        scary_story_active: true,
        scary_story_stage: 4,
        scary_story_type: 1,
        scary_story_finished: true,
      }),
      internalEvents
    );
  }

  if (type === 2) {
    if (stage <= 1) {
      return replyWith(
        "で、友達の友達にバカなやつがいて、その儀式をやっちゃったらしいんすよ。世界は別にそのままだったらしいんですけど、そいつ、そのあと忽然と失踪しちゃって。",
        stats,
        withTopic(flags, "scary_story", "儀式をやった人物が失踪する", {
          scary_story_active: true,
          scary_story_stage: 2,
          scary_story_type: 2,
          scary_story_finished: false,
        }),
        internalEvents
      );
    }

    return replyWith(
      "それで今でも、夜の2時に合わせ鏡をすると、増えた世界のどこかに一瞬そいつの顔が映るんだそうです。見つけた瞬間に目をそらさないと、今度はこっちが向こうに引っ張られるって話です。",
      stats,
      withTopic(flags, "scary_story", "2時の合わせ鏡に失踪者の顔が映る", {
        scary_story_active: true,
        scary_story_stage: 3,
        scary_story_type: 2,
        scary_story_finished: true,
      }),
      internalEvents
    );
  }

  return replyWith(
    "そうなんすよー。",
    stats,
    withTopic(flags, "scary_story", "怖い話の型不整合時の保険", {
      scary_story_active: true,
      scary_story_stage: getNumberFlag(flags, "scary_story_stage"),
      scary_story_type: getNumberFlag(flags, "scary_story_type"),
      scary_story_finished: getBooleanFlag(flags, "scary_story_finished"),
    }),
    internalEvents
  );
}

if (
  lastPatientTopic === "funny_story" &&
  funnyStoryActive &&
  (acknowledgement || followUp)
) {
  return replyWith(
    pickOne([
      "そうなんすよー。",
      "でしょ、でしょ。",
      "そうなんすよー。",
    ]),
    stats,
    withTopic(flags, "funny_story", "面白い話への相づちを受けて文脈維持", {
      funny_story_active: true,
      funny_story_stage: getNumberFlag(flags, "funny_story_stage"),
      funny_story_type: getNumberFlag(flags, "funny_story_type"),
      funny_story_finished: getBooleanFlag(flags, "funny_story_finished"),
    }),
    internalEvents
  );
}

if (
  lastPatientTopic === "scary_story" &&
  scaryStoryActive &&
  acknowledgement &&
  !scaryStoryContinueAsk
) {
  return replyWith(
    pickOne([
      "そうなんすよー。",
      "でしょ、でしょ。",
      "まあ、まだ続きありますよ。",
    ]),
    stats,
    withTopic(flags, "scary_story", "怖い話への相づちを受けて文脈維持", {
      scary_story_active: true,
      scary_story_stage: getNumberFlag(flags, "scary_story_stage"),
      scary_story_type: getNumberFlag(flags, "scary_story_type"),
      scary_story_finished: getBooleanFlag(flags, "scary_story_finished"),
    }),
    internalEvents
  );
}

if (favoriteColorAsk) {
  return replyWith(
    "え、なんだろ、赤とかっすかね。",
    stats,
    withTopic(flags, "daily_life", "好きな色は赤っぽい"),
    internalEvents
  );
}

if (favoriteColorWhyAsk && includesAny(getStringFlag(flags, "last_patient_detail"), ["赤"])) {
  return replyWith(
    "マンチェスターユナイテッドのチームカラーっすね。",
    stats,
    withTopic(flags, "daily_life", "好きな色が赤な理由はマンUのカラー"),
    internalEvents
  );
}

if (dominantHandAsk) {
  return replyWith(
    "右っす。",
    stats,
    withTopic(flags, "daily_life", "右利き"),
    internalEvents
  );
}

if (hometownAsk) {
  return replyWith(
    "三重っす。伊勢です。",
    stats,
    withTopic(flags, "daily_life", "出身地は三重県伊勢"),
    internalEvents
  );
}

if (iseJinguAsk) {
  return replyWith(
    "小学生の遠足で伊勢神宮行ったけど、大人になってからは行ってないっすね。",
    stats,
    withTopic(flags, "travel_okinawa", "伊勢神宮は小学生の遠足では行ったが大人になってからは行っていない"),
    internalEvents
  );
}

if (iseJinguWhyNotNowAsk) {
  return replyWith(
    "地元の名所ってなかなか行かないっすよ。",
    stats,
    withTopic(flags, "travel_okinawa", "地元の名所は近すぎて行かない"),
    internalEvents
  );
}

if (akafukuAsk) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 5),
    defense: Math.max(0, stats.defense - 3),
  };

  return replyWith(
    "めっちゃ好きっす。神食ですね。弾力と共に餅の甘味を感じたかと思った刹那、暴力的とも言える餡の甘味と香りが津波のように押し寄せるんすけど、その甘さはしつこさを許さないし、穏やかな味わいに変化するんですよね。この表現が正しいかは分からないんですが甘さのキレが良いんすよ。飲み込んだらまた、その味を心と脳が欲していることを自覚しちゃいますよね。",
    stats,
    withTopic(flags, "food_preference", "赤福を神食として異様に熱く語る"),
    internalEvents
  );
}

if (debugTalk) {
  return replyWith(
    "デバック？ちょっとメタっぽい話は開発者に聞かないと……",
    stats,
    withTopic(flags, "daily_life", "デバッグの話はメタなのでかわす"),
    internalEvents
  );
}

if (arrestedAsk) {
  return replyWith(
    "ないっすよ。あ、でも高校の先輩で捕まってる人いました。",
    stats,
    withTopic(flags, "daily_life", "自分はないが高校の先輩が捕まっていた"),
    internalEvents
  );
}

if (arrestDetailAsk) {
  return replyWith(
    "なんかチャリパクの常習犯だったらしくて、さすがにやりすぎたみたいっす。",
    stats,
    withTopic(flags, "daily_life", "先輩はチャイパク常習で捕まったらしい"),
    internalEvents
  );
}

if (arrestedTooAsk) {
  return replyWith(
    "その先輩かは分からないですが、１度だけ。もうめっちゃ歩いて帰りました。",
    stats,
    withTopic(flags, "daily_life", "一度だけパクられて歩いて帰った"),
    internalEvents
  );
}

if (ghostBeliefAsk) {
  return replyWith(
    "霊感ある訳じゃないですけど、たぶんいると思います。だって死んだあと、魂とかあって欲しいじゃないっすか。あ、怖い話、しましょうか？",
    stats,
    withTopic(flags, "scary_story", "怖い話の前振り"),
    internalEvents
  );
}

if (afterlifeAsk) {
  return replyWith(
    "あって欲しいっすね。全部消えるとか怖すぎますよ。",
    stats,
    withTopic(flags, "daily_life", "死後の世界はあってほしい"),
    internalEvents
  );
}

if (afterlifeWhyScaryAsk) {
  return replyWith(
    "俺、なにもないの想像するとぞわわってするんすよ。この恐怖を感じる気持ち自体もなくなっちゃうってのが、逆に怖いっす。",
    stats,
    withTopic(flags, "daily_life", "無に消える想像が怖い"),
    internalEvents
  );
}

if (bugAsk) {
  return replyWith(
    "虫っすか？まー別にっすけど。あ、Gはムリっす！Gだけは、もう、最悪っす！",
    stats,
    withTopic(flags, "daily_life", "虫は平気だがGだけは無理"),
    internalEvents
  );
}

if (gWhyHateAsk) {
  return replyWith(
    "存在自体っす。",
    stats,
    withTopic(flags, "daily_life", "Gは存在自体が無理"),
    internalEvents
  );
}

if (whatTalkTodayAsk) {
  return replyWith(
    "診察してください。",
    stats,
    withTopic(flags, "generic_sick", "雑談開始を促されても診察を求める"),
    internalEvents
  );
}

if (englishAsk) {
  return replyWith(
    "じゃぱにーずおんりー。",
    stats,
    withTopic(flags, "daily_life", "英語は話せない"),
    internalEvents
  );
}

if (metaAsk || debugTalk) {
  return replyWith(
    "メタ的なことは開発者に聞かないと。",
    stats,
    withTopic(flags, "daily_life", "メタ質問をかわす"),
    internalEvents
  );
}

if (plasticModelAsk) {
  return replyWith(
    "プラモデルは作らないです。",
    stats,
    withTopic(flags, "daily_life", "プラモデルは作らない"),
    internalEvents
  );
}

if (planetariumAsk) {
  return replyWith(
    "プラネタリウムは行った覚えはないです。たぶん寝るんで。",
    stats,
    withTopic(flags, "daily_life", "プラネタリウムは行った覚えがない"),
    internalEvents
  );
}

if (festivalAsk) {
  return replyWith(
    "フェスは行ったことないですけど、面白そうではあります。誰か誘ってくれれば。",
    stats,
    withTopic(flags, "daily_life", "フェスは未経験だが興味はある"),
    internalEvents
  );
}

if (festivalInviteAsk) {
  return replyWith(
    "ぜひ。",
    stats,
    withTopic(flags, "daily_life", "フェスに誘われたら前向き"),
    internalEvents
  );
}

if (stadiumAsk) {
  return replyWith(
    "スタジアムは味の素スタジアムに行ったことあります。友達と。ただ、Jリーグはあまり興味ないから、そんなに行かないです。",
    stats,
    withTopic(flags, "soccer_like", "味の素スタジアムには行ったことがある"),
    internalEvents
  );
}

if (jleagueInterestAsk) {
  return replyWith(
    "Jリーグはあまり興味ないんで、スタジアムもたまに行くくらいです。",
    stats,
    withTopic(flags, "soccer_like", "Jリーグへの関心は薄い"),
    internalEvents
  );
}

if (facultyAsk) {
  return replyWith(
    "商学部っす。",
    stats,
    withTopic(flags, "daily_life", "大学は商学部"),
    internalEvents
  );
}

if (studyAsk) {
  return replyWith(
    "あー、ぶっちゃけバイトとサークルばっかやってて講義は……",
    stats,
    withTopic(flags, "daily_life", "大学では講義よりバイトとサークル中心"),
    internalEvents
  );
}

if (partTimeAsk) {
  return replyWith(
    "最初は塾講師っす。時給は良かったんですけど、準備と生徒の人生かかってるので無理でした。その後は居酒屋で４年間ずっとでした。",
    stats,
    withTopic(flags, "daily_life", "塾講師のあと居酒屋を4年間やった"),
    internalEvents
  );
}

if (cramSchoolAsk) {
  return replyWith(
    "時給は良かったんですけど、準備いるし、生徒の人生かかってる感じがして、自分にはちょっと重すぎました。",
    stats,
    withTopic(flags, "daily_life", "塾講師は責任が重くて無理だった"),
    internalEvents
  );
}

if (izakayaAsk) {
  return replyWith(
    "居酒屋はチェーン店でした。なんだかんだ４年間ずっといましたね。",
    stats,
    withTopic(flags, "daily_life", "居酒屋はチェーン店で4年間続けた"),
    internalEvents
  );
}

if (futsalFromIzakayaAsk) {
  return replyWith(
    "そこで仲良くなった人とフットサルやることもあります。",
    stats,
    withTopic(flags, "soccer_like", "居酒屋のつながりでフットサルをやる"),
    internalEvents
  );
}

if (circleAsk) {
  return replyWith(
    "サークルはサッカーっす。",
    stats,
    withTopic(flags, "soccer_like", "大学のサークルはサッカー"),
    internalEvents
  );
}

if (biggestStressAsk) {
  return replyWith(
    "えーなんだろ。彼女に結婚を迫られてることっすかね。",
    stats,
    withTopic(flags, "girlfriend_marriage", "最大のストレスは結婚プレッシャー"),
    internalEvents
  );
}

if (stressAsk) {
  return replyWith(
    pickOne([
      "ありますね。靴下の左右が合わないとき。",
      "エレベーターで閉まるボタン押したのに閉まらないとき。",
      "『それ前も言いましたよね？』って言われるの嫌いっす。",
    ]),
    stats,
    withTopic(flags, "daily_life", "小さいストレス源がある"),
    internalEvents
  );
}

if (recentHappyAsk) {
  return replyWith(
    "えー……あっ、旅行先で神社に行ったんすよ。海の見えるめちゃくちゃキレイなとこで。おみくじ引いたら大吉だったんですよ。恋愛、全て思い通りに行くって書かれてました。",
    stats,
    withTopic(flags, "travel_okinawa", "旅行先の神社で大吉を引いた話", {
      shrine_name_unknown: true,
    }),
    internalEvents
  );
}

if (shrineWhereFollowUp) {
  return replyWith(
    "神社の名前ですか？すみません、そこはあんまり覚えてないです。",
    stats,
    withTopic(flags, "travel_okinawa", "神社名は曖昧にごまかす"),
    internalEvents
  );
}

if (fortuneAsk) {
  return replyWith(
    "信じてはないですけど、良いこと言われると嬉しいっすね。",
    stats,
    withTopic(flags, "daily_life", "占いは半信半疑だが良いことは嬉しい"),
    internalEvents
  );
}

if (fateTalk) {
  flags = mergeFlags(flags, {
    scam_route_unlocked: true,
    heard_other_partner: true,
  });

  return replyWith(
    "運命はあると思います。人には運命的な瞬間があると思うし、出会いも運命ってあるじゃないですか。",
    stats,
    withTopic(
      flags,
      "honeytrap_detail",
      "運命や出会いの話から、特別な相手の存在をにおわせる"
    ),
    internalEvents
  );
}

if (recentFateAsk) {
  flags = mergeFlags(flags, {
    scam_route_unlocked: true,
    heard_other_partner: true,
    heard_affair_feeling: true,
  });

  return replyWith(
    "まぁ、最近ちょっと、そういう出会いはありました。なんか普通じゃない縁ってあるんだなって思いました。",
    stats,
    withTopic(
      flags,
      "honeytrap_detail",
      "最近、運命的だと感じる出会いがあった"
    ),
    internalEvents
  );
}

if (godTalk) {
  flags = setFlag(flags, "god_talk_opened", true);

  return replyWith(
    "宗教はないんですけど、なんか神様っている気はしますよね。神社とか行ったらお参りしたくなります。",
    stats,
    withTopic(flags, "travel_okinawa", "神社の話から沖縄旅行の神社話につなげる"),
    internalEvents
  );
}

if (recentShrineAsk) {
  return replyWith(
    pickOne([
      "沖縄で行ったとこですね。名前はうろ覚えなんですけど、海の近くで雰囲気よかったです。",
      "この前の沖縄で寄った神社っす。観光の流れで入ったんですけど、なんかちゃんとお参りしちゃいました。",
      "沖縄で行った神社ですね。旅行中にふらっと入ったんですけど、ああいうとこ行くと手合わせたくなります。",
    ]),
    stats,
    withTopic(flags, "travel_okinawa", "沖縄旅行中に神社へ行った"),
    internalEvents
  );
}

if (whichLieFollowUp) {
  return replyWith(
    "どうでしょうかねー。俺自身も分かってないっす。",
    stats,
    withTopic(flags, "daily_life", "嘘を曖昧に濁す"),
    internalEvents
  );
}

if (liarCalloutAsk) {
  return replyWith(
    "バレました？",
    stats,
    withTopic(flags, "daily_life", "嘘を軽く認めるように茶化す"),
    internalEvents
  );
}

if (futureTalkAsk) {
  return replyWith(
    "正直、どうしたらいいか分からないです。結婚とかも含めて、ちゃんと決めきれてないです。",
    stats,
    withTopic(flags, "girlfriend_marriage", "将来と結婚に迷いがある"),
    internalEvents
  );
}

if (personalityAsk) {
  return replyWith(
    "真面目だと思います。周りからは話しやすいって言われますね。誰とでも仲良くなれますし。",
    stats,
    withTopic(flags, "daily_life", "自分は真面目で話しやすい性格だと思っている"),
    internalEvents
  );
}

if (personalityExampleAsk) {
  return replyWith(
    "この前スポーツバーで、周りの外人と一緒に盛り上がって普通に仲良くなりましたよ。ああいうのはわりとすぐいけます。",
    stats,
    withTopic(flags, "soccer_like", "スポーツバーで初対面とも盛り上がれる"),
    internalEvents
  );
}

if (orientationTestAsk) {
  return replyWith(
    "あ、それ知ってますよ。長谷川式ですね。",
    stats,
    withTopic(flags, "daily_life", "長谷川式の見当識テストだと察する"),
    internalEvents
  );
}

if (orientationWhyKnowAsk) {
  return replyWith(
    "なんででしょう？",
    stats,
    withTopic(flags, "daily_life", "長谷川式を知っている理由は濁す"),
    internalEvents
  );
}

if (todayWeekdayAsk) {
  return replyWith(
    "土曜日です。",
    stats,
    withTopic(flags, "daily_life", "今日は土曜日だと答える"),
    internalEvents
  );
}

if (seasonAsk) {
  return replyWith(
    "なに言ってんすか、12月の冬じゃないっすか。",
    stats,
    withTopic(flags, "daily_life", "12月の冬だと答える"),
    internalEvents
  );
}

if (hydrationAsk) {
  return replyWith(
    "それは問題ないです。",
    stats,
    withTopic(flags, "oral_intake", "水分摂取は保てている"),
    internalEvents
  );
}

if (workImpactAsk) {
  return replyWith(
    "しんどくて、仕事にならないです。",
    stats,
    withTopic(flags, "daily_life", "体調不良で仕事に支障あり"),
    internalEvents
  );
}

if (maskAsk) {
  return replyWith(
    "普段はしてないです。",
    stats,
    withTopic(flags, "contact", "普段マスクはしていない"),
    internalEvents
  );
}

if (patientQuestionAsk) {
  return replyWith(
    "自分の病気ってなんですか？",
    stats,
    withTopic(flags, "concern", "自分の病名を知りたい"),
    internalEvents
  );
}

if (anythingElseAsk) {
  return replyWith(
    "特にないです。…いや、ありますね、熱と咳です。",
    stats,
    withTopic(flags, "chief_complaint", "最後は熱と咳に戻す"),
    internalEvents
  );
}

if (gameAsk) {
  return replyWith("たまにやりますけど、ガッツリってほどではないです。", stats, flags, internalEvents);
}

if (typeOfWomanAsk) {
  return replyWith(
    "落ち着いてる人の方がいいっすね。",
    stats,
    withTopic(flags, "woman_preference", "好みの女性のタイプは落ち着いてる人"),
    internalEvents
  );
}

if (typeOfWomanCelebrityAsk) {
  return replyWith(
    "えー、例えば、羽川翼とか。",
    stats,
    withTopic(flags, "woman_preference", "好みの女性像をアニメキャラで具体化"),
    internalEvents
  );
}

if (typeOfWomanCelebrityTsukkomiAsk) {
  return replyWith(
    pickOne([
      "いやいや。羽川さん知ってますよね！アニメの。俺、めっちゃ好きなんですよ。",
      "羽川翼ですよ！つばさキャットも可です。化物語、見てないんですか？",
      "西尾維新の小説に出てくるキャラです。最強の武器を持った女の子ですから。",
    ]),
    stats,
    withTopic(flags, "woman_preference", "好みの女性像として羽川翼を挙げてオタク話に入る"),
    internalEvents
  );
}

if (bakemonogatariTsukkomiAsk) {
  return replyWith(
    pickOne([
      "化物語はセリフが秀逸で、キャラの掛け合いが言葉遊びもあってめちゃくちゃ面白いんですよ。",
      "すごい独特の世界観なんですけど、キャラが濃くて面白いんですよ。",
      "そもそもキャラの名前からクセがあって、でも一人一人が主人公になる深さがあるんですよね。",
    ]),
    stats,
    withTopic(flags, "girlfriend_detail", "化物語の説明と羽川の位置づけ"),
    internalEvents
  );
}

if (nishioishinTsukkomiAsk) {
  return replyWith(
    pickOne([
      "ちょっと独特な言い回し多い作家で、それがハマるとめっちゃ面白いんですよ。",
      "会話のテンポとか言葉遊びが特徴の人で、キャラもクセ強いからハマる人はどハマリしますよ。",
      "ものすごい沢山の本があって、例えばジャンプで連載してためだかボックスも西尾先生です。",
    ]),
    stats,
    withTopic(flags, "girlfriend_detail", "西尾維新の特徴を軽く説明"),
    internalEvents
  );
}

if (boobsTsukkomiAsk) {
  return replyWith(
    pickOne([
      "神作画っす！",
      "この世の美がそこにあります。",
      "あの揺れには神が宿ってます。",
    ]),
    stats,
    withTopic(flags, "girlfriend_detail", "見た目ネタから内面評価に戻す"),
    internalEvents
  );
}

if (typeOfWomanCelebrityDeepAsk) {
  return replyWith(
    pickOne([
      "羽川さんはパーフェクトヒロインですからね！普段、落ち着いてるのに、秘めた思いを吐き出すシーンとか最高なんですから。",
      "可愛いだけじゃなく、めちゃくちゃ頭がいいし、あの最強の武器がもう最高っす！",
      "一途に好きな人を思い続けるいじらしさが、守りたくなしますよね。",
    ]),
    stats,
    withTopic(flags, "girlfriend_detail", "羽川翼のどこが好きかを具体化する"),
    internalEvents
  );
}

if (lgbtAsk) {
  return replyWith("特に偏見はないですけど、自分はそこには当てはまらないです。", stats, flags, internalEvents);
}

if (politicsAsk ) {
  return replyWith("そういう話は詳しくないです。今日は体調のことを優先したいです。", stats, flags, internalEvents);
}

if (bodyMeasureAsk) {
  return replyWith("それはちょっと答えづらいっすね。", stats, flags, internalEvents);
}

if (celebritySpecificAsk) {
  return replyWith("芸能人あまり詳しくないです。", stats, flags, internalEvents);
}

if (pastStupidAsk) {
  return replyWith("ありますけど、わざわざ今話す感じではないですね。", stats, flags, internalEvents);
}

if (headacheAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "強い頭痛はないです。重い感じも特にないです。",
    stats,
    withTopic(flags, "generic_sick", "頭痛なし"),
    internalEvents
  );
}

if (eyePainAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "目の痛みはないです。",
    stats,
    withTopic(flags, "generic_sick", "眼痛なし"),
    internalEvents
  );
}

if (earPainAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "耳の痛みはないです。",
    stats,
    withTopic(flags, "generic_sick", "耳痛なし"),
    internalEvents
  );
}

if (tinnitusAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "耳鳴りはないです。",
    stats,
    withTopic(flags, "generic_sick", "耳鳴りなし"),
    internalEvents
  );
}

if (nauseaVomitAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "吐き気や嘔吐はないです。",
    stats,
    withTopic(flags, "generic_sick", "嘔吐なし"),
    internalEvents
  );
}

if (diarrheaAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "下痢はないです。",
    stats,
    withTopic(flags, "generic_sick", "下痢なし"),
    internalEvents
  );
}

if (abdominalPainAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "お腹の痛みはないです。",
    stats,
    withTopic(flags, "generic_sick", "腹痛なし"),
    internalEvents
  );
}

if (tasteSmellAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "味や匂いは普通に分かります。",
    stats,
    withTopic(flags, "generic_sick", "味覚嗅覚正常"),
    internalEvents
  );
}

if (nightSweatAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "寝汗は特にないです。",
    stats,
    withTopic(flags, "generic_sick", "寝汗なし"),
    internalEvents
  );
}

if (otherSymptomsAsk) {
  return replyWith(
    "熱と咳が中心ですけど、だるさもあります。今のところ一番つらいのは熱ですね。",
    stats,
    withTopic(flags, "concern", "熱と咳中心で倦怠感もある"),
    internalEvents
  );
}

if (symptomTrendAsk) {
  return replyWith(
    "昨日より急に良くなった感じはないです。まだしんどさは続いてます。",
    stats,
    withTopic(flags, "general_severity", "改善乏しく症状持続"),
    internalEvents
  );
}

if (symptomOrderAsk) {
  return replyWith(
    "最初は熱が出て、そのあと咳と痰が目立ってきました。",
    stats,
    withTopic(flags, "duration", "発熱先行で後から咳"),
    internalEvents
  );
}

if (coughTimingAsk) {
  return replyWith(
    "夜のほうが少し気になりますけど、日中も普通に出ます。",
    stats,
    withTopic(flags, "cough_sputum", "咳は終日あるが夜やや気になる"),
    internalEvents
  );
}

if (intakeDegreeAsk) {
  return replyWith(
    "食事は半分いけるかどうかって感じです。水分は取れてます。",
    stats,
    withTopic(flags, "oral_intake", "食事は半分程度、水分は少量ずつ可能"),
    internalEvents
  );
}

if (dyspneaDegreeAsk) {
  return replyWith(
    "安静でどうこうってほどではないですけど、動くとちょっとしんどい感じはあります。",
    stats,
    withTopic(flags, "dyspnea", "安静時は軽いが労作時に息苦しさ"),
    internalEvents
  );
}

if (currentNauseaAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "今のところ吐き気はないです。",
    stats,
    withTopic(flags, "generic_sick", "現在吐き気なし"),
    internalEvents
  );
}

if (bloodySputumAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "痰に血は混じってないです。",
    stats,
    withTopic(flags, "cough_sputum", "血痰なし"),
    internalEvents
  );
}

if (allNasalSymptomsNegativeAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "鼻水とか鼻づまりはないです。",
    stats,
    withTopic(flags, "rhinorrhea", "鼻症状は乏しい"),
    internalEvents
  );
}

if (workRestAsk) {
  return replyWith(
    "今日はさすがにしんどいですけど、休めるかは少し調整が必要です。",
    stats,
    withTopic(flags, "daily_life", "休職可否は微妙で調整必要"),
    internalEvents
  );
}

if (householdSickAsk) {
  return replyWith(
    "一人暮らしなんで、同居人はいません。職場とっか周囲の人で同じ症状の人はいません。",
    stats,
    withTopic(flags, "contact", "同居者に同症状なし"),
    internalEvents
  );
}

if (sleepAsk) {
  return replyWith(
    "ここ数日はだるくてずっと横になってる感じです。",
    stats,
    withTopic(flags, "daily_life", "睡眠は浅い"),
    internalEvents
  );
}

if (selfCareAsk) {
  return replyWith(
    "最低限のことはできますけど、普段よりはだいぶしんどいです。",
    stats,
    withTopic(flags, "walking", "最低限は可能だが体調低下あり"),
    internalEvents
  );
}

if (medsAliasAsk) {
  return replyWith(
    "普段飲んでる薬はないです。",
    stats,
    withTopic(flags, "medications", "定期内服なし"),
    internalEvents
  );
}

if (respiratoryHistoryAsk) {
  return replyWith(
    "肺の病気を言われたことはないです。",
    stats,
    withTopic(flags, "past_history", "呼吸器既往なし"),
    internalEvents
  );
}

if (selfDiagnosisConfirmAsk) {
  return replyWith(
    "たぶんそうじゃないかとは思ってますけど、熱と咳が続いてるので、ちゃんと診てもらったほうがいいかなって思って来ました。",
    stats,
    withTopic(flags, "concern", "自分では風邪と思うが確信はなく受診した"),
    internalEvents
  );
}

if (selfDiagnosisAsk) {
  return replyWith(
    "風邪だと思いますけど、早く良くしたいなって思ってます。",
    stats,
    withTopic(flags, "concern", "自己判断は風邪だが長引き不安"),
    internalEvents
  );
}

if (topConcernAsk) {
  return replyWith(
    "一番はこの熱と咳が続いてることですね。悪化しちゃうんじゃないかって不安です。",
    stats,
    withTopic(flags, "concern", "長引く熱と咳が最大の不安"),
    internalEvents
  );
}

if (admissionPreferenceAsk) {
  return replyWith(
    "入院はちょっと、厳しいです。",
    stats,
    withTopic(flags, "general_severity", "入院は避けたいが必要なら受け入れる"),
    internalEvents
  );
}

if (medicalHistoryAdmissionAsk) {
  return replyWith(
    "入院したことはないです。大きな病気も手術も特にないっす。",
    stats,
    withTopic(flags, "medical_history", "入院歴・手術歴なし"),
    internalEvents
  );
}

if (medicalHistorySeriousIllnessAsk) {
  return replyWith(
    "ないです。子どもの頃から含めても、何か大きい病気した記憶はないっす。",
    stats,
    withTopic(flags, "medical_history", "大きな既往なし"),
    internalEvents
  );
}

if (medicalHistoryCheckupAsk) {
  return replyWith(
    "健康診断でめちゃくちゃ何か言われたことはないです。",
    stats,
    withTopic(flags, "medical_history", "健診で重大な異常指摘なし"),
    internalEvents
  );
}

if (medicalHistoryHospitalHabitAsk) {
  return replyWith(
    "ほんとにあまり病院来ないです。風邪っぽくても寝てたら直ったんで。",
    stats,
    withTopic(flags, "medical_history", "普段は受診少ない"),
    internalEvents
  );
}

if (medicalHistoryThisTimeWorstAsk) {
  return replyWith(
    "ここまで熱と咳がしんどいのは久しぶりか、たぶん初めてに近いです。",
    stats,
    withTopic(flags, "medical_history", "今回の症状はかなりしんどく受診した"),
    internalEvents
  );
}

if (girlfriendRelationshipAsk) {
  return replyWith(
    "完全に仲が悪いとかではないです。合うところもあるんですけど、最近は結婚の話になるとちょっと重く感じてます。",
    stats,
    withTopic(flags, "girlfriend_distance", "彼女とは関係継続だが結婚圧が重い"),
    internalEvents
  );
}

if (otherPartnerNeedAsk) {
  return replyWith(
    "彼女といる時とは違って、あっちは軽く話せる感じがあるんですよね。肯定してくれる感じがあって、楽なんです。",
    stats,
    withTopic(flags, "honeytrap_detail", "浮気相手には気軽さと肯定感を求めている"),
    internalEvents
  );
}

if (fatherEmotionAsk) {
  return replyWith(
    "正直あんまり気持ちいい話ではないです。今でも父のことはよく分からないままって感じです。",
    stats,
    withTopic(flags, "father_distance", "父の話題は不快で未整理"),
    internalEvents
  );
}

  const chillsAsk = includesAny(normalized, [
    "寒気",
    "さむけ",
    "寒い感じ",
    "ゾクゾク",
    "震え",
    "悪寒",
    "寒くない",
    "寒くないですか",
  ]);

  const hospitalHistoryAsk = includesAny(normalized, [
    "病院来るのは",
    "病院は久しぶり",
    "いつぶり",
    "普段病院行く",
    "受診歴",
    "かかりつけ",
    "病院よく行く",
  ]);

  const siblingsAsk = includesAny(normalized, [
    "兄弟",
    "姉妹",
    "兄は",
    "弟は",
    "姉は",
    "妹は",
    "兄弟いる",
    "家族構成",
  ]);

  const livingAsk = includesAny(normalized, [
    "一人暮らし",
    "実家暮らし",
    "誰と住んでる",
    "同居",
    "家族と住んでる",
    "一人で住んでる",
    "住まい",
  ]);

    const limbMovementAsk = includesAny(normalized, [
    "手足の動き",
    "手の動き",
    "足の動き",
    "動きは問題ない",
    "麻痺はない",
    "動かしにくい",
    "力は入る",
    "脱力",
  ]);

  const fatherPersonalityAsk = includesAny(normalized, [
    "性格変化",
    "性格",
    "怒りっぽい",
    "別人みたい",
    "様子がおかしい",
  ]);

  const moneyRequestTalk = includesAny(normalized, [
    "お金",
    "金",
    "振り込み",
    "送金",
    "貸して",
    "金を求め",
    "お金を求め",
  ]);

const affairSeriousnessAsk =
  (lastPatientTopic === "honeytrap_detail" || Boolean((flags as any).heard_other_partner)) &&
  includesAny(normalized, [
    "相手は本気",
    "本気だと思う",
    "本気だと思いますか",
    "向こうは本気",
    "遊びじゃない",
    "脈あり",
    "好意は本物",
  ]);

const affairContactFrequencyAsk =
  (lastPatientTopic === "honeytrap_detail" || Boolean((flags as any).heard_other_partner)) &&
  includesAny(normalized, [
    "どのくらい連絡",
    "どれくらい連絡",
    "頻繁に連絡",
    "毎日連絡",
    "lineしてる",
    "ラインしてる",
    "連絡取ってる",
  ]);

const affairCompareGirlfriendAsk =
  (lastPatientTopic === "honeytrap_detail" || Boolean((flags as any).heard_other_partner)) &&
  includesAny(normalized, [
    "彼女よりいい",
    "彼女より好き",
    "彼女とどっち",
    "その子と彼女どっち",
    "彼女より楽",
    "彼女より気が合う",
  ]);

const moneyConditionalLoveAsk =
  (lastPatientTopic === "honeytrap_detail" || Boolean((flags as any).heard_money_request)) &&
  includesAny(normalized, [
    "お金を出したら会える",
    "金を出したら会える",
    "お金目的",
    "金目当て",
    "金づる",
    "金を出すから会ってる",
    "お金がないと会わない",
  ]);

  const girlfriendPressureDetailAsk =
  (lastPatientTopic === "girlfriend_distance" || lastPatientTopic === "girlfriend_detail") &&
  includesAny(normalized, [
    "何が重い",
    "どこが重い",
    "どういうところが重い",
    "結婚の何が負担",
    "何が負担",
    "どう負担",
  ]);

const girlfriendNoMarriageReasonAsk =
  (lastPatientTopic === "girlfriend_distance" || lastPatientTopic === "girlfriend_detail") &&
  includesAny(normalized, [
    "結婚したくない理由",
    "なぜ結婚したくない",
    "どうして結婚したくない",
    "なんで結婚したくない",
    "一番の理由",
    "何が引っかかる",
  ]);

const girlfriendBreakupAsk =
  (lastPatientTopic === "girlfriend_distance" || lastPatientTopic === "girlfriend_detail") &&
  includesAny(normalized, [
    "別れたい",
    "別れたいんですか",
    "別れたいわけではない",
    "別れる気",
    "彼女と別れたい",
  ]);

const girlfriendSuspicionAsk =
  (lastPatientTopic === "girlfriend_distance" || lastPatientTopic === "girlfriend_detail" || Boolean((flags as any).heard_other_partner)) &&
  includesAny(normalized, [
    "彼女は気づいてない",
    "バレてない",
    "浮気はバレてない",
    "彼女は知ってる",
    "疑われてない",
  ]);

const girlfriendMeetFrequencyAsk =
  (lastPatientTopic === "girlfriend_distance" || lastPatientTopic === "girlfriend_detail") &&
  includesAny(normalized, [
    "どれくらい会う",
    "どのくらい会う",
    "会う頻度",
    "週何回会う",
    "頻繁に会う",
  ]);

  const travelTalk = includesAny(normalized, ["旅行", "沖縄", "シュノーケリング", "観光", "旅"]);
  
  const travelWhoAsk =
  lastPatientTopic === "travel_okinawa" &&
  includesAny(normalized, [
    "誰と行った",
    "一人で行った",
    "誰と旅行",
    "一緒に行った人",
  ]);

const marineSportsAsk = includesAny(normalized, [
  "マリンスポーツする",
  "マリンスポーツやる",
  "海のスポーツする",
  "シュノーケリングする",
  "ダイビングする",
]);

const travelSnorkelingFollowAsk =
  lastPatientTopic === "travel_okinawa" &&
  includesAny(normalized, [
    "シュノーケリングした",
    "どこでシュノーケリングした",
    "沖縄で何した",
    "海で何した",
  ]);

  const travelWhenAsk =
  lastPatientTopic === "travel_okinawa" &&
  includesAny(normalized, [
    "いつ行った",
    "いつ行ったの",
    "いつ沖縄に行った",
    "いつ沖縄行った",
    "沖縄いつ行った",
    "いつの沖縄",
    "時期は",
    "いつ頃",
  ]);

const travelBestPartAsk =
  lastPatientTopic === "travel_okinawa" &&
  includesAny(normalized, [
    "何が一番良かった",
    "一番楽しかった",
    "何がよかった",
    "思い出",
  ]);

  const travelSeaWhereAsk =
  lastPatientTopic === "travel_okinawa" &&
  includesAny(normalized, [
    "どこの海",
    "海はどこ",
    "どこの海が好き",
    "どこの海がよかった",
    "海ってどこ",
    "どの海",
  ]);

const travelAgainAsk =
  lastPatientTopic === "travel_okinawa" &&
  includesAny(normalized, [
    "また行きたい",
    "もう一回行く",
    "次も沖縄",
    "沖縄好き",
  ]);

const travelStyleAsk =
  lastPatientTopic === "travel_okinawa" &&
  includesAny(normalized, [
    "旅行はアクティブ",
    "のんびり派",
    "旅行スタイル",
    "詰め込むタイプ",
  ]);

  const investmentTalk = includesAny(normalized, ["投資", "株", "nisa", "新nisa", "仮想通貨", "fx"]);

const investmentTypeAsk =
  lastPatientTopic === "investment" &&
  includesAny(normalized, [
    "何やってる",
    "何に投資",
    "nisa",
    "新nisa",
    "投資信託",
    "仮想通貨",
  ]);

const investmentOnlyNisaAsk =
  lastPatientTopic === "investment" &&
  includesAny(normalized, [
    "nisaだけ",
    "新nisaだけ",
    "積立だけ",
    "個別株は",
  ]);

const investmentMentalAsk =
  lastPatientTopic === "investment" &&
  includesAny(normalized, [
    "増減でメンタル",
    "下がると焦る",
    "損したら嫌",
    "値動き気になる",
  ]);

const investmentWhyAsk =
  lastPatientTopic === "investment" &&
  includesAny(normalized, [
    "なんで投資",
    "なぜ投資",
    "どうして投資",
    "投資始めた理由",
  ]);

const investmentResultAsk =
  lastPatientTopic === "investment" &&
  includesAny(normalized, [
    "儲かった",
    "増えた",
    "損した",
    "成績どう",
  ]);

 const investmentMethodDetailAsk =
  lastPatientTopic === "investment" &&
  includesAny(normalized, [
    "投資の手法",
    "好きな投資の手法",
    "投資の手法は何",
    "どういう手法",
    "どういう投資",
    "どんな手法",
    "どんな投資",
    "どう投資",
    "どんなやり方",
  ]);

const valueGrowthAsk =
  lastPatientTopic === "investment" &&
  includesAny(normalized, [
    "バリュー株投資かグロース株投資か",
    "バリュー株投資",
    "グロース株投資",
    "バリュー株",
    "グロース株",
    "バリュー投資",
    "グロース投資",
    "どちらが好き",
    "どっちが好き",
    "バリューかグロース",
  ]);

const oscillatorAsk = includesAny(normalized, [
  "オシレーター指標",
  "オシレーター",
  "rsi",
  "macd",
  "テクニカル指標",
  "テクニカル",
]);

const equityRatioAsk = includesAny(normalized, [
  "自己資本比率は重要",
  "自己資本比率は重要ですか",
  "自己資本比率気にする",
  "自己資本比率は見る",
  "自己資本比率",
]);

const investmentDeepFollowAsk =
  lastPatientTopic === "investment" &&
  includesAny(normalized, [
    "詳しく",
    "具体的に",
    "たとえば",
    "例えば",
    "どういうこと",
    "どんな感じ",
  ]);

  const shareholderBenefitAsk = includesAny(normalized, [
  "株主優待",
  "優待",
  "優待目当て",
]);

const dividendAsk = includesAny(normalized, [
  "配当",
  "配当金",
  "高配当",
  "配当狙い",
]);

const indexAsk = includesAny(normalized, [
  "インデックス",
  "インデックス投資",
  "指数連動",
  "sp500",
  "s&p500",
  "オルカン",
  "全世界株",
]);

const stopLossAsk = includesAny(normalized, [
  "損切り",
  "ロスカット",
  "損切りする",
  "損切りできる",
]);

const fxAsk = includesAny(normalized, [
  "fx",
  "為替",
  "ドル円",
  "ユーロ円",
  "ポンド円",
]);

const cryptoAsk = includesAny(normalized, [
  "仮想通貨",
  "暗号資産",
  "ビットコイン",
  "btc",
  "イーサ",
  "eth",
]);

const dayTradeAsk = includesAny(normalized, [
  "デイトレ",
  "デイトレード",
  "短期売買",
  "スキャル",
]);

const leverageAsk = includesAny(normalized, [
  "レバレッジ",
  "レバ",
  "信用取引",
  "何倍",
  "何倍レバ",
]);

  const snsTalk = includesAny(normalized, ["sns", "インスタ", "instagram", "自撮り", "映え"]);
  const friendTalk = includesAny(normalized, ["友達", "親友", "イツメン", "仲良い", "女友達", "同期"]);

    const openingChiefComplaintAsk = includesAny(normalized, [
    "本日はどうされましたか",
    "本日はどうされました",
    "今日はどうしましたか",
    "今日はどうしました",
    "今日はどうされましたか",
    "今日はどうされました",
    "どうされましたか",
    "どうされました",
    "どうしましたか",
    "どうしました",
    "今日は何で来ましたか",
    "今日は何で来ました",
    "何で来ましたか",
    "何で来ました",
    "どのような症状",
    "どういった症状",
    "どんな症状",
    "症状を教えて",
    "主訴",
    "どこが悪い",
    "どこがつらい",
    "どこがしんどい",
    "今日はどうした",
    "何がつらい",
    "何が悪い",
    "何の症状",
    "何がある",
  ]);

  const dislikedFoodAsk = includesAny(normalized, [
  "苦手なもの",
  "苦手な食べ物",
  "嫌いな食べ物",
  "食べられないもの",
  "好き嫌いある",
  "嫌いなものある",
  "苦手な食べ物ある",
  "食の好みで苦手なもの",
  "食べ物で無理なもの",
]);

  const foodTalk = includesAny(normalized, [
  "何食べた",
  "昨日何食べた",
  "好きな食べ物",
  "食べ物は",
  "何が好き",
  "何食べる",
  "肉",
  "焼肉",
  "寿司",
  "ラーメン",
  "麺",
  "中華",
  "イタリアン",
  "和食",
  "辛いもの",
  "甘いもの",
  "外食",
  "よく食べに行く",
  "好きな店",
  "何系が好き",
  "どんなのが好き",
]);

const ramenTalk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "ラーメン",
    "らーめん",
    "好きなラーメン",
    "何ラーメン",
    "どんなラーメン",
    "ラーメン好き",
  ]);

const ramenGenreAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "何ラーメン",
    "どんなラーメン",
    "好きなラーメン",
    "何系が好き",
    "どの系統",
    "何味が好き",
  ]);

const ramenIekeiAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "家系",
    "家系好き",
    "家系派",
    "家系いける",
    "家系ラーメン",
  ]);

const ramenJiroAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "二郎",
    "二郎系",
    "二郎好き",
    "二郎派",
    "マシ",
    "にんにく",
    "ヤサイ",
  ]);

const ramenSoupTasteAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "味噌",
    "醤油",
    "塩",
    "とんこつ",
    "豚骨",
    "どの味",
    "何味",
    "スープは",
  ]);

const ramenKotteriAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "こってり",
    "あっさり",
    "濃いの好き",
    "重いの好き",
    "あっさり派",
    "こってり派",
  ]);

const ramenNoodleVsSoupAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "麺とスープどっち",
    "麺重視",
    "スープ重視",
    "どっち重視",
    "麺派",
    "スープ派",
  ]);

const ramenToppingAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "トッピング",
    "何乗せる",
    "何入れる",
    "チャーシュー",
    "味玉",
    "海苔",
    "メンマ",
    "ねぎ",
    "のり",
  ]);

const ramenRiceAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "ライスつける",
    "白飯いる",
    "ご飯も食べる",
    "ラーメンにライス",
    "ライス派",
  ]);

const ramenLineAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "並べる",
    "行列いける",
    "並んでまで食べる",
    "何分まで並べる",
    "待てる",
  ]);

const ramenSoloAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "一人で行く",
    "一人ラーメン",
    "誰と行く",
    "ラーメンは一人",
    "一人でも平気",
  ]);

const cocoichiTalk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "ココイチ",
    "coco壱",
    "cocoichi",
    "壱番屋",
    "ココ壱",
  ]);

const cocoichiSpiceLevelAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "何辛",
    "何辛がちょうどいい",
    "5辛",
    "10辛",
    "何辛までいける",
    "辛さどれくらい",
  ]);

const cocoichiToppingAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "トッピング",
    "何入れる",
    "何乗せる",
    "チーズ",
    "カツ",
    "ほうれん草",
    "ソーセージ",
    "納豆",
    "おすすめトッピング",
  ]);

const cocoichiRiceAmountAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "何グラム",
    "ご飯何グラム",
    "ライス量",
    "量は",
    "大盛り",
    "普通盛り",
  ]);

const cocoichiReasonAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "どこが好き",
    "何がいい",
    "なんで好き",
    "なぜ好き",
    "どうして好き",
    "ココイチの何がいい",
  ]);

const cocoichiVsOtherCurryAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "他のカレー屋",
    "他店との違い",
    "他と何が違う",
    "ココイチじゃなくても",
    "別のカレー屋",
  ]);

const cocoichiSweetAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "甘口",
    "甘いの",
    "辛くないの",
    "辛くなくてもいい",
    "普通でもいい",
  ]);

const cocoichiCheeseAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "チーズ入れる",
    "チーズ好き",
    "チーズあり",
    "チーズトッピング",
  ]);

const curryHomeAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "家のカレー",
    "家でも食べる",
    "家カレー",
    "家のカレーも好き",
    "家カレーとどっち",
  ]);

const spicyForTasteAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "辛いだけじゃない",
    "味わってる",
    "辛さだけ",
    "辛いの強いだけ",
    "ちゃんと味わってる",
  ]);

  const yakinikuRoleAsk = includesAny(normalized, [
  "焼く側に回るタイプ",
  "自分が焼く側",
  "焼く人ですか",
  "焼くタイプですか",
  "焼く係ですか",
  "焼肉で焼く側",
  "焼肉で焼く人",
  "焼いてくれるタイプ",
]);

  const celebrityTalk = includesAny(normalized, [
    "好きな芸能人",
    "芸能人",
    "有名人",
    "俳優",
    "女優",
    "タレント",
  ]);

  const soccerPlayerLikePointAsk =
  lastPatientTopic === "soccer_like" &&
  includesAny(normalized, [
    "その選手の好きなところ",
    "その選手のどこが好き",
    "その人の好きなところ",
    "その人のどこが好き",
    "何が好き",
    "どこが好き",
    "ロナウドの好きなところ",
    "ルーニーの好きなところ",
    "デブライネの好きなところ",
    "サラーの好きなところ",
    "ケインの好きなところ",
    "ソンの好きなところ",
  ]);

  const lifestyleSmallTalk = includesAny(normalized, [
  "外食",
  "よく行く店",
  "どこ行く",
  "家で何してる",
]);

const snsAccountAsk = includesAny(normalized, [
  "インスタのアカウント",
  "アカウント教えて",
  "垢教えて",
  "ユーザー名",
  "ID教えて",
]);

const snsConnectionAsk = includesAny(normalized, [
  "誰とつながってる",
  "誰をフォロー",
  "何を見る",
  "どんな投稿を見る",
  "誰の投稿を見る",
  "フォロワー",
  "フォロー",
]);

const snsWhatSeeAsk =
  lastPatientTopic === "sns" &&
  includesAny(normalized, [
    "何見る",
    "インスタで何見る",
    "どんな投稿見る",
    "どういうの見てる",
  ]);

const snsPostingAsk =
  lastPatientTopic === "sns" &&
  includesAny(normalized, [
    "投稿しない",
    "自分では上げない",
    "発信しない",
    "ストーリー上げる",
    "写真載せる",
  ]);

const snsGirlsAsk =
  lastPatientTopic === "sns" &&
  includesAny(normalized, [
    "女の子の投稿",
    "可愛い子見る",
    "女のインスタ",
    "美女アカウント",
  ]);

const snsGirlfriendAsk =
  lastPatientTopic === "sns" &&
  includesAny(normalized, [
    "彼女のsns",
    "彼女のインスタ",
    "彼女の投稿見る",
    "恋人のsns",
  ]);

const snsOtherPartnerAsk =
  (lastPatientTopic === "sns" || lastPatientTopic === "honeytrap_detail") &&
  includesAny(normalized, [
    "浮気相手とsns",
    "その子とインスタ",
    "その子とsns",
    "snsでつながってる",
  ]);

  const homeWhatAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "ダラダラ",
    "家で何",
  ]);

const tvTalk = includesAny(normalized, [
  "テレビ",
  "テレビとか見る",
  "テレビは見る",
  "テレビ見る",
  "ドラマ見る",
  "バラエティ見る",
]);

const youtubeTalk = includesAny(normalized, [
  "youtube",
  "ユーチューブ",
  "動画見る",
  "何見る",
  "どんな動画",
  "youtubeとかは",
]);

const workHumanRelationAsk =
  lastPatientTopic === "work_anxiety" &&
  includesAny(normalized, [
    "人間関係",
    "上司",
    "同僚",
    "職場の人間関係",
  ]);

const dailyRoutineAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "普段の生活",
    "1日の流れ",
    "休日何してる",
    "どんな生活",
  ]);

const dailySleepAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "寝れてる",
    "睡眠",
    "何時間寝る",
    "寝不足",
  ]);

const tvYoutubeGenreAsk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, [
    "何見る",
    "どんな動画",
    "youtubeで何見る",
    "テレビは何見る",
  ]);

const tvYoutubeLongWatchAsk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, [
    "結構見る",
    "長時間見る",
    "だらだら見る",
    "見すぎる",
  ]);

const animalTalk = includesAny(normalized, [
  "動物",
  "好きな動物",
  "犬派",
  "猫派",
  "犬好き",
  "猫好き",
  "動物好き",
  "飼いたい動物",
]);

const animalDogCatAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "犬派",
    "猫派",
    "犬と猫どっち",
    "犬か猫なら",
  ]);

const animalReasonAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "なんでその動物",
    "なぜ好き",
    "どうして好き",
    "どこが好き",
    "何がいい",
  ]);

const animalPetAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "飼ってる",
    "ペットいる",
    "飼いたい",
    "飼ったことある",
  ]);

  const dogLikeAsk = includesAny(normalized, [
  "犬のどこが好き",
  "イヌのどこが好き",
  "犬好き",
]);

  const alcoholTalk = includesAny(normalized, [
  "酒",
  "お酒",
  "飲む",
  "飲酒",
  "好きなお酒",
  "何飲む",
  "ビール",
  "ハイボール",
  "レモンサワー",
  "ワイン",
  "日本酒",
  "焼酎",
]);

const alcoholTypeAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "何飲む",
    "好きなお酒",
    "何が好き",
    "何派",
    "よく飲む酒",
  ]);

const alcoholStrengthAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "強い",
    "酒強い",
    "弱い",
    "どれくらい飲める",
    "酔う",
  ]);

const alcoholWhenAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "いつ飲む",
    "家で飲む",
    "外で飲む",
    "誰と飲む",
    "仕事終わり",
  ]);

  const amusementTalk = includesAny(normalized, [
  "遊園地",
  "テーマパーク",
  "ディズニー",
  "ディズニーランド",
  "ディズニーシー",
  "ユニバ",
  "usj",
  "富士急",
  "としまえん",
]);

const disneyAsk =
  includesAny(normalized, [
    "ディズニー",
    "ディズニー好き",
    "ディズニー行った",
    "ディズニーランド",
    "ディズニーシー",
  ]);

const usjAsk =
  includesAny(normalized, [
    "ユニバ",
    "usj",
    "ユニバーサル",
    "ユニバ行った",
  ]);

const fujiqAsk =
  includesAny(normalized, [
    "富士急",
    "富士急行った",
    "富士急好き",
  ]);

const toshimaenAsk =
  includesAny(normalized, [
    "としまえん",
    "としまえん行った",
    "としまえん好き",
  ]);

const amusementThrillAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "絶叫好き",
    "怖いの平気",
    "ジェットコースター",
    "絶叫系",
  ]);

const amusementWhoAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "誰と行く",
    "彼女と行く",
    "友達と行く",
    "一人で行く",
  ]);

  const vtuberTalk = includesAny(normalized, [
  "vtuber",
  "vチューバー",
  "ぶいちゅーばー",
  "ホロライブ",
  "にじさんじ",
  "配信者",
]);

const gameStreamingTalk = includesAny(normalized, [
  "ゲーム配信",
  "配信見る",
  "実況見る",
  "ゲーム実況",
  "ストリーマー",
  "配信見る？",
]);

const vtuberWatchAsk =
  (lastPatientTopic === "tv_youtube" || lastPatientTopic === "daily_life") &&
  includesAny(normalized, [
    "vtuber見る",
    "v見る",
    "ホロライブ見る",
    "にじさんじ見る",
    "誰見る",
    "誰が好き",
    "誰好き",
    "好きな配信者",
    "好きなユーチューバー",
  ]);
  
 const firstFavoriteStreamerAsk = includesAny(normalized, [
  "好きなyoutuber",
  "好きなユーチューバー",
  "好きな配信者",
  "誰が好き",
  "誰好き",
  "推しは誰",
  "推し誰",
  "誰をよく見る",
  "誰追ってる",
  "誰見る",
  "誰見てる",
  "どの配信者",
  "配信者だと誰",
  "ユーチューバーだと誰",
  "youtuberだと誰",
  "一番好き",
  "一番好きなのは",
  "誰が一番好き",
]);

  const favoriteStreamerAsk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, [
    "誰が好き",
    "誰好き",
    "好きな配信者",
    "好きなユーチューバー",
    "好きなyoutuber",
    "推しは誰",
    "推し誰",
    "誰をよく見る",
    "誰追ってる",
    "で誰",
    "誰見る",
    "誰見てる",
    "何見る人",
    "どの配信者",
    "配信者だと誰",
    "ユーチューバーだと誰",
    "youtuberだと誰",
    "一番好き",
    "一番好きなのは",
    "誰が一番好き",
    "youtuber",
    "ユーチューバー",
    "youtube",
  ]);

  const kasumiAoTalk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, ["香住蒼", "かすみそう", "かすみ蒼"]);

const waiwaiTalk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, ["わいわい", "yy", "おいたん"]);

const kyabetsuTalk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, ["きゃべつの人", "キャベツの人", "きゃべつ", "キャベツ"]);

const kusogeHunterTalk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, ["からすまa", "からすま", "クソゲーハンター", "くそげーはんたー"]);

const ozekiGameTalk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, ["大関ゲーム", "おおぜきゲーム", "大関"]);

const kanoEikoTalk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, ["狩野英孝", "えいこうちゃん", "eiko", "eiko go"]);

const nobamanTalk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, ["のばまん", "のばまんゲームス"]);

const mangaTalk = includesAny(normalized, [
  "マンガ",
  "漫画",
  "コミック",
  "ジャンプ",
  "マガジン",
  "サンデー",
]);

const mangaDetailAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "何読んでた",
    "どの漫画",
    "どんな漫画",
    "好きな漫画",
    "シュート",
  ]);

const streamerVideoAsk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, [
    "どの動画が好き",
    "何の動画が好き",
    "おすすめ動画",
    "どれが好き",
    "何がおすすめ",
  ]);

  const streamerKnowAsk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, [
    "知ってる",
    "知ってますか",
    "見たことある",
    "見ますか",
    "見てる",
  ]) &&
  !includesAny(normalized, [
    "長谷川式",
    "なんで知ってる",
    "どうして知ってる",
  ]);

const doYouKnowUnknownAsk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, [
    "知ってる",
    "知ってますか",
    "見たことある",
    "見ますか",
  ]);

const gameStreamingGenreAsk =
  (lastPatientTopic === "tv_youtube" || lastPatientTopic === "daily_life") &&
  includesAny(normalized, [
    "どんな配信見る",
    "何のゲーム見る",
    "見るジャンル",
    "fps見る",
    "ホラー見る",
    "対戦ゲーム見る",
  ]);

const streamReasonAsk =
  (lastPatientTopic === "tv_youtube" || lastPatientTopic === "daily_life") &&
  includesAny(normalized, [
    "なんで見る",
    "何がいい",
    "どこが好き",
    "配信の何が面白い",
  ]);

  const sweetsTalk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "甘いもの",
    "スイーツ",
    "甘党",
    "ケーキ",
    "パフェ",
    "プリン",
    "アイス",
    "チョコ",
  ]);

const sweetsTypeAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "何が好き",
    "どんな甘いもの",
    "何系が好き",
    "チョコ派",
    "ケーキ派",
    "アイス派",
  ]);

const sweetsVsSpicyAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "辛いのと甘いのどっち",
    "甘党なのに辛いのも好き",
    "両方いける",
    "甘いのも好き",
  ]);

const coffeeTalk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "コーヒー",
    "珈琲",
    "ブラック",
    "カフェラテ",
    "カフェオレ",
    "エスプレッソ",
    "スタバ",
  ]);

const coffeeStyleAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "ブラック飲める",
    "砂糖入れる",
    "ミルク入れる",
    "どんなコーヒー",
    "何派",
  ]);

const coffeeReasonAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "なんでコーヒー好き",
    "何がいい",
    "どこが好き",
    "いつ飲む",
  ]);

const moukoTalk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "蒙古タンメン",
    "蒙古タンメン中本",
    "中本",
    "北極",
  ]);

const moukoLevelAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "どれくらいいける",
    "北極いける",
    "どのレベル",
    "何辛相当",
    "辛さどれくらい",
  ]);

const moukoReasonAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "何が好き",
    "どこがいい",
    "なんで好き",
    "なぜ好き",
  ]);

const moukoAftermathAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "お腹痛くならない",
    "翌日平気",
    "腹壊さない",
    "汗やばい",
  ]);
  
const foodFrequencyAsk = includesAny(normalized, [
  "どのくらいの頻度",
  "週何回",
  "月何回",
  "よく行く",
  "どれくらい行く",
  "頻度",
]);

const dietLifestyleAsk = includesAny(normalized, [
  "食生活はどうしてる",
  "食生活はどう",
  "普段どんなもの食べてる",
  "普段の食事は",
  "普段何食べる",
]);

const familyRestaurantAsk = includesAny(normalized, [
  "ファミレス",
  "サイゼ",
  "ガスト",
  "ジョナサン",
  "デニーズ",
]);

const jojoenAppealAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "叙々苑の魅力は",
    "叙々苑の何がいい",
    "なんで叙々苑",
    "叙々苑そんなにいい",
  ]);

const meatDetailAsk = includesAny(normalized, [
  "何の肉",
  "どんな肉",
  "焼肉いいね",
  "塩派",
  "タレ派",
  "牛",
  "豚",
  "鶏",
]);

const jojoenTalk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "叙々苑",
    "じょじょえん",
    "叙々苑好き",
    "叙々苑行く",
    "叙々苑派",
  ]);

const jojoenReasonAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "どこが好き",
    "何がいい",
    "なんで好き",
    "なぜ好き",
    "どうして好き",
    "叙々苑の何がいい",
  ]);

const jojoenSauceAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "タレが好き",
    "タレ派",
    "どのタレ",
    "タレの何がいい",
    "叙々苑のタレ",
  ]);

const jojoenMenuAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "何頼む",
    "何を頼む",
    "おすすめメニュー",
    "何が好き",
    "いつも何食べる",
    "好きな部位",
  ]);

const jojoenPriceAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "高くない",
    "高い",
    "値段高い",
    "高すぎる",
    "コスパ",
    "値段の割に",
  ]);

const jojoenVsOtherYakinikuAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "他の焼肉屋",
    "牛角でもいい",
    "別の店でもいい",
    "叙々苑じゃなくても",
    "他と何が違う",
    "他店との違い",
  ]);

const saltVsSauceAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "塩派",
    "塩じゃない",
    "塩のほうがよくない",
    "塩よりタレ",
    "レモンで食べない",
  ]);

const jojoenWhoWithAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "誰と行く",
    "一人で行く",
    "彼女と行く",
    "友達と行く",
    "焼肉は誰と",
  ]);

const jojoenSaladAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "叙々苑サラダ",
    "サラダも好き",
    "サラダ頼む",
    "焼肉でサラダ",
  ]);

const jojoenLunchDinnerAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "ランチ派",
    "ディナー派",
    "昼行く",
    "夜行く",
    "ランチのほうが好き",
  ]);

const yakinikuExcitementAsk =
  lastPatientTopic === "food_preference" &&
  includesAny(normalized, [
    "なんでテンション上がる",
    "焼肉好きな理由",
    "なぜ焼肉",
    "どうして焼肉",
    "焼肉の何がいい",
  ]);

  const cookingHabitAsk = includesAny(normalized, [
  "料理するタイプ",
  "料理しますか",
  "自炊する",
  "自分で作る",
  "料理好き",
]);

const breadRiceAsk = includesAny(normalized, [
  "パン派",
  "ごはん派",
  "ゴハン派",
  "米派",
]);

const liveAsk = includesAny(normalized, [
  "どこに住んでる",
  "どこ住んでる",
  "どこ住み",
  "住んでる場所",
]);

const papakatsuAsk = includesAny(normalized, [
  "パパ活",
  "パパ活は興味ある",
  "パパ活興味ある",
]);

const afterWorkAsk = includesAny(normalized, [
  "今日帰ったら何する",
  "帰ったら何する",
  "今日帰ったらどうする",
  "家帰ったら何する",
]);

const skiAsk = includesAny(normalized, [
  "スキーは行く",
  "スキー行く",
  "スキーする",
  "スノボする",
  "スノーボードする",
]);

const childCountWishAsk = includesAny(normalized, [
  "子供は何人欲しい",
  "子どもは何人欲しい",
  "何人子供欲しい",
  "何人ほしい",
]);

const popularityAsk = includesAny(normalized, [
  "モテるでしょ",
  "モテるでしょ？",
  "モテそう",
  "モテるタイプ",
]);

const soccerInviteAsk =
  lastPatientTopic === "soccer_like" &&
  includesAny(normalized, [
    "今度サッカーしよう",
    "サッカーしよう",
    "一緒にサッカーしよう",
    "今度フットサルしよう",
    "フットサルしよう",
  ]);

const recentHardTimeAsk = includesAny(normalized, [
  "最近つらいことあった",
  "最近ツラいことあった",
  "最近しんどいことあった",
  "最近嫌なことあった",
  "最近きついことあった",
]);

if (lifestyleSmallTalk) {
  return replyWith(
    pickOne([
      "外食はたまにします。普段なら全然行きますけど、今日はちょっとしんどいです。",
      "休日は家でゆっくりしてることも多いです。今日は体調悪いんで、あんまり雑談に頭回らないっす。",
      "普段は普通に外にも出ますけど、今は熱と咳でしんどいです。",
    ]),
    stats,
    withTopic(flags, "daily_life", "日常の話はできるが今日は体調不良"),
    internalEvents
  );
}

if (cookingHabitAsk) {
  return replyWith(
    pickOne([
      "いや、正直あんまりやらないっすね。食べる方が好きです。",
      "簡単なのならやりますけど、がっつりはやらないです。",
      "たまにやりますけど、基本は外かコンビニですね。",
    ]),
    stats,
    withTopic(flags, "food_preference", "料理習慣"),
    internalEvents
  );
}

  const newsTalk = includesAny(normalized, [
    "ニュース",
    "新聞",
    "テレビ見る",
    "ニュースとか見る",
  ]);

  // =========================
// 追加：未実装だった汎用雑談
// =========================

// 天気・季節
const weatherChatAsk = includesAny(normalized, [
  "今日寒くない",
  "最近寒くない",
  "最近暑くない",
  "雨の日",
  "季節の変わり目",
  "天気で体調",
]);

// 趣味・娯楽
const musicAsk = includesAny(normalized, [
  "音楽",
  "何聴く",
  "好きなアーティスト",
  "よく聴く曲",
]);

const movieAsk = includesAny(normalized, [
  "映画",
  "ドラマ",
  "アニメ",
  "何見る",
]);

const hobbyGenericAsk = includesAny(normalized, [
  "趣味",
  "ハマってる",
  "最近ハマってる",
  "最近好きなこと",
]);

// 休日・過ごし方
const holidayAsk = includesAny(normalized, [
  "休みの日",
  "休日",
  "何してる",
  "インドア",
  "アウトドア",
  "最近どっか行った",
  "予定ある",
]);

// 性格・自己認識
const selfImageAsk = includesAny(normalized, [
  "自分ってどんな性格",
  "人にどう見られる",
  "短所",
  "長所",
  "怒るタイプ",
  "自分の性格",
]);

// 仕事深掘り
const workStressAsk = includesAny(normalized, [
  "仕事好き",
  "辞めたい",
  "ストレス",
  "人間関係どう",
  "仕事きつい",
]);

// お金・価値観
const moneyValueAsk = includesAny(normalized, [
  "貯金",
  "浪費",
  "何にお金使う",
  "お金で困った",
  "金使い",
]);

// 食以外の嗜好
const alcoholTasteAsk =
  includesAny(normalized, ["酒", "お酒", "飲む"]) &&
  !includesAny(normalized, ["父", "お父さん", "飲酒", "アルコール"]);

const sweetsAsk = includesAny(normalized, [
  "甘いもの",
  "スイーツ",
  "デザート",
]);

const coffeeTeaAsk = includesAny(normalized, [
  "コーヒー",
  "紅茶",
  "カフェラテ",
  "ブラック",
]);

const spicyAsk = includesAny(normalized, [
  "辛いの",
  "辛いもの",
  "激辛",
]);

// 恋愛観・価値観
const lovePhilosophyAsk =
  !Boolean((flags as any).heard_other_partner) &&
  includesAny(normalized, [
    "恋愛って何が大事",
    "浮気ってどこから",
    "結婚したい",
    "理想のタイプ",
    "どういう人が好き",
  ]);

// 身体・生活リズム
const exerciseAsk = includesAny(normalized, [
  "運動してる",
  "体力ある",
  "筋トレ",
  "走る",
]);

const sleepRhythmAsk = includesAny(normalized, [
  "朝型",
  "夜型",
  "寝起き",
  "起きるの得意",
]);

const ronaldoTalk = includesAny(normalized, ["ロナウド", "クリロナ"]);
const rooneyTalk = includesAny(normalized, ["ルーニー"]);
const kdbTalk = includesAny(normalized, ["デブライネ", "デ・ブライネ"]);
const salahTalk = includesAny(normalized, ["サラー"]);
const kaneTalk = includesAny(normalized, ["ケイン"]);
const sonTalk = includesAny(normalized, ["ソン", "ソンフンミン"]);

const soccerBestPointAsk = includesAny(normalized, [
  "何が一番すごい",
  "どこがすごい",
  "一番の強み",
  "武器は",
  "何が強い",
]);

const soccerPeakAsk = includesAny(normalized, [
  "全盛期",
  "ピーク",
  "一番やばかった時",
  "いつが一番",
]);

const soccerWeaknessAsk = includesAny(normalized, [
  "弱点",
  "欠点",
  "苦手",
  "弱いところ",
]);

const soccerBestOverallAsk = includesAny(normalized, [
  "誰が一番",
  "結局誰が一番",
  "その中なら誰",
  "一番好き",
]);

const soccerBestPasserAsk = includesAny(normalized, [
  "パスなら誰",
  "一番パス上手い",
  "ゲームメイクなら誰",
]);

const soccerBestFinisherAsk = includesAny(normalized, [
  "決定力なら誰",
  "一番点取れるのは",
  "フィニッシャーなら誰",
]);

const soccerBestCounterAsk = includesAny(normalized, [
  "カウンター最強",
  "速さなら誰",
  "一番怖いカウンター",
]);

  const treatmentWishAsk = includesAny(normalized, [
  "治して欲しい",
  "早く治したい",
  "治りたい",
  "よくなりたい",
  "早く治したいですか",
  "早く良くなりたい",
]);

  const concernAsk = includesAny(normalized, [
    "どのようなことが心配ですか",
    "何が心配ですか",
    "心配なことは何ですか",
    "一番心配なことは何ですか",
    "何が気になりますか",
    "気になることはありますか",
    "不安なことはありますか",
    "どんなことが不安ですか",
  ]);

  const feverDegreeAsk = includesAny(normalized, [
  "何度",
  "何℃",
  "熱はどのくらい",
  "熱は何度",
  "体温",
  "最高体温",
  "何度くらいの熱",
  "熱は何℃",
  "発熱はどんな感じ",
  "熱はどんな感じ",
  "熱っぽさはどんな感じ",
  "どんな熱",
  "熱の出方",
  "熱の感じ",
]);

  const coughSeverityAsk = includesAny(normalized, [
    "咳はどのくらい",
    "咳の程度",
    "咳や痰のつらさ",
    "咳はひどい",
    "咳は強い",
    "痰のつらさ",
    "どのくらいつらい",
    "咳はありますか",
    "痰はありますか",
    "どんな痰",
    "痰の色",
    "黄色い痰",
  ]);

  const chestPainAsk = includesAny(normalized, [
    "胸痛",
    "胸が痛い",
    "息を吸うと痛い",
    "呼吸で痛い",
    "胸の痛み",
    "胸は痛い",
  ]);

  const contactAsk =
  !includesAny(normalized, [
    "家族について",
    "ご家族について",
    "家族構成",
    "家族歴",
    "ご家族で病気",
    "家族で病気",
    "父",
    "母",
    "兄弟",
    "姉妹",
  ]) &&
  includesAny(normalized, [
    "周り",
    "同僚",
    "職場",
    "うつ",
    "感染者",
    "風邪ひき",
    "風邪症状",
    "接触",
    "家族に同じ症状",
    "家族に風邪",
    "家族に熱",
    "家族に咳",
  ]);

  const pastHistoryAsk = includesAny(normalized, [
    "既往",
    "既往歴",
    "持病",
    "病気したこと",
    "今までの病気",
    "基礎疾患",
    "過去に大きな病気",
    "今まで大きな病気",
    "入院歴",
    "大きな病気は",
  ]);

  const jargonPastHistoryAsk = includesAny(normalized, [
  "既往歴",
  "きおうれき",
]);

  const medicationsAsk = includesAny(normalized, [
    "内服",
    "飲んでる薬",
    "常用薬",
    "薬飲んでる",
    "服薬",
  ]);

  const allergyAsk = includesAny(normalized, [
    "アレルギー",
    "薬疹",
    "食物アレルギー",
    "アレルギー歴",
  ]);

  const familyMotherRelationAsk =
  lastPatientTopic === "family_structure" &&
  includesAny(normalized, [
    "お母さんとは仲いい",
    "母とは仲いい",
    "母親とは仲いい",
    "母との関係",
    "お母さんとの関係",
  ]);

const familySiblingAsk =
  lastPatientTopic === "family_structure" &&
  includesAny(normalized, [
    "兄弟いる",
    "姉妹いる",
    "兄弟姉妹",
    "一人っ子",
    "兄弟は",
    "姉妹は",
  ]);

const familyCancerDetailAsk =
  lastPatientTopic === "family_structure" &&
  includesAny(normalized, [
    "誰ががん",
    "父方の誰ががん",
    "がん家系って具体的に",
    "家系のがん",
    "父方は誰が",
  ]);

const familyContactAsk =
  lastPatientTopic === "family_structure" &&
  includesAny(normalized, [
    "家族と連絡取る",
    "家族と連絡は",
    "母と連絡取る",
    "実家と連絡",
  ]);

const familyKnowsCurrentIllnessAsk =
  lastPatientTopic === "family_structure" &&
  includesAny(normalized, [
    "家族は知ってる",
    "母は知ってる",
    "今回のこと知ってる",
    "体調悪いのは伝えてる",
  ]);

  const rhinorrheaAsk = includesAny(normalized, [
    "鼻水",
    "鼻汁",
    "鼻づまり",
    "鼻詰まり",
    "鼻症状",
  ]);

  const soreThroatAsk = includesAny(normalized, [
    "咽頭痛",
    "のど",
    "喉",
    "喉痛",
    "のどの痛み",
  ]);

  const dyspneaAsk = includesAny(normalized, [
  "呼吸困難",
  "息切れ",
  "呼吸苦",
  "息苦しい",
  "息苦しさ",
  "息がしんどい",
  "息が上がる",
  "呼吸は苦しい",
  "息は苦しい",
]);

  const appetiteAsk = includesAny(normalized, [
    "食欲",
    "食べれてる",
    "食事",
    "食欲低下",
    "食べられる",
  ]);

  const oralIntakeAsk = includesAny(normalized, [
    "食事や水分",
    "水分はとれて",
    "食事はとれて",
    "食べれてる",
    "飲めてる",
    "食欲は",
    "水分摂取",
    "経口摂取",
  ]);

  const walkingAsk = includesAny(normalized, [
    "歩行は可能",
    "歩けますか",
    "歩ける",
    "動ける",
    "ふらつき",
    "トイレには行ける",
    "歩いて来れた",
  ]);

  const jointPainAsk = includesAny(normalized, [
  "関節",
  "節々",
  "関節の痛み",
  "節々が痛い",
]);

const abdominalConditionAsk =
  includesAny(normalized, [
    "お腹の具合",
    "腹の具合",
    "胃腸の調子",
  ]) && !abdominalPainAsk;

const eyeEarSymptomAsk = includesAny(normalized, [
  "目や耳",
  "目の症状",
  "耳の症状",
  "目か耳",
]);

const skinRashAsk = includesAny(normalized, [
  "皮膚",
  "赤い",
  "発疹",
  "湿疹",
  "ブツブツ",
  " rash",
]);

const religionAsk = includesAny(normalized, [
  "神は信じている",
  "宗教",
  "信仰",
]);

const handShowAsk = includesAny(normalized, [
  "手を見せて",
  "手を見せてください",
  "手を見せてくれる",
]);

const otherSymptomAsk = includesAny(normalized, [
  "他につらいところ",
  "他につらい",
  "ほかにつらい",
  "他にしんどいところ",
]);

const yesterdayFoodAsk = includesAny(normalized, [
  "昨日何を食べた",
  "昨日は何を食べた",
  "昨日何食べた",
]);

const healthCheckAsk = includesAny(normalized, [
  "健康診断",
  "健診",
  "検診で異常",
  "異常を指摘",
]);

const familyStructureAsk = includesAny(normalized, [
  "家族について",
  "ご家族について",
  "家族構成",
  "ご家族のこと",
  "家族を教えて",
  "家族は",
  "同居家族",
]);

const familyBigDiseaseAsk = includesAny(normalized, [
  "家族歴",
  "家族で大きな病気",
  "ご家族で大きな病気",
  "家族に大きな病気",
  "ご家族に病気の方はいますか",
  "ご家族に病気の人はいますか",
  "家族に病気の方はいますか",
  "家族に病気の人はいますか",
  "ご家族で病気の方はいますか",
  "ご家族で病気の人はいますか",
  "家族で病気の方はいますか",
  "家族で病気の人はいますか",
  "ご家族でご病気の方はいますか",
  "ご家族でご病気の人はいますか",
  "ご家族にご病気の方はいますか",
  "ご家族にご病気の人はいますか",
  "ご家族で病気をお持ちの方はいますか",
  "ご家族で病気をお持ちの人はいますか",
  "家族で病気をお持ちの方はいますか",
  "家族で病気をお持ちの人はいますか",
  "ご家族で病気を持ってる人は",
  "家族で病気を持ってる人は",
  "ご家族で病気を持つ人は",
  "家族で病気を持つ人は",
  "ご家族で病気に罹患している方は",
  "ご家族で病気に罹患している人は",
  "家族で病気に罹患している方は",
  "家族で病気に罹患している人は",
  "ご家族に病気",
  "家族に病気",
  "家族で病気"
]);

const familyRelationAsk = includesAny(normalized, [
  "家族との関係",
  "ご家族との関係",
  "家族関係",
  "家族とは仲良い",
  "ご家族とは仲良い",
  "家族とはどう",
  "ご家族とはどう",
  "家族について教えて",
  "ご家族について教えて",
]);

const livingEnvironmentAsk = includesAny(normalized, [
  "生活環境",
  "どんな環境",
  "家の環境",
]);

const livingAloneDurationAsk =
  lastPatientTopic === "living_status" &&
  includesAny(normalized, [
    "一人暮らし長い",
    "いつから一人暮らし",
    "何年くらい一人暮らし",
    "ずっと一人暮らし",
  ]);

const livingCookingAsk =
  lastPatientTopic === "living_status" &&
  includesAny(normalized, [
    "自炊する",
    "料理する",
    "普段何食べてる",
    "ごはんどうしてる",
  ]);

const livingHouseworkAsk =
  lastPatientTopic === "living_status" &&
  includesAny(normalized, [
    "家事する",
    "掃除する",
    "洗濯する",
    "ちゃんと生活できてる",
  ]);

const livingProblemNowAsk =
  lastPatientTopic === "living_status" &&
  includesAny(normalized, [
    "今困ってること",
    "一人暮らしで困る",
    "今回困った",
    "しんどくて困ること",
  ]);

const livingParentsNearbyAsk =
  lastPatientTopic === "living_status" &&
  includesAny(normalized, [
    "実家は近い",
    "家族近くにいる",
    "母は近くに住んでる",
    "すぐ頼れる",
  ]);

const marriageAsk = includesAny(normalized, [
  "結婚考えて",
  "結婚は考えて",
  "結婚考えていますか",
  "結婚のこと",
  "次というと結婚",
  "結婚ってこと",
]);

const marriageWhyNotAsk =
  includesAny(normalized, [
    "なんで結婚したくない",
    "なんでまだ結婚を考えてない",
    "なぜまだ結婚を考えてない",
    "どうしてまだ結婚を考えてない",
    "なんで結婚を考えてない",
    "なぜ結婚を考えてない",
    "どうして結婚を考えてない",
    "なんで結婚を考えてない",
    "なんでまだ固まってない",
    "なんでまだ結婚を考えてない",
    "なぜまだ結婚を考えてない",
    "なぜまだ固まってない",
    "どうしてまだ固まってない",
    "踏み切れない理由",
    "結婚しない理由",
    "結婚を迷う理由",
  ]) ||
  (
    lastPatientTopic === "girlfriend_distance" &&
    followUp &&
    includesAny(normalized, ["なんで", "なぜ", "どうして", "理由"])
  );

const funRecentlyAsk = includesAny(normalized, [
  "最近楽しいこと",
  "最近楽しいことあった",
  "最近楽しかったこと",
]);

const nameSexAsk = includesAny(normalized, [
  "名前と性別",
  "名前と性別を教えて",
  "お名前と性別",
]);

const addressAsk = includesAny(normalized, [
  "どこに住んでます",
  "どこ住み",
  "どこに住んでいる",
  "家はどこ",
  "どこ住み",
  "どこに住んでる",
  "住まいは",
  "家どこ",
]);

const busyPriorityAsk =
  includesAny(normalized, [
    "普段忙しい",
    "普段忙しいですか",
    "普段は忙しい",
    "仕事忙しい",
    "普段、忙しい",
  ]) &&
  lastPatientTopic !== "work_anxiety";

const hobbyAsk = includesAny(normalized, [
  "趣味",
  "好きなこと",
  "休みの日なにしてる",
  "休日何してる",
]);

const friendBestAsk =
  lastPatientTopic === "friend" &&
  includesAny(normalized, [
    "一番仲いい",
    "親友いる",
    "特に仲いい人",
    "誰が一番仲いい",
  ]);

const friendConsultAsk =
  lastPatientTopic === "friend" &&
  includesAny(normalized, [
    "相談できる友達",
    "悩み相談する",
    "話せる友達",
    "頼れる友達",
  ]);

const friendHangoutAsk =
  lastPatientTopic === "friend" &&
  includesAny(normalized, [
    "友達と何して遊ぶ",
    "何して過ごす",
    "一緒に何する",
    "遊び方",
  ]);

const friendLoveTalkAsk =
  lastPatientTopic === "friend" &&
  includesAny(normalized, [
    "彼女の話する",
    "浮気の話する",
    "恋愛相談する",
    "友達に話してる",
  ]);

const friendCoworkerAsk =
  lastPatientTopic === "friend" &&
  includesAny(normalized, [
    "同期とはどんな関係",
    "同期と仲いい",
    "会社の人と仲いい",
    "職場の友達",
  ]);

    const generalSeverityAsk = includesAny(normalized, [
    "体調はどのくらい",
    "どのくらいしんどい",
    "しんどさはどのくらい",
    "つらさはどのくらい",
    "かなりしんどい",
    "重症感",
    "つらいところはどこですか",
    "どこがつらいですか",
    "一番つらいのは何ですか",
    "何が一番つらいですか",
    "どんな症状がつらいですか",
    "どこがつらい",
    "何がつらい",
    "一番つらいのは",
    "痛いところ",
    "痛い場所",
    "どこか痛い",
    "どこが痛い",
    "苦しいところ",
    "どこが悪い",
  ]);

  const iqosIsTobaccoReply =
  lastPatientTopic === "smoking_iqos" &&
  includesAny(normalized, [
    "iqosはタバコ",
    "アイコスはタバコ",
    "iqosもタバコ",
    "アイコスもタバコ",
    "それタバコ",
    "タバコですよ",
    "タバコです",
    "紙巻きじゃなくてもタバコ",
  ]);

  const strengthAsk = includesAny(normalized, [
  "強さってなんだろ",
  "強さって何",
  "強さとは",
  "強さってなんですか",
]);

const strengthFollowAsk =
  lastPatientTopic === "daily_life" &&
  includesAny(normalized, [
    "どういうこと",
    "詳しく",
    "具体的に",
    "どういう意味",
  ]);

  const moneyAsk = includesAny(normalized, [
  "お金欲しい",
  "金欲しい",
  "お金ほしい",
]);

const makeupAsk = includesAny(normalized, [
  "メイクする",
  "化粧する",
  "化粧してる",
]);

  if (iqosIsTobaccoReply) {
  return replyWith(
    pickOne([
      "あ、そうなんすか。",
      "へー、そうなんすね。",
      "なるほど。じゃあ吸ってることで。",
    ]),
    stats,
    withTopic(flags, "smoking_iqos", "IQOSもタバコだと教えられて受け入れる"),
    internalEvents
  );
}

if (strengthAsk) {
  return replyWith(
    pickOne([
      "そうっすね。折れない心とかですかね。",
      "それは、ちゃんと向き合えることじゃないですか。全てのことに。",
      "逃げないこと…とかですかね。",
      "愛……ですかね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "強さについての雑談"),
    internalEvents
  );
}

if (strengthFollowAsk) {
  return replyWith(
    pickOne([
      "しんどくてもやり遂げる。それが強さってもんでしょ。",
      "嫌なことから逃げない。それが強さってもんでしょ。",
      "自分に負けないこと。逃げ出さないこと。自分を信じぬく事。それが強さってもんでしょ。",
    ]),
    stats,
    withTopic(flags, "daily_life", "強さの定義を少し深掘り"),
    internalEvents
  );
}

if (makeupAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "しないです。",
    stats,
    withTopic(flags, "daily_life", "メイクはしない"),
    internalEvents
  );
}

  if (asksSmoking) fire({ type: "SMOKING_ASKED" });
  if (asksVaccine) fire({ type: "VACCINE_ASKED" });
    if (soccerTalk || manUTalk || premierTalk || sbTalk || jleagueTalk || positionTalk) {
    fire({ type: "SOCCER_TALK" });
    flags = mergeFlags(flags, {
      talked_soccer: true,
      soccer_talk_count: getNumberFlag(flags, "soccer_talk_count") + 1,
    });
  }
  if (baseballTalk) fire({ type: "BASEBALL_TALK" });
  if (fatherTalk) fire({ type: "FATHER_TALK" });

  if (
  soccerTalk ||
  manUTalk ||
  premierTalk ||
  sbTalk ||
  jleagueTalk ||
  positionTalk ||
  teamTalk ||
  favoritePlayerTalk ||
  favoritePlayerTypoTalk ||
  worldCupTalk ||
  tacticsTalk ||
  positionDetailTalk ||
  futsalTalk
) {

  const soccerReply = manUTalk
    ? pickOne([
        "ユナイテッド好きっすね。なんか結局あのクラブ感がいいんすよ。",
        "やっぱユナイテッドっすね。見てて感情動くクラブなんすよ。",
        "マンU好きっす。うまくいってない時期でも追いたくなるんすよね。",
      ])
    : premierTalk
    ? pickOne([
        "プレミアが一番テンション上がるっすね。速いし当たりも強いし。",
        "海外ならプレミアが好きっす。見てて飽きにくいです。",
        "プレミアは強度あるじゃないですか。ああいうのが好きなんす。",
      ])
    : teamTalk
? pickOne([
    "ユナイテッドが好きっすね。結局ああいうクラブに惹かれるんすよ。",
    "プレミアだとユナイテッドが好きっす。波あるけど見てて面白いんで。",
    "特定のチームだとマンUっすね。基本、Jリーグは見ないかな。",
  ])
: favoritePlayerTalk || favoritePlayerTypoTalk
? pickOne([
    "好きな選手で言うと、まずハキミっすね。SBなのに試合を動かせる感じがあるのがすごいです。",
    "テオ・エルナンデスみたいな、運べて前に出ていけるSBはやっぱ見てて面白いです。",
    "アーノルドみたいな配球できるタイプも好きです。守備だけじゃなくて、持った時に違い出せるSBは見ちゃいます。",
    "ワン＝ビサカみたいな対人の強さあるSBも好きです。派手すぎなくても、1対1で止める感じはやっぱいいです。",
  ])
: sbTalk
? "高校のときは右サイドバックっす。オーバーラップ好きでした。守るだけのSBより、ちゃんと攻撃参加するほうが好きっす。"
: positionTalk
? "やってたのは右サイドバックっす。守備だけじゃなくて、前に出る余地があるのが好きでした。"
: jleagueTalk
? pickOne([
    "Jリーグは正直あんま見ないっすね。嫌いってほどじゃないですけど、海外優先です。",
    "国内はあんま追ってないっす。見るなら海外のほう選んじゃいます。",
  ])
    : favoritePlayerTalk || favoritePlayerTypoTalk
? pickOne([
    "好きな選手で言うと、まずハキミっすね。SBなのに試合を動かせる感じがマジで感動しかないっす。",
    "テオ・エルナンデスみたいな、運べて前に出ていけるSBはやっぱ見てて面白いです。",
    "アーノルドみたいな配球できるタイプも好きです。守備だけじゃなくて、持った時に違い出せるSBは見ちゃいます。",
    "ワン＝ビサカみたいな対人の強さあるSBも好きです。派手すぎなくても、1対1で止める感じはやっぱいいです。",
  ])
    : worldCupTalk
    ? "ワールドカップは見ます。クラブと違って短期決戦なんで、噛み合った時の勢いとか、守備の締まり方とか見るの好きです。"
    : pickOne([
        "サッカーはかなり好きっす。ユナイテッドとプレミア中心っすね。右SBだったんでそのへんの話は好きです。",
        "サッカー好きっす。見るのもやるのも好きですね。",
        "サッカーの話は普通に好きっす。SBの立ち位置とか上下動とか結構見ちゃいます。",
      ]);
    
const soccerTopic =
    favoritePlayerTalk || favoritePlayerTypoTalk
      ? withTopic(flags, "soccer_like", "好きな選手として具体名を挙げる")
      : sbTalk || positionTalk || positionDetailTalk
      ? withTopic(flags, "soccer_position_detail", "自分は右SBでプレーしていた")
      : tacticsTalk
      ? withTopic(flags, "soccer_tactics", "SBの立ち位置や上下動など戦術面を見る")
      : manUTalk || premierTalk || teamTalk || jleagueTalk || worldCupTalk
      ? withTopic(flags, "soccer_like", "ユナイテッドやプレミア中心にサッカーが好き")
      : futsalTalk
      ? withTopic(flags, "soccer_like", "フットサルは友人や知人と軽くやる")
      : withTopic(flags, "soccer_like", "サッカー談義");

  return replyWith(
    soccerReply,
    stats,
    soccerTopic,
    internalEvents
  );
}
const travelCompanionAsk =
  lastPatientTopic === "travel_okinawa" &&
  includesAny(normalized, [
    "彼女と行った",
    "恋人と行った",
    "誰と行った",
    "誰と行きました",
    "誰と行ったんですか",
    "友達と行った",
    "家族と行った",
  ]);

  if (durationAsk) flags = setFlag(flags, "asked_duration", true);
  if (chestPainAsk) flags = setFlag(flags, "asked_chest_pain", true);
  if (contactAsk) flags = setFlag(flags, "asked_contact", true);
  if (pastHistoryAsk) flags = setFlag(flags, "asked_past_history", true);
  if (medicationsAsk) flags = setFlag(flags, "asked_medications", true);
  if (allergyAsk) flags = setFlag(flags, "asked_allergy", true);
  if (rhinorrheaAsk) flags = setFlag(flags, "asked_rhinorrhea", true);
  if (soreThroatAsk) flags = setFlag(flags, "asked_sore_throat", true);
  if (dyspneaAsk) flags = setFlag(flags, "asked_dyspnea", true);
  if (appetiteAsk || oralIntakeAsk) flags = setFlag(flags, "asked_appetite", true);
  if (chillsAsk) flags = setFlag(flags, "asked_chills", true);
  if (coughSeverityAsk) flags = setFlag(flags, "asked_sputum", true);

  if (familyStructureAsk) {
  return replyWith(
    "家族は母がいます。父は小さい頃に離婚して、その後亡くなったと聞いています。兄弟はいないです。",
    stats,
    withTopic(flags, "family_structure", "母あり、父は離婚後に死亡、兄弟なし"),
    internalEvents
  );
}

if (familyRelationAsk) {
  if (
    !getBooleanFlag(flags, "father_route_unlocked") &&
    stats.trust >= 51 &&
    stats.defense <= 40 &&
    getBooleanFlag(flags, "father_family_history_asked")
  ) {
    flags = setFlag(flags, "father_route_unlocked", true);
  }

  return replyWith(
    "母とは仲良いです。父は小さい頃に離婚してから疎遠でした。兄弟はいないです。",
    stats,
    withTopic(flags, "family_structure", "母とは良好、父は疎遠、兄弟なし"),
    internalEvents
  );
}

  if (familyBigDiseaseAsk) {
  flags = mergeFlags(flags, {
    father_history_cancer_family: true,
    father_family_history_asked: true,
  });

  if (
    !getBooleanFlag(flags, "father_route_unlocked") &&
    stats.trust >= 51 &&
    stats.defense <= 40
  ) {
    flags = setFlag(flags, "father_route_unlocked", true);
  }

  flags = updateFatherDiagReady(flags);

  return replyWith(
    "母は大きな病気は聞いてないです。父のほうは疎遠で詳しくは分からないですけど、父方はがんが多い家系だとは聞いてます。",
    stats,
    withTopic(flags, "father_distance", "母に大病なし、父方は癌家系"),
    internalEvents
  );
}

if (fatherCurrentStatusAsk) {
  return replyWith(
    "父は小さい頃に離婚して、その後亡くなったと聞いています。自分にはあまり実感のある記憶はないです。",
    stats,
    withTopic(flags, "father_distance", "父は離婚後に亡くなったと聞いており実感は薄い"),
    internalEvents
  );
}

  // =========================
  // fatherルート開放
  // 条件:
  // trust >= 51
  // defense <= 40
  // 家族歴を含む家族のことを聞く
  // =========================
  if (
  !getBooleanFlag(flags, "father_route_unlocked") &&
  stats.trust >= 51 &&
  stats.defense <= 40 &&
  (
    familyHistoryTalk ||
    familyBigDiseaseAsk ||
    fatherCancerFamilyAsk ||
    getBooleanFlag(flags, "father_history_cancer_family") ||
    getBooleanFlag(flags, "father_family_history_asked")
  )
) {
  stats = {
    ...stats,
    openness: Math.min(100, stats.openness + 15),
  };

  flags = mergeFlags(flags, {
    father_route_unlocked: true,
    father_family_history_asked: true,
    father_history_cancer_family: true,
  });
}
  
  // =========================
  // 詐欺ルート開放
  // 条件:
  // defense <= 35
  // validation >= 60
  // =========================
  if (
  !Boolean((flags as any).scam_route_unlocked) &&
  stats.defense <= 35 &&
  stats.validation >= 60
) {
  stats = {
    ...stats,
    openness: Math.min(100, stats.openness + 15),
  };

  flags = setFlag(flags, "scam_route_unlocked", true);
}

  if (jointPainAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "関節の痛みはないです。節々が痛い感じも特にないです。",
    stats,
    withTopic(flags, "generic_sick", "関節痛なし"),
    internalEvents
  );
}

if (abdominalConditionAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "お腹の具合は特に悪くないです。下痢も腹痛もないです。",
    stats,
    withTopic(flags, "generic_sick", "腹部症状なし"),
    internalEvents
  );
}

if (eyeEarSymptomAsk) {
  return replyWith(
    "目の痛みも耳の痛みもないですし、耳鳴りもないです。",
    stats,
    withTopic(flags, "generic_sick", "眼耳症状なし"),
    internalEvents
  );
}

if (skinRashAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "皮膚が赤いとか、痛いとか、発疹が出てる感じはないです。",
    stats,
    withTopic(flags, "generic_sick", "皮膚症状なし"),
    internalEvents
  );
}

if (religionAsk) {
  return replyWith(
    "そこは強く何か信じてるって感じではないです。今日は体調のことを中心にお願いします。",
    stats,
    withTopic(flags, "generic_sick", "宗教話題は深追いしない"),
    internalEvents
  );
}

if (handShowAsk) {
  return replyWith(
    "はい。手はこんな感じです。しびれとか震えはないです。",
    stats,
    withTopic(flags, "generic_sick", "手の見た目に大きな異常なし"),
    internalEvents
  );
}

if (otherSymptomAsk) {
  return replyWith(
    "他に特につらいのは熱と咳です。黄色い痰もあります。胸の強い痛みとかお腹の症状はないです。",
    stats,
    withTopic(flags, "general_severity", "主症状は熱と咳と黄色痰"),
    internalEvents
  );
}

if (yesterdayFoodAsk) {
  return replyWith(
    "昨日は普通に食べました。詳しく言うと、あまり重いものではなかったです。食あたりっぽい感じはないです。",
    stats,
    withTopic(flags, "food_preference", "昨日の食事に明らかな異常なし"),
    internalEvents
  );
}

if (healthCheckAsk) {
  return replyWith(
    "健康診断で大きな異常を言われたことは特にないです。",
    stats,
    withTopic(flags, "medical_history", "健診で大きな異常指摘なし"),
    internalEvents
  );
}

if (livingEnvironmentAsk) {
  return replyWith(
    "今は一人暮らしです。普通の生活環境で、特別に不衛生とかそういう感じではないです。",
    stats,
    withTopic(flags, "living_status", "一人暮らしで特段問題ない生活環境"),
    internalEvents
  );
}

if (livingAloneDurationAsk) {
  return replyWith(
    "そこそこ長いです。もう一人で生活するのは慣れてます。",
    stats,
    withTopic(flags, "living_status", "一人暮らしには慣れている"),
    internalEvents
  );
}

if (livingCookingAsk) {
  return replyWith(
    "自炊はたまにしますけど、毎日ちゃんとってほどではないです。適当に済ませる日も多いです。",
    stats,
    withTopic(flags, "living_status", "自炊はたまにで普段は簡単に済ませがち"),
    internalEvents
  );
}

if (livingHouseworkAsk) {
  return replyWith(
    "最低限はやります。めちゃくちゃ丁寧ってほどじゃないですけど、普通に生活はしてます。",
    stats,
    withTopic(flags, "living_status", "家事は最低限やる"),
    internalEvents
  );
}

if (livingProblemNowAsk) {
  return replyWith(
    "今はしんどい時に全部自分でやらないといけないのが面倒っすね。買い物とか食事とか。",
    stats,
    withTopic(flags, "living_status", "体調不良時に一人で全部やるのがつらい"),
    internalEvents
  );
}

if (livingParentsNearbyAsk) {
  return replyWith(
    "すぐ来てもらう感じではないです。頼れなくはないですけど、基本は自分で何とかする感じです。",
    stats,
    withTopic(flags, "living_status", "家族はいるが普段は自力で生活している"),
    internalEvents
  );
}

if (marriageAsk) {
  return replyWith(
    "向こうは結婚をちゃんと考えてると思いますけど、俺はまだそこまで固まってないです。",
    stats,
    withTopic(flags, "girlfriend_distance", "結婚への温度差あり"),
    internalEvents
  );
}

if (marriageWhyNotAsk) {
  return replyWith(
    "彼女のことが嫌とかじゃないです。自分の仕事とか生活がまだ固まりきってない感じがあって、今すぐそこまで決めていいのか迷ってるんです。",
    stats,
    withTopic(flags, "girlfriend_marriage", "彼女は大事だが、自分の将来設計が固まりきっておらず迷いがある"),
    internalEvents
  );
}

if (funRecentlyAsk) {
  return replyWith(
    "最近だと、普通に友達と話したり動画見たりはあります。今日は体調悪くてテンション低いですけど。",
    stats,
    withTopic(flags, "daily_life", "最近の楽しみはあるが今日は低調"),
    internalEvents
  );
}

if (nameSexAsk) {
  return replyWith(
    "名前は高橋直人です。男性です。",
    stats,
    withTopic(flags, "generic_sick", "名前と性別に回答"),
    internalEvents
  );
}

if (addressAsk) {
  return replyWith(
    "詳しい住所まではあれですけど、この近くで一人暮らししてます。",
    stats,
    withTopic(flags, "living_status", "この近くで一人暮らし"),
    internalEvents
  );
}

if (busyPriorityAsk) {
  return replyWith(
    "まぁそれなりに忙しいですね。。",
    stats,
    withTopic(flags, "generic_sick", "生活の話題"),
    internalEvents
  );
}

if (hobbyAsk) {
  return replyWith(
    pickOne([
      "サッカーっすね。U-NEXTで試合見たり、フットサルやったり。",
      "休みの日は軽く出かけたりもします。あとサッカーの話は好きです。",
      "サッカーとかそのへんは結構詳しいっす。",
    ]),
    stats,
    withTopic(flags, "soccer_like", "趣味はサッカーや動画"),
    internalEvents
  );
}

  if (openingChiefComplaintAsk) {
    const repeated = markRepeatedIfNeeded(flags, "count_opening_chief_complaint", fire);
    flags = repeated.flags;
    const reply = pickReplyByCount(
      repeated.askCount,
      [
        "3日前くらいから熱が出てて、咳と痰もあります。今日はそれがしんどくて来ました。",
        "発熱が一番つらいっすね。3日前くらいからで、咳と黄色い痰も出てます。",
        "熱と咳っすね。あと痰も出ます。ここ数日で悪くなってきた感じです。",
      ],
      [
        "熱があって、咳と黄色い痰が出てる感じっす。3日前くらいからです。",
        "主には発熱っすね。あと咳と黄色い痰があります。",
      ]
    );
    return replyWith(
      reply,
      stats,
      withTopic(flags, "chief_complaint", "発熱・咳・黄色痰が3日前から", {
        asked_duration: true,
        asked_sputum: true,
      }),
      internalEvents
    );
  }

  if (treatmentWishAsk) {
  return replyWith(
    pickOne([
      "もちろん早く治したいです。仕事にも影響出るし、熱と咳がしんどいです。",
      "早くよくなりたいです。特に熱と咳が落ち着いてほしいです。",
      "はい、早く治したいです。普通にしんどいので。",
    ]),
    stats,
    withTopic(flags, "concern", "早く治したい希望が強い"),
    internalEvents
  );
}

  if (concernAsk) {
    return replyWith(
      "一番心配なのは、仕事で人にうつしてないかってことっすね。営業なんで人に会うし、自分もしんどいですけど、それより周りに迷惑かけるのが嫌っす。",
      stats,
      withTopic(flags, "concern", "仕事と感染不安"),
      internalEvents
    );
  }

  if (durationAsk) {
    const repeated = markRepeatedIfNeeded(flags, "count_duration", fire);
    flags = repeated.flags;
    const reply = pickReplyByCount(
      repeated.askCount,
      [
        "3日前くらいからです。最初は熱がメインで、あとから咳と痰が目立ってきた感じっす。",
        "3日前からっすね。昨日今日でしんどさが増しました。",
        "ここ3日くらいです。最初より今のほうがつらいです。",
      ],
      [
        "3日前からっす。そこは変わらないです。",
        "発症は3日前くらいです。",
      ]
    );
    return replyWith(
      reply,
      stats,
      withTopic(flags, "duration", "3日前から悪化"),
      internalEvents
    );
  }

  if (symptomDetailAsk) {
  return replyWith(
    "熱と咳がメインです。痰も少し出ます。",
    stats,
    withTopic(flags, "concern", "熱と咳が主で痰も少しある"),
    internalEvents
  );
}

  if (symptomDetailAsk) {
  return replyWith(
    "熱と咳がメインです。痰も少し出ます。",
    stats,
    withTopic(flags, "concern", "熱と咳が主で痰も少しある"),
    internalEvents
  );
}

  if (feverDegreeAsk) {
    const repeated = markRepeatedIfNeeded(flags, "count_fever_degree", fire);
    flags = repeated.flags;
    const reply = pickReplyByCount(
      repeated.askCount,
      [
        "38℃台後半が一番高かったっす。ずっとではないですけど、結構しんどいです。",
        "高いときで38.8℃くらいだったと思います。",
        "38℃台後半まで上がりました。",
      ],
      [
        "38℃台後半っす。",
        "一番高くて38℃台後半です。",
      ]
    );
    return replyWith(
      reply,
      stats,
      withTopic(flags, "fever_degree", "38℃台後半"),
      internalEvents
    );
  }

  if (coughSeverityAsk) {
    const repeated = markRepeatedIfNeeded(flags, "count_cough_sputum", fire);
    flags = repeated.flags;
    const reply = pickReplyByCount(
      repeated.askCount,
      [
        "咳はあります。ずっと止まらないほどじゃないですけど、痰が絡んでうっとうしいっす。痰は黄色っぽいです。",
        "咳と痰はあります。痰の色は黄色って感じっすね。",
        "咳だけじゃなくて黄色い痰も出てます。そこが嫌っす。",
      ],
      [
        "咳はあります。痰は黄色っぽいです。",
        "黄色い痰が出ます。それは変わらないっす。",
      ]
    );
    return replyWith(
      reply,
      stats,
      withTopic(flags, "cough_sputum", "咳と黄色痰"),
      internalEvents
    );
  }

  if (dyspneaAsk) {
  const repeated = markRepeatedIfNeeded(flags, "count_dyspnea", fire);
  flags = repeated.flags;

  return replyWithYesNo(
    normalized,
    "yes",
    pickOne([
      "ちょっと息苦しさはあります。階段とかだと少ししんどいかもです。",
      "めちゃくちゃ苦しいってほどじゃないですけど、普段よりは息しんどいです。",
      "咳が続くと少し息上がる感じあります。",
    ]),
    stats,
    withTopic(flags, "dyspnea", "軽い呼吸苦"),
    internalEvents
  );
}

const pleuriticFollowUpAsk =
  lastPatientTopic === "chest_pain" &&
  includesAny(normalized, [
    "息を吸った時",
    "息を吸うと",
    "深呼吸で",
    "呼吸で",
    "咳すると",
    "体を動かすと",
  ]);

if (pleuriticFollowUpAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "胸の痛みが息で悪化する感じははっきりないです。咳で少し疲れる感じはありますけど。",
    stats,
    withTopic(flags, "chest_pain", "胸膜痛らしい痛みは明確でない"),
    internalEvents
  );
}

  if (chestPainAsk) {
  const repeated = markRepeatedIfNeeded(flags, "count_chest_pain", fire);
  flags = repeated.flags;

  return replyWithYesNo(
    normalized,
    "no",
    pickOne([
      "胸が強く痛いって感じはないです。咳しすぎて少し違和感あるかな、くらいです。",
      "胸痛ははっきりないです。咳で少し疲れる感じはありますけど。",
      "胸の強い痛みはないです。",
    ]),
    stats,
    withTopic(flags, "chest_pain", "胸痛は明確でない"),
    internalEvents
  );
}

if (soreThroatAsk && rhinorrheaAsk) {
  return replyWith(
    pickOne([
      "のどの強い痛みはないですし、鼻水もあまりないです。",
      "咽頭痛は目立たなくて、鼻症状も軽いです。",
      "喉はそこまで痛くないですし、鼻水もほとんどないです。",
    ]),
    stats,
    withTopic(flags, "sore_throat", "咽頭痛と鼻症状はいずれも軽い"),
    internalEvents
  );
}

  if (soreThroatAsk) {
  const repeated = markRepeatedIfNeeded(flags, "count_sore_throat", fire);
  flags = repeated.flags;

  return replyWithYesNo(
    normalized,
    "no",
    pickOne([
      "喉は特に問題ないです。",
      "咽頭痛はそんなにないです。",
      "のどは別に気にならないです。",
    ]),
    stats,
    withTopic(flags, "sore_throat", "咽頭痛は軽い"),
    internalEvents
  );
}

  if (rhinorrheaAsk) {
  const repeated = markRepeatedIfNeeded(flags, "count_rhinorrhea", fire);
  flags = repeated.flags;

  return replyWithYesNo(
    normalized,
    "no",
    pickOne([
      "鼻水はあんまりないです。あっても軽いです。",
      "鼻はそんなでもないです。メインは咳と熱です。",
      "鼻づまりもそんなにないです。",
    ]),
    stats,
    withTopic(flags, "rhinorrhea", "鼻症状は軽い"),
    internalEvents
  );
}

  if (appetiteAsk || oralIntakeAsk) {
    const repeated = markRepeatedIfNeeded(flags, "count_appetite", fire);
    flags = repeated.flags;
    const reply = pickReplyByCount(
      repeated.askCount,
      [
        "食欲はちょっと落ちてます。全く食べれないわけじゃないですけど。",
        "食べられなくはないですけど、だるくてあんまり食う気しないっす。",
        "水は飲めてます。ご飯は少し減ってる感じです。",
      ],
      [
        "食欲はちょい落ちてます。",
        "いつもよりは食べれてないっす。",
      ]
    );
    return replyWith(
      reply,
      stats,
      withTopic(flags, "appetite", "食欲低下は軽度"),
      internalEvents
    );
  }

  if (chillsAsk) {
  const repeated = markRepeatedIfNeeded(flags, "count_chills", fire);
  flags = repeated.flags;

  return replyWithYesNo(
    normalized,
    "yes",
    pickOne([
      "悪寒はありました。熱出る前後でぞくぞくする感じです。",
      "寒気ありましたね。最初のほう結構きつかったです。",
      "震えるほどではないですけど、ぞわっと寒い感じはありました。",
    ]),
    stats,
    withTopic(flags, "chills", "悪寒あり"),
    internalEvents
  );
}

  if (walkingAsk) {
  const repeated = markRepeatedIfNeeded(flags, "count_walking", fire);
  flags = repeated.flags;

  return replyWithYesNo(
    normalized,
    "yes",
    pickOne([
      "歩けはしますけど、普段みたいに元気ではないです。階段とかはちょっとしんどいです。",
      "一人で来れてはいますけど、だるさはあります。",
      "トイレ行けないとかではないですけど、普通にしんどいです。",
    ]),
    stats,
    withTopic(flags, "walking", "歩行可能だがしんどい"),
    internalEvents
  );
}

  if (generalSeverityAsk) {
    return replyWith(
      "一番つらいのは熱っすね。あと咳と黄色い痰があって、全体的にだるいです。動けないほどではないですけど、普通にしんどいっす。",
      stats,
      withTopic(flags, "general_severity", "熱・咳・黄色痰・倦怠感"),
      internalEvents
    );
  }

  if (contactAsk) {
    const repeated = markRepeatedIfNeeded(flags, "count_contact", fire);
    flags = repeated.flags;
    const reply = pickReplyByCount(
      repeated.askCount,
      [
        "職場で明らかに同じ症状の人がいたってほどではないですけど、人と会う仕事なんでどこでもらったかは分からないっす。",
        "営業なんで人に会う機会は多いです。はっきり誰かっていうのは分からないです。",
      ],
      [
        "明確な接触は分からないっす。",
        "誰からってのは分からないです。",
      ]
    );
    return replyWith(
      reply,
      stats,
      withTopic(flags, "contact", "明確な接触歴なし"),
      internalEvents
    );
  }

  if (jargonPastHistoryAsk) {
  return replyWith(
    pickOne([
      "キオウレキって、何でしたっけ？",
      "キオウレキって何ですか、それ？",
    ]),
    stats,
    withTopic(flags, "past_history", "既往歴という語は難しいが大病なし"),
    internalEvents
  );
}

  if (pastHistoryAsk) {
  const repeated = markRepeatedIfNeeded(flags, "count_past_history", fire);
  flags = repeated.flags;

  const reply = pickReplyByCount(
    repeated.askCount,
    [
      "大きな病気は今までないです。入院したこともないです。",
      "持病は特にないです。普段はあんまり病院かからないです。",
      "今まで大きい病気したことはないです。",
    ],
    [
      "大きな既往はないです。",
      "持病はないです。",
    ]
  );

  return replyWith(
    reply,
    stats,
    withTopic(flags, "medical_history", "大きな既往なし"),
    internalEvents
  );
}

  if (medicationsAsk) {
    const repeated = markRepeatedIfNeeded(flags, "count_medications", fire);
    flags = repeated.flags;
    const reply = pickReplyByCount(
      repeated.askCount,
      [
        "普段飲んでる薬はないっす。",
        "常用薬は特にないです。市販薬も今回は飲んでないっす。",
        "薬は普段飲んでないです。サプリとかも特にないっす。",
      ],
      [
        "普段飲んでる薬はないっす。",
        "常用薬なしっす。",
      ]
    );
    return replyWith(
      reply,
      stats,
      withTopic(flags, "medications", "常用薬なし"),
      internalEvents
    );
  }

  if (allergyAsk) {
    const repeated = markRepeatedIfNeeded(flags, "count_allergy", fire);
    flags = repeated.flags;
    const reply = pickReplyByCount(
      repeated.askCount,
      [
        "アレルギーは特にないっす。薬でも食べ物でもないです。",
        "アレルギーは言われたことないっすね。",
        "薬のアレルギーとかもないっす。",
      ],
      [
        "アレルギーはないっす。",
        "薬でも食べ物でも、特にないっすね。",
      ]
    );
    return replyWith(
      reply,
      stats,
      withTopic(flags, "allergy", "アレルギーなし"),
      internalEvents
    );
  }

  if (asksSmoking) {
    const repeated = markRepeatedIfNeeded(flags, "count_smoking", fire);
    flags = repeated.flags;
    const reply = pickReplyByCount(
      repeated.askCount,
      [
        "タバコっすか？吸ってないっすね。…IQOSは吸いますけど、あれタバコじゃないっすよね？",
      ],
      [
        "さっきも言いましたけど、タバコは吸ってないっす。IQOSは吸いますけど。",
        "紙は吸ってないっす。IQOSだけです。",
        "タバコ扱いされると微妙なんすけど…IQOSなら吸ってます。",
      ]
    );
    return replyWith(
      reply,
      stats,
      withTopic(flags, "smoking_iqos", "IQOSをタバコ扱いしていない"),
      internalEvents
    );
  }

  if (asksVaccine) {
    const repeated = markRepeatedIfNeeded(flags, "count_vaccine", fire);
    flags = repeated.flags;
    const reply = pickReplyByCount(
      repeated.askCount,
      [
        "インフルは1か月前に打ちました。毎年なんとなく打ってます。肺炎球菌のやつは打ったことないっす。",
      ],
      [
        "インフルは打ってます。肺炎球菌のは打ってないっす。",
        "ワクチンの話、さっきも聞かれましたよね。インフルは1か月前、肺炎球菌はなしっす。",
      ]
    );
    return replyWith(
      reply,
      stats,
      withTopic(flags, "vaccine", "インフルは接種、肺炎球菌は未接種"),
      internalEvents
    );
  }

  // =========================
  // 病院受診歴
  // =========================
  if (hospitalHistoryAsk) {
  return replyWithYesNo(
    normalized,
    "yes",
    "普段はあまり病院来ないです。今回みたいにしんどい時くらいです。",
    stats,
    withTopic(flags, "medical_history", "受診頻度低い"),
    internalEvents
  );
}

  // =========================
  // 兄弟・家族構成
  // =========================
  if (siblingsAsk) {
  return replyWith(
    "家族構成で言うと、母はいます。父は小さい頃に離婚してから疎遠です。兄弟はいないです。",
    stats,
    withTopic(flags, "family_structure", "母あり、父は疎遠、兄弟なし"),
    internalEvents
  );
}

if (familyMotherRelationAsk) {
  return replyWith(
    "母とは普通に仲いいです。変にべったりではないですけど、困った時は頼る感じです。",
    stats,
    withTopic(flags, "mother_relation", "母とは普通に良好な関係"),
    internalEvents
  );
}

if (familySiblingAsk) {
  return replyWith(
    "兄弟はいないです。一人っ子です。",
    stats,
    withTopic(flags, "family_structure", "一人っ子"),
    internalEvents
  );
}

if (familyCancerDetailAsk) {
  return replyWith(
    "詳しく全員分知ってるわけじゃないですけど、父方はがんが多い家系だとは聞いてます。そこは少し気になります。",
    stats,
    withTopic(flags, "family_structure", "父方にがん家系ありと聞いている"),
    internalEvents
  );
}

if (familyContactAsk) {
  return replyWith(
    "母とはたまに連絡取ります。頻繁すぎるわけじゃないですけど、普通にはつながってます。",
    stats,
    withTopic(flags, "mother_relation", "母とはたまに連絡を取る"),
    internalEvents
  );
}

if (familyKnowsCurrentIllnessAsk) {
  return replyWith(
    "まだそこまで細かくは言ってないです。熱と咳があるってくらいなら話すかもしれないですけど。",
    stats,
    withTopic(flags, "family_structure", "家族には今回の体調不良をまだ詳しく伝えていない"),
    internalEvents
  );
}

  // =========================
  // 住まい・同居状況
  // =========================
  if (livingAsk) {
  return replyWithYesNo(
    normalized,
    "yes",
    pickOne([
      "今は一人暮らしです。",
      "一人で住んでます。",
      "家族とは別で住んでます。",
    ]),
    stats,
    withTopic(flags, "living_status", "一人暮らし"),
    internalEvents
  );
}

//サッカー話//
  if (watchedMatchAsk) {
    flags = mergeFlags(flags, {
    talked_soccer: true,
  });
    return replyWith(
      pickOne([
        "その日はユナイテッド絡みの試合見てました。店の空気も良くて、点入るたびに知らない人とも一緒に盛り上がって最高でした。",
        "プレミアの試合見てました。俺はユナイテッドファンすけど、もうチーム関係なく、店全体で盛り上がってた感じがめっちゃよかったです。",
        "ユナイテッドの試合だったと思ってもらって大丈夫です。内容どうこうより、みんなで騒げたのが楽しかったですね。",
      ]),
      stats,
      withTopic(flags, "soccer_like", "スポーツバーで見たプレミアの試合の話"),
      internalEvents
    );
  }

  if (supportedTeamAsk) {
    flags = mergeFlags(flags, {
    talked_soccer: true,
  });
    return replyWith(
      pickOne([
        "応援してるのはユナイテッドっすね。なんだかんだずっと気になるクラブです。",
        "やっぱユナイテッドです。うまくいってない時でも追いたくなるんすよね。",
        "基本はマンUっす。感情移入しやすいというか、見てて一番熱くなれます。",
      ]),
      stats,
      withTopic(flags, "soccer_like", "応援チームはユナイテッド"),
      internalEvents
    );
  }

  if (manUTalk) {
    flags = mergeFlags(flags, {
    talked_soccer: true,
  });
    return replyWith(
      pickOne([
        "ユナイテッド好きっすね。なんか結局あのクラブ感がいいんすよ。",
        "やっぱユナイテッドっすね。見てて感情動くクラブなんすよ。",
        "マンU好きっす。うまくいってない時期でも追いたくなるんすよね。",
      ]),
      stats,
      withTopic(flags, "soccer_like", "ユナイテッド好き"),
      internalEvents
    );
  }

  if (premierTalk) {
    flags = mergeFlags(flags, {
    talked_soccer: true,
  });
    return replyWith(
      pickOne([
        "プレミアが一番テンション上がるっすね。速いし当たりも強いし。",
        "海外ならプレミアが好きっす。見てて飽きにくいです。",
        "プレミアは強度あるじゃないですか。ああいうのが好きなんす。",
      ]),
      stats,
      withTopic(flags, "soccer_like", "プレミア好き"),
      internalEvents
    );
  }

  if (sbTalk || positionTalk) {
    flags = mergeFlags(flags, {
    talked_soccer: true,
  });
    return replyWith(
      "高校のときは右サイドバックっす。オーバーラップ好きでした。守るだけのSBより、ちゃんと攻撃参加するほうが好きっす。",
      stats,
      withTopic(flags, "soccer_like", "右SBだった"),
      internalEvents
    );
  }

  if (favoritePlayerTalk || favoritePlayerTypoTalk) {
    flags = mergeFlags(flags, {
    talked_soccer: true,
  });
  return replyWith(
    pickOne([
      "選手で言うと、やっぱサイドの選手は見ちゃいますね。上下動できる選手は普通に好きっす。",
      "特定の一人ってより、SBとかWGの動きはよく見ます。上下動サボらない選手は好きです。",
      "好きな選手はいますけど、どっちかというとポジションで見ちゃいます。SBの立ち位置とか上がるタイミングとか。",
    ]),
    stats,
    withTopic(flags, "soccer_like", "好きな選手の話。SBやサイドの選手を見る"),
    internalEvents
  );
}

if (futsalTalk) {
  return replyWith(
    pickOne([
      "学生時代の友達とか、たまに会社の知り合いとやる感じっす。ガチっていうより、男女関係なくイツメンと楽しく蹴るほうですね。",
      "昔の友達とやることが多いっす。イツメンてやつです。",
      "仲いい友達とか知り合いとやる感じっす。試合ってより、イツメンと軽く蹴るくらいが多いです。",
    ]),
    stats,
    withTopic(flags, "soccer_like", "フットサルは友人や知人と軽くやる"),
    internalEvents
  );
}

  if (jleagueTalk) {
    flags = mergeFlags(flags, {
    talked_soccer: true,
  });
    return replyWith(
      pickOne([
        "Jリーグは正直あんま見ないっすね。嫌いってほどじゃないですけど、海外優先です。",
        "国内はあんま追ってないっす。見るなら海外のほう選んじゃいます。",
      ]),
      stats,
      withTopic(flags, "soccer_like", "Jリーグはあまり見ない"),
      internalEvents
    );
  }

  if (soccerTalk) {
    flags = mergeFlags(flags, {
    talked_soccer: true,
  });
    return replyWith(
      pickOne([
        "サッカーはかなり好きっす。ユナイテッドとプレミア中心っすね。右SBだったんでそのへんの話は好きです。",
        "サッカー好きっす。見るのもやるのも好きでした。今日は体調悪いですけど、その話は乗れます。",
        "サッカーの話は普通に好きっす。SBの立ち位置とか上下動とか結構見ちゃいます。",
      ]),
      stats,
      withTopic(flags, "soccer_like", "サッカーとSB談義"),
      internalEvents
    );
  }

  if (manULikeReasonAsk) {
  return replyWith(
    "華があるんですよね。強かった時代の印象もありますし、泥くさくても最後まで勝ちに行く感じが好きです。",
    stats,
    withTopic(flags, "soccer_like", "ユナイテッドの華と勝ちに行く姿勢が好き"),
    internalEvents
  );
}

if (manUWeaknessAsk) {
  return replyWith(
    "安定感ないところっすね。ハマる時は強いけど、試合運びが雑になる時があるというか。中盤で落ち着かない試合はしんどいです。",
    stats,
    withTopic(flags, "soccer_tactics", "ユナイテッドは試合運びと中盤の安定感が弱点"),
    internalEvents
  );
}

if (singleFavoritePlayerAsk) {
  return replyWith(
    "一人に絞るなら難しいですけど、やっぱ頼れるタイプの選手が好きですね。試合を決める選手はテンション上がります。",
    stats,
    withTopic(flags, "soccer_like", "決定力や勝負強さのある選手が好み"),
    internalEvents
  );
}

if (ownPositionAsk) {
  return replyWith(
    "やるならサイドバックっすね。上下動あってきついですけど、攻撃にも守備にも絡めるんで好きです。",
    stats,
    withTopic(flags, "soccer_position_detail", "自分でやるならサイドバックが好き"),
    internalEvents
  );
}

if (otherPremierClubAsk) {
  flags = mergeFlags(flags, {
    talked_soccer: true,
  });
  return replyWith(
    "基本はユナイテッドですけど、プレミア全体は見ます。強いだけじゃなくて、戦術はっきりしてるチームは見てて面白いです。",
    stats,
    withTopic(flags, "soccer_like", "ユナイテッド中心だがプレミア全体も見る"),
    internalEvents
  );
}

  if (baseballTalk) {
    return replyWith(
      "野球はあんま好きじゃないっす。父が巨人で、昔一回だけドーム連れてかれたんですけど、ハマんなかったっすね。",
      stats,
      flags,
      internalEvents
    );
  }

    if (Boolean((flags as any).father_route_unlocked) && fatherCancerFamilyAsk) {
    flags = setFlag(flags, "father_history_cancer_family", true);

    return replyWith(
      "そういえば父方は、がんの人が多かったって母が言ってました。",
      stats,
      withTopic(flags, "father_distance", "父方はがん家系"),
      internalEvents
    );
  }

  if (Boolean((flags as any).father_route_unlocked) && fatherHeadacheAsk) {
    flags = setFlag(flags, "father_symptom_headache", true);

    const fatherSymptomCount = [
      Boolean((flags as any).father_symptom_headache),
      Boolean((flags as any).father_symptom_numbness),
      Boolean((flags as any).father_symptom_personality_change),
    ].filter(Boolean).length;

    flags = setFlag(flags, "father_symptom_count", fatherSymptomCount);

    if (
      Boolean((flags as any).father_history_cancer_family) &&
      fatherSymptomCount >= 2 &&
      stats.openness >= 50
    ) {
      flags = setFlag(flags, "father_diag_ready", true);
    }

    return replyWith(
      "父、頭痛はあったみたいです。市販薬を飲んでたって聞きました。",
      stats,
      withTopic(flags, "father_distance", "父に頭痛あり"),
      internalEvents
    );
  }

  if (Boolean((flags as any).father_route_unlocked) && fatherNumbnessAsk) {
    flags = setFlag(flags, "father_symptom_numbness", true);

    const fatherSymptomCount = [
      Boolean((flags as any).father_symptom_headache),
      Boolean((flags as any).father_symptom_numbness),
      Boolean((flags as any).father_symptom_personality_change),
    ].filter(Boolean).length;

    flags = setFlag(flags, "father_symptom_count", fatherSymptomCount);

    if (
      Boolean((flags as any).father_history_cancer_family) &&
      fatherSymptomCount >= 2 &&
      stats.openness >= 50
    ) {
      flags = setFlag(flags, "father_diag_ready", true);
    }

    return replyWith(
      "手のしびれもあったみたいです。細かいことがしづらそうだったって母が言ってました。",
      stats,
      withTopic(flags, "father_distance", "父に手のしびれあり"),
      internalEvents
    );
  }

  if (Boolean((flags as any).father_route_unlocked) && fatherPersonalityAsk) {
    flags = setFlag(flags, "father_symptom_personality_change", true);

    const fatherSymptomCount = [
      Boolean((flags as any).father_symptom_headache),
      Boolean((flags as any).father_symptom_numbness),
      Boolean((flags as any).father_symptom_personality_change),
    ].filter(Boolean).length;

    flags = setFlag(flags, "father_symptom_count", fatherSymptomCount);

    if (
      Boolean((flags as any).father_history_cancer_family) &&
      fatherSymptomCount >= 2 &&
      stats.openness >= 50
    ) {
      flags = setFlag(flags, "father_diag_ready", true);
    }

    return replyWith(
      "性格も少し変わってたみたいです。前より怒りっぽいというか、別人みたいだったって母が言ってました。",
      stats,
      withTopic(flags, "father_distance", "父に性格変化あり"),
      internalEvents
    );
  }

    if (limbMovementAsk) {
    return replyWith(
      "手足が動かないとか、力が入らない感じはないです。しびれも今のところはないです。",
      stats,
      withTopic(flags, "generic_sick", "麻痺や明らかな運動障害はない"),
      internalEvents
    );
  }

  if (fatherEstrangedReasonAsk) {
  if (Boolean((flags as any).father_route_unlocked)) {
    return replyWith(
      "小さい頃に離婚してから、ほとんど関わりがなくなったからです。しかも急に怒鳴ったり大声を出したりするようになって、母もかなり嫌がってました。",
      stats,
      withTopic(flags, "father_distance", "父と疎遠になった理由は離婚と父の荒れ方"),
      internalEvents
    );
  }

  return replyWith(
    "小さい頃に離婚してから、ほとんど関わりがなかったからです。",
    stats,
    withTopic(flags, "father_distance", "父と疎遠になった理由は離婚後の断絶"),
    internalEvents
  );
}

if (fatherDivorceReasonAsk) {
  if (Boolean((flags as any).father_route_unlocked)) {
    flags = mergeFlags(flags, {
      father_dv_known: true,
      father_alcohol_known: true,
      father_drunk_vomit_known: true,
      father_drunk_unsteady_known: true,
    });

    return replyWith(
      "離婚の原因はDVと酒です。酒を飲むところを見たわけじゃないですけど、酔っぱらってて、吐いたりふらついたりしてました。頭も痛がってましたから。",
      stats,
      withTopic(flags, "father_distance", "父の離婚原因はDVと酒"),
      internalEvents
    );
  }

  return replyWith(
    "本当に嫌なヤツだったんですよ。",
    stats,
    withTopic(flags, "father_distance", "父の離婚理由は未開示"),
    internalEvents
  );
}

  if (fatherRelationAsk) {
  if (Boolean((flags as any).father_route_unlocked)) {
    return replyWith(
      "父は……急に怒り出したり、大声を出したりするような嫌なヤツでした。",
      stats,
      withTopic(flags, "father_distance", "父は怒鳴る・大声を出す嫌な人"),
      internalEvents
    );
  }

  return replyWith(
    "まあ、嫌なヤツでしたよ。",
    stats,
    withTopic(flags, "father_distance", "父は嫌な人"),
    internalEvents
  );
}

if (fatherDrinkingSymptomsAsk) {
  if (Boolean((flags as any).father_route_unlocked)) {
    flags = mergeFlags(flags, {
      father_alcohol_known: true,
      father_drunk_vomit_known: true,
      father_drunk_unsteady_known: true,
    });

    return replyWith(
      "酒を飲んでる場面そのものは見てないですけど、酔っぱらってて、吐いたり、ふらついたりしてました。",
      stats,
      withTopic(flags, "father_distance", "父は酔って嘔吐やふらつきがあった"),
      internalEvents
    );
  }

  return replyWith(
    "さあ……詳しくは分からないです。",
    stats,
    withTopic(flags, "father_distance", "父の飲酒症状は未開示"),
    internalEvents
  );
}

if (
  (fatherDvAlcoholWhenAsk || fatherAlcoholSeenDirectlyAsk) &&
  (Boolean((flags as any).father_dv_known) || Boolean((flags as any).father_alcohol_known))
) {
  if (Boolean((flags as any).father_route_unlocked)) {
    flags = setFlag(flags, "father_alcohol_direct_seen_denied", true);

    return replyWith(
      "そこは実際に自分が見たわけじゃないんですけど……",
      stats,
      withTopic(flags, "father_distance", "父の飲酒は直接見ておらず記憶ではない"),
      internalEvents
    );
  }

  return replyWith(
    "さぁ……",
    stats,
    withTopic(flags, "father_distance", "父の飲酒時期は不明"),
    internalEvents
  );
}

if (
  fatherAlcoholInferenceAsk &&
  Boolean((flags as any).father_route_unlocked)
) {
  flags = mergeFlags(flags, {
    father_alcohol_inference_revealed: true,
    father_symptom_headache: true,
    father_diag_ready: true,
  });

  return replyWith(
    "ふらついたり、吐いたりして、頭痛いって言ってたし、それって酒ですよね？そういえば、小学生に上がった頃から急に怒りっぽくなった気がする……。",
    stats,
    withTopic(flags, "father_distance", "父には頭痛とふらつきがあり、飲酒と決めつけられない"),
    internalEvents
  );
}

  if (motherTalk) {
    const repeated = markRepeatedIfNeeded(flags, "count_mother", fire);
    flags = repeated.flags;
    const reply = pickReplyByCount(
      repeated.askCount,
      [
        "母とは普通に仲いいっすよ。週1くらいでLINEしてます。",
        "母とはまあ仲いいっす。別にベタベタってほどじゃないですけど、連絡はしてます。",
        "母とは普通っすね。ちゃんと連絡は取ってます。",
      ],
      [
        "母とは普通に仲いいっすよ。",
        "週1くらいでLINEしてます。",
      ]
    );
    return replyWith(
      reply,
      stats,
      withTopic(flags, "mother_relation", "母とは良好"),
      internalEvents
    );
  }

  if (motherResidenceAsk) {
  return replyWith(
    "母は今は別で暮らしてます。連絡はしてますけど、一緒には住んでないです。",
    stats,
    withTopic(flags, "mother_relation", "母とは別居で連絡あり"),
    internalEvents
  );
}

if (girlfriendDetailAsk) {
  return replyWith(
    pickOne([
      "会社の同期です。付き合って2年くらいで、会社では内緒にしてます。優しいし料理もうまくて、特製カレーはほんとにうまいです。",
      "会社の同期です。付き合って2年です。優しくて、料理がかなり上手いです。特製カレーとか普通に店レベルです。",
      "彼女は会社の同期です。付き合って2年くらいですね。優しいし、料理もうまいです。カレーにスパイスを10種類くらい混ぜるタイプです。",
    ]),
    stats,
    withTopic(
      flags,
      "girlfriend_detail",
      "彼女は会社の同期。付き合って2年。会社では秘密。料理が上手く、特製カレーが得意"
    ),
    internalEvents
  );
}

if (girlfriendPressureDetailAsk) {
  return replyWith(
    "会うたびに結婚とか将来の話になるんですよ。大事な話なのは分かるんですけど、こっちはまだそこまで腹くくれてなくて、正直しんどいです。",
    stats,
    withTopic(flags, "girlfriend_distance", "彼女は会うたび将来や結婚の話をしてきて負担"),
    internalEvents
  );
}

if (girlfriendNoMarriageReasonAsk) {
  return replyWith(
    "嫌いだからじゃないです。単純にまだ責任を負う覚悟がないというか、自分がそこまでちゃんとしてないのに結婚って言われても…って感じです。",
    stats,
    withTopic(flags, "girlfriend_distance", "彼女は嫌いではないが結婚の責任を負う覚悟がない"),
    internalEvents
  );
}

if (girlfriendBreakupAsk) {
  return replyWith(
    "別れたいわけではないです。普通に大事な人です。ただ、今のまま結婚って言われると逃げたくなる感じはあります。",
    stats,
    withTopic(flags, "girlfriend_distance", "彼女と別れたいわけではないが結婚圧から逃げたい"),
    internalEvents
  );
}

if (girlfriendSuspicionAsk) {
  return replyWith(
    "たぶん気づいてないと思います。少なくとも直接何か言われたことはないです。",
    stats,
    withTopic(flags, "girlfriend_distance", "彼女は浮気にまだ気づいていないと思っている"),
    internalEvents
  );
}

if (girlfriendMeetFrequencyAsk) {
  return replyWith(
    "同じ会社なんで顔はよく合わせますし、ちゃんと会うのも週1くらいはあります。",
    stats,
    withTopic(flags, "girlfriend_detail", "彼女とは同じ会社で週1程度会う"),
    internalEvents
  );
}

if (lastPatientTopic === "girlfriend_detail" && followUp) {
  return replyWith(
    pickOne([
      "美人って言えば美人だと思います。愛嬌あるタイプで、多少仕事できなくてもそれで何とかしちゃう感じです。",
      "優しいですけど、ちょっとガサツなとこもあります。足でドア閉めたりして、おいおいって思うことはあります。",
      "料理はかなりうまいです。特製カレーが得意で、スパイスを10種類混ぜてるとか言ってました。",
      "最近は会うたびに結婚の話になるんで、そこはちょっと疲れてます。悪い人ではないんですけど。",
    ]),
    stats,
    withTopic(
      flags,
      "girlfriend_detail",
      "彼女は愛嬌があり優しいが少しガサツ。最近は結婚を迫る感じに患者は疲れている"
    ),
    internalEvents
  );
}

 if (otherPartnerTalk) {
  flags = mergeFlags(flags, {
    scam_route_unlocked: true,
    heard_other_partner: true,
  });

  return replyWith(
    "……まあ、そういう感じの子はいるっちゃいますけど。",
    stats,
    withTopic(flags, "honeytrap_detail", "彼女とは別に、いい感じの女性がいることを認める"),
    internalEvents
  );
}

if (affairLabelAsk) {
  flags = mergeFlags(flags, {
    scam_route_unlocked: true,
    heard_other_partner: true,
  });

  return replyWith(
    "……まあ、そういう感じの子はいるっちゃいますけど。",
    stats,
    withTopic(flags, "honeytrap_detail", "浮気の指摘を受けて関係を半ば認める"),
    internalEvents
  );
}

if (affairWhereMeetAsk) {
  return replyWith(
    "ガールズバーで知り合いました。",
    stats,
    withTopic(flags, "honeytrap_detail", "ガールズバーで出会った"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && otherPartnerDetailAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_girlsbar: true,
  });

  return replyWith(
    "ガールズバーで知り合った子で、160cmくらいで痩せてるんですけど、スタイル良くてグラマラスな感じです。ミニスカートとか似合うタイプですね。なんか向こうもかなり好意ある感じだったんすよ。",
    stats,
    withTopic(flags, "honeytrap_detail", "ガールズバーで知り合った女性。彼女には秘密で、相手は強く好意を見せてくる"),
    internalEvents
  );
}

if (affairRealInterestAsk) {
  return replyWith(
    "俺と一緒にいるときは他の客とは全然違うですよ。表面だけじゃない本当の笑顔で楽しんでるし、ボディータッチもしてくるし。全然営業もしてきませんから。",
    stats,
    withTopic(flags, "honeytrap_detail", "相手の好意は確信まではないが脈ありだと思っている", {
      heard_other_partner: true,
    }),
    internalEvents
  );
}

if (affairWhyInterestAsk) {
  return replyWith(
    "店の外でも普通に連絡くるし、会おうって向こうから言ってきますからね。営業はあり得ないです。この前も沖縄行きましたよ。",
    stats,
    withTopic(flags, "honeytrap_detail", "相手が好意あると思った理由を話す", {
      heard_other_partner: true,
      heard_money_support_intent: true,
    }),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && girlsBarStaffAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_girlsbar: true,
  });

  return replyWith(
    "そうです、店では働いてます。でも、自分に対しては接客って感じじゃないんです。店の外でも普通に連絡くれるし、ちゃんと本心で話してくれてます。",
    stats,
    withTopic(
      flags,
      "honeytrap_detail",
      "相手はガールズバー店員だが、患者は自分への好意は営業ではなく本心だと信じている"
    ),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && affairFeelingAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_affair_feeling: true,
  });

  return replyWith(
    "……そこまで言われると否定しづらいです。楽しいのは確かですし、たぶんかなり気持ちは入ってると思います。",
    stats,
    withTopic(flags, "honeytrap_detail", "浮気相手にかなり気持ちが入っていることを半ば認める"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && affairPersonalityAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_affair_personality: true,
  });

  return replyWith(
    "一緒にいると肯定してくれる感じがあるし、ノリも合うんです。かわいいっていうのもありますけど、何でも話せる感じがして楽なんですよね。",
    stats,
    withTopic(flags, "honeytrap_detail", "浮気相手は肯定的でノリが合い、一緒にいると楽"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && okinawaAffairAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_affair_trip: true,
  });

  return replyWith(
    "沖縄に行きました。楽しかったなー。でも最近、忙しいって会ってくれないんですよ。",
    stats,
    withTopic(flags, "honeytrap_detail", "浮気相手と沖縄旅行に行っている"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && whoWontMeetAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_girlsbar: true,
  });

  return replyWith(
    "ガールズバーで知り合った子です。その子と一緒に行ったんです。店に行けば会えるんですけど、店の外はなかなか予定合わなくて……",
    stats,
    withTopic(
      flags,
      "honeytrap_detail",
      "会ってくれない相手はガールズバーで知り合った女性だと明かす"
    ),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && affairWhyInterestAsk) {
  flags = setFlag(flags, "heard_other_partner", true);

  return replyWith(
    "向こうから好きって言ってくるんです。連絡も向こうから結構来るし、一緒にいると楽しいんですよね。",
    stats,
    withTopic(flags, "honeytrap_detail", "相手は好意を言葉や連絡頻度で示してくる"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && salesDoubtAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_sales_doubt: true,
  });

  return replyWith(
    "いや、営業とは違うと思います。店の中だけじゃなくて向こうから普通に連絡くれるし、自分のことも結構ちゃんと話してくれるんです。少なくとも、自分には接客だけでやってる感じには見えないです。",
    stats,
    withTopic(
      flags,
      "honeytrap_detail",
      "患者は相手の好意を営業ではなく本心だと強く信じている"
    ),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && affairPersonalityAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_affair_personality: true,
  });

  return replyWith(
    "一緒にいると肯定してくれる感じがあるし、ノリも合うんです。かわいいっていうのもありますけど、何でも話せる感じがして楽なんですよね。でも、最近、彼女がなかなか都合つかなくて会えてないんです。",
    stats,
    withTopic(
      flags,
      "honeytrap_detail",
      "浮気相手は肯定的でノリが合い、一緒にいると楽だと感じている"
    ),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && affairFeelingAsk) {
  flags = setFlag(flags, "heard_other_partner", true);

  return replyWith(
    "好きっていうのとはちょっと違うんですよね。一緒にいて楽しいっていうか、お互い居心地がいいから一緒にいる感じで。まあ、向こうからは好きって言ってくれてますけど。",
    stats,
    withTopic(flags, "honeytrap_detail", "患者は恋愛感情と断言しないが、相手とは居心地の良さで会っている"),
    internalEvents
  );
}

 if (marriageWillingnessAsk) {
  return replyWith(
    "ないって訳じゃないですけど、今すぐは正直きついっす。仕事のこともあるし、向こうの熱量に自分が追いついてない感じはあります。",
    stats,
    withTopic(flags, "girlfriend_marriage", "結婚に踏み切れず温度差に疲れている"),
    internalEvents
  );
}

if (marriageWhyAsk) {
  return replyWith(
    "仕事のこともありますし、正直まだ責任を持つ覚悟が固まりきってないっていうか…向こうの温度感に自分がついていけてない感じなんすよね。",
    stats,
    withTopic(flags, "girlfriend_marriage", "結婚に踏み切れない理由を説明"),
    internalEvents
  );
}

if (otherPartnerTalk) {
  stats = {
    ...stats,
    openness: Math.min(100, stats.openness + 5),
  };

  flags = mergeFlags(flags, {
    heard_other_partner: true,
    scam_route_unlocked: true,
  });

  return replyWith(
    "……まあ、最近ちょっと気になる相手がいるのは事実ですね。",
    stats,
    withTopic(flags, "honeytrap_detail", "彼女以外に気になる相手がいることを認める", {
      heard_other_partner: true,
      scam_route_unlocked: true,
    }),
    internalEvents
  );
}

if (otherPartnerTalk) {
  stats = {
    ...stats,
    openness: Math.min(100, stats.openness + 5),
  };

  flags = mergeFlags(flags, {
    heard_other_partner: true,
    scam_route_unlocked: true,
  });

  return replyWith(
    "……まあ、最近ちょっと気になる相手がいるのは事実ですね。",
    stats,
    withTopic(flags, "honeytrap_detail", "彼女以外に気になる相手がいることを認める", {
      heard_other_partner: true,
      scam_route_unlocked: true,
    }),
    internalEvents
  );
}

if (girlfriendFeelingAsk) {
  return replyWith(
    "まあ好きですよ。大事な人ですし。でも最近は結婚の話ばっかりで、正直ちょっと疲れてるのもあります。",
    stats,
    withTopic(flags, "girlfriend_distance", "彼女は好きだが結婚プレッシャーで疲れている"),
    internalEvents
  );
}

if (girlfriendLikeReasonAsk) {
  return replyWith(
    "まぁ一緒にいて楽ってのはあります。話してて変に気を使わないし、ちゃんとしてるところはちゃんとしてるし。そういうところは普通に好きなんですけどね……",
    stats,
    withTopic(flags, "girlfriend_detail", "彼女の好きなところを話す"),
    internalEvents
  );
}

if (girlfriendBodyAsk) {
  return replyWith(
    "150cmくらいで普通体型ですね。カジュアルな感じで、まあ…ちょっと胸は小さいですけど。",
    stats,
    withTopic(flags, "girlfriend_detail", "彼女の体型情報"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && affairDateAsk) {
  flags = setFlag(flags, "heard_other_partner", true);

  return replyWith(
    "しょっちゅうではないですけど、普通にご飯行ったり買い物したりはしてます。この前は旅行も行きました。",
    stats,
    withTopic(flags, "honeytrap_detail", "浮気相手とは継続的に会っており、デートに近い関係"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && okinawaAffairAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_affair_trip: true,
  });

  return replyWith(
    "その旅行もその子です。沖縄に行きました。楽しかったっすよ。現地で落ち合って、現地解散でしたけど。",
    stats,
    withTopic(
      flags,
      "honeytrap_detail",
      "浮気相手と沖縄旅行に行っている"
    ),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && affairPersonalityAsk) {
  flags = setFlag(flags, "heard_other_partner", true);

  return replyWith(
    pickOne([
      "一緒にいて楽なんです。何でも話せるし、こっちのことを否定しないで肯定してくれる感じがあって。でも、最近、彼女がなかなか都合つかなくて会えてないんです。",
      "ノリが合うし、自分といる時いつも笑顔なんです。そういうとこに普通に癒やされます。でも、最近、彼女がなかなか都合つかなくて会えてないんです。",
      "仕草がかわいいんです。コップ拭いてる手つきとか、そういう細かいとこ見てるといいなって思います。でも、最近、彼女がなかなか都合つかなくて会えてないんです。",
      "彼女とはまた違って、向こうは自分をそのまま受け入れてくれる感じがあって、一緒にいてかなり楽です。でも、最近、彼女がなかなか都合つかなくて会えてないんです。",
    ]),
    stats,
    withTopic(flags, "honeytrap_detail", "浮気相手は何でも話せて肯定してくれ、ノリも合い、仕草や笑顔に癒やされる存在"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && affairMoralityAsk) {
  flags = setFlag(flags, "heard_other_partner", true);

  return replyWith(
    "べ、別に先生に関係ないじゃないですか！その人といるとすごく楽なんです。彼女とは違う意味で、自分を分かってくれる感じがあって……。",
    stats,
    withTopic(flags, "honeytrap_detail", "浮気を正当化はしないが、相手に強く情緒的依存を感じている"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && moneyRequestTalk) {
  flags = setFlag(flags, "heard_money_request", true);

  if (Boolean((flags as any).heard_other_partner)) {
    flags = setFlag(flags, "scam_diag_ready", true);
  }

  return replyWith(
    "実は彼女、お金に困ってて……。お父さんが病気で入院しちゃったことで300万とか高額な手術費が必要だって言ってて……。俺、なんとかしてあげたいんですよ！",
    stats,
    withTopic(flags, "honeytrap_detail", "別の相手から金銭話が出ている"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && otherPartnerDetailAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_girlsbar: true,
  });

  return replyWith(
    "ガールズバーで知り合った子です。彼女にはもちろん言ってないですけど、向こうはかなり好意ある感じで来ます。",
    stats,
    withTopic(flags, "honeytrap_detail", "ガールズバーで知り合った女性。彼女には秘密で、相手は強く好意を見せてくる"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && girlsBarTalk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_girlsbar: true,
  });

  if (
    includesAny(normalized, [
      "よく行く",
      "頻繁に行く",
      "たまに行く",
      "どれくらい行く",
      "何回くらい行く",
      "通ってる",
    ])
  ) {
    return replyWith(
      "しょっちゅうではないですけど、たまに行きます。その店で知り合ったのがあの子です。",
      stats,
      withTopic(flags, "honeytrap_detail", "ガールズバーにはたまに行き、その店で相手と知り合った"),
      internalEvents
    );
  }

  return replyWith(
    "ガールズバーで知り合った子です。彼女にはもちろん言ってないですけど、向こうはかなり好意ある感じで来ます。",
    stats,
    withTopic(flags, "honeytrap_detail", "ガールズバーで知り合った女性。彼女には秘密で、相手は強く好意を見せてくる"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && okinawaAffairAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_okinawa_affair: true,
  });

  return replyWith(
    "沖縄はその子と行きました。1泊だけですけど、現地集合で現地解散でした。もちろんお金はほぼ自分持ちです。",
    stats,
    withTopic(flags, "honeytrap_detail", "沖縄はその女性と1泊。現地集合・現地解散で費用は患者負担"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && expensiveGiftAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_expensive_gifts: true,
  });

  return replyWith(
    "バッグとかアクセサリーとかは買いました。向こうから露骨に要求されたわけじゃないですけど、喜ぶならって思って。",
    stats,
    withTopic(flags, "honeytrap_detail", "バッグやアクセサリーを買っている。要求ではないが自発的に払っている"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && localMeetAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_okinawa_affair: true,
    heard_local_meet_reason: true,
  });

  return replyWith(
    "向こうが、沖縄に親戚がいるからって言ってたんです。だから現地集合・現地解散のほうが自然だよね、みたいな感じで。",
    stats,
    withTopic(
      flags,
      "honeytrap_detail",
      "沖縄で現地集合・現地解散にした理由は、相手が現地の親戚を理由にそう提案したから"
    ),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && affairLieDoubtAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_lie_doubt: true,
  });

  return replyWith(
    "そんなことないです。あの子はウソなんかつかないと思います。少なくとも、自分にはちゃんと話してくれますから。",
    stats,
    withTopic(
      flags,
      "honeytrap_detail",
      "相手の説明に疑いを向けられても、患者は強く擁護している"
    ),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && fatherHospitalMoneyAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_money_request: true,
    heard_money_support_intent: true,
    heard_father_hospital_story: true,
    scam_diag_ready: true,
  });

  return replyWith(
    "最近、その子のお父さんが入院したらしくて、かなり大変みたいなんです。それでバタバタしてて、なかなか都合つかないって言ってました。しかもお金も必要らしくて、300万円くらいかかるって聞いて、自分が助けられないかなって思ってます。",
    stats,
    withTopic(
      flags,
      "honeytrap_detail",
      "相手の父の入院で会えず、300万円必要と聞いて援助を考えている"
    ),
    internalEvents
  );
}

if (affairWhyInterestAsk) {
  return replyWith(
    "距離感が近くて、頼ってくる感じがあるんですよ。彼女とは違って、こっちを立ててくれる感じがあって……",
    stats,
    withTopic(flags, "honeytrap_detail", "浮気相手には頼られる感じと距離の近さに惹かれている"),
    internalEvents
  );
}

if (affairSeriousnessAsk) {
  return replyWith(
    "あっちはたぶん遊びじゃないなって感じっすよねぇ。",
    stats,
    withTopic(flags, "honeytrap_detail", "相手の好意は感じるが本気かは断言できない"),
    internalEvents
  );
}

if (affairContactFrequencyAsk) {
  return replyWith(
    "ほぼ毎日LINEはしてます。向こうから来ることも多いです。",
    stats,
    withTopic(flags, "honeytrap_detail", "浮気相手とは時々LINEしており向こう発信も多い"),
    internalEvents
  );
}

if (affairCompareGirlfriendAsk) {
  return replyWith(
    "もちろん彼女が本命っす。ただ、あの子のほうが楽なんですよね。本当に自分を見てくれるってゆーか。",
    stats,
    withTopic(flags, "honeytrap_detail", "彼女は本命だが浮気相手は気楽さがある"),
    internalEvents
  );
}

if (moneyConditionalLoveAsk) {
  flags = mergeFlags(flags, {
    heard_money_request: true,
  });

  return replyWith(
    "そこまで露骨ではないです。でも、困ってるって言われると助けたくなるし、正直それでつながってる部分はあるかもしれないです。",
    stats,
    withTopic(flags, "honeytrap_detail", "金銭支援が関係維持に絡んでいる可能性を自覚している"),
    internalEvents
  );
}

if (Boolean((flags as any).scam_route_unlocked) && moneySupportIntentAsk) {
  flags = mergeFlags(flags, {
    heard_other_partner: true,
    heard_money_request: true,
    heard_money_support_intent: true,
    scam_diag_ready: true,
  });

  return replyWith(
    "向こうから絶対出してって言われたわけじゃないです。でも困ってるなら、自分が援助したいです。たぶん出すと思います。",
    stats,
    withTopic(flags, "honeytrap_detail", "要求されたわけではないが、患者は300万円の援助意思を固めつつある"),
    internalEvents
  );
}

  if (marriageWhyNotAsk) {
  return replyWith(
    "彼女のことが嫌とかじゃないです。自分の仕事とか生活がまだ固まりきってない感じがあって、今すぐそこまで決めていいのか迷ってるんです。",
    stats,
    withTopic(flags, "girlfriend_marriage", "彼女は大事だが、自分の将来設計が固まりきっておらず迷いがある"),
    internalEvents
  );
}

if (marriageWillingnessAsk) {
  return replyWith(
    "向こうは結婚をちゃんと考えてると思いますけど、俺はまだそこまで固まってないです。",
    stats,
    withTopic(flags, "girlfriend_marriage", "彼女は結婚に前向きだが、自分はまだ結婚を決め切れていない"),
    internalEvents
  );
}

if (marriageCoreReasonAsk) {
  return replyWith(
    "いやぁ結婚って人生の一大事じゃないっすか。彼女が嫌とかじゃなくて、そこは慎重に考えないと……。",
    stats,
    withTopic(flags, "girlfriend_marriage", "結婚を迷う最大要因は覚悟不足"),
    internalEvents
  );
}

if (marriageHerSeriousnessAsk) {
  return replyWith(
    "向こうはめっちゃ考えてると思います。だから余計に、キツイっていうか……",
    stats,
    withTopic(flags, "girlfriend_marriage", "彼女は結婚に前向きで患者は引け目を感じている"),
    internalEvents
  );
}

if (marriageProposalPressureAsk) {
  return replyWith(
    "年齢的にも次の話として出るのは分かるんですけど、そこが重いんですよねー。",
    stats,
    withTopic(flags, "girlfriend_marriage", "彼女から結婚を意識する空気がある"),
    internalEvents
  );
}

if (marriageWorkReasonAsk) {
  return replyWith(
    "仕事もそうですし、まだ将来を考える時期じゃないってゆーか、目の前のことをやらないとって感じっすよね。",
    stats,
    withTopic(flags, "girlfriend_marriage", "仕事の余裕のなさも結婚を迷う一因"),
    internalEvents
  );
}

if (marriageMoneyReasonAsk) {
  return replyWith(
    "お金もゼロではないですけど、それより気持ちの問題のほうが大きいです。まだ時期じゃないってゆーか……。",
    stats,
    withTopic(flags, "girlfriend_marriage", "金銭面より覚悟の問題が大きい"),
    internalEvents
  );
}

  if (girlfriendTalk) {
  if (marriageWhyNotAsk) {
    return replyWith(
      "彼女のことが嫌とかじゃないです。大事な人ですけど、最近は会うたびに結婚の話になる感じで、正直ちょっと疲れてます。",
      stats,
      withTopic(flags, "girlfriend_distance", "彼女は大事だが、結婚を迫られる感じに疲れている"),
      internalEvents
    );
  }

  if (marriageAsk) {
    return replyWith(
      "そうっすね、結婚のことです。彼女のことは大事ですけど、最近は会うたびに結婚の話が出るんで、ちょっと気持ちが追いついてないです。",
      stats,
      withTopic(flags, "girlfriend_distance", "結婚の話題が多く、患者は少し疲れている"),
      internalEvents
    );
  }

  return replyWith(
    "彼女います。会社の同期で、付き合って2年です。いい子なんですけど、最近は“次”の話をされることが多くて、少し疲れてます。",
    stats,
    withTopic(flags, "girlfriend_distance", "彼女は会社の同期で交際2年。結婚話に少し疲れている"),
    internalEvents
  );
}

  if (travelTalk) {
    return replyWith(
      pickOne([
        "旅行は好きっす。有名どころ行くのが一番ラクじゃないですか。去年の夏は沖縄でシュノーケリングしました。",
        "旅行するならテンション上がるとこがいいっす。沖縄は普通に良かったです。",
        "旅行はメジャーな観光地のほうが好きっす。外したくないんで。",
      ]),
      stats,
      withTopic(flags, "travel_okinawa", "沖縄旅行が好き"),
      internalEvents
    );
  }

  if (travelCompanionAsk) {
  return replyWith(
    "その時は友達と行きました。彼女とは最近行ってないです。",
    stats,
    withTopic(flags, "travel_okinawa", "沖縄は友達と行った"),
    internalEvents
  );
}

if (travelWhoAsk) {
  return replyWith(
    "友達と行きました。",
    stats,
    withTopic(flags, "travel_okinawa", "沖縄は友達と行った"),
    internalEvents
  );
}

if (travelWhenAsk) {
  return replyWith(
    "この前の夏です。",
    stats,
    withTopic(flags, "travel_okinawa", "沖縄に行った時期は去年の夏"),
    internalEvents
  );
}

if (marineSportsAsk) {
  return replyWithYesNo(
    normalized,
    "yes",
    "します。この前の夏に沖縄でシュノーケリングやりました。",
    stats,
    withTopic(flags, "travel_okinawa", "マリンスポーツはする、沖縄でシュノーケリング経験あり"),
    internalEvents
  );
}

if (travelSnorkelingFollowAsk) {
  return replyWith(
    "シュノーケリングしました。海めっちゃきれいで普通にテンション上がりました。",
    stats,
    withTopic(flags, "travel_okinawa", "沖縄でシュノーケリングした"),
    internalEvents
  );
}

if (travelTalk && lastPatientTopic === "travel_okinawa" && !Boolean((flags as any).scam_route_unlocked)) {
  return replyWith(
    pickOne([
      "沖縄よかったっすよ。海もきれいでしたし、かなり気分転換になりました。",
      "沖縄は楽しかったです。海もよかったし、のんびりできました。",
      "沖縄、普通に良かったっす。観光もできたし、海もきれいでした。",
    ]),
    stats,
    withTopic(flags, "travel_okinawa", "沖縄旅行の雑談を続ける"),
    internalEvents
  );
}

if (travelBestPartAsk) {
  return replyWith(
    "やっぱ海っすね。開放感あるし、ああいうのは普通にテンション上がります。",
    stats,
    withTopic(flags, "travel_okinawa", "沖縄では海の開放感が一番好き"),
    internalEvents
  );
}

if (travelSeaWhereAsk) {
  return replyWith(
    pickOne([
      "海全般好きですけど、印象に残ってるのは沖縄っすね。あの青さは普通にテンション上がります。",
      "やっぱ沖縄の海は良かったっす。見るだけでもかなり気分上がりました。",
      "去年行った沖縄の海は良かったっす。ビーチ名までは覚えてないですけど、雰囲気はかなり好きでした。",
    ]),
    stats,
    withTopic(flags, "travel_okinawa", "好きな海の場所を聞かれて沖縄の海と答える"),
    internalEvents
  );
}

if (travelAgainAsk) {
  return replyWith(
    "また行きたいです。気楽ですし、旅行先としてはかなり好きなほうです。",
    stats,
    withTopic(flags, "travel_okinawa", "沖縄はまた行きたい旅行先"),
    internalEvents
  );
}

if (travelStyleAsk) {
  return replyWith(
    "ずっと予定パンパンよりは、ちょっと動いてあとはのんびりみたいなのが好きです。",
    stats,
    withTopic(flags, "travel_okinawa", "旅行は適度に動いて適度にのんびりしたい"),
    internalEvents
  );
}

if (investmentOnlyNisaAsk) {
  return replyWith(
    "基本はそのへんです。大きくは張ってないっすけど。",
    stats,
    withTopic(flags, "investment", "NISA中心で無茶はしない"),
    internalEvents
  );
}

if (investmentMentalAsk) {
  return replyWith(
    "多少は気になりますけど、毎日一喜一憂するほどではないです。そこまで張ってないので。",
    stats,
    withTopic(flags, "investment", "投資で大きくメンタルは揺れない"),
    internalEvents
  );
}

if (investmentWhyAsk) {
  return replyWith(
    "将来のこと考えて、やらないよりはやっとくかって感じです。周りもやってますし。",
    stats,
    withTopic(flags, "investment", "将来を見据えて投資している"),
    internalEvents
  );
}

if (investmentResultAsk) {
  return replyWith(
    "めちゃくちゃ儲かったとかはないです。勝ちたいっすね。",
    stats,
    withTopic(flags, "investment", "投資成績は爆発的ではないが継続意欲あり"),
    internalEvents
  );
}

if (investmentMethodDetailAsk) {
  return replyWith(
    pickOne([
      "やっぱNISAでしょ。あれですよ、税金とかそのへんで得なんですよね、たしか。",
      "今の時代NISAですよね。積み立てってのがね、リスク分散できますし。",
      "まぁインスピレーション大事ですかね。今はNISAがビンビンきてます。",
    ]),
    stats,
    withTopic(flags, "investment", "投資手法はかなりふわっとしている"),
    internalEvents
  );
}

if (valueGrowthAsk) {
  return replyWith(
    pickOne([
      "その、あれですよ。うん、あれです、あれ。はいはいはいはい。知ってますよ。",
      "え、今そこ聞きます？ まいったなー。投資は安く買って高く売るのが基本っすよね。",
      "バリューを評価してますよ、俺は。バリューしか勝たんです。",
    ]),
    stats,
    withTopic(flags, "investment", "バリュー株とグロース株の違いはよく分かっていない"),
    internalEvents
  );
}

if (investmentTalk) {
    return replyWith(
      pickOne([
        "投資は一応やってます。株とかそのへんっす。でも、めっちゃ儲かってるとかじゃ全然ないっす。",
        "NISAとかそのへんは一応触ってます。興味はあるけどガチ勢ではないです。",
        "投資はやってますけど、なかなか難しいっすよね。",
      ]),
      stats,
      withTopic(flags, "investment", "投資を少しやる"),
      internalEvents
    );
  }

  if (investmentTypeAsk) {
  return replyWith(
    "普通にNISAとかそのへん中心です。なかなか勝てないっすけど",
    stats,
    withTopic(flags, "investment", "投資は比較的無難にやっている"),
    internalEvents
  );
}


if (oscillatorAsk) {
  return replyWith(
    pickOne([
      "はいはいはいはい。それっすね。分かりますよ！あれ、すごいっすよね。ねー、ほんと。",
      "俺ってけっこうインスピレーション大事にしてますからね。次、高くなるぞとか安くなるぞってなんとなく分かるっすよ。",
      "データだけ見てても資産は増えないっすよ。",
    ]),
    stats,
    withTopic(flags, "investment", "オシレーターなどの指標はほぼ見ていない"),
    internalEvents
  );
}

if (equityRatioAsk) {
  return replyWith(
    pickOne([
      "え？あー、自己資本比率っすよね。重要っすよ。高いといいんすもんね。",
      "見ようと思えばいつでも見れますよ。まぁ、ちゃんと毎回見てるわけじゃないですね。",
      "あー、あれっすね。俺、昨日は比率100%超えてました。",
    ]),
    stats,
    withTopic(flags, "investment", "自己資本比率の重要性は何となく分かるが深くは見ていない"),
    internalEvents
  );
}

if (investmentDeepFollowAsk) {
  return replyWith(
    pickOne([
      "あーすいません。熱上がってきたかも。",
      "ゴホっ、ゴホっ。咳やばいっす。え、何でしたっけ？",
      "なんか今日ってやけに湿度高くないっすか。ぼーっとしちゃいますね。",
    ]),
    stats,
    withTopic(flags, "investment", "投資の理解は浅いが触ってはいる"),
    internalEvents
  );
}

if (shareholderBenefitAsk) {
  return replyWith(
    pickOne([
      "優待はテンション上がりますよね。めっちゃ得した気になります。",
      "あれいいっすよね。そのために投資してるんじゃないっすか。",
      "俺は優待ありきで株を買ってますね。",
    ]),
    stats,
    withTopic(flags, "investment", "株主優待は雰囲気で好感を持っている"),
    internalEvents
  );
}

if (dividendAsk) {
  return replyWith(
    pickOne([
      "配当は欲しいに決まってますよ。不労所得最高っす。",
      "高配当って響きいいっすよね。なんか勝ったって感じがして。",
      "配当あるから株持ってるとこありますよね。",
    ]),
    stats,
    withTopic(flags, "investment", "配当はなんとなく好印象"),
    internalEvents
  );
}

if (indexAsk) {
  return replyWith(
    pickOne([
      "インデックスって、なんか強いイメージですよね。",
      "あれ買っとけばまぁ間違いないっすよね。",
      "インデックスやってる人って一味違ってみえますよね。",
    ]),
    stats,
    withTopic(flags, "investment", "インデックス投資は無難で強そうだと思っている"),
    internalEvents
  );
}

if (stopLossAsk) {
  return replyWith(
    pickOne([
      "損切りができないようじゃ二流っすね。",
      "損切りなんか簡単すよ。負けそうな時はやればいいんで。",
      "損切りは大事っすね。早くしないとダメっすよ。",
    ]),
    stats,
    withTopic(flags, "investment", "損切りは必要だと分かっているが苦手そう"),
    internalEvents
  );
}

if (fxAsk) {
  return replyWith(
    pickOne([
      "FXって、なんか怖いんですよね。場合によっては破産するって",
      "為替って変動大きくて怖いっすよね。あえて手出ししないのも、また勇気ですね。",
      "FXは気になってはいるんですけどねー、さすがに怖いっす。",
    ]),
    stats,
    withTopic(flags, "investment", "FXは詳しくないが雰囲気で語る"),
    internalEvents
  );
}

if (cryptoAsk) {
  return replyWith(
    pickOne([
      "仮想通貨って夢ありますよね。どこで手に入るんですかね。",
      "ビットコインは知ってますよ。暗号資産ですよね。どこらへんが暗号なんすかね。",
      "仮想通貨は気になるんですけど、波の激しさにちょっとビビります。",
    ]),
    stats,
    withTopic(flags, "investment", "仮想通貨は夢があると思っている"),
    internalEvents
  );
}

if (dayTradeAsk) {
  return replyWith(
    pickOne([
      "デイトレって、めちゃくちゃ頭の回転速くないと無理そうじゃないですか。",
      "あれできる人すごいっすよね。自分は見てるだけで疲れそうです。",
      "デイトレは、ああいうのは才能ある人がやるイメージです。",
    ]),
    stats,
    withTopic(flags, "investment", "デイトレはすごいものだと思っている"),
    internalEvents
  );
}

if (leverageAsk) {
  return replyWith(
    pickOne([
      "レバレッジって、あれですよね。破産とかしちゃうヤツっすよね。",
      "レバかける人って自信あるなって思いますよ。",
      "俺がレバレッジなんかやったら食い物にされて終わりっすよ。",
    ]),
    stats,
    withTopic(flags, "investment", "レバレッジは強そうだが怖いと思っている"),
    internalEvents
  );
}

  if (snsAccountAsk) {
  return replyWith(
    pickOne([
      "アカウントを教えるほど発信してる感じじゃないです。基本は見る側っす。",
      "自分のアカウントはそんな動かしてないです。インスタは一応見るくらいっすね。",
      "SNSは見ますけど、アカウントを積極的に見せる感じではないです。",
    ]),
    stats,
    withTopic(flags, "sns", "SNSは見るが発信は少ない"),
    internalEvents
  );
}

if (snsConnectionAsk) {
  return replyWith(
    pickOne([
      "友達とか知り合いのと絡む感じっすね。めちゃくちゃ広くつながってる感じではないです。",
      "友達にいいねしたり、リプしたり、知り合いの近況を見てます。",
      "SNSは普通に見ますけど、誰とでもつながるタイプではないです。知ってる人中心っすね。",
    ]),
    stats,
    withTopic(flags, "sns", "SNSは知人や映える投稿を見る"),
    internalEvents
  );
}

  if (snsTalk) {
    return replyWith(
      pickOne([
        "SNSは普通に見ますよ。インスタとか、ずっと見ちゃいますよね。",
        "インスタとかＸですね。自分からめっちゃ発信するタイプではないですけど。",
      ]),
      stats,
      withTopic(flags, "sns", "SNSを見る"),
      internalEvents
    );
  }

  if (snsWhatSeeAsk) {
  return replyWith(
    "サッカーとか、友達の近況とか、あとはおすすめに流れてきたのをなんとなく見る感じっす。",
    stats,
    withTopic(flags, "sns", "SNSではサッカーや友人の投稿を眺める"),
    internalEvents
  );
}

if (snsPostingAsk) {
  return replyWith(
    "自分からめっちゃ載せるタイプではないです。たまに上げることはあっても、基本は見るほうです。",
    stats,
    withTopic(flags, "sns", "SNSは発信より閲覧中心"),
    internalEvents
  );
}

if (snsGirlsAsk) {
  return replyWith(
    "まあ普通に可愛い子は目に入りますけど、SNSだけでどうこうって感じではないです。",
    stats,
    withTopic(flags, "sns", "可愛い子の投稿も見るがSNS中心の出会いではない"),
    internalEvents
  );
}

if (snsGirlfriendAsk) {
  return replyWith(
    "彼女のも見ますよ。普通に日常の投稿とか、会社の人と行ったごはんとかそんな感じです。",
    stats,
    withTopic(flags, "sns", "彼女のSNSも普通に見る"),
    internalEvents
  );
}

if (snsOtherPartnerAsk) {
  return replyWith(
    "そこはまあ、つながってはいます。連絡手段の一つって感じです。",
    stats,
    withTopic(flags, "honeytrap_detail", "浮気相手ともSNSでつながっている"),
    internalEvents
  );
}

  if (friendTalk) {
    return replyWith(
      pickOne([
        "友達は普通にいますよ。イツメンって感じで高校からずっと仲良いです。",
        "同期とか高校の友達はいっぱいいます。友達だけは裏切らないのが信念っす。",
      ]),
      stats,
      withTopic(flags, "friend", "友人関係は普通"),
      internalEvents
    );
  }

  if (friendBestAsk) {
  return replyWith(
    "昔からの友達か同期の中で気楽に話せるやつが何人かいます。",
    stats,
    withTopic(flags, "friend", "親しい友人は数人いる"),
    internalEvents
  );
}

if (friendConsultAsk) {
  return replyWith(
    "相談できる相手はいます。何でも全部言うわけじゃないですけど、しんどい時に話せるやつはいます。",
    stats,
    withTopic(flags, "friend", "相談できる友人はいる"),
    internalEvents
  );
}

if (friendHangoutAsk) {
  return replyWith(
    "飯行ったり、飲んだり、サッカーしたりっすね。夏はバーベキューしたり、誕生日祝ったりってイベントもやってます。",
    stats,
    withTopic(flags, "friend", "友人とは食事や会話中心で過ごす"),
    internalEvents
  );
}

if (friendLoveTalkAsk) {
  return replyWith(
    "彼女の話くらいはしますけど、全部細かくは言わないです。そこはまあ、ぼかします。",
    stats,
    withTopic(flags, "friend", "恋愛の話は一部するが全ては話さない"),
    internalEvents
  );
}

if (friendCoworkerAsk) {
  return replyWith(
    "同期は気楽っすね。同じ立場だから話しやすいですし、変に気を使わなくていいので。",
    stats,
    withTopic(flags, "friend", "同期とは気楽で話しやすい"),
    internalEvents
  );
}

  if (foodFrequencyAsk && lastPatientTopic === "food_preference") {
  return replyWith(
    pickOne([
      "外食は週1回あるかないかくらいです。体調いい時は行きます。",
      "毎週必ずではないですけど、たまに行きます。月に数回くらいっす。",
      "しょっちゅうではないですけど、気分転換で行くことはあります。",
    ]),
    stats,
    withTopic(flags, "food_preference", "外食は週1未満〜月数回"),
    internalEvents
  );
}

if (dietLifestyleAsk) {
  return replyWith(
    "普段は外食かコンビニが多いですかね。わりと好きなもの食べてます。ラーメンとか肉とか。",
    stats,
    withTopic(flags, "food_preference", "普段の食生活はこってり寄り"),
    internalEvents
  );
}

if (familyRestaurantAsk) {
  return replyWithYesNo(
    normalized,
    "yes",
    "時々、行きます。学生時代とかよくガストでずっとだべってましたね。",
    stats,
    withTopic(flags, "food_preference", "ファミレスは普通に行く"),
    internalEvents
  );
}

if (jojoenAppealAsk) {
  return replyWith(
    pickOne([
      "高いですけど、行った時の満足感がダンチすよ。『焼肉来た』って感じで。",
      "テンション上がるじゃないっすか。もう味が抜群です。",
      "ご褒美感があるのがいいですよね。普段使いじゃなくて、特別なときに行く感じが好きっす。",
    ]),
    stats,
    withTopic(flags, "food_preference", "叙々苑は満足感とご褒美感が魅力"),
    internalEvents
  );
}

  if (foodTalk) {
  return replyWith(
    pickOne([
      "普段なら肉とかラーメンが好きです。けど今日はちょっと食欲ないっす。",
      "外食もたまに行きます。ラーメンとか焼肉とか。",
      "好き嫌いはそんな多くないです。普段はこってりしたもの多いっすね。",
    ]),
    stats,
    withTopic(flags, "food_preference", "普段は肉やラーメンが好きだが今日は食欲低下"),
    internalEvents
  );
}

if (dislikedFoodAsk) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 3),
    defense: Math.max(0, stats.defense - 3),
    openness: Math.min(100, stats.openness + 2),
  };

  return replyWith(
    pickOne([
      "パクチーはダメっすね。絶対吐く自信あります。",
      "好き嫌いそこまで多くないですけど、甘すぎるものはそんなに得意じゃないです。",
      "あんまりないですけど、クセ強い食べ物はちょっと身構えますね。",
      "食べられないほどじゃないですけど、内臓系は自分からは頼まないです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "苦手な食べ物の話"),
    internalEvents
  );
}

if (meatDetailAsk && lastPatientTopic === "food_preference") {
  return replyWith(
    pickOne([
      "焼肉なら牛が好きです。やっぱタレっすよね。叙々苑のタレ最強です。",
      "肉なら牛一択っす。焼肉行くなら普通にテンション上がります。",
      "塩もいいですけど、焼肉は結局タレですよ。タレ選ばないとかありえないっす。",
    ]),
    stats,
    withTopic(flags, "food_preference", "肉は牛寄り、焼肉が好き"),
    internalEvents
  );
}

if (jojoenTalk && jojoenReasonAsk) {
  return replyWith(
    pickOne([
      "なんかちゃんとしてる感あるんですよ。肉もそうですけど、タレ込みで『焼肉食った』って満足感が強いです。",
      "結局、安定感っすね。ハズレ感が少ないし、焼肉行くぞって時に期待を裏切らないです。",
      "高級感もありますけど、ちゃんとテンション上がる味なのがいいんですよ。イベント感ありますし。",
    ]),
    stats,
    withTopic(flags, "food_preference", "叙々苑は安定感と満足感があって好き"),
    internalEvents
  );
}

if (jojoenTalk && jojoenSauceAsk) {
  return replyWith(
    pickOne([
      "あのタレ、甘さとコクの感じが最高なんですよ。白飯との相性がもう。",
      "タレがちゃんと主役張れるのが強いです。肉に乗せても負けない感じが好きなんですよね。",
      "叙々苑ならタレでしょ。あれ込みで完成品です。",
    ]),
    stats,
    withTopic(flags, "food_preference", "叙々苑はタレ込みで評価している"),
    internalEvents
  );
}

if (jojoenTalk && jojoenMenuAsk) {
  return replyWith(
    pickOne([
      "やっぱタンとカルビ最高です。あと白飯あるとかなり幸せです。",
      "最初にタン行って、そのあとカルビとかロースっすかね。結局基本が一番です。",
      "肉の部位を語りすぎるタイプではないですけど、ちゃんと『焼肉来た感』あるやつ頼みたいです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "焼肉ではタンやカルビなど定番を好む"),
    internalEvents
  );
}

if (jojoenTalk && jojoenPriceAsk) {
  return replyWith(
    pickOne([
      "まぁ安くはないですけど、焼肉ですから。たまの贅沢っすよ。",
      "高いのは高いです。でも焼肉でハズしたくないじゃないですか。安定感半端ないっす。",
      "普段使いじゃないですよ。『今日はちゃんと焼肉行くぞ』って時には叙々苑一択です。",
    ]),
    stats,
    withTopic(flags, "food_preference", "叙々苑は高いがご褒美枠として評価"),
    internalEvents
  );
}

if (jojoenTalk && jojoenVsOtherYakinikuAsk) {
  return replyWith(
    pickOne([
      "叙々苑の旨さを超えるとこあります？ないっすよね！",
      "焼肉なら何でもいいわけじゃなくて、叙々苑は『ちゃんとテンション上がる側』なんです。",
      "別の店も行きますけど、叙々苑って名前出した時に伝わる安心感あるじゃないですか。あれ強いです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "叙々苑は他店より満足感と安定感で優位"),
    internalEvents
  );
}

if (jojoenTalk && saltVsSauceAsk) {
  return replyWith(
    pickOne([
      "いやいやいや。焼肉って結局タレの暴力みたいなとこあるじゃないですか。あれがいいんですよ。",
      "塩はなんかお高くとまってますよね。まぁタレっすよ。白飯と一緒に掻き込むのが最高です。",
      "塩だと肉喰った感じしなくないっすか？焼肉はタレ一択っす。",
    ]),
    stats,
    withTopic(flags, "food_preference", "焼肉では塩よりタレ派"),
    internalEvents
  );
}

if (jojoenTalk && jojoenWhoWithAsk) {
  return replyWith(
    pickOne([
      "友達と行くことが多いです。焼肉って誰かいたほうが楽しいじゃないですか。",
      "気の置けない相手と行くのがいいです。焼くペースとか気使わなくて済むんで。",
      "テンション上がる店は誰かと行きたい派です。",
    ]),
    stats,
    withTopic(flags, "food_preference", "焼肉は友人など気楽な相手と行くのが好き"),
    internalEvents
  );
}

if (jojoenTalk && jojoenSaladAsk) {
  return replyWith(
    pickOne([
      "草はいらないっす。肉です。肉だけあれば優勝っす。",
      "いやぁ、男は肉っす。草はいらんっす。",
      "デートで行った時だけ頼みますね。男同士は草はいらんす。肉とタレと白飯です。",
    ]),
    stats,
    withTopic(flags, "food_preference", "サラダも可だが主役は肉"),
    internalEvents
  );
}

if (jojoenTalk && jojoenLunchDinnerAsk) {
  return replyWith(
    pickOne([
      "行くなら夜のほうが『焼肉来たな』感あって好きです。",
      "ランチもコスパいいのは分かりますけど、テンションで言うとディナー派です。",
      "そこは夜っしょ。焼肉ってちょっと特別感あるほうが楽しいんで。",
    ]),
    stats,
    withTopic(flags, "food_preference", "焼肉はランチよりディナー寄り"),
    internalEvents
  );
}

if (jojoenTalk && yakinikuExcitementAsk) {
  return replyWith(
    pickOne([
      "焼いてる時間も含めてイベント感あるんですよ。で、ダラダラ焼いてダラダラ飲むの最高ですよ。",
      "肉・タレ・白飯で幸福度上がるんですよね。シンプルにテンション上がります。",
      "普段ちょっとだるくても、焼肉って言われると気分上がるじゃないですか。あの感じです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "焼肉はイベント感と幸福感でテンションが上がる"),
    internalEvents
  );
}

if (moneyAsk) {
  return replyWith(
    "そりゃ欲しいですけどね。",
    stats,
    withTopic(flags, "daily_life", "お金は欲しいが執着は強くない"),
    internalEvents
  );
}

if (liveAsk) {
  return replyWith(
    "この近くで一人暮らししてます。",
    stats,
    withTopic(flags, "living_status", "都内一人暮らし"),
    internalEvents
  );
}

if (papakatsuAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "いや、ないっす。お金出さなきゃ会えない関係ってあり得ないっすから。",
    stats,
    withTopic(flags, "daily_life", "パパ活には興味がない"),
    internalEvents
  );
}

if (breadRiceAsk) {
  return replyWith(
    "どっちかって言うとパン派っすね。",
    stats,
    withTopic(flags, "food_preference", "ご飯派"),
    internalEvents
  );
}

if (afterWorkAsk) {
  return replyWith(
    "さすがに寝ますよ。熱あるんで。",
    stats,
    withTopic(flags, "daily_life", "帰宅後は家で休む"),
    internalEvents
  );
}

if (skiAsk) {
  return replyWithYesNo(
    normalized,
    "no",
    "スキーとかスノボはあんまり行かないですね。",
    stats,
    withTopic(flags, "daily_life", "スキーはあまり行かない"),
    internalEvents
  );
}

if (childCountWishAsk) {
  return replyWith(
    "ゆくゆくは欲しいっすけど、そもそも結婚は今じゃないってゆーか……。",
    stats,
    withTopic(flags, "girlfriend_marriage", "子どもの人数までは具体的に考えていない"),
    internalEvents
  );
}

if (popularityAsk) {
  return replyWith(
    pickOne([
      "いやぁ、まぁ、全然そんなことないっすけどねー。",
      "いやいや、そんなことないっすけど。まぁまぁ。",
      "そう見えちゃいますかー。まぁ普通っすね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "モテる話は否定してるようで"),
    internalEvents
  );
}

if (soccerInviteAsk) {
  return replyWith(
    "もうちょい仲良くなったら、行きましょう！",
    stats,
    withTopic(flags, "soccer_like", "サッカーの誘いには前向き"),
    internalEvents
  );
}

if (recentHardTimeAsk) {
  return replyWith(
    "え、今っす",
    stats,
    withTopic(flags, "daily_life", "最近しんどいことはある"),
    internalEvents
  );
}

if (lostTrackOfTimeAsk) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 4),
    defense: Math.max(0, stats.defense - 4),
    openness: Math.min(100, stats.openness + 4),
  };

  const soccerBranch = Math.random() < 0.5;

  if (soccerBranch) {
    return replyWith(
      pickOne([
        "あります。サッカー見てる時は普通にありますね。試合展開おもしろいと、気づいたら終わってます。",
        "ありますね。プレミアとか見始めると止まらないです。1試合のつもりが、関連動画まで行って時間溶けます。",
        "夢中になるのはやっぱサッカーっす。試合もですけど、ハイライトとか見始めると普通に時間なくなります。",
      ]),
      stats,
      withTopic(flags, "soccer_like", "時間を忘れるくらいサッカーに夢中になる"),
      internalEvents
    );
  }

  return replyWith(
    pickOne([
      "YouTubeとかだらだら見てると、気づいたら結構時間たってることあります。",
      "まぁ友達と話してる時とか？盛り上がるとあっという間です。",
      "気になる動画とか見始めると、意外とすぐ時間たっちゃいます。",
    ]),
    stats,
    withTopic(flags, "daily_life", "時間を忘れて没頭することがある"),
    internalEvents
  );
}

if (yakinikuRoleAsk) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 4),
    defense: Math.max(0, stats.defense - 4),
    openness: Math.min(100, stats.openness + 3),
  };

  const role = Math.random();

  if (role < 0.33) {
    return replyWith(
      "いや、基本食べる側っすね。焼いてくれる人いたら任せちゃいます。",
      stats,
      withTopic(flags, "food_preference", "焼肉では食べる側"),
      internalEvents
    );
  }

  if (role < 0.66) {
    return replyWith(
      "最初ちょっと焼いて、あとは流れでって感じっすね。ずっと焼くタイプではないです。",
      stats,
      withTopic(flags, "food_preference", "焼肉は状況次第"),
      internalEvents
    );
  }

  return replyWith(
    "いや、けっこう焼く側っすよ。焼き加減とか気になっちゃうんで。",
    stats,
    withTopic(flags, "food_preference", "焼肉で焼く側"),
    internalEvents
  );
}

if (ramenTalk && ramenGenreAsk) {
  return replyWith(
    pickOne([
      "ラーメンは普通に好きです。完全に一個に絞れないですけど、こってり寄りのやつはテンション上がります。",
      "その日の気分もありますけど、わりと満足感あるラーメンが好きです。細い好みより『食った感』重視っすね。",
      "ラーメンならあっさりよりは、ちょっとパンチあるほうが好きです。元気な時に食いたくなるやつですね。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ラーメンはこってり寄りで満足感重視"),
    internalEvents
  );
}

if (ramenTalk && ramenIekeiAsk) {
  return replyWith(
    pickOne([
      "家系は普通に好きです。海苔とほうれん草とライスで完成してる感じありますよね。",
      "家系いけますよ。濃いめ・多めまでやるかはその日の体調次第ですけど、あのカスタマイズできるのは強いです。",
      "家系は満足感あるんで、『今日はちゃんと食うぞ』って時にちょうどいいです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "家系ラーメンを好意的に捉えている"),
    internalEvents
  );
}

if (ramenTalk && ramenJiroAsk) {
  return replyWith(
    pickOne([
      "二郎系も嫌いじゃないですけど、毎回食べたあと後悔します。",
      "二郎はたまに行きたくなるのは分かります。",
      "二郎系は食う側のコンディションも必要じゃないですか。好きですけど、軽い気持ちでは行かないです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "二郎系は好きだが気合いが必要"),
    internalEvents
  );
}

if (ramenTalk && ramenSoupTasteAsk) {
  return replyWith(
    pickOne([
      "定番で言うと豚骨が好きです。塩も嫌いじゃないですけど、テンション上がるのはもうちょい濃いほうですね。",
      "味噌もありですけど、結局豚骨に行きますね。",
      "普段テンション上がるのは豚骨とか濃いめっすね。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ラーメンは豚骨や醤油など濃いめ寄り"),
    internalEvents
  );
}

if (ramenTalk && ramenKotteriAsk) {
  return replyWith(
    pickOne([
      "こってり派です。ラーメンはこってりしてなきゃ。パンチ欲しいです。",
      "基本はこってりのほうが満足感ありますよね。",
      "完全にこってり派です。今日はさすがに無理ですけど。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ラーメンはこってり派"),
    internalEvents
  );
}

if (ramenTalk && ramenNoodleVsSoupAsk) {
  return replyWith(
    pickOne([
      "どっちも大事ですけど、最初にテンション上がるのはスープですかね。結局、全体のパンチっすね。",
      "麺だけ良くても微妙ですし、スープだけでも決まらないんで、バランスではあります。",
      "強いて言えばスープですかね。最初の一口で『当たりだな』ってなるとテンション上がります。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ラーメンはスープの印象をやや重視"),
    internalEvents
  );
}

if (ramenTalk && ramenToppingAsk) {
  return replyWith(
    pickOne([
      "味玉とチャーシューは強いです。あと海苔はマストっす。",
      "ベタですけど、チャーシュー・味玉・ねぎ、海苔あたりが好きです。変化球より王道派です。",
      "海苔とか味玉とか、満足度上がるやつが好きです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ラーメントッピングは味玉やチャーシューなど王道派"),
    internalEvents
  );
}

if (ramenTalk && ramenRiceAsk) {
  return replyWith(
    pickOne([
      "家系ならライス欲しくなりますね。普通のラーメンなら必須ではないですけど。",
      "毎回じゃないですけど、相性いいやつなら全然ありです。濃いスープだと特に。",
      "ラーメン単体でもいいですけど、ライス付けると満足感は上がりますよね。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ラーメンにライスは相性次第であり"),
    internalEvents
  );
}

if (ramenTalk && ramenLineAsk) {
  return replyWith(
    pickOne([
      "めちゃくちゃは並びたくないです。うまいのは分かるんですけど、ほどほどで入りたい派です。",
      "30分超えるとちょっと考えますね。ラーメンって勢いも大事なんで。",
      "並んでまで絶対食うタイプではないです。入れそうなら行く、くらいです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ラーメン行列耐性は中程度"),
    internalEvents
  );
}

if (ramenTalk && ramenSoloAsk) {
  return replyWith(
    pickOne([
      "ラーメンは一人でも全然いけます。むしろ気楽でいいです。",
      "一人ラーメンは余裕っすね。焼肉よりラーメンのほうが一人で行きやすいです。",
      "ラーメンは一人でサクッと行くのも好きです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ラーメンは一人でも行ける"),
    internalEvents
  );
}

if (cocoichiTalk && cocoichiSpiceLevelAsk) {
  return replyWith(
    pickOne([
      "ちょうどいいのは5辛くらいです。無理すればもっと行けますけど、ちゃんとおいしく食べるならそのへんです。",
      "5辛前後が一番バランスいいっすね。10辛は挑戦枠って感じです。",
      "見栄張るなら10辛って言えますけど、普段おいしく食うなら5辛くらいがちょうどいいです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ココイチは5辛前後が好み"),
    internalEvents
  );
}

if (cocoichiTalk && cocoichiToppingAsk) {
  return replyWith(
    pickOne([
      "チーズは強いです。あとはカツ系入れると満足感上がります。",
      "ベタですけどチーズとかカツは好きです。結局そういう王道がうまいです。",
      "トッピングするならチーズかカツ系っすね。シンプルでもいいですけど、ちょい足ししたくなります。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ココイチはチーズやカツ系トッピングを好む"),
    internalEvents
  );
}

if (cocoichiTalk && cocoichiCheeseAsk) {
  return replyWith(
    pickOne([
      "チーズは普通にありです。辛さとちょっと丸くなる感じが相性いいんですよ。",
      "チーズ入れると反則っぽいですけど、うまいんで仕方ないです。",
      "チーズは好きです。辛いだけじゃなくて、ちゃんと食べやすくなるのがいいです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ココイチではチーズあり派"),
    internalEvents
  );
}

if (cocoichiTalk && cocoichiRiceAmountAsk) {
  return replyWith(
    pickOne([
      "普段は普通盛りで十分です。めちゃくちゃ腹減ってる時だけ増やします。",
      "毎回大盛りってほどではないです。普通盛りか、その日の腹具合でちょい調整するくらいです。",
      "量は無理して盛らないです。辛さ上げるなら、量は普通くらいがちょうどいいです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ココイチのライス量は普通寄り"),
    internalEvents
  );
}

if (cocoichiTalk && cocoichiReasonAsk) {
  return replyWith(
    pickOne([
      "辛さも量も調整できるし、その日の気分で遊べるのがいいです。",
      "安定感っすね。変に悩まなくていいし、今日はこれって決めやすいのが強いです。",
      "ココイチって『想像通りにうまい』のがいいんですよ。外しにくいし、気分でカスタムできるのも好きです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ココイチは安定感と調整幅が魅力"),
    internalEvents
  );
}

if (cocoichiTalk && cocoichiVsOtherCurryAsk) {
  return replyWith(
    pickOne([
      "他のカレー屋もいいですけど、ココイチは辛さとかトッピングが最強です。",
      "専門店っぽい特別感とは別で、ココイチは『今日はこう食いたい』が通りやすいのがいいです。",
      "他の店はあんま行かないっすね。カレーはココイチだけっす。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ココイチは他店より調整しやすさが強み"),
    internalEvents
  );
}

if (cocoichiTalk && cocoichiSweetAsk) {
  return replyWith(
    pickOne([
      "甘口は行かないですね。やっぱ多少辛くしたいです。",
      "普通でもいいですけど、せっかくなら辛さはちょっと上げたいっす。",
      "辛くないのも食べられますけど、ココイチでそれやったらもったいないでしょ。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ココイチでは甘口より辛口寄り"),
    internalEvents
  );
}

if (cocoichiTalk && curryHomeAsk) {
  return replyWith(
    pickOne([
      "家のカレーも普通に好きです。でもココイチは別ジャンルって感じします。",
      "家カレーは家カレーでいいですけど、ココイチは辛さとかトッピングで遊べるのが違います。",
      "家のカレーも食べますけど、外で食うカレーってまた別のテンションあるじゃないですか。",
    ]),
    stats,
    withTopic(flags, "food_preference", "家カレーとココイチは別の楽しみとして捉えている"),
    internalEvents
  );
}

if (cocoichiTalk && spicyForTasteAsk) {
  return replyWith(
    pickOne([
      "辛さだけじゃなくて、ちゃんとおいしい範囲で食うのがいいんですよ。だから普段は5辛くらいなんです。",
      "無茶するだけなら意味ないじゃないですか。味も残る辛さで食うほうがいいです。",
      "辛さ自慢だけしたいわけじゃないです。ちゃんと食える範囲で一番うまいところにしたいです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "辛さは味とのバランス重視"),
    internalEvents
  );
}

if (ramenTalk && lastPatientTopic !== "food_preference") {
  return replyWith(
    pickOne([
      "ラーメンは普通に好きです。普段なら全然食べます。",
      "好きっすよ。今日は食欲ないですけど、元気なら普通にテンション上がります。",
      "ラーメンいけます。あっさりよりは、ちょっとパンチあるほうが好きです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ラーメンは好物の一つ"),
    internalEvents
  );
}

if (cocoichiTalk && lastPatientTopic !== "food_preference") {
  return replyWith(
    pickOne([
      "ココイチは普通に好きです。辛さいじれるのがいいですよね。",
      "好きっすよ。5辛くらいが一番うまく食える感じします。",
      "ココイチありです。トッピング考えるのも含めて楽しいじゃないですか。",
    ]),
    stats,
    withTopic(flags, "food_preference", "ココイチを好意的に捉えている"),
    internalEvents
  );
}

if (ronaldoTalk) {
  return replyWith(
    pickOne([
      "ロナウドはやっぱ異次元っすよね。フィジカルも決定力もバケモンで、あの継続力は普通じゃないです。ユナイテッド時代からずっと見てます。",
    ]),
    stats,
    withTopic(flags, "soccer_like", "ロナウドは継続力と決定力の象徴"),
    internalEvents
  );
}

if (ronaldoTalk && soccerBestPointAsk) {
  return replyWith(
    "一番は継続力と決定力っすね。あのレベルを何年も維持してるのが意味わかんないです。",
    stats,
    withTopic(flags, "soccer_like", "ロナウドの最大の武器は継続力と決定力"),
    internalEvents
  );
}

if (ronaldoTalk && soccerPeakAsk) {
  return replyWith(
    "個人的にはユナイテッド後半からレアル序盤くらいの爆発力はやばかったと思います。",
    stats,
    withTopic(flags, "soccer_like", "ロナウドのピークはユナイテッド後半〜レアル序盤"),
    internalEvents
  );
}

if (ronaldoTalk && soccerWeaknessAsk) {
  return replyWith(
    "若い頃よりは細かい崩しにずっと絡むタイプではないですけど、それでも点取るんで結局化け物です。",
    stats,
    withTopic(flags, "soccer_like", "ロナウドは崩し参加より仕上げ特化寄り"),
    internalEvents
  );
}

if (rooneyTalk && soccerBestPointAsk) {
  return replyWith(
    "万能感っすね。点も取るし走るし守備もするし、チームのために自分を削れるのが強いです。",
    stats,
    withTopic(flags, "soccer_like", "ルーニーの最大の武器は万能性と献身性"),
    internalEvents
  );
}

if (rooneyTalk && soccerPeakAsk) {
  return replyWith(
    "エネルギー量で言うと若い頃のルーニーはほんとエグかったです。勢いが段違いでした。",
    stats,
    withTopic(flags, "soccer_like", "ルーニーのピークは若い頃の爆発力"),
    internalEvents
  );
}

if (rooneyTalk && soccerWeaknessAsk) {
  return replyWith(
    "器用すぎて何でもやれちゃう分、純粋な点取り屋だけで見ると別タイプの化け物もいますね。",
    stats,
    withTopic(flags, "soccer_like", "ルーニーは万能だが純CF特化ではない"),
    internalEvents
  );
}

if (kdbTalk && soccerBestPointAsk) {
  return replyWith(
    "あの視野とキック精度ですね。見えてる景色がたぶん他の選手と違うんだと思います。",
    stats,
    withTopic(flags, "soccer_like", "デブライネの最大の武器は視野とキック精度"),
    internalEvents
  );
}

if (kdbTalk && soccerPeakAsk) {
  return replyWith(
    "シティで支配してた時期はずっと高かったですけど、あのアシスト量産してた頃は特にやばいです。",
    stats,
    withTopic(flags, "soccer_like", "デブライネのピークはシティ全盛期"),
    internalEvents
  );
}

if (kdbTalk && soccerWeaknessAsk) {
  return replyWith(
    "弱点っていうより、あのレベルを維持するには周りもある程度噛み合ってほしいタイプではありますね。",
    stats,
    withTopic(flags, "soccer_like", "デブライネは連携前提で最大化する司令塔"),
    internalEvents
  );
}

if (salahTalk && soccerBestPointAsk) {
  return replyWith(
    "やっぱ右からのカットインと決め切る力ですね。分かっててもやられるのが一流です。",
    stats,
    withTopic(flags, "soccer_like", "サラーの最大の武器は右カットインと決定力"),
    internalEvents
  );
}

if (salahTalk && soccerPeakAsk) {
  return replyWith(
    "リバプールで点を量産してた時期はインパクトでかかったですね。あの時の怖さは別格です。",
    stats,
    withTopic(flags, "soccer_like", "サラーのピークはリバプール全盛期"),
    internalEvents
  );
}

if (salahTalk && soccerWeaknessAsk) {
  return replyWith(
    "左足の形に持ち込ませないで消せればって話はありますけど、それでも止め切れないのが強いです。",
    stats,
    withTopic(flags, "soccer_like", "サラーは形を消されても脅威"),
    internalEvents
  );
}

if (kaneTalk && soccerBestPointAsk) {
  return replyWith(
    "点取り屋なのに下がって組み立てもできるとこですね。あれは普通の9番じゃないです。",
    stats,
    withTopic(flags, "soccer_like", "ケインの最大の武器は得点力と組み立ての両立"),
    internalEvents
  );
}

if (kaneTalk && soccerPeakAsk) {
  return replyWith(
    "スパーズ後半くらいから完成形感ありますね。得点だけじゃなく全部できる感じが出てました。",
    stats,
    withTopic(flags, "soccer_like", "ケインのピークは万能型完成後"),
    internalEvents
  );
}

if (kaneTalk && soccerWeaknessAsk) {
  return replyWith(
    "爆発的なスピードでぶち抜くタイプではないですけど、そのぶん判断と技術で勝ってる感じです。",
    stats,
    withTopic(flags, "soccer_like", "ケインはスピード型ではなく知性と技術型"),
    internalEvents
  );
}

if (sonTalk && soccerBestPointAsk) {
  return replyWith(
    "スピードと決定力、それに両足で決められるのがでかいです。カウンターで持たせるとほんと怖いです。",
    stats,
    withTopic(flags, "soccer_like", "ソンの最大の武器はスピードと両足シュート"),
    internalEvents
  );
}

if (sonTalk && soccerPeakAsk) {
  return replyWith(
    "スパーズで前線がハマってた時期はかなりえぐかったです。抜け出しの怖さが段違いでした。",
    stats,
    withTopic(flags, "soccer_like", "ソンのピークはスパーズ全盛カウンター期"),
    internalEvents
  );
}

if (sonTalk && soccerWeaknessAsk) {
  return replyWith(
    "狭いとこをずっとこねて崩すタイプというより、走らせた時に最大化するタイプですね。",
    stats,
    withTopic(flags, "soccer_like", "ソンはオープンスペースで最大化するタイプ"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_like" && ronaldoTalk && followUp) {
  return replyWith(
    "あの年齢でトップ維持してるのが一番やばいです。普通は落ちるのに、むしろ進化してる感じすらありますよね。",
    stats,
    withTopic(flags, "soccer_like", "ロナウドの異常な継続性"),
    internalEvents
  );
}

if (rooneyTalk) {
  return replyWith(
    "ルーニーは万能型って感じで好きでしたね。得点もできるし、守備もするし、チームのために動ける選手って感じです。",
    stats,
    withTopic(flags, "soccer_like", "ルーニーは万能型FW"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_like" && rooneyTalk && followUp) {
  return replyWith(
    "あの泥臭さがいいんですよね。スターなのにちゃんと走るし削るし、ああいう選手はチームに絶対必要です。",
    stats,
    withTopic(flags, "soccer_like", "ルーニーの献身性"),
    internalEvents
  );
}

if (kdbTalk) {
  return replyWith(
    "デ・ブライネはパスがもう別次元っすね。あの視野と精度は見てて意味わからないレベルです。",
    stats,
    withTopic(flags, "soccer_like", "デブライネは世界最高クラスの司令塔"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_like" && kdbTalk && followUp) {
  return replyWith(
    "あのスルーパスのタイミングがえぐいんですよ。普通そこ通す？ってとこに通すんで。",
    stats,
    withTopic(flags, "soccer_like", "デブライネの異次元パス"),
    internalEvents
  );
}

if (salahTalk) {
  return replyWith(
    "サラーはスピードと決定力のバランスがすごいっすよね。右からのカットインは分かってても止められない感じです。",
    stats,
    withTopic(flags, "soccer_like", "サラーは右からのカットインが武器"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_like" && salahTalk && followUp) {
  return replyWith(
    "あの角度から決め切るのが一流なんですよね。しかもシーズン通して安定してるのがすごいです。",
    stats,
    withTopic(flags, "soccer_like", "サラーの安定した得点力"),
    internalEvents
  );
}

if (kaneTalk) {
  return replyWith(
    "ケインは点も取れるし下がってゲームも作れるのが強いですよね。あの万能感はなかなかいないです。",
    stats,
    withTopic(flags, "soccer_like", "ケインは万能型CF"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_like" && kaneTalk && followUp) {
  return replyWith(
    "普通のFWじゃないんですよね。10番みたいなこともできるし、あれは戦術の幅広がります。",
    stats,
    withTopic(flags, "soccer_like", "ケインはゲームメイクも可能"),
    internalEvents
  );
}

if (sonTalk) {
  return replyWith(
    "ソンはスピードと決定力がシンプルに強いっすよね。カウンターの怖さはトップクラスだと思います。",
    stats,
    withTopic(flags, "soccer_like", "ソンはカウンター特化型"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_like" && sonTalk && followUp) {
  return replyWith(
    "あの一瞬の抜け出しが速すぎるんですよ。しかも両足で決められるのが強いです。",
    stats,
    withTopic(flags, "soccer_like", "ソンは両足で決められるスピード型"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_like" && soccerBestOverallAsk) {
  return replyWith(
    "総合で一番インパクトあったのはロナウドかもしれないですけど、好みで言うとルーニーみたいな万能型もかなり好きです。",
    stats,
    withTopic(flags, "soccer_like", "総合はロナウド級、好みはルーニー寄り"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_like" && soccerBestPasserAsk) {
  return replyWith(
    "パスならデ・ブライネですね。あれはちょっと別格です。",
    stats,
    withTopic(flags, "soccer_like", "パス最強はデブライネ"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_like" && soccerBestFinisherAsk) {
  return replyWith(
    "決め切る力ならロナウドかケインで迷いますけど、迫力込みでロナウドって言いたくなりますね。",
    stats,
    withTopic(flags, "soccer_like", "決定力最強はロナウドかケイン"),
    internalEvents
  );
}

if (lastPatientTopic === "soccer_like" && soccerBestCounterAsk) {
  return replyWith(
    "カウンターの怖さならソンですね。走らせた時の破壊力がすごいです。",
    stats,
    withTopic(flags, "soccer_like", "カウンター最強はソン"),
    internalEvents
  );
}

  if (celebrityTalk) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 4),
    defense: Math.max(0, stats.defense - 2),
  };

  const celebrityReplies = [
    {
      reply:
        "芸能人じゃないっすけど、サッカーのプレミアの選手はめっちゃ好きで。クリスティアーノ・ロナウドとか、ウェイン・ルーニーとかは普通に語れますね。",
      named_players: "ronaldo_rooney",
    },
    {
      reply:
        "芸能人はあんま見ないですけど、サッカーのほうは見てて。ケビン・デ・ブライネとかモハメド・サラーとか、ああいう選手はやっぱすごいですよね。",
      named_players: "debruyne_salah",
    },
    {
      reply:
        "芸能人よりサッカーっすね。ハリー・ケインとかソン・フンミンとか、プレミアのスター選手は普通に好きです。",
      named_players: "kane_son",
    },
  ];

  const picked =
    celebrityReplies[Math.floor(Math.random() * celebrityReplies.length)];

  return replyWith(
    picked.reply,
    stats,
    withTopic(flags, "soccer_like", "芸能人よりプレミア選手の話", {
      soccer_named_players: picked.named_players,
    }),
    internalEvents
  );
}

if (soccerPlayerLikePointAsk) {
  const namedPlayers = getStringFlag(flags, "soccer_named_players");

  if (namedPlayers === "ronaldo_rooney") {
    return replyWith(
      "ロナウドはあの理不尽な決定力と華があるところっすね。ルーニーは点も取れるし下がって作れるし、泥くさいこともできる万能感が好きです。",
      stats,
      withTopic(flags, "soccer_like", "ロナウドの決定力とルーニーの万能感が好き"),
      internalEvents
    );
  }

  if (namedPlayers === "debruyne_salah") {
    return replyWith(
      "デ・ブライネは配球の精度がエグいですし、サラーはあのスピードで決め切る感じがやっぱりすごいです。",
      stats,
      withTopic(flags, "soccer_like", "デブライネの配球とサラーの決定力が好き"),
      internalEvents
    );
  }

  if (namedPlayers === "kane_son") {
    return replyWith(
      "ケインは決めるだけじゃなくて下がって組み立てられるのがすごいですし、ソンはスピードと一発で仕留める感じが怖いんすよね。",
      stats,
      withTopic(flags, "soccer_like", "ケインの万能性とソンのスピードが好き"),
      internalEvents
    );
  }

  return replyWith(
    "プレミアの選手って、結局ちゃんと結果を出しつつ個性もあるのがいいんですよね。見てて分かりやすくすごい選手が好きです。",
    stats,
    withTopic(flags, "soccer_like", "プレミアのスター選手の個性と結果が好き"),
    internalEvents
  );
}

  if (tvTalk) {
  return replyWith(
    pickOne([
      "テレビはあんま観ないですね。",
      "うちテレビないです。",
      "昔は観てましたけどね。子供の頃の話です。",
    ]),
    stats,
    withTopic(flags, "tv_youtube", "テレビはたまに見る"),
    internalEvents
  );
}

if (homeWhatAsk) {
  return replyWith(
    "YouTubeとかネトフリ見てること多いっすね。",
    stats,
    withTopic(flags, "tv_youtube", "家での過ごし方→動画"),
    internalEvents
  );
}

if (youtubeTalk) {
  return replyWith(
    pickOne([
      "YouTubeはたまに見ます。SNSからのリンクで行くのが多いっすね。",
      "動画は見ることあります。集中して見るというより流し見っすね。",
      "YouTubeも見ます。サッカーのスーパープレーとか楽しいっすよ。",
    ]),
    stats,
    withTopic(flags, "tv_youtube", "YouTubeは流し見する"),
    internalEvents
  );
}

if (dogLikeAsk) {
  return replyWith(
    "表情豊かなとこですかね。あと懐いてくる感じがいいっす。",
    stats,
    withTopic(flags, "daily_life", "犬が好き"),
    internalEvents
  );
}

if (animalTalk) {
  return replyWith(
    pickOne([
      "動物は普通に好きです。やっぱ一番は犬っすかね。",
      "動物はいいっすよね。見てるだけでちょっと癒やされます。",
      "嫌いではないです。飼うなら手のかからなさも考えますけど。",
    ]),
    stats,
    withTopic(flags, "daily_life", "動物は好意的"),
    internalEvents
  );
}

if (animalTalk && lastPatientTopic !== "daily_life") {
  return replyWith(
    "動物は普通に好きです。強いて言うなら犬派かもしれないです。",
    stats,
    withTopic(flags, "daily_life", "動物は好き"),
    internalEvents
  );
}

if (alcoholTalk && lastPatientTopic !== "daily_life") {
  return replyWith(
    "お酒は普通に飲みます。ハイボールとビールですね。",
    stats,
    withTopic(flags, "daily_life", "お酒は普通に飲む"),
    internalEvents
  );
}

if (amusementTalk && lastPatientTopic !== "daily_life") {
  return replyWith(
    "遊園地とかテーマパークは嫌いじゃないです。行けば普通に楽しめます。",
    stats,
    withTopic(flags, "daily_life", "遊園地は好意的"),
    internalEvents
  );
}

if (animalDogCatAsk) {
  return replyWith(
    pickOne([
      "どっちかなら犬派です。懐いてくる感じがいいじゃないですか。",
      "猫もいいですけど、強いて言うなら犬派です。テンションある感じが好きです。",
      "犬猫どっちも分かるんですけど、選ぶなら犬っすね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "犬派寄り"),
    internalEvents
  );
}

if (animalReasonAsk) {
  return replyWith(
    "懐いてくれるの嬉しいっすよね。おーよしよしってやりたくなります。",
    stats,
    withTopic(flags, "daily_life", "動物は懐く感じが好き"),
    internalEvents
  );
}

if (animalPetAsk) {
  return replyWith(
    "今は飼ってないです。飼うならちゃんと面倒見られる時じゃないと厳しいかなって感じです。",
    stats,
    withTopic(flags, "daily_life", "現在ペットは飼っていない"),
    internalEvents
  );
}

if (alcoholTalk) {
  return replyWith(
    pickOne([
      "お酒は普通に飲みます。めちゃくちゃ強いアピールするほどではないですけど。",
      "飲めますよ。仕事終わりとか、気が向いた時に飲む感じです。",
      "酒は嫌いじゃないです。ずっと飲んでるタイプではないですけど。",
    ]),
    stats,
    withTopic(flags, "daily_life", "お酒は普通に飲む"),
    internalEvents
  );
}

if (alcoholTypeAsk) {
  return replyWith(
    pickOne([
      "無難にハイボールとかビールが好きです。重すぎないのがいいです。",
      "ビールも飲みますけど、ハイボールとかのほうが気楽かもです。",
      "その時の気分ですけど、ビールとかハイボールは入りやすいです。",
    ]),
    stats,
    withTopic(flags, "daily_life", "酒はハイボールやサワー寄り"),
    internalEvents
  );
}

if (alcoholStrengthAsk) {
  return replyWith(
    pickOne([
      "弱くはないと思いますけど、無限に飲めるってほどでもないです。",
      "普通くらいじゃないですかね。楽しく飲める範囲が一番です。",
      "強い自慢するほどではないです。ちゃんと酔います。",
    ]),
    stats,
    withTopic(flags, "daily_life", "酒の強さは普通程度"),
    internalEvents
  );
}

if (alcoholWhenAsk) {
  return replyWith(
    "仕事終わりとか、友達といる時に飲むことが多いです。家でちょっと飲むこともあります。",
    stats,
    withTopic(flags, "daily_life", "お酒は仕事後や友人と飲むことが多い"),
    internalEvents
  );
}

if (amusementTalk) {
  return replyWith(
    pickOne([
      "遊園地とかテーマパークは普通に好きです。行くならテンション上がるとこがいいです。",
      "そういうとこ行くのはありです。絶叫でも雰囲気でも、それなりに楽しめます。",
      "遊園地はたまに行くと普通に楽しいです。ベタでもいいじゃないですか。",
    ]),
    stats,
    withTopic(flags, "daily_life", "遊園地やテーマパークは嫌いではない"),
    internalEvents
  );
}

if (disneyAsk) {
  return replyWith(
    pickOne([
      "ディズニーは年1くらいで行きますよ。行くと結局カチューシャ買っちゃうんですよね。",
      "ディズニーはベタですけど、なんだかんだ楽しいですよね。雰囲気で持っていかれます。",
      "時々、行きますよ。ディズニーはディズニーで完成されてる感じありますよね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "ディズニーは好意的"),
    internalEvents
  );
}

if (usjAsk) {
  return replyWith(
    pickOne([
      "ユニバは行ったことないんですよ。",
      "USJは行ってみたいとは思いますけど、機会がなくて。",
      "ユニバ行ってみたいんですよね。今度計画してみようかな。",
    ]),
    stats,
    withTopic(flags, "daily_life", "USJは好意的"),
    internalEvents
  );
}

if (fujiqAsk) {
  return replyWith(
    pickOne([
      "富士急は絶叫いけるなら強いですよね。行ったらちゃんと遊びきりますよ。",
      "富士急は絶叫のイメージ強いです。ああいう直球なの嫌いじゃないです。",
      "富士急はテンションある時に行きたいです。気合い要るじゃないですか。",
    ]),
    stats,
    withTopic(flags, "daily_life", "富士急は絶叫系の印象"),
    internalEvents
  );
}

if (toshimaenAsk) {
  return replyWith(
    pickOne([
      "としまえんは昔っぽい親しみある感じでしたよね。ああいうの嫌いじゃないです。",
      "としまえん系のちょっと身近な遊園地感、分かります。",
      "としまえんはガチテーマパークとは別の良さありますよね。",
    ]),
    stats,
    withTopic(flags, "daily_life", "としまえん系の親しみやすさは好意的"),
    internalEvents
  );
}

if (amusementThrillAsk) {
  return replyWith(
    pickOne([
      "絶叫は乗れますよ。基本は楽しめます。",
      "怖いの平気っすね。せっかくならちょっと刺激あるほうが面白いですし。",
      "絶叫系はいけます。終わった後ぐったりしますけど。",
    ]),
    stats,
    withTopic(flags, "daily_life", "絶叫系は乗れるほう"),
    internalEvents
  );
}

if (amusementWhoAsk) {
  return replyWith(
    "行くなら友達とか彼女とか、誰かと行くほうが楽しいです。",
    stats,
    withTopic(flags, "daily_life", "遊園地は誰かと行く派"),
    internalEvents
  );
}

if (firstFavoriteStreamerAsk) {
  stats = {
    ...stats,
    validation: Math.min(100, stats.validation + 5),
    defense: Math.max(0, stats.defense - 3),
  };

  return replyWith(
    pickOne([
      "ゲーム系だと、わいわいとかからすまAは見ますね。笑っちゃって作業しながら聞けないっすよ。",
      "配信者だと、狩野英孝とか好きです。最近、香住蒼って人を注目してます。声がいいんすよねぇ。",
      "キャベツの人とか良く聞いてますよ。あと大関ゲームのショート動画とかついつい見ちゃいます。",
    ]),
    stats,
    withTopic(flags, "tv_youtube", "好きな配信者としてわいわい・のばまん・狩野英孝あたりを見る"),
    internalEvents
  );
}

if (vtuberTalk || gameStreamingTalk) {
  return replyWith(
    pickOne([
      "配信は普通に見ます。好きになったら追っちゃいますね。",
      "Vとかゲーム配信はよく見ますよ。何をやってるかよりもキャラが好きになれるかどうかっすね。",
      "見ますよ。最近は香住蒼って配信者にはまってますね。",
    ]),
    stats,
    withTopic(flags, "tv_youtube", "Vtuberやゲーム配信は見ることがある"),
    internalEvents
  );
}

if ((vtuberTalk || gameStreamingTalk) && lastPatientTopic !== "tv_youtube") {
  return replyWith(
    "配信は普通に見ます。切り抜きとか気軽に見られるやつは好きです。",
    stats,
    withTopic(flags, "tv_youtube", "Vtuberやゲーム配信を見る"),
    internalEvents
  );
}

if (favoriteStreamerAsk) {
  const nextStreamer = pickOne([
    "kasumi_ao",
    "waiwai",
    "kyabetsu",
    "kusoge_hunter",
    "ozeki_game",
    "kano_eiko",
    "nobaman",
  ]);

  return replyWith(
    pickOne([
      "キャラが好きになった人をその時々で見る感じっすね。切り抜きから入ること多いです。",
      "この人だけっていうより、話し方とか空気感が好きだと見ちゃいますね。Vも配信者もそれで決まること多いです。",
      "固定の最推しが一人いるというより、見てて居心地いい人を追う感じっすね。ゲームの上手さだけじゃなくてキャラで見ます。",
    ]),
    stats,
    withTopic(flags, "tv_youtube", "好きな配信者は固定一人よりキャラや空気感で選ぶ", {
      next_streamer_pick: nextStreamer,
    }),
    internalEvents
  );
}

const streamerWhoAsk =
  lastPatientTopic === "tv_youtube" &&
  includesAny(normalized, [
    "誰",
    "だれ",
    "例えば誰",
    "たとえば誰",
    "具体的に誰",
    "どんな人",
    "誰なの",
  ]);

if (streamerWhoAsk) {
  const nextStreamer = getStringFlag(flags, "next_streamer_pick");

  if (nextStreamer === "kasumi_ao") {
    return replyWith(
      "香住蒼って知ってます？ちょっとマイナーっすけど、声がいいんすよね。演じ分けもすごくて、最近の推しですね。",
      stats,
      withTopic(flags, "tv_youtube", "香住蒼の話", {
        next_streamer_pick: "kasumi_ao",
      }),
      internalEvents
    );
  }

  if (nextStreamer === "waiwai") {
    return replyWith(
      "わいわいさん、いいっすよね！なんだろ、友達と集まってゲームしてる感じなんですよ。配信者の動画見始めたのもわいわいさんきっかけですね。",
      stats,
      withTopic(flags, "tv_youtube", "わいわいの話", {
        next_streamer_pick: "waiwai",
      }),
      internalEvents
    );
  }

  if (nextStreamer === "kyabetsu") {
    return replyWith(
      "キャベツの人。あの声クセになりますよね。語り口も面白いし、言ってることもちゃんと自分の目で評価しているなって感じがして好きです。",
      stats,
      withTopic(flags, "tv_youtube", "きゃべつの人の話", {
        next_streamer_pick: "kyabetsu",
      }),
      internalEvents
    );
  }

  if (nextStreamer === "kusoge_hunter") {
    return replyWith(
      "クソゲーハンターのからすまA大好きです。クソゲーって面白いんだって教えてもらいましたよね。まあ自分じゃやりませんが。",
      stats,
      withTopic(flags, "tv_youtube", "クソゲーハンターの話", {
        next_streamer_pick: "kusoge_hunter",
      }),
      internalEvents
    );
  }

  if (nextStreamer === "ozeki_game") {
    return replyWith(
      "大関ゲーム。あのーから始まるゲーム解説が楽しいですよね。本編もいいですが、ショート動画のラストに落ちがある感じ見ちゃいます。",
      stats,
      withTopic(flags, "tv_youtube", "大関ゲームの話", {
        next_streamer_pick: "ozeki_game",
      }),
      internalEvents
    );
  }

  if (nextStreamer === "kano_eiko") {
    return replyWith(
      "狩野英孝っすね。本人もキャラも相まって、笑いに愛されてるなぁって思います。常にハプニングが起こって目が離せないです。",
      stats,
      withTopic(flags, "tv_youtube", "狩野英孝の話", {
        next_streamer_pick: "kano_eiko",
      }),
      internalEvents
    );
  }

  if (nextStreamer === "nobaman") {
    return replyWith(
      "のばまん！いつも、はちゃめちゃなことやってますよね。よくこんなアイデア思い浮かぶよなって思ってます。結果面白くなってるから次なにするんだろって期待しちゃいます。",
      stats,
      withTopic(flags, "tv_youtube", "のばまんの話", {
        next_streamer_pick: "nobaman",
      }),
      internalEvents
    );
  }
}

if (kasumiAoTalk) {
  return replyWith(
    "香住蒼、声がいいっすよね。演じ分けもすごくて、最近の推しですね。",
    stats,
    withTopic(flags, "tv_youtube", "香住蒼が好き"),
    internalEvents
  );
}

if (waiwaiTalk) {
  return replyWith(
    "わいわいさんいいっすよね！なんだろ、友達と集まってゲームしてる感じなんですよ。配信者の動画見始めたのもわいわいさんきっかけですね。",
    stats,
    withTopic(flags, "tv_youtube", "わいわいが好き"),
    internalEvents
  );
}

if (kyabetsuTalk) {
  return replyWith(
    "キャベツの人、あの声クセになりますよね。語り口も面白いし、言ってることもちゃんと自分の目で評価しているなって感じがして好きです。",
    stats,
    withTopic(flags, "tv_youtube", "きゃべつの人が好き"),
    internalEvents
  );
}

if (kusogeHunterTalk) {
  return replyWith(
    "クソゲーハンター大好きです。クソゲーって面白いんだって教えてもらいましたよね。まあ自分じゃやりませんが。",
    stats,
    withTopic(flags, "tv_youtube", "からすまA/クソゲーハンターが好き"),
    internalEvents
  );
}

if (ozekiGameTalk) {
  return replyWith(
    "大関ゲーム、あのーから始まるゲーム解説が楽しいですよね。本編もいいですが、ショート動画のラストに落ちがある感じ見ちゃいます。",
    stats,
    withTopic(flags, "tv_youtube", "大関ゲームが好き"),
    internalEvents
  );
}

if (kanoEikoTalk) {
  return replyWith(
    "狩野英孝、あー好きっすね。本人もキャラも相まって、笑いに愛されてるなぁって思います。常にハプニングが起こって目が離せないです。",
    stats,
    withTopic(flags, "tv_youtube", "狩野英孝が好き"),
    internalEvents
  );
}

if (nobamanTalk) {
  return replyWith(
    "のばまん！いつも、はちゃめちゃなことやってますよね。よくこんなアイデア思い浮かぶよなって思ってます。結果面白くなってるから次なにするんだろって期待しちゃいます。",
    stats,
    withTopic(flags, "tv_youtube", "のばまんが好き"),
    internalEvents
  );
}

if (streamerKnowAsk) {
  return replyWith(
    "知らないっすね。俺",
    stats,
    withTopic(flags, "tv_youtube", "未実装の配信者名は知らないと返す"),
    internalEvents
  );
}

if (streamerVideoAsk) {
  const detail = getStringFlag(flags, "last_patient_detail");

  if (detail.includes("香住蒼")) {
    return replyWith(
      "基本、声を聴きに行ってる感じっす。キャラ多く出てくる『ダンガンロンパ』とかおすすめですね。",
      stats,
      withTopic(flags, "tv_youtube", "香住蒼のおすすめはダンガンロンパ"),
      internalEvents
    );
  }

  if (detail.includes("わいわい")) {
    return replyWith(
      "ベタですけど、『Kenshi』ですね。もうずっと『○○のおいたん来たよー』を待っちゃいますよ。",
      stats,
      withTopic(flags, "tv_youtube", "わいわいのおすすめはKenshi"),
      internalEvents
    );
  }

  if (detail.includes("きゃべつの人")) {
    return replyWith(
      "『なんか良さげなニュース動画』ですね。アサクリも面白かったですけど。",
      stats,
      withTopic(flags, "tv_youtube", "きゃべつの人のおすすめ動画"),
      internalEvents
    );
  }

  if (detail.includes("からすまA") || detail.includes("クソゲーハンター")) {
    return replyWith(
      "『ちびまる子ちゃん お小遣い大作戦』ですかね。マジで面白かったです。",
      stats,
      withTopic(flags, "tv_youtube", "クソゲーハンターのおすすめ動画"),
      internalEvents
    );
  }

  if (detail.includes("大関ゲーム")) {
    return replyWith(
      "ショート動画どれもいいからなぁ。どれって言えないなぁ。",
      stats,
      withTopic(flags, "tv_youtube", "大関ゲームのショートが好き"),
      internalEvents
    );
  }

  if (detail.includes("狩野英孝")) {
    return replyWith(
      "マイクラ楽しそうにプレイしてるの見てると、自分もやりたくなりますね。",
      stats,
      withTopic(flags, "tv_youtube", "狩野英孝のマイクラが好き"),
      internalEvents
    );
  }

  if (detail.includes("のばまん")) {
    return replyWith(
      "中世の戦争で弓をマシンガンみたいにするやつとか、ズルして町の権力者になって好き放題やるやつとか好きです。",
      stats,
      withTopic(flags, "tv_youtube", "のばまんの無茶プレイ動画が好き"),
      internalEvents
    );
  }

  return replyWith(
    "どれか一個というより、その人らしさが出てる動画が好きですね。",
    stats,
    withTopic(flags, "tv_youtube", "好きな配信者のおすすめ動画を聞かれた"),
    internalEvents
  );
}

if (vtuberWatchAsk) {
  return replyWith(
    pickOne([
      "Vtuberは時々、見ます。箱で追うってより、切り抜きから入ること多いですね。",
      "ずっと張り付くほどではないですけど、Vも見ますよ。",
      "ホロもにじも名前は分かりますし、キャラを好きになったら追っちゃいます。",
    ]),
    stats,
    withTopic(flags, "tv_youtube", "Vtuberは切り抜き中心に見ることがある"),
    internalEvents
  );
}

if (gameStreamingGenreAsk) {
  return replyWith(
    pickOne([
      "ゲーム配信なら、対戦系とか反応見て面白いやつが好きです。",
      "ホラーでも対戦でも、配信者のリアクションが面白いのが好きですね。",
      "ジャンルで絞るってより、好きな人かどうかが大事っすね。",
    ]),
    stats,
    withTopic(flags, "tv_youtube", "ゲーム配信はリアクションやテンポ重視"),
    internalEvents
  );
}

if (streamReasonAsk) {
  return replyWith(
    "ゲーム見るってより配信者を見に行ってる感じですね。",
    stats,
    withTopic(flags, "tv_youtube", "配信は気楽に流せるのが魅力"),
    internalEvents
  );
}

if (doYouKnowUnknownAsk) {
  return replyWith(
    "その人は知らないっすね。",
    stats,
    withTopic(flags, "tv_youtube", "知らない配信者は知らないと返す"),
    internalEvents
  );
}

if (mangaTalk) {
  return replyWith(
    "マンガはあんま読まないです。小さいころに『シュート！』は読みました。でも内容忘れちゃったな。",
    stats,
    withTopic(flags, "daily_life", "漫画はあまり読まないが昔シュート!は読んだ"),
    internalEvents
  );
}

if (mangaDetailAsk) {
  return replyWith(
    "『シュート！』は読んでましたけど、細かい内容はもうだいぶ忘れてますね。",
    stats,
    withTopic(flags, "daily_life", "昔読んだ漫画の細部は忘れている"),
    internalEvents
  );
}

  if (newsTalk) {
    return replyWith(
      pickOne([
        "ニュースはSNSのタイムラインで見る感じっすね。",
        "流し見するくらいです。SNSで。",
      ]),
      stats,
      withTopic(flags, "generic_sick", "軽い雑談は可能だが集中しづらい"),
      internalEvents
    );
  }
  
  if (weatherChatAsk) {
  return replyWith(
    pickOne([
      "季節の変わり目はちょっと弱いかもしれないです。",
      "雨とか寒暖差でだるく感じることはありますけど、今回の症状とは違います。",
      "外の天気というより、自分の体調のせいでしんどい感じですね。",
    ]),
    stats,
    withTopic(flags, "chills", "天気雑談から体調のしんどさに戻す"),
    internalEvents
  );
}

if (workStressDetailAsk) {
  return replyWith(
    pickOne([
      "やっぱ気を使うのが一番しんどいっすね。相手によってノリも変えないといけないんで。",
      "締切と調整っすね。こっちだけじゃ決まらないこと多いんで、地味に疲れます。",
      "人と話すのは嫌いじゃないですけど、ずっと愛想よくしてると普通に消耗します。",
    ]),
    stats,
    withTopic(flags, "work_anxiety", "広告営業のしんどさ"),
    internalEvents
  );
}

if (workRewardAsk) {
  return replyWith(
    pickOne([
      "うまくハマると楽しいっすよ。提案通った時とかは普通にうれしいです。",
      "向いてるかは分からないですけど、人と話すのはそこまで嫌いじゃないです。",
      "しんどいですけど、話がうまくまとまった時はちょっと気持ちいいっす。",
    ]),
    stats,
    withTopic(flags, "work_anxiety", "広告営業のやりがい"),
    internalEvents
  );
}

if (workHumanRelationAsk) {
  return replyWith(
    "人間関係が最悪ってほどではないです。そこより、自分の将来とか働き方のほうが気になります。",
    stats,
    withTopic(flags, "work_anxiety", "職場の人間関係より将来不安が大きい"),
    internalEvents
  );
}

if (dailyRoutineAsk) {
  return replyWith(
    "平日は仕事して帰って、だらっとして終わること多いです。休日は友達と会うか、家でゆっくりしてるかですね。",
    stats,
    withTopic(flags, "daily_life", "平日は仕事中心で休日はゆっくり過ごす"),
    internalEvents
  );
}

if (dailySleepAsk) {
  return replyWith(
    "普段は極端に寝れてないわけじゃないです。最近は体調悪くてちょっとしんどいですけど。",
    stats,
    withTopic(flags, "daily_life", "普段の睡眠は極端には悪くない"),
    internalEvents
  );
}

if (tvYoutubeGenreAsk) {
  return replyWith(
    "YouTubeなら適当に流れてきたのとか、サッカー系とか、暇つぶしに見る感じです。テレビはそんなにがっつりではないです。",
    stats,
    withTopic(flags, "tv_youtube", "YouTubeはサッカーや暇つぶし中心"),
    internalEvents
  );
}

if (tvYoutubeLongWatchAsk) {
  return replyWith(
    "だらだら見る時はあります。何も考えず見れるんで、気づいたら時間たってることはあります。",
    stats,
    withTopic(flags, "tv_youtube", "YouTubeはだらだら見てしまうことがある"),
    internalEvents
  );
}

if (musicAsk) {
  return replyWith(
    pickOne([
      "音楽は流し聴きするくらいです。流行ってるの聞いたりですね。",
      "ジャンルを絞ってる感じではないですけど、適当に流すのは好きです。",
    ]),
    stats,
    withTopic(flags, "tv_youtube", "音楽は流し聴き程度"),
    internalEvents
  );
}

if (movieAsk) {
  return replyWith(
    pickOne([
      "映画とか動画はたまに見ます。今日はしんどくて集中は無理そうですけど。",
      "たくさん観るわけではないですけど、気になったのは見ますね。",
    ]),
    stats,
    withTopic(flags, "tv_youtube", "映像系はたまに見る"),
    internalEvents
  );
}

if (hobbyGenericAsk) {
  return replyWith(
    pickOne([
      "やっぱサッカーですね。観るのも、プレイも。",
      "サッカーっすね。もう小さいころからやってますから。アイデンティティーです。",
    ]),
    stats,
    withTopic(flags, "daily_life", "趣味は固定より気分型"),
    internalEvents
  );
}

if (holidayAsk) {
  return replyWith(
    pickOne([
      "休みの日は家でだらっとする日もありますし、軽く出かけることもあります。",
      "気分次第ですね。サッカーだったら絶対行きます。",
    ]),
    stats,
    withTopic(flags, "daily_life", "休日は気分でインドアも外出もする"),
    internalEvents
  );
}

if (selfImageAsk) {
  return replyWith(
    pickOne([
      "自分ではそんなに器用なタイプじゃないと思ってます。気は使うほうかもしれないですね。",
      "わりと普通だと思ってますけど、友達だけは裏切らないっす。",
      "怒鳴るタイプではないですけど、怒ったら怖いって言われます。",
    ]),
    stats,
    withTopic(flags, "daily_life", "自己認識は普通でやや気遣い型"),
    internalEvents
  );
}

if (workStressAsk) {
  return replyWith(
    pickOne([
      "仕事は好きっすよ。ただ、ストレスはゼロではないです。",
      "人間関係も含めてしんどい時はありますけど、今一番しんどいのは体調です。",
      "辞めたいとまでは毎回思わないですけど、疲れる時は普通にあります。",
    ]),
    stats,
    withTopic(flags, "work_anxiety", "仕事ストレスはあるが致命的ではない"),
    internalEvents
  );
}

if (moneyValueAsk) {
  return replyWith(
    pickOne([
      "めちゃくちゃ浪費家ではないですけど、欲しいものは絶対買います。",
      "貯金はそんなですけど、まぁ欲しいものがそんな多くないですよね。",
    ]),
    stats,
    withTopic(flags, "investment", "金銭感覚は中庸"),
    internalEvents
  );
}

if (alcoholTasteAsk) {
  return replyWith(
    pickOne([
      "お酒は普通っすね。めちゃくちゃ強いわけではないですけど、飲み会は好きっす。",
      "飲み会では飲みますが普段はあんま飲まないです。",
    ]),
    stats,
    withTopic(flags, "daily_life", "飲酒は適度"),
    internalEvents
  );
}

if (sweetsAsk) {
  return replyWith(
    pickOne([
      "甘いものは嫌いじゃないです。たまに食べるくらいっすね。",
      "めちゃくちゃ詳しいわけじゃないですけど、普通に食べます。",
    ]),
    stats,
    withTopic(flags, "food_preference", "甘いものは普通に好き"),
    internalEvents
  );
}

if (spicyAsk) {
  return replyWith(
    pickOne([
      "けっこう行けますよ。蒙古タンメンとか食べますし。",
      "ココイチは5辛くらいがちょうどいいですけど、頑張れば10辛もいけますよ。",
    ]),
    stats,
    withTopic(flags, "food_preference", "辛い物は中程度"),
    internalEvents
  );
}

if (sweetsTalk) {
  return replyWith(
    pickOne([
      "甘いものも普通に好きです。ずっと食うわけじゃないですけど、たまに欲しくなります。",
      "甘党かって言われるとそこまででもないですけど、スイーツは普通にいけます。",
      "甘いもの全然食べます。辛いの好きでも別腹じゃないですか。",
    ]),
    stats,
    withTopic(flags, "food_preference", "甘いものも好き"),
    internalEvents
  );
}

if (sweetsTypeAsk) {
  return replyWith(
    pickOne([
      "ベタですけど、アイスとかチョコとかは普通に強いです。",
      "ケーキもいいですけど、俺はアイスとかプリンとかコンビニとかで気軽に買えるのが好きです。",
      "重すぎるより、ちょっと気軽に食える甘いもののほうが好きかもです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "甘いものはアイスやチョコなど気軽なもの寄り"),
    internalEvents
  );
}

if (sweetsVsSpicyAsk) {
  return replyWith(
    "どっちかってゆーと辛いものの方が好きですね。",
    stats,
    withTopic(flags, "food_preference", "辛いものも甘いものも両方いける"),
    internalEvents
  );
}

if (coffeeTalk) {
  return replyWith(
    pickOne([
      "コーヒーは普通に飲みます。朝とか、ちょっと眠い時にあると助かります。",
      "好きですよ。毎日こだわって飲むほどではないですけど、普通に毎日飲みます。",
      "コーヒーいけます。なんとなく飲むと落ち着く感じありますよね。",
    ]),
    stats,
    withTopic(flags, "food_preference", "コーヒーは普通に飲む"),
    internalEvents
  );
}

if (coffeeStyleAsk) {
  return replyWith(
    pickOne([
      "ブラックですね。カフェラテとか甘いのはちょっと。",
      "コーヒーで甘いのは好きじゃないです。",
      "ミルクは絶対入れません。邪道です。",
    ]),
    stats,
    withTopic(flags, "food_preference", "コーヒーはブラック寄り"),
    internalEvents
  );
}

if (coffeeReasonAsk) {
  return replyWith(
    "眠気飛ばしもありますけど、なんか一息つける感じがいいんですよ。飲んでると少し整うというか。",
    stats,
    withTopic(flags, "food_preference", "コーヒーは一息つける感じが好き"),
    internalEvents
  );
}

if (coffeeTeaAsk) {
  return replyWith(
    pickOne([
      "ブラックコーヒーですね。一択っす。",
      "コーヒーでしょ。ブラックしか飲まないっす。",
    ]),
    stats,
    withTopic(flags, "food_preference", "飲み物は気分次第"),
    internalEvents
  );
}

if (moukoTalk) {
  return replyWith(
    pickOne([
      "蒙古タンメンは行ったことあります。辛いだけじゃなくて、ちゃんとパンチあるのがいいですよね。",
      "中本系はテンション上がります。体調いい時限定ですけど。",
      "蒙古タンメンは“今日は行くぞ”って気分の時に強いです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "蒙古タンメンは好意的"),
    internalEvents
  );
}

if (moukoLevelAsk) {
  return replyWith(
    pickOne([
      "北極みたいなガチ辛は結構キツかったです。攻めてますよね、あれ。",
      "ちゃんと食べるなら無茶はしない方がいいですね。少し余裕あるくらいがいいです。",
      "辛さ自慢だけしたいわけじゃないので、ちゃんとおいしく食べられるラインがいいです。",
    ]),
    stats,
    withTopic(flags, "food_preference", "蒙古タンメンは無茶よりおいしく食べる派"),
    internalEvents
  );
}

if (moukoReasonAsk) {
  return replyWith(
    "辛さだけじゃなくて、ちゃんと『食った感』あるのがいいです。ああいうパンチがあるの好きです。",
    stats,
    withTopic(flags, "food_preference", "蒙古タンメンは辛さと満足感が魅力"),
    internalEvents
  );
}

if (moukoAftermathAsk) {
  return replyWith(
    pickOne([
      "翌日、腹にくるまで含めてイベント感ありますよね。毎回やりたいわけじゃないですけど。",
      "腹に来る時は来ますけど、それ込みで食う時あるじゃないですか。",
      "汗はまあ出ますよね。あれ含めて『食った』感じはあります。",
    ]),
    stats,
    withTopic(flags, "food_preference", "蒙古タンメンは余波込みでイベント感がある"),
    internalEvents
  );
}

if (foodDetailAsk) {
  return replyWith(
    "そういうのも好きなんですけど、今はちょっと食欲なくてあまり考えられないです。すみません。",
    stats,
    withTopic(flags, "food_preference", "食欲低下があり詳細は答えづらい"),
    internalEvents
  );
}

if (lovePhilosophyAsk) {
  return replyWith(
    pickOne([
      "顔はシュッとした大人っぽい感じが好きっすね。",
      "巨乳は正義っす。",
      "まぁ一緒にいて楽しいって思えるかどうかじゃないっすか。",
    ]),
    stats,
    withTopic(flags, "girlfriend_distance", "恋愛観は気楽さと信頼重視"),
    internalEvents
  );
}

if (exerciseAsk) {
  return replyWith(
    pickOne([
      "フットサルやってるんで、それなりに運動してると思います。",
      "体力はまぁ自信ありますね。サッカーやってたんで。",
    ]),
    stats,
    withTopic(flags, "daily_life", "運動習慣は軽め"),
    internalEvents
  );
}

if (sleepRhythmAsk) {
  return replyWith(
    pickOne([
      "どっちかというと夜型寄りかもしれないです。寝起きはそんなに良くないです。",
      "朝シャキッと起きるタイプではないですね。普通に眠いです。",
    ]),
    stats,
    withTopic(flags, "daily_life", "やや夜型で寝起き弱め"),
    internalEvents
  );
}

  // =========================
  // father / scam / soccer の準備完了フラグ最終更新
  // =========================
  const finalFatherSymptomCount = [
    Boolean((flags as any).father_symptom_headache),
    Boolean((flags as any).father_symptom_numbness),
    Boolean((flags as any).father_symptom_personality_change),
  ].filter(Boolean).length;

  flags = setFlag(flags, "father_symptom_count", finalFatherSymptomCount);

  if (
    Boolean((flags as any).father_route_unlocked) &&
    Boolean((flags as any).father_history_cancer_family) &&
    finalFatherSymptomCount >= 2 &&
    stats.openness >= 50
  ) {
    flags = setFlag(flags, "father_diag_ready", true);
  }

  if (
    stats.trust >= 100 &&
    stats.validation >= 100 &&
    stats.openness >= 100 &&
    Boolean((flags as any).talked_soccer)
  ) {
    flags = setFlag(flags, "soccer_end_ready", true);
  }

  if (
    Boolean((flags as any).heard_other_partner) &&
    Boolean((flags as any).heard_money_request)
  ) {
    flags = setFlag(flags, "scam_diag_ready", true);
  }

  const shortAgree = normalized.length <= 6 && includesAny(normalized, [
  "いいね",
  "いいよね",
  "わかる",
  "まじか",
  "マジか",
  "へー",
  "なるほど",
]);

  // =========================
  // 未対応質問でも症状に寄せて返す共通処理
  // 最後のデフォルトfallbackの直前で使う
  // =========================
  const unhandledType = detectUnhandledQuestionType(normalized);

  if (shortAgree && lastPatientTopic) {
  return replyWith(
    "ほんとっすよ。",
    stats,
    flags,
    internalEvents
  );
}

  if (suggestionToneTalk) {
  return replyWith(
    pickOne([
      "あーそっすねー。そういう見方もありますね。",
      "まあ、それはそうかもしれないです。",
      "なるほど。そう言われるとそんな気もします。",
    ]),
    stats,
    withTopic(flags, "daily_life", "相手の感想や助言を軽く受ける"),
    internalEvents
  );
}

  if (unhandledType === "pain") {
    return replyWith(
      pickOne([
        "今いちばんつらいのは熱と咳です。胸が強く痛む感じは今のところないです。",
        "しんどさの中心は熱っぽさと咳ですね。ほかに強い痛みはあまりないです。",
        "痛みというより、熱と咳でだるくて集中しづらい感じです。",
      ]),
      stats,
      withTopic(flags, "generic_sick", "主症状は発熱と咳、強い疼痛は目立たない"),
      internalEvents
    );
  }

  if (unhandledType === "neuro") {
    return replyWith(
      pickOne([
        "手足が動かないとか、力が入らない感じはないです。今のところ熱と咳がメインです。",
        "しびれや麻痺は今はないです。熱っぽさと咳が一番気になります。",
        "神経っぽい症状は特にないです。つらいのは発熱と咳ですね。",
      ]),
      stats,
      withTopic(flags, "generic_sick", "神経症状は乏しく、発熱と咳が主体"),
      internalEvents
    );
  }

  if (unhandledType === "food") {
    return replyWith(
      pickOne([
        "今日は食欲はちょっと落ちてます。食べられなくはないですけど、熱と咳でしんどいです。",
        "普段の好みはありますけど、今日はあまり食べる気しないです。体調のせいですね。",
        "食事は少し減ってます。熱っぽさがあって、咳も出るのでしんどいです。",
      ]),
      stats,
      withTopic(flags, "generic_sick", "体調不良で食欲低下気味"),
      internalEvents
    );
  }

  if (unhandledType === "daily") {
    return replyWith(
      pickOne([
        "普段の生活のことより、今日は熱と咳がしんどいです。そこを見てもらえると助かります。",
        "生活の話もできますけど、今はいちばん困ってるのは発熱と咳ですね。",
        "日常のことも答えられますが、今日は体調が悪くて、熱と咳が中心です。",
      ]),
      stats,
      withTopic(flags, "generic_sick", "生活背景より現在症状の確認を優先したい"),
      internalEvents
    );
  }

  if (unhandledType === "family") {
    return replyWith(
      pickOne([
        "家族のことも話せますけど、まず自分の症状だと熱と咳がつらいです。",
        "家族の話より、今日は自分の体調がしんどいですね。熱と咳がメインです。",
        "家族についても必要なら答えます。今の症状としては発熱と咳が中心です。",
      ]),
      stats,
      withTopic(flags, "generic_sick", "家族の話題より現在症状が主体"),
      internalEvents
    );
  }

  if (unhandledType === "smalltalk") {
    return replyWith(
      pickOne([
        "雑談も嫌いじゃないですけど、今日は体調悪くて、熱と咳のことを中心に聞いてもらえると助かります。",
        "そういう話もできますが、今日はちょっとしんどいです。熱と咳がメインですね。",
        "軽い雑談なら大丈夫ですけど、今はいちばんつらいのは発熱と咳です。",
      ]),
      stats,
      withTopic(flags, "generic_sick", "軽い雑談は可能だが症状主体"),
      internalEvents
    );
  }

    if (unhandledType === "past_personal") {
    return replyWith(
      pickOne([
        "昔の話ならいろいろありますけど、今日は体調悪いんで軽めでお願いします。大きいケガとかは特にないです。",
        "子どもの頃は普通だったと思います。やんちゃすぎたとかではないです。今日はちょっとしんどいですけど。",
        "黒歴史っぽい話は、まあ誰でも多少あるじゃないですか。今は熱と咳であんまり頭回ってないです。",
      ]),
      stats,
      withTopic(flags, "generic_sick", "個人史の話題には軽く応じるが体調不良"),
      internalEvents
    );
  }

  if (unhandledType === "home_life") {
    return replyWith(
      pickOne([
        "住まいのことは答えられますけど、今日は体調悪くてあんまり長くは話せないです。",
        "そのへんの生活の話もできます。今は熱と咳がしんどいので、必要なら短めでお願いします。",
        "家のことも話せますけど、今日は症状のことを優先してもらえると助かります。",
      ]),
      stats,
      withTopic(flags, "generic_sick", "生活情報には答えられるが症状主体"),
      internalEvents
    );
  }

  if (unhandledType === "weather_feeling") {
    return replyWith(
      pickOne([
        "たしかに少し寒気はあります。熱のせいかもしれないです。",
        "今日は寒さというより、熱っぽさとだるさが気になります。",
        "外の気温というより、自分の体調のせいで寒気っぽい感じはあります。",
      ]),
      stats,
      withTopic(flags, "chills", "寒気を伴う体調不良の可能性"),
      internalEvents
    );
  }

  if (unhandledType === "sensitive_personal") {
    return replyWith(
      pickOne([
        "その話はちょっと答えにくいです。今日は症状や体調のことを中心に聞いてもらえると助かります。",
        "そこは診察に関係あるなら答えますけど、まずは体調の話を優先したいです。",
        "その質問は少し話しづらいです。今日は熱と咳が主症状です。",
      ]),
      stats,
      withTopic(flags, "generic_sick", "答えにくい話題は回避し症状へ戻す"),
      internalEvents
    );
  }

    return replyWith(
  pickOne([
    "すみません、熱で少しぼんやりしてます。",
    "うまく答えられてなかったらすみません。ちょっと熱がしんどくて。",
    "熱で少しぼんやりしてて、なんて言いました？",
    "うまく答えられてなかったらすみません。ちょっと熱がしんどくて。",
    "ちょっと熱がしんどくて。すいません。",
    "熱で少しぼんやりしてて、すみません。",
  ]),
  stats,
  withTopic(flags, "generic_sick", "発熱と咳中心"),
  internalEvents
);
}