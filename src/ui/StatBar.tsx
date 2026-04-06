export function StatBar(props: { label: string; value: number }) {
  const { label, value } = props;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <small>{label}</small>
        <small style={{ color: "rgba(255,255,255,0.85)" }}>{Math.round(value)}</small>
      </div>
      <div style={{ height: 10, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden" }}>
        <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: "rgba(120,200,255,0.55)" }} />
      </div>
    </div>
  );
}