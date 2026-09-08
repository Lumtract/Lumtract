#!/usr/bin/env node
/**
 * Lumtact · 约束校验（不依赖 vitest）
 * ────────────────────────────────────────────────────────
 * 用途：装好就想立刻知道「设计值有没有违反约束」，
 * 不必先配好测试框架。
 *
 * 用法：
 *   node scripts/verify.mjs
 *
 * 【诚实声明】
 * 本文件内联了一份颜色计算，是 src/design/contrast.ts 的镜像。
 * 之所以重复：node 不能直接 import TS。
 * 若两份结果不一致，以 contrast.ts 为准——
 * 正式的、进 CI 的校验请用 vitest（npm test）。
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(
  join(__dirname, '..', 'src', 'design', 'lumtact-tokens.css'),
  'utf-8',
);

/* ── 颜色计算（contrast.ts 的镜像）──────────────────── */
const s2l = (c) => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};
const Y = (hex) => {
  const h = hex.replace('#', '');
  const p = (i) => parseInt(h.slice(i, i + 2), 16);
  return 0.2126 * s2l(p(0)) + 0.7152 * s2l(p(2)) + 0.0722 * s2l(p(4));
};
const Ls = (hex) => {
  const y = Y(hex);
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
};
const CR = (a, b) => {
  const [x, y] = [Y(a), Y(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const over = (f, b, a) => {
  const F = f.replace('#', '');
  const B = b.replace('#', '');
  const ch = (i) => {
    const v = Math.round(
      Math.min(255, Math.max(0, parseInt(F.slice(i, i + 2), 16) * a + parseInt(B.slice(i, i + 2), 16) * (1 - a))),
    );
    return v.toString(16).padStart(2, '0');
  };
  return ('#' + ch(0) + ch(2) + ch(4)).toUpperCase();
};
const dL = (a, b) => Math.abs(Ls(a) - Ls(b));

/* ── CSS 解析 ────────────────────────────────────────── */
function scope(sel) {
  const i = CSS.indexOf(sel);
  if (i < 0) return {};
  const open = CSS.indexOf('{', i);
  let depth = 0,
    end = open;
  for (let k = open; k < CSS.length; k++) {
    if (CSS[k] === '{') depth++;
    else if (CSS[k] === '}') {
      depth--;
      if (depth === 0) { end = k; break; }
    }
  }
  const body = CSS.slice(open + 1, end);
  const out = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(body))) out[m[1]] = m[2].trim();
  return out;
}
const num = (v) => {
  const m = String(v).match(/-?[\d.]+/);
  return m ? parseFloat(m[0]) : NaN;
};
const rgbTriple = (v) => {
  const m = v.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) throw new Error('无法解析 rgb 三元组: ' + v);
  return '#' + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, '0')).join('').toUpperCase();
};

const ROOT = scope(':root {');
const LIGHT = scope("[data-theme='light']");
const DARK = scope("[data-theme='dark']");

/* ── 校验 ────────────────────────────────────────────── */
const results = [];
const check = (group, name, actual, need, cmp, cid, unit = '') => {
  const pass = cmp === '>=' ? actual >= need : cmp === '<=' ? actual <= need : actual > need;
  results.push({ group, name, actual, need, cmp, cid, unit, pass });
};

// 一 · 对比度
for (const [label, T] of [['夜', DARK], ['昼', LIGHT]]) {
  const s = T['--bg-surface'];
  check('对比度', `${label} 正文`, CR(T['--text-1'], s), 4.5, '>=', 'P-001', ':1');
  check('对比度', `${label} 次级`, CR(T['--text-2'], s), 4.5, '>=', 'P-001', ':1');
  check('对比度', `${label} 三级`, CR(T['--text-3'], s), 3.0, '>=', 'P-001', ':1');
}

