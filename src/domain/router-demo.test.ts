import { expect, it } from 'vitest';
import { parseRoute, buildHash } from './router';
it('recognises demo with explicit flag', () => { expect(parseRoute('#/demo', true)).toEqual({ name: 'demo' }); });
it('rejects demo without flag', () => { expect(parseRoute('#/demo')).toEqual({ name: 'home' }); });
it('rejects demo when disabled', () => { expect(parseRoute('#/demo', false)).toEqual({ name: 'home' }); });
it('builds demo hash', () => { expect(buildHash({ name: 'demo' })).toBe('#/demo'); });
