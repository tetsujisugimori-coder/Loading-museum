// Enable the destination and transfer focus before disabling the old button.
// Never move focus from an unrelated control, including on automatic completion.
export function syncPlaybackControls({play, pause, reset, active, playing, reduced}) {
  const playEnabled = !playing && !reduced;
  const pauseEnabled = playing;
  if (playEnabled) play.disabled = false;
  if (pauseEnabled) pause.disabled = false;
  if (active === play && !playEnabled) {
    (pauseEnabled ? pause : reset).focus({preventScroll: true});
  } else if (active === pause && !pauseEnabled) {
    (playEnabled ? play : reset).focus({preventScroll: true});
  }
  play.disabled = !playEnabled;
  pause.disabled = !pauseEnabled;
}
