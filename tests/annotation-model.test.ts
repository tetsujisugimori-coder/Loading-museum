import { describe, expect, it } from 'vitest';
import {
  COLORS, HISTORY_LIMIT, MIN_ARROW_LENGTH, MIN_RECT_SIZE, SCENES, SAMPLES,
  canEdit, clientToImage, containedRect, formatAnnotation, formatCoordinate, guideAnnotations,
  imageToClient, initialState, moveAnnotation, numericAnnotation, resizeAnnotation, transition,
  validateAnnotation, visibleAnnotations,
  type Action, type Annotation, type AnnotationState, type Handle, type Point,
} from '../app/components/practical/annotation-model';

const apply = (s: AnnotationState, ...actions: Action[]) => actions.reduce(transition, s);
const get = (s: AnnotationState, id: string) => s.annotations.find(a => a.id === id)!;
const make = (kind: Annotation['kind'], id = `new-${kind}`): Annotation => ({
  id, kind, number: 5, title: '追加した注釈', description: '説明文', color: COLORS[0], stroke: 3,
  x: .2, y: .3, x2: .7, y2: .8,
});
function begin(s = initialState(), id = s.annotations[0].id, point: Point = { x: .4, y: .4 }, handle: Handle = 'move', time = 100): AnnotationState {
  return transition(s, { type: 'start', annotationId: id, pointerId: 7, time, point, handle });
}
function pointer(s: AnnotationState, phase: 'move' | 'up' | 'cancel', point: Point, time = 101): AnnotationState {
  return transition(s, { type: 'pointer', phase, pointerId: 7, time, generation: s.gesture!.generation, point });
}
const commitDrag = (s: AnnotationState, id: string, handle: Handle, point: Point, time = 100) => pointer(begin(s, id, { x: .4, y: .4 }, handle, time), 'up', point, time + 1);

