import { packConfig } from '../../config.ts';

export class InputDepthError extends Error {}
type Container = Record<string, unknown> | unknown[];
type Frame = { value: unknown; parent: Container; key: string; depth: number }
  | { leave: object };

/** Copies only own enumerable JSON data, without invoking inherited toJSON methods. */
export function normalizeJson(input: unknown): unknown {
  const root: Record<string, unknown> = {};
  const active = new Set<object>();
  const stack: Frame[] = [{ value: input, parent: root, key: 'value', depth: 0 }];
  while (stack.length) {
    const frame = stack.pop();
    if (!frame) break;
    if ('leave' in frame) { active.delete(frame.leave); continue; }
    const { value, parent, key, depth } = frame;
    if (depth > packConfig.depthMax) throw new InputDepthError();
    let copy: unknown = value;
    if (typeof value === 'object' && value !== null) {
      if (active.has(value)) throw new Error('Cyclic JSON');
      active.add(value);
      const container: Container = Array.isArray(value) ? [] : Object.create(null) as Record<string, unknown>;
      copy = container;
      stack.push({ leave: value });
      const keys = Object.keys(value);
      // Read once: getters cannot change between the depth check and the copy.
      for (const childKey of keys.reverse()) stack.push({
        value: Reflect.get(value, childKey), parent: container, key: childKey, depth: depth + 1,
      });
      if (Array.isArray(value) && keys.length !== value.length) throw new Error('Non-JSON array');
    } else if (value !== null && typeof value !== 'string' && typeof value !== 'boolean' &&
      !(typeof value === 'number' && Number.isFinite(value))) throw new Error('Non-JSON value');
    Object.defineProperty(parent, key, { value: copy, enumerable: true, configurable: true, writable: true });
  }
  // Return ordinary JSON objects, with no references to the original input.
  return JSON.parse(JSON.stringify(root.value)) as unknown;
}
