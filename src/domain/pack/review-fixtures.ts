/// <reference types="node" />
import { readFileSync } from 'node:fs';
import type { MathFragment } from './latex.ts';

interface ReviewFixtures {
  math: { text: string; expected: MathFragment[] }[];
  unclosed: string[];
  badMath: string[];
  messages: { path: (string | number)[]; value: unknown; expected: string }[];
  largeMessages: { path: (string | number)[]; length: number; unit: string; expected: string }[];
  normalizationNames: string[];
  depthAccepted: number;
  depthRejected: number;
  deepLevels: number;
}
export function reviewFixtures(): ReviewFixtures {
  return JSON.parse(readFileSync(new URL('../../../tests/fixtures/packs/review-regressions.json', import.meta.url), 'utf8')) as ReviewFixtures;
}
