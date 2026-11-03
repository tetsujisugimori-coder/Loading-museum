import { judgeTiming } from './waapi-interaction-state';
export { judgeTiming };
export const TIMING_WINDOW_START = 420;
export const TIMING_WINDOW_END = 680;
export const TIMING_EFFECT_DURATION = 420;
export const TIMING_OBSERVATION_DURATION = 1420;
export type TimingResult = ReturnType<typeof judgeTiming>;
/** The same presentation recipe is used by the live game and isolated preview. */
export function timingEffectFrames(dodge: boolean, result: TimingResult, side: -1 | 0 | 1): Keyframe[] {
  const success = result === 'PERFECT';
  return dodge && success
    ? [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${side * 66}px)`, opacity: .55 }, { transform: `translateX(${side * 58}px)`, opacity: 1 }]
    : [{ transform: 'scale(1)' }, { transform: `scale(${success ? 1.22 : .86})` }, { transform: 'scale(1)' }];
}
