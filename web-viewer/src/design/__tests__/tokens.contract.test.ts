import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { parseCssVars, numOf } from '../contrast';
import { findDefinedVars, findReferencedVars } from '../css-scan';
import { wave, hit, dur, edge } from '../tokens';

/**
 * 契约测试 · 单一事实源
 * ────────────────────────────────────────────────────────
 * AUD-007 的教训：同一个令牌在两处有值 = 漂移的定义。
 *
 * 本包引入了 CSS 与 TS 两份令牌（CSS 供样式，TS 供逻辑）。
 * 这本身就是风险——两份「单一事实源」是矛盾的。
 *
 * 所以必须有这份测试：它们必须始终一致。
 * 若不一致，就是漂移，构建应失败。
 */

const TOKENS_CSS = readFileSync(
  join(__dirname, '..', 'lumtact-tokens.css'),
  'utf-8',
);
const ROOT = parseCssVars(TOKENS_CSS, ':root {');
const LIGHT = parseCssVars(TOKENS_CSS, "[data-theme='light']");
const DARK = parseCssVars(TOKENS_CSS, "[data-theme='dark']");

describe('CSS 变量 ↔ TS 常量', () => {
  const pairs: Array<[string, number, string]> = [
    ['--wave-min-r', wave.minRadius.value, '波纹起始半径'],
    ['--wave-dur', wave.duration.value, '波纹时长'],
    ['--wave-breath', wave.breath.value, '呼吸周期'],
    ['--hit-min', hit.min.value, '热区'],
    ['--edge-w', edge.width.value, '边缘遮蔽宽度'],
    ['--dur-press', dur.press.value, '按下时长'],
    ['--dur-state', dur.state.value, '状态切换时长'],
  ];

  pairs.forEach(([cssVar, tsValue, label]) => {
    it(`${cssVar} = ${tsValue}（${label}）`, () => {
      const actual = numOf(ROOT[cssVar] ?? '');
      expect(
        Number.isFinite(actual),
        `CSS 中未找到 ${cssVar}，或值不是数字`,
      ).toBe(true);
      expect(
        actual,
        `漂移：CSS ${cssVar}=${actual}，TS=${tsValue}。` +
          `同一个令牌在两个地方有值 —— 这正是 AUD-007 发现的问题。`,
      ).toBe(tsValue);
    });
  });

  it('--edge-a（夜）= alphaDark', () => {
    expect(numOf(DARK['--edge-a']), '夜主题遮蔽强度漂移').toBe(
      edge.alphaDark.value,
    );
  });

  it('--edge-a（昼）= alphaLight', () => {
    expect(numOf(LIGHT['--edge-a']), '昼主题遮蔽强度漂移').toBe(
      edge.alphaLight.value,
    );
  });
});

