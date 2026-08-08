export type Bounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function rectanglesOverlap(first: Bounds, second: Bounds) {
  return (
    first.right >= second.left &&
    first.left <= second.right &&
    first.bottom >= second.top &&
    first.top <= second.bottom
  );
}

export const SYSTEM_1_TO_6_CHOICES = [
  { label: "System 1", year: "1984", note: "Finderと単一アプリの直接操作", preview: "単一アプリ" },
  { label: "System 2", year: "1985", note: "Finder操作の整備", preview: "Finder整備" },
  { label: "System 3", year: "1986", note: "階層ファイルの改善", preview: "階層改善" },
  { label: "System 4", year: "1987", note: "大きな記憶装置への対応", preview: "大容量対応" },
  { label: "System 5", year: "1987", note: "1987年のMultiFinder導入。画面は展示用の簡略化です。", preview: "MultiFinder" },
  { label: "System 6", year: "1988", note: "安定した日常環境。System 5/6の詳細差は展示上簡略化しています。", preview: "安定した環境" },
] as const;

export type SystemActivation = "click" | "enter" | "space";

export function selectSystemChoice(currentIndex: number, requestedIndex: number, activation: SystemActivation) {
  if (!["click", "enter", "space"].includes(activation)) return currentIndex;
  if (!Number.isInteger(requestedIndex) || requestedIndex < 0 || requestedIndex >= SYSTEM_1_TO_6_CHOICES.length) return currentIndex;
  return requestedIndex;
}
