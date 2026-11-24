import { plainText } from '../domain/render/plain.ts';
import { renderRich, renderRichInline } from '../domain/render/richtext.ts';
import styles from './RichText.module.css';

interface RichTextProps { text: string; inline?: boolean; className?: string }

export function RichText({ text, inline = false, className }: RichTextProps) {
  const Tag = inline ? 'span' : 'div';
  const html = inline ? renderRichInline(text) : renderRich(text);
  // Inline content with formulas gets a plain-text name: a button made only of a formula has no name otherwise.
  const spoken = inline && text.includes('$') ? plainText(text) : '';
  const name = spoken ? { role: 'img', 'aria-label': spoken } : {};
  // Safe: Markdown uses html: false and only KaTeX generates math HTML (trust stays false).
  return <Tag className={[styles.richText, className].filter(Boolean).join(' ')} {...name}
    dangerouslySetInnerHTML={{ __html: html }} />;
}
