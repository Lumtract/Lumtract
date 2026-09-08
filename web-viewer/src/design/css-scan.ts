/**
 * CSS 结构化解析
 * ────────────────────────────────────────────────────────
 * 【为什么需要它】
 * 用正则全文扫 `--xxx:` 会把 CSS 选择器误判为声明：
 *
 *     .lumtact-btn--ghost:hover { }
 *                  ^^^^^^^^  ← BEM 修饰符，不是令牌
 *
 * 这是 AUD-010 的实测教训：测试报「组件样式定义了令牌 --ghost」，
 * 但 --ghost 根本不存在——它是选择器的一部分。
 *
 * 【原则】自定义属性声明只可能出现在【声明块内部】。
 * 所以必须先把选择器剥离，只在 { } 之间扫。
 */

/** 提取所有声明块的内容（剥离选择器） */
export function declarationBlocks(css: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of css) {
    if (ch === '{') {
      depth += 1;
      buf = '';
    } else if (ch === '}') {
      if (depth > 0) blocks.push(buf);
      depth = depth > 0 ? depth - 1 : 0;
      buf = '';
    } else if (depth > 0) {
      buf += ch;
    }
  }
  return blocks;
}

/** 剥离注释与 var() 引用，避免误报 */
function stripNonDeclarations(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // 块注释
    .replace(/var\([^)]*\)/g, ' '); // var(--x, fallback) 是引用不是定义
}

/**
 * 找出被【定义】的自定义属性名。
 * 只认声明块内的 `--x:`，不认选择器里的 `--x:`。
 */
export function findDefinedVars(css: string): string[] {
  const found = new Set<string>();
  for (const block of declarationBlocks(css)) {
    const clean = stripNonDeclarations(block);
    const re = /(^|[;{\s])(--[a-z0-9-]+)\s*:/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(clean))) found.add(m[2]);
  }
  return [...found];
}

/** 找出被【引用】的自定义属性名（var(--x)） */
export function findReferencedVars(css: string): string[] {
  const found = new Set<string>();
  const re = /var\(\s*(--[a-z0-9-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) found.add(m[1]);
  return [...found];
}
