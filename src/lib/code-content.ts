// Product policy: public fields contain prose, not source code or markup.
// This is a bounded heuristic, never the execution/security boundary. React
// escaping, typed CSS/URLs, SQL parameters and CSP must remain in place.
const CODE_RULES = [
  /```|(?:^|\n)\s*~~~/u,
  /<!--|<!doctype\b|<\?(?:php|xml|=)|<%|<\s*\/?\s*[a-z][a-z0-9:-]*(?:\s[^<>]*|\s*\/?)>/iu,
  /<\s*\/?\s*(?:script|iframe|object|embed|svg|math|style|link|meta)\b/iu,
  /\bon[a-z]+\s*=\s*(?:["']|[^\s])/iu,
  /\b(?:javascript|vbscript)\s*:|\bdata\s*:\s*(?:text\/(?:html|javascript)|application\/javascript|image\/svg\+xml)/iu,
  /\b(?:eval|Function|alert|prompt|confirm|setTimeout|setInterval|fetch|require|exec|system|shell_exec|passthru|print|console\.(?:log|error)|document\.(?:write|writeln|querySelector|createElement))\s*\(/u,
  /\b(?:const|let|var)\s+[a-z_$][\w$]*\s*(?:=|;)|\bfunction\s*(?:[a-z_$][\w$]*\s*)?\(|(?:\([^()\r\n]{0,160}\)|\b[a-z_$][\w$]*)\s*=>/iu,
  /\b(?:for|while|if|switch|catch)\s*\([^()\r\n]{0,200}\)\s*\{|\b(?:fn|func|def)\s+\w+\s*\(|\$\([^\r\n)]{1,200}\)|\$[a-z_]\w*\s*=/iu,
  /\b(?:document|window)\s*(?:\.[a-z_$][\w$]*|\[[^\]\r\n]{1,80}\])\s*(?:=|\()/iu,
  /\$\{[^}\r\n]{1,300}\}|\{\{[^}\r\n]{1,300}\}\}|\{\s*["'][^"'\r\n]{1,80}["']\s*:/u,
  /(?:^|\n)\s*(?:[.#][a-z][\w-]*|body|html|:root|@(?:media|supports|keyframes))[^{}\r\n]{0,100}\s*\{/iu,
  /@import\s|\b(?:expression|url)\s*\(|(?:-moz-binding|behavior)\s*:/iu,
  /\bunion\s+(?:all\s+)?select\b|\b(?:drop|alter|truncate)\s+(?:table|database|schema)\b|\binsert\s+into\s+[\w."`]+\s*(?:\(|values\b)|\bupdate\s+[\w."`]+\s+set\s+[\w."`]+\s*=/iu,
  /\bselect\s+(?:\*|[\w."`]+(?:\s*,\s*[\w."`]+)*)\s+from\s+[\w."`]+(?:\s*(?:;|$)|\s+where\b)/iu,
  /["']\s*(?:or|and)\s+(?:\d+\s*=\s*\d+|["'][^"']{0,60}["']\s*=\s*["'])/iu,
  /(?:^|\n)\s*(?:#![^\r\n]*\b(?:sh|bash|python|node|perl)\b|(?:sudo\s+)?(?:rm|curl|wget|bash|sh|powershell|pwsh|cmd|python\d*|node|php|perl)\s+(?:[-/]|https?:)|(?:def|class)\s+\w+\s*\([^\r\n)]{0,160}\)\s*:|from\s+[\w.]+\s+import\s+[\w*]|import\s+[\w.]+\s*(?:$|\n)|(?:public\s+)?class\s+\w+\s*\{|#\s*include\b|(?:using\s+System|package\s+main)\b)/imu,
] as const;

function decodeInspectionLayer(value: string): string {
  const entities: Record<string, string> = {
    lt: "<",
    gt: ">",
    amp: "&",
    quot: '"',
    apos: "'",
    colon: ":",
    tab: "\t",
    newline: "\n",
    lbrace: "{",
    rbrace: "}",
    sol: "/",
    bsol: "\\",
    equals: "=",
  };
  return value
    .replace(/&#(x[0-9a-f]{1,6}|\d{1,7});?/giu, (match, code: string) => {
      const number = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
      return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : match;
    })
    .replace(
      /&(lt|gt|amp|quot|apos|colon|tab|newline|lbrace|rbrace|sol|bsol|equals);/giu,
      (_match, name: string) => entities[name.toLowerCase()],
    )
    .replace(/(?:%[0-9a-f]{2})+/giu, (match) => {
      try {
        return decodeURIComponent(match);
      } catch {
        return match;
      }
    })
    .replace(
      /\\u\{([0-9a-f]{1,6})\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/giu,
      (match, wide: string, unicode: string, hex: string) => {
        const number = parseInt(wide ?? unicode ?? hex, 16);
        return number <= 0x10ffff ? String.fromCodePoint(number) : match;
      },
    );
}

export function containsCodeContent(value: string): boolean {
  let candidate = value.normalize("NFKC").replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "");
  for (let layer = 0; layer < 4; layer++) {
    if (CODE_RULES.some((rule) => rule.test(candidate))) return true;
    const decoded = decodeInspectionLayer(candidate);
    if (decoded === candidate) break;
    candidate = decoded;
  }
  return false;
}