// 二 · 被遮蔽处
for (const [label, T] of [['夜', DARK], ['昼', LIGHT]]) {
  const veil = rgbTriple(T['--edge-veil']);
  const a = num(T['--edge-a']);
  const bg = over(veil, T['--bg-surface'], a);
  check('被遮蔽处', `${label} 正文`, CR(over(veil, T['--text-1'], a), bg), 4.5, '>=', 'P-001 / P-014', ':1');
  check('被遮蔽处', `${label} 次级`, CR(over(veil, T['--text-2'], a), bg), 4.5, '>=', 'P-001 / P-014', ':1');
}

// 三 · 时间窗口
check('时间窗口', 'dur-press', num(ROOT['--dur-press']), 100, '>', 'P-004', 'ms');
check('时间窗口', 'dur-state 下限', num(ROOT['--dur-state']), 200, '>=', 'P-005', 'ms');
check('时间窗口', 'dur-state 上限', num(ROOT['--dur-state']), 350, '<=', 'P-005', 'ms');
check('时间窗口', 'wave-dur', num(ROOT['--wave-dur']), 600, '<=', 'P-006', 'ms');

// 四 · 光敏
const hz = 1000 / num(ROOT['--wave-breath']);
check('光敏安全', '呼吸频率', hz, 3, '<=', 'P-019', 'Hz');

// 五 · 热区
check('热区', 'hit-min', num(ROOT['--hit-min']), 44, '>=', 'P-010', 'px');

// 六 · 起始半径
check('波纹', 'wave-min-r', num(ROOT['--wave-min-r']), 9, '>=', 'P-004', 'px');

// 七 · 遮蔽强度
for (const [label, T] of [['夜', DARK], ['昼', LIGHT]]) {
  const veil = rgbTriple(T['--edge-veil']);
  const a = num(T['--edge-a']);
  const d = dL(over(veil, T['--bg-surface'], a), T['--bg-surface']);
  check('遮蔽强度', `${label} ΔL* 下限`, d, 8, '>=', 'P-001', '');
  check('遮蔽强度', `${label} ΔL* 上限`, d, 20, '<=', 'P-016', '');
}

// 八 · 层级单调
for (const [label, T] of [['夜', DARK], ['昼', LIGHT]]) {
  const s = T['--bg-surface'];
  const dv = (tok) => {
    const raw = T[tok];
    const a = parseFloat(raw.match(/,\s*([\d.]+)\s*\)/)[1]);
    return dL(over(rgbTriple(raw), s, a), s);
  };
  const z = dv('--row-zebra'), h = dv('--row-hover'), sel = dv('--row-sel');
  check('层级单调', `${label} zebra→hover`, h - z, 1.5, '>', 'L-001', ' ΔL*');
  check('层级单调', `${label} hover→sel`, sel - h, 1.5, '>', 'L-001', ' ΔL*');
}

/* ── 输出 ────────────────────────────────────────────── */
const C = { g: '\x1b[32m', r: '\x1b[31m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };
const groups = [...new Set(results.map((r) => r.group))];

console.log('\n' + C.b + 'Lumtact · 约束校验' + C.x + C.d + '  v10.0.0-alpha' + C.x + '\n');

let fail = 0;
for (const g of groups) {
  console.log(C.b + '  ' + g + C.x);
  for (const r of results.filter((x) => x.group === g)) {
    if (!r.pass) fail++;
    const mark = r.pass ? C.g + '✓' + C.x : C.r + '✗' + C.x;
    const val = r.actual.toFixed(2) + r.unit;
    console.log(
      `    ${mark} ${r.name.padEnd(16)} ${val.padStart(10)}  ` +
        `${C.d}需 ${r.cmp} ${r.need}${r.unit}  [${r.cid}]${C.x}`,
    );
  }
  console.log('');
}

const total = results.length;
if (fail === 0) {
  console.log(C.g + `  全部通过：${total} / ${total}` + C.x);
  console.log(C.d + '  钻石约束无违反。这是一份可被 CI 守住的底线。' + C.x + '\n');
  process.exit(0);
} else {
  console.log(C.r + `  失败 ${fail} / ${total}` + C.x);
  console.log(C.d + '  上述为钻石/钢铁约束，任何目的不可豁免。' + C.x + '\n');
  process.exit(1);
}
