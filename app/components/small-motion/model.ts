import type { SmallMotionId } from '../../data/smallMotionExhibits';
export const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
export const duration = (id: SmallMotionId, gravity: number, fallSpeed: number) => id === 'blink-look' ? 4800 : id === 'squash-stretch' ? 2400 / Math.sqrt(gravity) : id === 'drop-ripple' ? 1000 / fallSpeed + 1400 : 1800;
export function sample(id: SmallMotionId, progress: number, amplitude: number, rebound: number, size: number, spread: number, fallSpeed: number) {
  const p = clamp(progress);
  const impact = id === 'drop-ripple' ? (1000 / fallSpeed) / (1000 / fallSpeed + 1400) : .38;
  const after = clamp((p - impact) / (1 - impact));
  const squash = Math.max(0, 1 - Math.abs(p - .40) / .06);
  const stretch = Math.max(0, 1 - Math.abs(p - .26) / .12) * .38 + Math.max(0, 1 - Math.abs(p - .55) / .12) * .3;
  const scaleY = 1 - squash * .55 + stretch;
  return {
    bellAngle: Math.sin(p * Math.PI * 8) * amplitude * (1 - p),
    ballY: p < .38 ? 35 + 132 * (p / .38) ** 2 : 167 - Math.sin(after * Math.PI) * 100 * rebound,
    scaleY, scaleX: 1 / scaleY,
    dropY: 22 + (152 - 19 * size / 12) * clamp(p / impact) ** 2,
    dropVisible: p < impact, rippleRadius: 8 + after * spread,
    rippleOpacity: p >= impact ? 1 - after : 0, dropRadius: size,
    blink: Math.max(0, 1 - Math.abs(p - .28) / .035, 1 - Math.abs(p - .76) / .045),
  };
}
