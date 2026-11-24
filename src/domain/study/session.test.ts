import { expect, it } from 'vitest';
import { allA, aIds, bIds, blindRounds, manyInput, replaceItem, sessionAttempt,
  sessionInput, setDue, today } from '../../../tests/fixtures/study/session-catalog.ts';
import { buildSession } from './session.ts';
import { rebuildFromAttempts } from './rebuild.ts';

it('S01 includes unseen info and A in package order, excluding locked B', () => {
  expect(buildSession(sessionInput())).toEqual({ itemIds: allA,
    groups: { blind: [], due: [], current: allA, interleaved: [] }, estimatedSeconds: 170 });
});
it('S02 fills a one minute budget', () => {
  const plan = buildSession(sessionInput(1));
  expect(plan.itemIds).toEqual(['a0', 'a1']);
  expect(plan.estimatedSeconds).toBe(50);
});
it('S03 excludes archived items from all groups', () => {
  const input = sessionInput();
  replaceItem(input, 'a1', { archived: true });
  expect(buildSession(input).itemIds).toEqual(['a0', 'a2', 'a3', 'a4', 'a5']);
});
it('S04 excludes previously seen info when A is in progress', () => {
  const input = sessionInput();
  input.attempts = [sessionAttempt('a0', '2026-11-09', { tipo: 'info', confidence: null }), sessionAttempt('a1')];
  input.derived = rebuildFromAttempts(input.attempts, input.catalog, today);
  expect(buildSession(input).itemIds).not.toContain('a0');
});
it('excludes seen info even when the block is still pending', () => {
  const input = sessionInput();
  input.attempts = [sessionAttempt('a0', '2026-11-09', { tipo: 'info', confidence: null })];
  expect(buildSession(input).itemIds).toEqual(aIds);
});
it('S05 excludes items answered today with any attempt type', () => {
  const input = sessionInput();
  input.attempts = [sessionAttempt('a1', today, { tipo: 'info', confidence: null })];
  expect(buildSession(input).itemIds).toEqual(['a0', 'a2', 'a3', 'a4', 'a5']);
});
it('S06 unlocks B after mastery and interleaves A without info', () => {
  const input = sessionInput();
  input.attempts = ['2026-11-08', '2026-11-09'].flatMap(day => aIds.map(id => sessionAttempt(id, day)));
  input.derived = rebuildFromAttempts(input.attempts, input.catalog, today);
  aIds.forEach(id => { setDue(input, id); });
  const plan = buildSession(input);
  expect(plan.groups.current).toEqual(bIds);
  expect([...plan.groups.interleaved].sort()).toEqual(aIds);
  expect(plan.estimatedSeconds).toBe(195);
});
it('S07 orders due items by due then id and never repeats them', () => {
  const input = sessionInput();
  const state = input.derived.blocks.get('A');
  if (state) state.status = 'en_curso';
  aIds.forEach(id => { setDue(input, id); });
  setDue(input, 'a2', '2026-11-10T08:00:00Z');
  setDue(input, 'a4', '2026-11-09T08:00:00Z');
  setDue(input, 'a3', '2026-11-10T08:00:00Z');
  const plan = buildSession(input);
  expect(plan.groups.due).toEqual(['a4', 'a2', 'a3']);
  expect(new Set(plan.itemIds).size).toBe(plan.itemIds.length);
});
it('S08 caps blind spots and exhausts 50 items across three disjoint sessions', () => {
  const input = manyInput();
  const answered: string[] = [];
  for (const expected of blindRounds) {
    input.derived = rebuildFromAttempts(input.attempts, input.catalog, today);
    const plan = buildSession(input);
    expect(plan.groups.blind).toEqual(expected);
    expect(plan.groups.blind.length * 30).toBeLessThanOrEqual(240);
    expect(plan.estimatedSeconds).toBeLessThanOrEqual(600);
    expect(plan.itemIds.some(id => answered.includes(id))).toBe(false);
    expect(new Set(plan.itemIds).size).toBe(plan.itemIds.length);
    answered.push(...plan.itemIds);
    input.attempts.push(...plan.itemIds.map(id => sessionAttempt(id, today, { correct: false, confidence: 'seguro' })));
  }
  expect(answered).toHaveLength(50);
  expect(new Set(answered)).toEqual(new Set(input.catalog.items.keys()));
  expect(buildSession(input).itemIds).toEqual([]);
});
it('S09 is deterministic and does not mutate inputs', () => {
  const input = manyInput();
  const before = structuredClone(input);
  expect(buildSession(input)).toEqual(buildSession(input));
  expect(input).toEqual(before);
});
it('S10 changes the interleaved order with the seed, preserving the collection', () => {
  const input = manyInput(20);
  input.derived.blindSpots = [];
  input.derived.items.clear();
  for (const state of input.derived.blocks.values()) state.status = 'dominado';
  const first = buildSession(input);
  const second = buildSession({ ...input, seed: 2 });
  expect([...first.itemIds].sort()).toEqual([...second.itemIds].sort());
  expect(first.itemIds).not.toEqual(second.itemIds);
  expect(first.groups.interleaved).toHaveLength(20);
});
it('S11 fits exactly one sixty second item', () => {
  const input = sessionInput(1);
  input.attempts = [sessionAttempt('a0', today)];
  for (const id of aIds) replaceItem(input, id, { tipo: 'ordenar' });
  expect(buildSession(input).itemIds).toEqual(['a1']);
  expect(buildSession(input).estimatedSeconds).toBe(60);
});
it('S12 guarantees the first current candidate even when over budget', () => {
  const plan = buildSession(sessionInput(0.2));
  expect(plan.itemIds).toEqual(['a0']);
  expect(plan.estimatedSeconds).toBe(20);
});
it('S13 returns empty when all eligible items have been answered today', () => {
  const input = sessionInput();
  input.attempts = allA.map(id => sessionAttempt(id, today));
  expect(buildSession(input).itemIds).toEqual([]);
});
it('S14 excludes another subject even if its blind spot is first', () => {
  const input = manyInput();
  const block = input.catalog.blocks.get('X0');
  if (block) block.subjectId = 'T';
  expect(buildSession(input).itemIds).toEqual([]);
});
it('S15 builds a warm session with 2000 items and 20000 attempts under 200 ms', () => {
  const input = manyInput(2000, 100, 20000);
  input.minutes = 5;
  buildSession(input);
  const start = performance.now();
  const plan = buildSession(input);
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(200);
  expect(plan.estimatedSeconds).toBeLessThanOrEqual(300);
});
it('skips expensive candidates and continues to cheaper ones', () => {
  const input = sessionInput(1);
  replaceItem(input, 'a1', { tipo: 'ordenar' });
  replaceItem(input, 'a2', { tipo: 'flashcard' });
  expect(buildSession(input).itemIds).toEqual(['a0', 'a2']);
  expect(buildSession(input).estimatedSeconds).toBe(35);
});
it('puts never attempted evaluables before previously attempted ones', () => {
  const input = sessionInput();
  input.attempts = [sessionAttempt('a1')];
  expect(buildSession(input).groups.current).toEqual(['a0', 'a2', 'a3', 'a4', 'a5', 'a1']);
});
it('excludes locked blocks from blind, due and fallback candidates', () => {
  const input = manyInput();
  for (const state of input.derived.blocks.values()) state.locked = true;
  expect(buildSession(input).itemIds).toEqual([]);
});
it('falls back to due then interleaved when there are no current candidates', () => {
  const input = manyInput(1);
  input.minutes = 0.1;
  for (const state of input.derived.blocks.values()) state.status = 'dominado';
  expect(buildSession(input).groups.due).toEqual(['x01']);
  input.derived.items.clear();
  expect(buildSession(input).groups.interleaved).toEqual(['x01']);
});
it('does not count an item due exactly at the next cutoff as due', () => {
  const input = sessionInput();
  setDue(input, 'a1', '2026-11-11T03:00:00Z');
  expect(buildSession(input).groups.due).toEqual([]);
});
it('calibrates all costs from attempts and applies the resulting budget', () => {
  const input = sessionInput(1);
  input.attempts = Array.from({ length: 30 }, (_, i) =>
    sessionAttempt(`unrelated-${String(i)}`, '2026-11-09', { durationMs: 10000 }));
  expect(buildSession(input).itemIds).toEqual(['a0', 'a1', 'a2', 'a3', 'a4']);
  expect(buildSession(input).estimatedSeconds).toBe(60);
});
it('traverses chapters by numero and blocks in package order', () => {
  const input = sessionInput();
  const chapter = input.catalog.chapters.get('c1');
  const block = input.catalog.blocks.get('B');
  const state = input.derived.blocks.get('B');
  if (chapter) chapter.blockIds = ['A'];
  if (block) block.chapterId = 'c0';
  if (state) state.locked = false;
  input.catalog.chapters.set('c0', { id: 'c0', subjectId: 'S', numero: 0, blockIds: ['B'] });
  expect(buildSession(input).groups.current).toEqual(['b1', 'b2', 'b3', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5']);
});
it.each([0, -1, NaN, Infinity])('rejects invalid session minutes %s', minutes => {
  expect(() => buildSession(sessionInput(minutes))).toThrow('Duración');
});