describe('source geometry and binary64 numeric fields', () => {
  it('contains landscape and portrait sources with real letterbox offsets', () => {
    expect(containedRect({ x: 20, y: 40, width: 600, height: 600 }, SCENES.map)).toEqual({ x: 20, y: 150, width: 600, height: 380 });
    expect(containedRect({ x: 20, y: 40, width: 600, height: 600 }, SCENES.machine)).toEqual({ x: 92, y: 40, width: 456, height: 600 });
    const wide = containedRect({ x: -13, y: 101, width: 1200, height: 200 }, SCENES.machine)!;
    expect(wide).toEqual({ x: 511, y: 101, width: 152, height: 200 });
  });
  for (const scene of ['map', 'machine'] as const) for (const viewport of [
    { x: 0, y: 0, width: 360, height: 640 }, { x: 19.25, y: -31.75, width: 997.125, height: 431.2 }, { x: 83, y: 71, width: 1, height: 1 },
  ]) it(`round trips source coordinates within screen arithmetic precision: ${scene} ${viewport.width}`, () => {
    const bounds = containedRect(viewport, SCENES[scene])!;
    for (const x of [0, Number.MIN_VALUE, .12345678901234568, 1 / 3, .9999999999999999, 1]) {
      const point = { x, y: 1 - x }, client = imageToClient(point, bounds)!;
      const restored = clientToImage(client, bounds)!;
      expect(restored).not.toBeNull(); expect(restored.x).toBeCloseTo(point.x, 12); expect(restored.y).toBeCloseTo(point.y, 12);
    }
  });
  it('rejects letterboxes, zero bounds, nonfinite inputs and invalid normalized coordinates', () => {
    const viewport = { x: 0, y: 0, width: 500, height: 500 }, bounds = containedRect(viewport, SCENES.map)!;
    expect(clientToImage({ x: 250, y: 0 }, bounds)).toBeNull();
    expect(clientToImage({ x: -1, y: 250 }, bounds)).toBeNull();
    expect(clientToImage({ x: -1, y: 500 }, bounds, true)).toEqual({ x: 0, y: 1 });
    expect(clientToImage({ x: 1, y: 1 }, null)).toBeNull();
    expect(imageToClient({ x: -.001, y: .5 }, bounds)).toBeNull();
    expect(imageToClient({ x: 1.0001, y: .5 }, bounds)).toBeNull();
    for (const value of [0, -1, NaN, Infinity, -Infinity]) {
      expect(containedRect({ ...viewport, width: value }, SCENES.map)).toBeNull();
      expect(containedRect(viewport, { width: value, height: 700 })).toBeNull();
      expect(clientToImage({ x: 0, y: 0 }, { ...viewport, width: value })).toBeNull();
      expect(imageToClient({ x: .5, y: .5 }, { ...viewport, height: value })).toBeNull();
    }
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(clientToImage({ x: value, y: 0 }, bounds, true)).toBeNull();
      expect(imageToClient({ x: value, y: 0 }, bounds)).toBeNull();
      expect(containedRect({ ...viewport, x: value }, SCENES.map)).toBeNull();
    }
  });
  it('retains all binary64 digits through field formatting, parsing, reducer commits and undo/redo', () => {
    const values = [0, Number.MIN_VALUE, .10000000000000002, .12345678901234568, 1 / 3, .9999999999999999, 1];
    for (const value of values) {
      const original = { ...make('arrow'), x: value, y: value, x2: 1, y2: 0 };
      expect(formatCoordinate(value)).toBe(String(value));
      const result = numericAnnotation(original, formatAnnotation(original));
      expect(result.error).toBeUndefined(); expect(result.annotation).toEqual(original);
      let s = transition(initialState(), { type: 'add', annotation: result.annotation! });
      expect(get(s, original.id)).toEqual(original);
      s = apply(s, { type: 'undo' }, { type: 'redo' }); expect(get(s, original.id)).toEqual(original);
    }
  });
  it('rejects silently rounded decimal strings rather than snapping or truncating', () => {
    const a = make('arrow'), fields = formatAnnotation(a);
    for (const text of ['', ' ', 'NaN', 'Infinity', '-Infinity', '0x1', '1px', '1.0000000000000001', '0.1234567890123456789', '-0.00001', '1.0001', '1e-9999']) {
      expect(numericAnnotation(a, { ...fields, x: text }).error, text).toBeTruthy();
    }
    for (const text of ['.5', '0.5000', '5e-1', '+0.5']) expect(numericAnnotation(a, { ...fields, x: text }).annotation!.x).toBe(.5);
    expect(Object.is(numericAnnotation(a, { ...fields, x: '-0' }).annotation!.x, -0)).toBe(false);
    expect(numericAnnotation(make('pin'), { ...fields, x2: '', y2: 'NaN' }).error).toBeUndefined();
  });
  it('validates geometry, metadata and text links without accepting arbitrary target kinds', () => {
    const a = make('rect'); expect(validateAnnotation(a)).toBeNull();
    for (const patch of [{ x: NaN }, { y: -1 }, { x2: 1.1 }, { x2: .21 }, { y2: .31 }, { number: 0 }, { number: 1.5 }, { color: 'red' }, { stroke: 0 }, { stroke: Infinity }, { id: '' }]) expect(validateAnnotation({ ...a, ...patch })).toBeTruthy();
    const target = make('pin', 'target'), text = { ...make('text'), targetId: 'target' };
    expect(validateAnnotation(text, [target])).toBeNull();
    expect(validateAnnotation(text, [{ ...target, kind: 'arrow' }])).toBeTruthy();
    expect(validateAnnotation(text, [])).toBeTruthy();
    expect(validateAnnotation({ ...target, targetId: 'other' })).toBeTruthy();
    for (const patch of [{ title: '' }, { title: '   ' }, { title: 'a'.repeat(101) }, { description: 'a'.repeat(1501) }]) expect(validateAnnotation({ ...a, ...patch })).toBeTruthy();
    expect(validateAnnotation({ ...a, title: 'a'.repeat(100), description: 'a'.repeat(1500) })).toBeNull();
  });
  it('rejects zero and undersized arrows through numeric form, add and patch', () => {
    const a = make('arrow'), fields = formatAnnotation(a);
    expect(numericAnnotation(a, { ...fields, x2: fields.x, y2: fields.y }).error).toBeTruthy();
    expect(validateAnnotation({ ...a, x2: a.x + .001, y2: a.y })).toBeTruthy();
    let s = initialState();
    s = transition(s, { type: 'add', annotation: { ...a, x2: a.x, y2: a.y } });
    expect(s.annotations).toHaveLength(4); expect(s.past).toHaveLength(0);
    const original = get(s, 'map-route');
    s = transition(s, { type: 'update', id: original.id, patch: { x2: original.x, y2: original.y } });
    expect(get(s, original.id)).toEqual(original); expect(s.past).toHaveLength(0);
  });
});

