import { renderRich, renderRichInline } from '../domain/render/richtext.ts';
import styles from './RichText.module.css';

interface RichTextProps { text: string; inline?: boolean; className?: string }

export function RichText({ text, inline = false, className }: RichTextProps) {
  const Tag = inline ? 'span' : 'div';
  const html = inline ? renderRichInline(text) : renderRich(text);
  // Safe: Markdown uses html: false and only KaTeX generates math HTML (trust stays false).
  return <Tag className={[styles.richText, className].filter(Boolean).join(' ')}
    dangerouslySetInnerHTML={{ __html: html }} />;
}
