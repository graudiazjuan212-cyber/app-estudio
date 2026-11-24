// Plain-text reading of a Markdown + LaTeX text, used as the accessible name of inline content
// (a button whose whole text is a formula would otherwise have no name for assistive technology).
const spokenCommands: Readonly<Record<string, string>> = {
  sqrt: 'raíz', frac: 'fracción', cdot: 'por', times: 'por', pm: 'más menos',
  leq: 'menor o igual que', geq: 'mayor o igual que', neq: 'distinto de',
};
const escapedDollar = '\u0000';

function speak(tex: string): string {
  return tex
    .replace(/\\([A-Za-z]+)/g, (_match, name: string) => ` ${Object.hasOwn(spokenCommands, name) ? spokenCommands[name] ?? name : name} `)
    .replace(/\^/g, ' elevado a ').replace(/_/g, ' sub ').replace(/[{}]/g, ' ')
    .replace(/\\([^A-Za-z])/g, '$1').replace(/\s+/g, ' ').trim();
}

export function plainText(text: string): string {
  return text.replace(/\\\$/g, escapedDollar)
    .replace(/\$\$([^$]+)\$\$|\$([^$]+)\$/g, (_match, display: string | undefined, inline: string | undefined) =>
      ` ${speak(display ?? inline ?? '')} `)
    .replace(/[*`]/g, '').replace(new RegExp(escapedDollar, 'g'), '$').replace(/\s+/g, ' ').trim();
}