describe('annotation geometry', () => {
  it('moves whole annotations without letting endpoints leave the source', () => {
    for (const kind of ['pin', 'text', 'arrow', 'rect'] as const) {
      const a = make(kind), moved = moveAnnotation(a, 100, -100);
      expect(validateAnnotation(moved)).toBeNull();
      expect(moved.y).toBe(0);
      if (kind === 'arrow' || kind === 'rect') { expect(moved.x2).toBe(1); expect(moved.x2 - moved.x).toBeCloseTo(a.x2 - a.x, 15); }
      else { expect(moved.x).toBe(1); expect(moved.x2).toBe(a.x2); }
      for (const invalid of [NaN, Infinity, -Infinity]) expect(moveAnnotation(a, invalid, 0)).toBe(a);
    }
    const reversed = { ...make('arrow'), x: .8, y: .7, x2: .2, y2: .1 };
    const moved = moveAnnotation(reversed, -100, 100);
    expect(moved.x2).toBe(0); expect(moved.y).toBe(1); expect(validateAnnotation(moved)).toBeNull();
  });
  for (const handle of ['arrow-start', 'arrow-end'] as const) it(`${handle} changes only its own endpoint and clamps at edges`, () => {
    const a = make('arrow'), moved = resizeAnnotation(a, handle, 100, -100);
    if (handle === 'arrow-start') expect([moved.x, moved.y, moved.x2, moved.y2]).toEqual([1, 0, a.x2, a.y2]);
    else expect([moved.x, moved.y, moved.x2, moved.y2]).toEqual([a.x, a.y, 1, 0]);
    expect(resizeAnnotation(make('pin'), handle, .1, .1)).toEqual(make('pin'));
  });
  for (const handle of ['nw', 'ne', 'sw', 'se'] as const) it(`${handle} anchors the opposite rectangle corner with minimum dimensions`, () => {
    const a = make('rect');
    const inward = resizeAnnotation(a, handle, handle.endsWith('w') ? 100 : -100, handle.startsWith('n') ? 100 : -100);
    expect(validateAnnotation(inward)).toBeNull();
    expect(inward.x2 - inward.x).toBeGreaterThanOrEqual(MIN_RECT_SIZE);
    expect(inward.y2 - inward.y).toBeGreaterThanOrEqual(MIN_RECT_SIZE);
    if (handle.endsWith('w')) expect(inward.x2).toBe(a.x2); else expect(inward.x).toBe(a.x);
    if (handle.startsWith('n')) expect(inward.y2).toBe(a.y2); else expect(inward.y).toBe(a.y);
    const outward = resizeAnnotation(a, handle, handle.endsWith('w') ? -100 : 100, handle.startsWith('n') ? -100 : 100);
    expect(handle.endsWith('w') ? outward.x : outward.x2).toBe(handle.endsWith('w') ? 0 : 1);
    expect(handle.startsWith('n') ? outward.y : outward.y2).toBe(handle.startsWith('n') ? 0 : 1);
    expect(validateAnnotation(moveAnnotation(inward, .2, .1))).toBeNull();
  });
  it('keeps minimum rectangles valid through deterministic edge and rounding stress cases', () => {
    // No random source or clock: this repeats the same binary64 boundary probes.
    const corners = ['nw', 'ne', 'sw', 'se'] as const;
    for (let i = 0; i < 200; i++) {
      const start = { ...make('rect'), x: (i * .013) % .7, y: (i * .017) % .7, x2: .9, y2: .95 };
      for (const handle of corners) {
        const small = resizeAnnotation(start, handle, handle.endsWith('w') ? 2 : -2, handle.startsWith('n') ? 2 : -2);
        for (const delta of [-Number.MAX_VALUE, -1, -.1, 0, .1, 1, Number.MAX_VALUE]) {
          const moved = moveAnnotation(small, delta, -delta);
          expect(validateAnnotation(moved)).toBeNull();
          expect(numericAnnotation(moved, formatAnnotation(moved)).annotation).toEqual(moved);
        }
      }
    }
  });
  it('repairs only produced minimum-arrow rounding loss while preserving no-op identity and numeric rejection', () => {
    let a = { ...make('arrow'), x: 0, y: .5, x2: MIN_ARROW_LENGTH, y2: .5 };
    for (let i = 1; i <= 10; i++) {
      a = moveAnnotation(a, .05, 0);
      expect(a.x).toBeCloseTo(i * .05, 14); expect(validateAnnotation(a)).toBeNull();
      expect(moveAnnotation(a, 0, 0)).toBe(a);
      expect(numericAnnotation(a, formatAnnotation(a)).annotation).toEqual(a);
    }
    const invalidNumeric = { ...a, x: .1, x2: .125 };
    expect(validateAnnotation(invalidNumeric)).toBeTruthy();
    expect(numericAnnotation(invalidNumeric, formatAnnotation(invalidNumeric)).error).toBeTruthy();
    for (const start of [0, Number.MIN_VALUE, .1, .5, .9]) for (const orientation of ['horizontal', 'vertical', 'diagonal'] as const) for (const reversed of [false, true]) {
      let original = { ...make('arrow'), x: start, y: start, x2: start + MIN_ARROW_LENGTH, y2: start };
      if (orientation === 'vertical') original = { ...original, x2: start, y2: start + MIN_ARROW_LENGTH };
      if (orientation === 'diagonal') original = { ...original, y2: start + MIN_ARROW_LENGTH };
      if (reversed) original = { ...original, x: original.x2, y: original.y2, x2: original.x, y2: original.y };
      // These exact numeric inputs may themselves fall below the boundary.
      if (validateAnnotation(original)) continue;
      for (const delta of [-Number.MAX_VALUE, -.51, -.1, 0, .1, .51, Number.MAX_VALUE]) {
        const moved = moveAnnotation(original, delta, -delta);
        expect(validateAnnotation(moved)).toBeNull();
        expect(moveAnnotation(moved, 0, 0)).toBe(moved);
      }
    }
    const edge = { ...make('arrow'), x: .5, y: .5, x2: 1, y2: 1 };
    expect(moveAnnotation(edge, 1, 1)).toBe(edge);
  });
});

