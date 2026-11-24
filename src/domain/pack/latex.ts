export interface MathFragment { kind: 'inline' | 'display'; source: string }

/** Extracts dollar-delimited math outside Markdown backtick code spans/fences. */
export function extractMath(text: string): MathFragment[] {
  const result: MathFragment[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '\\') { i += 2; continue; }
    if (text[i] === '`') {
      const start = i;
      while (text[i] === '`') i++;
      const delimiter = text.slice(start, i);
      let end = text.indexOf(delimiter, i);
      while (end >= 0 && (text[end - 1] === '`' || text[end + delimiter.length] === '`'))
        end = text.indexOf(delimiter, end + delimiter.length);
      if (end >= 0) i = end + delimiter.length;
      continue;
    }
    if (text[i] !== '$') { i++; continue; }
    const delimiter = text.startsWith('$$', i) ? '$$' : '$';
    const start = i + delimiter.length;
    i = start;
    while (i < text.length) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text.startsWith(delimiter, i)) break;
      i++;
    }
    if (i >= text.length) throw new Error('`$` sin cerrar');
    result.push({ kind: delimiter === '$$' ? 'display' : 'inline', source: text.slice(start, i) });
    i += delimiter.length;
  }
  return result;
}
