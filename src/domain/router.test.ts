import { describe, expect, it } from 'vitest';
import { homeHashes, invalidRoutes, invalidHashes, validRoutes } from '../../tests/fixtures/router';
import { buildHash, parseRoute } from './router';

describe('hash router', () => {
  it.each(validRoutes)('parses $hash', ({ hash, route }) => { expect(parseRoute(hash)).toEqual(route); });
  it.each(validRoutes)('builds $hash and round trips', ({ hash, route }) => {
    expect(buildHash(route)).toBe(hash);
    expect(parseRoute(buildHash(route))).toEqual(route);
  });
  it.each(homeHashes)('falls back to home for %s', hash => { expect(parseRoute(hash)).toEqual({ name: 'home' }); });
  it.each(invalidHashes)('rejects invalid hash %s', hash => { expect(parseRoute(hash)).toEqual({ name: 'home' }); });
  it.each(invalidRoutes)('rejects invalid id in $name', route => { expect(() => buildHash(route)).toThrow('identificador'); });
});
