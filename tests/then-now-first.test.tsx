// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { VectorMorph, CursorCreature, KineticTypography, morphPoints, vertices, letterPose } from '../app/components/then-now/FirstStudies';
const props = { active: false, reduced: true, speed: 1, now: true };
afterEach(cleanup);
it('morph preserves source/end shapes and correspondence changes intermediate geometry', () => {
  expect(morphPoints('star',0,0)).toEqual(vertices('square'));
  expect(morphPoints('star',1,0)).toEqual(vertices('star'));
  expect(morphPoints('star',.5,0)).not.toEqual(morphPoints('star',.5,2));
  expect(morphPoints('star',1,2)).toEqual([...vertices('star').slice(2),...vertices('star').slice(0,2)]);
});
it('morph supports manual intermediate, shape and mapping in reduced motion', () => {
  render(<VectorMorph {...props}/>); fireEvent.change(screen.getByLabelText(/中間形状/),{target:{value:'50'}});
  expect(screen.getByText(/t=0.50/)).toBeTruthy(); fireEvent.change(screen.getByLabelText(/対応点のずれ/),{target:{value:'3'}});
  expect(screen.getByText(/i\+3/)).toBeTruthy(); fireEvent.click(screen.getByText('形を切替')); expect(screen.getByText(/四角 → 円/)).toBeTruthy();
});
it('bird keyboard target and signals work without pointer, escape clears input', () => {
  render(<CursorCreature {...props} active/>); const stage=screen.getByRole('application');
  fireEvent.keyDown(stage,{key:'ArrowLeft'}); expect(screen.getByText(/WATCH ／/)).toBeTruthy();
  fireEvent.keyDown(stage,{key:'Enter'}); expect(screen.getByText(/合図 1/)).toBeTruthy(); fireEvent.keyDown(stage,{key:'Escape'}); expect(screen.getByText(/REST ／/)).toBeTruthy();
});
it('bird leave and cancellation clear reaction even after repeated signals', () => {
  render(<CursorCreature {...props} active/>); for(let i=0;i<12;i++)fireEvent.click(screen.getByText('合図を送る'));
  fireEvent.click(screen.getByText('左へ誘う')); fireEvent.pointerLeave(screen.getByRole('application')); expect(screen.getByText(/REST ／/)).toBeTruthy(); expect(screen.getByText(/合図 12/)).toBeTruthy();
});
it('typography letters have independent phase and two compositions', () => {
  expect(letterPose(0,.3,'rise',true,0).q).toBeGreaterThan(letterPose(5,.3,'rise',true,0).q);
  expect(letterPose(2,.3,'rise',false,0)).not.toEqual(letterPose(2,.3,'spread',false,0));
  expect(letterPose(5,1,'spread',true,0).x).not.toEqual(letterPose(5,1,'spread',true,5).x);
});
it('typography meaning composition and time remain editable while stopped', () => {
  render(<KineticTypography {...props}/>); fireEvent.change(screen.getByLabelText(/時間位置/),{target:{value:'50'}}); expect(screen.getByText(/進行 50%/)).toBeTruthy();
  fireEvent.click(screen.getByText('言葉を切替')); expect(screen.getByText(/EXPAND ／ spread/)).toBeTruthy(); expect(screen.getByText(/進行 0%/)).toBeTruthy();
});
