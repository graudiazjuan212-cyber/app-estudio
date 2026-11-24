import { fingerprintConfig } from '../../config.ts';
import { fnv1a32 } from '../render/order.ts';
import type { Item } from './schema.ts';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).filter(key => object[key] !== undefined).sort()
      .map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
export function itemFingerprint(item: Item): string {
  const json = canonical(item);
  return `${fnv1a32(json).toString(fingerprintConfig.radix).padStart(fingerprintConfig.hexLength, '0')}:${String(json.length)}`;
}
