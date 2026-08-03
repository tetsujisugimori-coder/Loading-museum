export type AppleInteractionFrame = {
  operation: string;
  internal: string;
  visible: string;
  result: string;
};

export function AppleInteractionFlow({ frame, current, important }: { frame: AppleInteractionFrame; current: string; important?: string }) {
  const items = [
    ["1 / 利用者の操作", frame.operation],
    ["2 / 機器・データの変化", frame.internal],
    ["3 / 画面・音・ランプ", frame.visible],
    ["4 / できるようになったこと", frame.result],
  ] as const;
  return (
    <div className="appleInteractionFlow" aria-label={`現在の工程: ${current}`}>
      <p><span>現在の工程</span><strong>{current}</strong></p>
      <ol>{items.map(([label, value]) => <li key={label}><span>{label}</span><strong>{value}</strong></li>)}</ol>
      <span className="visuallyHidden" aria-live="polite">{important ?? ""}</span>
    </div>
  );
}
