export function substituteMarkers(text: string): string {
  return text.replace(/\{\{(\d+)\}\}/g, '**[$1]**');
}
export function placeStep(order: number[], step: number): number[] {
  return order.includes(step) ? order : [...order, step];
}
export function unplaceStep(order: number[], step: number): number[] {
  return order.filter(value => value !== step);
}
export function togglePair(pairs: [number, number][], left: number, right: number): [number, number][] {
  const rest = pairs.filter(([l, r]) => l !== left && r !== right);
  return pairs.some(([l, r]) => l === left && r === right) ? rest : [...rest, [left, right]];
}
export function originalIndex(order: number[], visible: number): number | undefined { return order[visible]; }
