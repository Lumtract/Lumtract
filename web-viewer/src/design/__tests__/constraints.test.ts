import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  contrastRatio,
  composite,
  deltaL,
  parseCssVars,
  numOf,
} from '../contrast';

/**
 * 生存权测试 · 卷三 3.5.4 不可降级底线
 * ────────────────────────────────────────────────────────
 * 这些不是普通单测。它们把「审计清单十一审」里的生理审
 * 变成了可执行断言。
 *
 * 若某条失败，说明钻石约束被违反——任何目的都不能豁免。
 */

const CSS = readFileSync(
  join(__dirname, '..', 'lumtact-tokens.css'),
  'utf-8',
);
const ROOT = parseCssVars(CSS, ':root {');
const LIGHT = parseCssVars(CSS, "[data-theme='light']");
const DARK = parseCssVars(CSS, "[data-theme='dark']");

/** 断言失败的措辞：必须指出违反了哪条约束 */
function survival(
  name: string,
  actual: number,
  need: number,
  cmp: '>=' | '<=' | '>',
  constraint: string,
) {
  const pass =
    cmp === '>=' ? actual >= need : cmp === '<=' ? actual <= need : actual > need;
  it(`${name} — [${constraint}]`, () => {
    expect(
      pass,
      `${name}：实测 ${actual.toFixed(2)}，要求 ${cmp} ${need}。` +
        `违反 [${constraint}]，这是钻石约束，任何目的不可豁免。`,
    ).toBe(true);
  });
}

describe('一 · 对比度（WCAG AA / [PHYS: P-001]）', () => {
  // 正文、次级必须达 AA 4.5:1；三级为辅助信息，3:1 即可
  survival('暗色 正文 / surface', contrastRatio(ROOT['--text-1'], ROOT['--bg-surface']), 4.5, '>=', 'P-001');
  survival('暗色 正文 / base', contrastRatio(ROOT['--text-1'], ROOT['--bg-base']), 4.5, '>=', 'P-001');
  survival('暗色 次级 / surface', contrastRatio(ROOT['--text-2'], ROOT['--bg-surface']), 4.5, '>=', 'P-001');
  survival('暗色 三级 / surface', contrastRatio(ROOT['--text-3'], ROOT['--bg-surface']), 3.0, '>=', 'P-001');

  survival('浅色 正文 / surface', contrastRatio(LIGHT['--text-1'], LIGHT['--bg-surface']), 4.5, '>=', 'P-001');
  survival('浅色 次级 / surface', contrastRatio(LIGHT['--text-2'], LIGHT['--bg-surface']), 4.5, '>=', 'P-001');
  survival('浅色 三级 / surface', contrastRatio(LIGHT['--text-3'], LIGHT['--bg-surface']), 3.0, '>=', 'P-001');
});

describe('二 · 被遮蔽处仍可读（[PHYS: P-014] 与 P-001 的边界）', () => {
  // 边缘提示落在 content 上。若把文字遮到读不出来，
  // 那就是「破坏」而不是「遮蔽」——这是两者的分界。
  const check = (theme: Record<string, string>, label: string) => {
    const surface = theme['--bg-surface'];
    const veil = theme['--edge-veil']; // "0, 0, 0" 或 "255, 255, 255"
    const alpha = numOf(theme['--edge-a']);
    const veilHex =
      '#' +
      veil
        .split(',')
        .map((n) => Number(n.trim()).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();

    const covered = composite(veilHex, surface, alpha);
    const fg1 = composite(veilHex, theme['--text-1'], alpha);
    const fg2 = composite(veilHex, theme['--text-2'], alpha);

    survival(
      `${label} 被遮处 正文`,
      contrastRatio(fg1, covered),
      4.5,
      '>=',
      'P-001 / P-014',
    );
    survival(
      `${label} 被遮处 次级`,
      contrastRatio(fg2, covered),
      4.5,
      '>=',
      'P-001 / P-014',
    );
  };

  check(DARK, '夜');
  check(LIGHT, '昼');
});

describe('三 · 时间窗口（碳基感知边界）', () => {
  // [PHYS: P-004] 因果感知下限 100ms —— 低于此，反馈在感知层面不存在
  survival('dur-press', numOf(ROOT['--dur-press']), 100, '>', 'P-004');
  // [PHYS: P-005] 200–350ms 注意力切换舒适区
  survival('dur-state 下限', numOf(ROOT['--dur-state']), 200, '>=', 'P-005');
  survival('dur-state 上限', numOf(ROOT['--dur-state']), 350, '<=', 'P-005');
  // [PHYS: P-006] 600ms 心流打断阈值
  survival('wave-dur', numOf(ROOT['--wave-dur']), 600, '<=', 'P-006');
});

describe('四 · 光敏安全（[PHYS: P-019]）', () => {
  // 闪烁 > 3Hz 可能触发光敏性癫痫。
  // 呼吸周期 1400ms = 0.71Hz，余量 4.2 倍。
  const period = numOf(ROOT['--wave-breath']);
  const hz = 1000 / period;
  survival('呼吸频率', hz, 3, '<=', 'P-019');
  it('呼吸周期换算 — [P-019]', () => {
    expect(hz).toBeLessThan(1); // 远低于安全线，不只是刚好达标
  });
});

describe('五 · 热区（[PHYS: P-010]）', () => {
  survival('hit-min', numOf(ROOT['--hit-min']), 44, '>=', 'P-010');
});

describe('六 · 波纹起始半径（[PHYS: P-004]）', () => {
  // 起始半径下限是可见性的真正保证者，不是缓动曲线。
  // scale(0) 在小容器上只有 1.7px —— 肉眼不可见。
  survival('wave-min-r', numOf(ROOT['--wave-min-r']), 9, '>=', 'P-004');
});

describe('七 · 边缘遮蔽强度（[PHYS: P-001] 与克制性）', () => {
  // 峰值 ΔL* 应落在 8–20 之间：
  // 低于 8 可能不被察觉（P-001 失效），高于 20 则开始扰动内容（P-016）
  for (const [label, theme] of [
    ['夜', DARK],
    ['昼', LIGHT],
  ] as const) {
    const surface = theme['--bg-surface'];
    const veil = theme['--edge-veil'];
    const alpha = numOf(theme['--edge-a']);
    const veilHex =
      '#' +
      veil
        .split(',')
        .map((n: string) => Number(n.trim()).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    const d = deltaL(composite(veilHex, surface, alpha), surface);
    survival(`${label} veil ΔL* 下限`, d, 8, '>=', 'P-001');
    survival(`${label} veil ΔL* 上限`, d, 20, '<=', 'P-016');
  }
});
