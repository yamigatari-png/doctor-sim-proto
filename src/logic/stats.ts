import type { Flags, Stats } from "./types";

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export type StatEvent =
  | { type: "EMPATHY" }
  | { type: "SUMMARY" }
  | { type: "ACCUSATION" }
  | { type: "SOCCER_TALK" }
  | { type: "PRAISE" }
  | { type: "PRIVACY_CARE" }
  | { type: "PRIVACY_INTRUSIVE" }
  | { type: "SMOKING_ASKED" }
  | { type: "VACCINE_ASKED" }
  | { type: "BASEBALL_TALK" }
  | { type: "FATHER_TALK" }
  | { type: "SEXWORK_PROBE" }
  | { type: "AGGRESSIVE" }
  | { type: "REPEATED_QUESTION" };

export function applyEvent(stats: Stats, flags: Flags, ev: StatEvent): { stats: Stats; flags: Flags } {
  const s: Stats = { ...stats };
  const f: Flags = { ...flags };

  const add = (k: keyof Stats, d: number) => (s[k] = clamp(s[k] + d));

  switch (ev.type) {
    case "EMPATHY":
      add("trust", +6);
      add("defense", -3);
      add("openness", +2);
      break;

    case "SUMMARY":
      add("trust", +4);
      add("openness", +1);
      break;

    case "PRAISE":
      add("validation", +7);
      add("trust", +2);
      add("defense", -1);
      break;

    case "ACCUSATION":
      add("trust", -10);
      add("defense", +10);
      add("openness", -4);
      break;

    case "PRIVACY_CARE":
      add("trust", +3);
      add("defense", -2);
      break;

    case "PRIVACY_INTRUSIVE":
      add("trust", -5);
      add("defense", +8);
      add("openness", -2);
      break;

    case "SOCCER_TALK":
      f.talked_soccer = true;
      add("trust", +3);
      add("validation", +2);
      add("condition", -2);
      // “何かある”匂わせ：必ず深度が微増
      add("openness", +1);
      break;

    case "BASEBALL_TALK":
      f.talked_baseball = true;
      add("trust", +1);
      add("defense", +2); // 父の記憶に触れやすい
      break;

    case "FATHER_TALK":
      f.mentioned_father = true;
      add("defense", +4);
      add("trust", +1);
      add("openness", +1);
      break;

    case "SEXWORK_PROBE":
      f.probed_sexwork = true;
      // 関係性が浅いと嫌がるが、丁寧なら別イベントで相殺
      add("defense", +6);
      add("trust", -2);
      break;

    case "REPEATED_QUESTION":
      add("trust", -4);
      add("defense", +3);
      add("openness", -1);
      break;

    case "SMOKING_ASKED":
      f.asked_smoking = true;
      // IQOSをタバコ扱いされると嫌なので、ニュートラルに
      add("trust", +0);
      break;

    case "VACCINE_ASKED":
      f.asked_vaccine = true;
      add("trust", +2);
      break;

    case "AGGRESSIVE":
  stats.trust -= 6;
  stats.validation -= 4;
  stats.defense += 6;
  break;
  }

  return { stats: s, flags: f };
}