describe('gesture ownership, transactions and history', () => {
  it('keeps moves provisional, commits one up and restores exact snapshots for undo/redo', () => {
    const initial = initialState(), id = initial.annotations[0].id;
    let s = begin(initial);
    s = pointer(s, 'move', { x: .6, y: .5 });
    expect(s.annotations).toEqual(initial.annotations); expect(s.past).toHaveLength(0);
    expect(visibleAnnotations(s)[0].x).not.toBe(initial.annotations[0].x);
    s = pointer(s, 'move', { x: .7, y: .6 }, 102);
    s = pointer(s, 'up', { x: .7, y: .6 }, 103);
    const committed = s.annotations;
    expect(s.gesture).toBeNull(); expect(s.past).toHaveLength(1); expect(get(s, id).x).not.toBe(get(initial, id).x);
    s = transition(s, { type: 'undo' }); expect(s.annotations).toEqual(initial.annotations);
    s = transition(s, { type: 'redo' }); expect(s.annotations).toEqual(committed);
    const noMovement = pointer(begin(s, id, { x: .4, y: .4 }, 'move', 110), 'up', { x: .4, y: .4 }, 111);
    expect(noMovement.past).toHaveLength(1);
  });
  it('cancel restores committed annotations and rejects foreign, older, nonfinite and reused-pointer events', () => {
    let s = begin(); const original = s.annotations, firstGeneration = s.gesture!.generation;
    const event: Action = { type: 'pointer', pointerId: 7, generation: firstGeneration, phase: 'up', time: 102, point: { x: .8, y: .9 } };
    expect(transition(s, { ...event, pointerId: 8 })).toBe(s);
    expect(transition(s, { ...event, generation: firstGeneration + 1 })).toBe(s);
    expect(transition(s, { ...event, time: 99 })).toBe(s);
    expect(transition(s, { ...event, time: NaN })).toBe(s);
    expect(transition(s, { ...event, phase: 'move', point: { x: NaN, y: 0 } })).toBe(s);
    s = pointer(s, 'move', { x: .8, y: .9 }, 110);
    expect(transition(s, event)).toBe(s);
    s = pointer(s, 'cancel', { x: NaN, y: NaN }, 111);
    expect(s.annotations).toEqual(original); expect(s.past).toHaveLength(0);
    expect(transition(s, { ...event, time: 112 })).toBe(s);
    expect(begin(s, original[0].id, { x: .4, y: .4 }, 'move', 109)).toBe(s);
    s = begin(s, original[0].id, { x: .4, y: .4 }, 'move', 120);
    expect(s.gesture!.generation).not.toBe(firstGeneration);
    expect(transition(s, { ...event, time: 1000 })).toBe(s);
    s = pointer(s, 'up', { x: .5, y: .6 }, 121); expect(s.past).toHaveLength(1);
  });
  it('rejects invalid starts and a second pointer without replacing gesture ownership', () => {
    const s = initialState();
    for (const point of [{ x: -.1, y: .5 }, { x: 1.1, y: .5 }, { x: NaN, y: .5 }]) expect(begin(s, s.annotations[0].id, point)).toBe(s);
    expect(begin(s, 'missing')).toBe(s);
    expect(begin(s, s.annotations[0].id, { x: .5, y: .5 }, 'se')).toBe(s);
    expect(begin(s, s.annotations[0].id, { x: .5, y: .5 }, 'move', Infinity)).toBe(s);
    const active = begin(s); expect(begin(active)).toBe(active);
  });
  it('invalid owned pointerup ends an existing-shape transaction and rolls its preview back', () => {
    const initial = initialState(), arrow = get(initial, 'map-route');
    for (const point of [{ x: arrow.x, y: arrow.y }, { x: NaN, y: .5 }]) {
      let s = begin(initial, arrow.id, { x: arrow.x2, y: arrow.y2 }, 'arrow-end');
      s = pointer(s, 'move', { x: .7, y: .6 }, 101);
      expect(visibleAnnotations(s)).not.toEqual(initial.annotations);
      const generation = s.gesture!.generation;
      s = pointer(s, 'up', point, 102);
      expect(s.gesture).toBeNull(); expect(s.annotations).toEqual(initial.annotations); expect(s.past).toHaveLength(0);
      expect(transition(s, { type: 'pointer', generation, phase: 'up', pointerId: 7, time: 103, point: { x: .8, y: .8 } })).toBe(s);
    }
  });
  for (const action of [
    { type: 'select', id: 'map-market' }, { type: 'mode', mode: 'view' }, { type: 'scene', scene: 'machine' },
    { type: 'reset' }, { type: 'undo' }, { type: 'redo' }, { type: 'abort' }, { type: 'guide', command: 'play' },
  ] satisfies Action[]) it(`${action.type} invalidates a gesture before a late pointerup`, () => {
    let s = begin(); const generation = s.gesture!.generation;
    s = pointer(s, 'move', { x: .6, y: .6 }); s = transition(s, action);
    expect(s.gesture).toBeNull();
    expect(transition(s, { type: 'pointer', pointerId: 7, generation, phase: 'up', time: 200, point: { x: 1, y: 1 } })).toBe(s);
    if (action.type !== 'scene') expect(s.annotations).toEqual(SAMPLES.map);
  });
  it('unifies add, text edit, geometry, numeric updates and linked deletion in one reversible history', () => {
    let s = initialState(); const states = [s.annotations];
    s = transition(s, { type: 'add', annotation: make('pin') }); states.push(s.annotations);
    s = transition(s, { type: 'update', id: 'map-note', patch: { title: '更新タイトル', description: '長い説明\n二行目', color: COLORS[3], stroke: 7 } }); states.push(s.annotations);
    s = commitDrag(s, 'map-market', 'nw', { x: .3, y: .3 }); states.push(s.annotations);
    s = transition(s, { type: 'update', id: 'new-pin', patch: { x: .12345678901234568, y: .9876543210987654 } }); states.push(s.annotations);
    s = transition(s, { type: 'delete', id: 'map-market' }); states.push(s.annotations);
    expect(get(s, 'map-note').targetId).toBeUndefined(); expect(s.annotations.some(a => a.id === 'map-market')).toBe(false);
    expect(s.past).toHaveLength(5);
    for (let i = states.length - 2; i >= 0; i--) { s = transition(s, { type: 'undo' }); expect(s.annotations).toEqual(states[i]); }
    for (let i = 1; i < states.length; i++) { s = transition(s, { type: 'redo' }); expect(s.annotations).toEqual(states[i]); }
    s = transition(s, { type: 'undo' }); expect(get(s, 'map-note').targetId).toBe('map-market');
    s = transition(s, { type: 'update', id: 'map-note', patch: { description: '分岐後の変更' } }); expect(s.future).toHaveLength(0);
  });
  it('caps history and ignores invalid/no-op edits without creating fake undo entries', () => {
    let s = initialState(); const id = s.annotations[0].id;
    for (let i = 1; i <= HISTORY_LIMIT + 7; i++) s = transition(s, { type: 'update', id, patch: { title: `title ${i}` } });
    expect(s.past).toHaveLength(HISTORY_LIMIT);
    for (let i = 0; i < HISTORY_LIMIT; i++) s = transition(s, { type: 'undo' });
    expect(get(s, id).title).toBe('title 7'); expect(s.past).toHaveLength(0);
    const before = s.annotations;
    s = apply(s, { type: 'add', annotation: s.annotations[0] }, { type: 'update', id, patch: { x: Infinity } }, { type: 'update', id, patch: { title: get(s, id).title } }, { type: 'delete', id: 'missing' });
    expect(s.annotations).toEqual(before); expect(s.past).toHaveLength(0); expect(s.future).toHaveLength(HISTORY_LIMIT);
  });
  it('scene switch and reset explicitly restore samples and discard both histories', () => {
    let s = apply(initialState(), { type: 'update', id: 'map-port', patch: { title: '編集後' } }, { type: 'undo' }, { type: 'reduced', reduced: true });
    s = transition(s, { type: 'scene', scene: 'machine' });
    expect(s.annotations).toEqual(SAMPLES.machine); expect(s.past).toHaveLength(0); expect(s.future).toHaveLength(0); expect(s.reduced).toBe(true);
    s = transition(s, { type: 'update', id: 'machine-drive', patch: { title: '機械を編集' } });
    s = transition(s, { type: 'scene', scene: 'map' }); expect(s.annotations).toEqual(SAMPLES.map);
    s = apply(s, { type: 'add', annotation: make('text') }, { type: 'reset' });
    expect(s.annotations).toEqual(SAMPLES.map); expect(s.past).toHaveLength(0);
  });
});

