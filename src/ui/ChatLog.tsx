import { useEffect, useRef } from "react";
import type { ChatMessage } from "../logic/types";

const FATHER_DIAG_NARRATION =
  "（ふらつき、嘔吐、頭痛、性格変化。そして父方はがんの家系。もしかしたら、お父さんは……？）";

const SCAM_DIAG_NARRATION =
  "（これって、あの病なんじゃ……。）";

export function ChatLog(props: { messages: ChatMessage[] }) {
  const { messages } = props;
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const colorBySpeaker = (s: ChatMessage["speaker"]) => {
    if (s === "SYSTEM") return "rgba(120,200,255,0.9)";
    if (s === "DOCTOR") return "rgba(255,255,255,0.92)";
    return "rgba(255,255,255,0.82)";
  };

  return (
    <div style={{ padding: 14, height: "100%", overflow: "auto" }}>
      {messages.map((m) => {
        const isFatherDiagNarration =
          m.speaker === "DOCTOR" && m.text === FATHER_DIAG_NARRATION;

        const isScamDiagNarration =
          m.speaker === "DOCTOR" && m.text === SCAM_DIAG_NARRATION;

        const isDoctorMonologue = isFatherDiagNarration || isScamDiagNarration;

        const textColor =
          m.color ?? (isDoctorMonologue ? "#ff4d4f" : colorBySpeaker(m.speaker));

        const labelColor =
          m.color ?? (isDoctorMonologue ? "#ff8080" : "rgba(255,255,255,0.55)");

        return (
          <div key={m.id} style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 12,
                color: labelColor,
                marginBottom: 4,
                fontWeight: isDoctorMonologue || m.color ? 700 : 400,
              }}
            >
              {m.speaker === "DOCTOR" ? "医師" : m.speaker === "PATIENT" ? "患者" : "システム"}
            </div>
            <div
              style={{
                whiteSpace: "pre-wrap",
                color: textColor,
                lineHeight: 1.5,
                fontWeight: isDoctorMonologue || m.color ? 800 : 400,
              }}
            >
              {m.text}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}