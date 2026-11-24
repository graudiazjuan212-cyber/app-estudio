export const exactCases = [
  ['R01', '**a**', '<p><strong>a</strong></p>\n'],
  ['R02', '<script>alert(1)</script>', '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>\n'],
  ['R03', '[x](javascript:alert(1))', '<p>[x](javascript:alert(1))</p>\n'],
  ['R05', '\\$5 y 6 \\$', '<p>$5 y 6 $</p>\n'],
  ['R06', '```python\nprint(1 < 2)\n```', '<pre><code class="language-python">print(1 &lt; 2)\n</code></pre>\n'],
  ['R07', '`a $b$ c`', '<p><code>a $b$ c</code></p>\n'],
  ['R12', '$x', '<p>$x</p>\n'],
  ['R14-empty', '', ''],
  ['R14-spaces', '   ', ''],
  ['R15', '- a\n- b', '<ul>\n<li>a</li>\n<li>b</li>\n</ul>\n'],
] as const;

export const containsCases = [
  ['R04', '[x](https://ejemplo.es)', '<a href="https://ejemplo.es">x</a>'],
  ['R08', '$x$', '<span class="katex">'],
  ['R09', '$$x$$', 'katex-display'],
  ['R10', '$$\na+b\n$$', 'katex-display'],
  ['R13', '$\\comandoInexistente$', 'color:#cc0000'],
  ['R16', '![i](data:image/png;base64,AAAA)', '<img'],
  ['R18', '<img src=x onerror=alert(1)>', '&lt;img'],
] as const;

export const forbiddenCases = [
  ['R03', '[x](javascript:alert(1))', '<a'],
  ['R07', '`a $b$ c`', 'katex'],
  ['R08', '$x$', '$x$'],
  ['R17', '[x](data:text/html;base64,AAAA)', '<a'],
  ['R18', '<img src=x onerror=alert(1)>', '<img'],
  ['vbscript', '[x](vbscript:alert(1))', '<a'],
  ['code-math', '```\n$x$\n$$y$$\n```', 'katex'],
  ['indented-code', '    $$x$$', 'katex'],
  ['escaped-math', '\\$x\\$', 'katex'],
  ['untrusted-katex', '$\\href{javascript:alert(1)}{x}$', '<a href'],
] as const;

export const specialCases = ['\u0000', '😀', '$$$$'] as const;
export const inlineInput = '**a** $x$';
export const twoFormulaInput = 'Si $a$ y $b$ entonces';
export const blankLineMath = '$$\na+\n\nb\n$$';