describe('drag creation', () => {
  for (const kind of ['arrow', 'rect'] as const) it(`previews ${kind} creation and commits only once, including reverse direction`, () => {
    let s = transition(initialState(), { type: 'start-create', annotation: make(kind), pointerId: 7, time: 100, point: { x: .8, y: .8 } });
    expect(s.annotations).toHaveLength(4); expect(visibleAnnotations(s)).toHaveLength(5); expect(s.past).toHaveLength(0);
    s = pointer(s, 'move', { x: .3, y: .4 }); expect(s.annotations).toHaveLength(4);
    s = pointer(s, 'up', { x: .3, y: .4 }, 102); expect(s.annotations).toHaveLength(5); expect(s.past).toHaveLength(1);
    const a = get(s, `new-${kind}`);
    expect([a.x, a.y, a.x2, a.y2]).toEqual(kind === 'rect' ? [.3, .4, .8, .8] : [.8, .8, .3, .4]);
    const committed = s.annotations; s = transition(s, { type: 'undo' }); expect(s.annotations).toEqual(SAMPLES.map);
    s = transition(s, { type: 'redo' }); expect(s.annotations).toEqual(committed);
  });
  for (const kind of ['arrow', 'rect'] as const) it(`rejects tiny ${kind} creations and cancels draft without leaking history or selection`, () => {
    const initial = initialState();
    let s = transition(initial, { type: 'start-create', annotation: make(kind), pointerId: 7, time: 100, point: { x: .5, y: .5 } });
    s = pointer(s, 'up', { x: .5 + MIN_ARROW_LENGTH / 10, y: .5 }, 101);
    expect(s.gesture).toBeNull(); expect(s.annotations).toEqual(initial.annotations); expect(s.past).toHaveLength(0); expect(s.selectedId).toBe(initial.selectedId);
    s = transition(s, { type: 'start-create', annotation: make(kind), pointerId: 7, time: 102, point: { x: .5, y: .5 } });
    s = pointer(s, 'move', { x: .9, y: .9 }, 103); s = transition(s, { type: 'abort' });
    expect(s.annotations).toEqual(initial.annotations); expect(visibleAnnotations(s)).toEqual(initial.annotations); expect(s.past).toHaveLength(0);
  });
});