describe('组件样式不得重新定义令牌', () => {
  const COMPONENT_CSS = readFileSync(join(__dirname, '..', 'lumtact.css'), 'utf-8');
  const TOKEN_CSS = readFileSync(
    join(__dirname, '..', 'lumtact-tokens.css'),
    'utf-8',
  );

  it('lumtact.css 中无 :root 或主题块', () => {
    const redefines = /:root\s*\{|\[data-theme[^\]]*\]\s*\{/.test(COMPONENT_CSS);
    expect(
      redefines,
      '组件样式重新定义了令牌。令牌的唯一定义处是 lumtact-tokens.css，' +
        '违反卷三 3.5.4「设计令牌零硬编码」',
    ).toBe(false);
  });

  it('lumtact.css 中无自定义属性定义（只允许 var() 引用）', () => {
    // 【必须用结构化解析，不能用正则全文扫】
    // AUD-010：全文扫会把 `.lumtact-btn--ghost:hover` 里的
    // BEM 修饰符 --ghost 误判为令牌定义。
    const defs = findDefinedVars(COMPONENT_CSS);
    expect(
      defs.length,
      `组件样式定义了令牌：${defs.join(', ')}。` +
        `应改为引用 lumtact-tokens.css`,
    ).toBe(0);
  });

  it('lumtact.css 确实在引用令牌（不是空引用）', () => {
    const refs = findReferencedVars(COMPONENT_CSS);
    expect(
      refs.length,
      '组件样式没有引用任何令牌 —— 说明它没接上令牌体系',
    ).toBeGreaterThan(10);
  });

  it('令牌文件是唯一定义处（组件引用 ⊆ 令牌定义）', () => {
    const defined = new Set(findDefinedVars(TOKEN_CSS));
    const used = findReferencedVars(COMPONENT_CSS);
    const orphan = used.filter((u) => !defined.has(u));
    expect(
      orphan.length,
      `组件引用了未定义的令牌：${orphan.join(', ')}。` +
        `这些 var() 会取不到值，组件退化为裸样式。`,
    ).toBe(0);
  });
});

/**
 * 元测试：解析器本身必须正确
 * ────────────────────────────────────────────────────────
 * AUD-010 的教训：检测逻辑自己出过错，报了个不存在的 --ghost。
 *
 * 一个会误报的测试会被人关掉，所以解析器必须被测试。
 * 而且要用【真实出过错的那条 CSS】作为用例。
 */
describe('元测试：CSS 解析器', () => {
  it('忽略选择器中的 BEM 修饰符（AUD-010 回归）', () => {
    const cases = [
      '.lumtact-btn--ghost:hover { background: red; }',
      '.lumtact-btn--primary:focus-visible { outline: 1px solid; }',
      '.lumtact-btn--ghost:not(:disabled):hover { background: var(--card-hover); }',
      '@media (hover: hover) { .a--ghost:hover { color: var(--text-1); } }',
    ];
    for (const css of cases) {
      expect(
        findDefinedVars(css).length,
        `误报：${css} 被判定为定义了令牌`,
      ).toBe(0);
    }
  });

  it('抓到真正的重定义', () => {
    const cases: Array<[string, string]> = [
      ['.x { --brand: #f00; }', '--brand'],
      [':root { --hit-min: 32px; }', '--hit-min'],
      ["[data-theme='light'] { --bg-base: #000; }", '--bg-base'],
      ['.y { color: var(--text-1); --custom: 1px; }', '--custom'],
    ];
    for (const [css, expected] of cases) {
      const defs = findDefinedVars(css);
      expect(defs, `漏报：${css} 未检出 ${expected}`).toContain(expected);
    }
  });

  it('忽略 var() 引用与注释', () => {
    const css = `
      /* --commented: not a definition; */
      .a { color: var(--text-1, #fff); }
    `;
    expect(findDefinedVars(css).length).toBe(0);
    expect(findReferencedVars(css)).toContain('--text-1');
  });
});

describe('组件源码不得硬编码令牌值', () => {
  const DIR = join(__dirname, '..', '..', 'components');

  // 【只扫生产组件，不扫 stories】
  // stories 是演示代码，里面有按钮尺寸 h:44、数据行 id:'6' 之类，
  // 它们不是令牌值。把 stories 纳入扫描会产生大量误报——
  // 噪音大的测试等于没有测试，会被人关掉。
  const files = readdirSync(DIR).filter((f) => {
    if (!['.ts', '.tsx'].includes(extname(f))) return false;
    if (f.includes('.stories.')) return false;
    if (f === 'index.ts') return false;
    return true;
  });

  // 有对应令牌的魔法数字
  const BANNED: Array<[number, string]> = [
    [44, '--hit-min [P-010]'],
    [9, '--wave-min-r [P-004]'],
    [1400, '--wave-breath [P-019]'],
    [520, '--wave-dur [P-006]'],
    [6, 'wave.maxConcurrent [R-001]'],
  ];

  /** 剥离注释与字符串字面量，避免文案里的数字误报 */
  function stripLiterals(src: string): string {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, ' ')   // 块注释
      .replace(/\/\/[^\n]*/g, ' ')             // 行注释
      .replace(/'[^'\n]*'/g, "''")               // 单引号字符串
      .replace(/"[^"\n]*"/g, '""')               // 双引号字符串
      .replace(/`[^`]*`/g, '``');                 // 模板字符串
  }

  it(`扫描 ${files.length} 个生产组件，无被令牌化的魔法数字`, () => {
    const violations: string[] = [];
    for (const f of files) {
      const src = readFileSync(join(DIR, f), 'utf-8');
      const code = stripLiterals(src);
      for (const [num, token] of BANNED) {
        const re = new RegExp(`(?<![\\w.])${num}(?![\\w.])`, 'g');
        if (re.test(code)) violations.push(`${f} 含 ${num}（应为 ${token}）`);
      }
    }
    expect(
      violations.length,
      `硬编码令牌值：\n  ${violations.join('\n  ')}\n` +
        `应从 tokens.ts 读取。卷三 3.5.4：设计令牌零硬编码是不可降级底线。`,
    ).toBe(0);
  });
});
