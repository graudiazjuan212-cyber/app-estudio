import MarkdownIt from 'markdown-it';
import katex from 'katex';
import { renderConfig } from '../../config.ts';

type Parser = InstanceType<typeof MarkdownIt>;
let markdown: Parser | undefined;
const cache = new Map<string, string>();

function renderMath(source: string, displayMode: boolean, escape: (s: string) => string): string {
  try {
    return katex.renderToString(source, {
      throwOnError: false, displayMode, output: renderConfig.mathOutput,
    });
  } catch {
    return '<span class="katex-error">' + escape(source) + '</span>';
  }
}

function closingDollar(text: string, start: number, delimiter: string): number {
  let position = start;
  while (position < text.length) {
    if (text[position] === '\\') { position += 2; continue; }
    if (text.startsWith(delimiter, position)) return position;
    position++;
  }
  return -1;
}

function getMarkdown(): Parser {
  if (markdown) return markdown;
  const parser = new MarkdownIt(renderConfig.markdown);
  parser.inline.ruler.before('escape', 'math', (state, silent) => {
    if (state.src[state.pos] !== '$') return false;
    const delimiter = state.src.startsWith('$$', state.pos) ? '$$' : '$';
    const start = state.pos + delimiter.length;
    const end = closingDollar(state.src, start, delimiter);
    if (end < 0 || end + delimiter.length > state.posMax) return false;
    if (!silent) {
      const token = state.push('math', '', 0);
      token.content = state.src.slice(start, end);
      token.markup = delimiter;
    }
    state.pos = end + delimiter.length;
    return true;
  });
  // A block rule also allows display math to contain blank lines.
  parser.block.ruler.before('fence', 'display_math', (state, startLine, endLine, silent) => {
    const start = (state.bMarks[startLine] ?? 0) + (state.tShift[startLine] ?? 0);
    if ((state.sCount[startLine] ?? 0) >= renderConfig.codeIndent || !state.src.startsWith('$$', start)) return false;
    const end = closingDollar(state.src, start + 2, '$$');
    if (end < 0) return false;
    let lastLine = startLine;
    while (lastLine < endLine && (state.eMarks[lastLine] ?? 0) < end + 2) lastLine++;
    if (lastLine >= endLine || state.src.slice(end + 2, state.eMarks[lastLine]).trim()) return false;
    if (silent) return true;
    const token = state.push('math', '', 0);
    token.block = true;
    token.content = state.src.slice(start + 2, end);
    token.markup = '$$';
    token.map = [startLine, lastLine + 1];
    state.line = lastLine + 1;
    return true;
  });
  parser.renderer.rules.math = (tokens, index) => {
    const token = tokens[index];
    if (!token) return '';
    return renderMath(token.content, token.markup === '$$', parser.utils.escapeHtml)
      + (token.block ? '\n' : '');
  };
  markdown = parser;
  return parser;
}

function render(text: string, inline: boolean): string {
  const key = (inline ? 'inline:' : 'block:') + text;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  let html = '';
  if (text.trim()) {
    const parser = getMarkdown();
    try {
      html = inline ? parser.renderInline(text) : parser.render(text);
    } catch {
      html = parser.utils.escapeHtml(text);
    }
  }
  if (cache.size >= renderConfig.cacheMax) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, html);
  return html;
}

export function renderRich(text: string): string { return render(text, false); }
export function renderRichInline(text: string): string { return render(text, true); }
export function richCacheSize(): number { return cache.size; }