describe('guide lifetime and edit/view exclusion', () => {
  it('reads every stop, reports a final finished state and rejects duplicate ticks', () => {
    let s = transition(initialState(), { type: 'guide', command: 'play' });
    const ids = guideAnnotations(s).map(a => a.id);
    expect(s.mode).toBe('view'); expect(s.guide.index).toBe(0); expect(s.selectedId).toBe(ids[0]);
    for (let i = 1; i < ids.length; i++) {
      const token = s.guide.generation;
      s = transition(s, { type: 'tick', generation: token });
      expect(s.guide.status).toBe('playing'); expect(s.guide.index).toBe(i); expect(s.selectedId).toBe(ids[i]);
      expect(transition(s, { type: 'tick', generation: token })).toBe(s);
    }
    s = transition(s, { type: 'tick', generation: s.guide.generation });
    expect(s.guide.status).toBe('finished'); expect(s.guide.index).toBe(ids.length - 1); expect(s.selectedId).toBe(ids.at(-1));
    expect(s.past).toHaveLength(0);
  });
  it('supports pause, resume, restart, manual navigation and explicit end with new generations', () => {
    let s = transition(initialState(), { type: 'guide', command: 'play' }); const first = s.guide.generation;
    s = transition(s, { type: 'tick', generation: first });
    const second = s.guide.generation;
    s = transition(s, { type: 'guide', command: 'pause' }); expect(s.guide.index).toBe(1); expect(s.guide.status).toBe('paused');
    expect(transition(s, { type: 'tick', generation: second })).toBe(s);
    s = transition(s, { type: 'guide', command: 'resume' }); expect(s.guide.index).toBe(1); expect(s.guide.status).toBe('playing');
    s = transition(s, { type: 'guide', command: 'next' }); expect(s.guide.index).toBe(2); expect(s.guide.status).toBe('paused');
    s = transition(s, { type: 'guide', command: 'prev' }); expect(s.guide.index).toBe(1);
    s = transition(s, { type: 'guide', command: 'jump', index: 3 }); expect(s.guide.index).toBe(3);
    for (const index of [-1, 4, NaN, Infinity, 1.5]) expect(transition(s, { type: 'guide', command: 'jump', index })).toBe(s);
    s = transition(s, { type: 'guide', command: 'restart' }); expect(s.guide.index).toBe(0); expect(s.guide.status).toBe('playing');
    const restarted = s.guide.generation;
    s = transition(s, { type: 'guide', command: 'end' }); expect(s.guide.status).toBe('idle'); expect(s.guide.index).toBe(-1);
    expect(transition(s, { type: 'tick', generation: restarted })).toBe(s);
  });
  it('Reset from playback restores editing, samples and empty histories and invalidates timers', () => {
    let s = apply(initialState(), { type: 'update', id: 'map-note', patch: { title: '変更済み' } }, { type: 'guide', command: 'play' });
    const token = s.guide.generation;
    s = transition(s, { type: 'reset' });
    expect(s.mode).toBe('edit'); expect(s.guide.status).toBe('idle'); expect(s.guide.index).toBe(-1);
    expect(s.annotations).toEqual(SAMPLES.map); expect(s.past).toHaveLength(0); expect(s.future).toHaveLength(0);
    expect(transition(s, { type: 'tick', generation: token })).toBe(s);
  });
  it('viewing and guide playback block all modifications; explicit edit ends playback safely', () => {
    for (const playing of [false, true]) {
      const s = transition(initialState(), playing ? { type: 'guide', command: 'play' } : { type: 'mode', mode: 'view' });
      expect(canEdit(s)).toBe(false); expect(begin(s)).toBe(s);
      for (const action of [
        { type: 'add', annotation: make('pin') }, { type: 'update', id: 'map-port', patch: { title: '不許可' } }, { type: 'delete', id: 'map-port' },
        { type: 'undo' }, { type: 'redo' }, { type: 'start-create', annotation: make('rect'), pointerId: 7, time: 10, point: { x: .5, y: .5 } },
      ] satisfies Action[]) expect(transition(s, action)).toBe(s);
      const token = s.guide.generation;
      const edit = transition(s, { type: 'mode', mode: 'edit' }); expect(canEdit(edit)).toBe(true);
      expect(transition(edit, { type: 'tick', generation: token })).toBe(edit);
      if (playing) expect(edit.guide.status).toBe('idle');
    }
  });
  for (const action of [
    { type: 'select', id: 'map-note' }, { type: 'mode', mode: 'edit' }, { type: 'scene', scene: 'machine' },
    { type: 'abort' }, { type: 'reduced', reduced: true }, { type: 'guide', command: 'restart' },
  ] satisfies Action[]) it(`${action.type} invalidates an old guide callback`, () => {
    let s = transition(initialState(), { type: 'guide', command: 'play' }); const token = s.guide.generation;
    s = transition(s, action); expect(transition(s, { type: 'tick', generation: token })).toBe(s);
  });
  it('reduced motion changes presentation without skipping any guide content', () => {
    let s = apply(initialState(), { type: 'reduced', reduced: true }, { type: 'guide', command: 'play' });
    const visited = [s.selectedId];
    while (s.guide.status === 'playing') { s = transition(s, { type: 'tick', generation: s.guide.generation }); if (s.guide.status === 'playing') visited.push(s.selectedId); }
    expect(visited).toEqual(guideAnnotations(s).map(a => a.id)); expect(s.guide.status).toBe('finished');
  });
  it('empty guides remain idle and annotation numbers determine guide order', () => {
    let s = initialState(); for (const a of [...s.annotations]) s = transition(s, { type: 'delete', id: a.id });
    s = transition(s, { type: 'guide', command: 'play' }); expect(s.guide.status).toBe('idle'); expect(s.guide.index).toBe(-1);
    s = initialState(); s = transition(s, { type: 'update', id: 'map-note', patch: { number: 1 } });
    expect(guideAnnotations(s).slice(0, 2).map(a => a.id)).toEqual(['map-port', 'map-note']);
  });
});
