import type { Flags, Stats } from "./types";

export type RevealNode = {
  id: string;
  when: (stats: Stats, flags: Flags) => boolean;
  onceFlag: string; // 出したら true にして二度出さない
  text: string;
};

export const revealNodes: RevealNode[] = [
  {
    id: "reveal_hint_depth",
    onceFlag: "reveal_hint_depth_done",
    when: (s) => s.trust > 50 && s.openness >= 28,
    text:
      "……あ、いや。先生、なんでもないっす。ちょっと考え事してました。",
  },
  {
    id: "reveal_soccer_cough",
    onceFlag: "reveal_soccer_cough_done",
    when: (s, f) => s.trust > 50 && !!f.talked_soccer && s.condition <= 60,
    text:
      "ユナイテッドの話すると熱くなるんすけど……ゴホッ。すいません、今日マジでしんどいっす。",
  },
  {
    id: "reveal_father_awkward",
    onceFlag: "reveal_father_awkward_done",
    when: (s, f) => s.trust > 60 && !!f.mentioned_father,
    text:
      "父親の話は…まあ、好きじゃないっす。なんか…そういうの、ありますよね。",
  },
  {
    id: "reveal_honeytrap_hint",
    onceFlag: "reveal_honeytrap_hint_done",
    when: (s, f) => s.trust > 65 && s.openness > 40 && !f.hinted_honeytrap,
    text:
      "最近ちょい変な感じなんすよね。仕事絡みで…いや、これも関係ないっすわ。忘れてください。",
  },
];