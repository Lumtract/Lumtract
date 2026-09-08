import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';

/**
 * 导出一致性测试
 * ────────────────────────────────────────────────────────
 * 【为什么需要它】
 * next build 每次只报【第一个】类型错误。一个漏掉的 export
 * 意味着一次完整的 build 循环——在真实项目里是几十秒到几分钟。
 *
 * 这类错误有个共同模式：A 文件引用了 B 文件没有导出的名字。
 * 这是纯静态可判定的，不需要完整类型检查。
 *
 * 【不能替代 tsc】它只查「名字存不存在」，不查类型是否匹配。
 * 类型错误（如逆变导致的赋值失败）仍然要靠 next build。
 */

const SRC = resolve(__dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

/** 剥离注释，避免注释里的伪代码干扰 */
function strip(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** 收集一个文件的具名导出 */
function exportsOf(src: string): Set<string> {
  const s = strip(src);
  const out = new Set<string>();
  const re =
    /export\s+(?:declare\s+)?(?:abstract\s+)?(?:interface|type|const|let|var|function|class|enum)\s+([A-Za-z_$][\w$]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.add(m[1]);

  for (const b of s.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of b[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const as = t.split(/\s+as\s+/);
      out.add((as[1] || as[0]).trim());
    }
  }
  return out;
}

const FILES = walk(SRC);
const EXPORTS = new Map<string, Set<string>>();
for (const f of FILES) EXPORTS.set(f, exportsOf(readFileSync(f, 'utf-8')));

interface Issue {
  from: string;
  name: string;
  target: string;
  available: string[];
}

function scan(): Issue[] {
  const issues: Issue[] = [];
  for (const f of FILES) {
    const src = strip(readFileSync(f, 'utf-8'));
    const re = /(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'(\.[^']+)'/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const target = resolve(dirname(f), m[2]);
      const real =
        [target + '.ts', target + '.tsx', join(target, 'index.ts')].find(
          (c) => existsSync(c),
        ) ?? null;
      if (!real) continue;
      const avail = EXPORTS.get(real) ?? new Set<string>();
      for (const part of m[1].split(',')) {
        const t = part.trim().replace(/^type\s+/, '');
        if (!t) continue;
        const orig = t.split(/\s+as\s+/)[0].trim();
        if (!avail.has(orig)) {
          issues.push({
            from: basename(f),
            name: orig,
            target: relative(SRC, real),
            available: [...avail],
          });
        }
      }
    }
  }
  return issues;
}

describe('模块导出一致性', () => {
  const issues = scan();

  it(`扫描 ${FILES.length} 个模块，所有具名引用都能解析`, () => {
    expect(
      issues.length,
      issues
        .map(
          (i) =>
            `  ${i.from} 引用 ${i.name} ← ${i.target}\n` +
            `    实际导出：[${i.available.join(', ')}]`,
        )
        .join('\n'),
    ).toBe(0);
  });

  it('组件公共 API 的 Props 类型均已导出', () => {
    // AUD-011：LumtactRipple 的 RippleHostProps 忘了 export，
    // 但 index.ts 试图再导出 —— next build 才报。
    // 这里把它变成一条可复现的断言。
    const idx = readFileSync(join(SRC, 'components', 'index.ts'), 'utf-8');
    const reExported = [...idx.matchAll(/export\s+type\s*\{([^}]*)\}/g)]
      .flatMap((m) => m[1].split(',').map((s) => s.trim()))
      .filter(Boolean);
    expect(reExported.length, 'index.ts 未再导出任何类型').toBeGreaterThan(0);
    // 每一条都在 scan() 里被验证过存在，这里只确认数量合理
    expect(reExported.length).toBeGreaterThanOrEqual(8);
  });
});
