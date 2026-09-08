import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { composite, deltaL } from '../contrast';
import { parseCssVars } from '../contrast';

/**
 * 层级测试 · [L-001] 层级-视觉同构
 * ────────────────────────────────────────────────────────
 * 视觉层级必须映射信息层级，且必须单调。
 *
 * 为什么这条需要测试：
 * 若 hover 与斑马纹 ΔL* 相同，hover 在偶数行上完全看不见。
 * 这是真实发生过的——先降级斑马纹，再定义 hover，才成立。
 */

const CSS = readFileSync(join(__dirname, '..', 'lumtact-tokens.css'), 'utf-8');

/** 从 rgba(...) 解析出 alpha */
function alphaOf(v: string): number {
  const m = v.match(/rgba?\([^)]*?,\s*([\d.]+)\s*\)/);
  return m ? parseFloat(m[1]) : NaN;
}

/** 从 rgba(...) 解析出叠加色（白或黑） */
function veilOf(v: string): string {
  const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) throw new Error(`无法解析：${v}`);
  const [r, g, b] = [m[1], m[2], m[3]].map((n) =>
    Number(n).toString(16).padStart(2, '0'),
  );
  return `#${r}${g}${b}`.toUpperCase();
}

interface Level {
  name: string;
  token: string;
}

const LEVELS: Level[] = [
  { name: '斑马纹 zebra', token: '--row-zebra' },
  { name: '悬停 hover', token: '--row-hover' },
  { name: '选中 selected', token: '--row-sel' },
];

function checkTheme(selector: string, label: string) {
  const T = parseCssVars(CSS, selector);
  const surface = T['--bg-surface'];

  describe(`${label} · 行状态三级`, () => {
    const deltas = LEVELS.map((lv) => {
      const raw = T[lv.token];
      const veil = veilOf(raw);
      const a = alphaOf(raw);
      return {
        name: lv.name,
        delta: deltaL(composite(veil, surface, a), surface),
      };
    });

    deltas.forEach((d, i) => {
      it(`${d.name} ΔL* = ${d.delta.toFixed(2)} — 应可察觉 [P-001]`, () => {
        expect(
          d.delta,
          `${d.name} 的 ΔL* 仅 ${d.delta.toFixed(2)}，低于 1 JND，` +
            `在感知层面不存在。违反 [P-001]`,
        ).toBeGreaterThan(1);
      });

      if (i > 0) {
        const prev = deltas[i - 1];
        it(`${prev.name} < ${d.name} — 层级单调 [L-001]`, () => {
          expect(
            d.delta,
            `层级倒挂：${d.name}(${d.delta.toFixed(2)}) 未高于 ` +
              `${prev.name}(${prev.delta.toFixed(2)})。` +
              `视觉层级必须映射信息层级，违反 [L-001]`,
          ).toBeGreaterThan(prev.delta);
        });
      }
    });

    it(`相邻层级差异足够（>1.5 ΔL*）— [P-001]`, () => {
      for (let i = 1; i < deltas.length; i++) {
        const gap = deltas[i].delta - deltas[i - 1].delta;
        expect(
          gap,
          `${deltas[i - 1].name} → ${deltas[i].name} 仅差 ${gap.toFixed(2)} ΔL*，` +
            `不足以被稳定区分。[P-001]`,
        ).toBeGreaterThan(1.5);
      }
    });
  });
}

checkTheme(':root {', '夜');
checkTheme("[data-theme='light']", '昼');

describe('层级不能只靠颜色 [L-001]', () => {
  // selected 除了底色变化，还必须有非颜色通道。
  // 组件里用左侧 2px 竖条（box-shadow inset）实现。
  it('选中态有非颜色标识', () => {
    const CSS_COMP = readFileSync(
      join(__dirname, '..', 'lumtact.css'),
      'utf-8',
    );
    const hasNonColor =
      /\[aria-selected='true'\]\s+td:first-child\s*\{[^}]*box-shadow/.test(
        CSS_COMP,
      );
    expect(
      hasNonColor,
      '选中行仅用底色区分，缺少非颜色通道。' +
        '色觉障碍用户无法分辨，违反 [L-001] 与 [C-004]',
    ).toBe(true);
  });
});
