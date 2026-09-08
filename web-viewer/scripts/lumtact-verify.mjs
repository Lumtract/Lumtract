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
/**
 * 【硬度分级：为什么校验规则自己也要有来源标注】
 *
 * 卷三：无标注 = 推导无效。校验规则若没有硬度标注，
 * 它就无法被审计、无法被质疑、无法被修正 —— 和被它校验的设计值一样。
 *
 * 更实际的：若把工程阈值当钻石去阻断，就是用机制固化
 * 「陶土冒充钻石」这个错误（卷一公理三）。
 *
 * diamond / steel → 失败即阻断
 * clay            → 失败只警告，退出码仍为 0
 */
const check = (group, name, actual, need, cmp, cid, unit = '', hardness = 'diamond') => {
  const pass = cmp === '>=' ? actual >= need : cmp === '<=' ? actual <= need : actual > need;
  results.push({ group, name, actual, need, cmp, cid, unit, pass, hardness });
};

// 一 · 对比度
for (const [label, T] of [['夜', DARK], ['昼', LIGHT]]) {
  const s = T['--bg-surface'];
  check('对比度', `${label} 正文`, CR(T['--text-1'], s), 4.5, '>=', 'P-001', ':1', 'diamond');
  check('对比度', `${label} 次级`, CR(T['--text-2'], s), 4.5, '>=', 'P-001', ':1', 'diamond');
  check('对比度', `${label} 三级`, CR(T['--text-3'], s), 3.0, '>=', 'P-001', ':1', 'diamond');
}

// 二 · 被遮蔽处
for (const [label, T] of [['夜', DARK], ['昼', LIGHT]]) {
  const veil = rgbTriple(T['--edge-veil']);
  const a = num(T['--edge-a']);
  const bg = over(veil, T['--bg-surface'], a);
  check('被遮蔽处', `${label} 正文`, CR(over(veil, T['--text-1'], a), bg), 4.5, '>=', 'P-001 / P-014', ':1', 'diamond');
  check('被遮蔽处', `${label} 次级`, CR(over(veil, T['--text-2'], a), bg), 4.5, '>=', 'P-001 / P-014', ':1', 'diamond');
}

// 三 · 时间窗口
check('时间窗口', 'dur-press', num(ROOT['--dur-press']), 100, '>', 'P-004', 'ms', 'diamond');
check('时间窗口', 'dur-state 下限', num(ROOT['--dur-state']), 200, '>=', 'P-005', 'ms', 'diamond');
check('时间窗口', 'dur-state 上限', num(ROOT['--dur-state']), 350, '<=', 'P-005', 'ms', 'diamond');
check('时间窗口', 'wave-dur', num(ROOT['--wave-dur']), 600, '<=', 'P-006', 'ms', 'diamond');

// 四 · 光敏
const hz = 1000 / num(ROOT['--wave-breath']);
check('光敏安全', '呼吸频率', hz, 3, '<=', 'P-019', 'Hz', 'diamond');

// 五 · 热区
check('热区', 'hit-min', num(ROOT['--hit-min']), 44, '>=', 'P-010', 'px', 'diamond');

// 六 · 起始半径
check('波纹', 'wave-min-r', num(ROOT['--wave-min-r']), 9, '>=', 'P-004', 'px', 'clay');

// 七 · 遮蔽强度
for (const [label, T] of [['夜', DARK], ['昼', LIGHT]]) {
  const veil = rgbTriple(T['--edge-veil']);
  const a = num(T['--edge-a']);
  const d = dL(over(veil, T['--bg-surface'], a), T['--bg-surface']);
  check('遮蔽强度', `${label} ΔL* 下限`, d, 8, '>=', 'P-001', '', 'clay');
  check('遮蔽强度', `${label} ΔL* 上限`, d, 20, '<=', 'P-016', '', 'clay');
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
  check('层级单调', `${label} zebra→hover`, h - z, 1.5, '>', 'L-001', ' ΔL*', 'clay');
  check('层级单调', `${label} hover→sel`, sel - h, 1.5, '>', 'L-001', ' ΔL*', 'clay');
}

/* ── 输出 ────────────────────────────────────────────── */
const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };

// 硬度标记。方块=不可妥协，圆圈=可调
const MARK = { diamond: '◆', steel: '▪', clay: '○' };
const NAME = { diamond: '钻石', steel: '钢铁', clay: '工程阈值' };

const groups = [...new Set(results.map((r) => r.group))];

console.log('\n' + C.b + 'Lumtact · 约束校验' + C.x + C.d + '  v10.0.0-alpha' + C.x + '\n');
console.log(C.d + '  ◆ 钻石/钢铁 = 不可妥协，失败即阻断' + C.x);
console.log(C.d + '  ○ 工程阈值 = 可随上下文调整，失败仅警告' + C.x + '\n');

let hardFail = 0;
let softFail = 0;
for (const g of groups) {
  console.log(C.b + '  ' + g + C.x);
  for (const r of results.filter((x) => x.group === g)) {
    const hard = r.hardness !== 'clay';
    if (!r.pass) hard ? hardFail++ : softFail++;
    const mark = r.pass
      ? C.g + '✓' + C.x
      : hard
        ? C.r + '✗' + C.x
        : C.y + '!' + C.x;
    const val = r.actual.toFixed(2) + r.unit;
    console.log(
      `    ${mark} ${MARK[r.hardness]} ${r.name.padEnd(16)} ${val.padStart(9)}  ` +
        `${C.d}需 ${r.cmp} ${r.need}${r.unit}  [${r.cid}]${C.x}`,
    );
  }
  console.log('');
}

const total = results.length;
const hardTotal = results.filter((r) => r.hardness !== 'clay').length;
const softTotal = total - hardTotal;

console.log(C.b + '  ── 汇总 ──' + C.x);
console.log(`    钻石/钢铁  ${hardTotal - hardFail}/${hardTotal} 通过` +
  (hardFail ? C.r + `  （${hardFail} 项阻断）` + C.x : C.g + '  ✓' + C.x));
console.log(`    工程阈值  ${softTotal - softFail}/${softTotal} 通过` +
  (softFail ? C.y + `  （${softFail} 项警告，不阻断）` + C.x : C.g + '  ✓' + C.x));
console.log('');

if (hardFail === 0) {
  // 措辞必须准确：有警告时不能说「全部通过」
  const okN = total - softFail;
  console.log(
    softFail > 0
      ? C.g + `  ${okN} / ${total} 通过` + C.y + `，${softFail} 项警告` + C.x
      : C.g + `  全部通过：${total} / ${total}` + C.x,
  );
  if (softFail > 0) {
    console.log(C.y + `  其中 ${softFail} 项为工程阈值警告 —— 可调整，不阻断。` + C.x);
    console.log(C.d + '  若确认要改，连同依据一并更新 tokens.ts 的 why 字段。' + C.x);
  } else {
    console.log(C.d + '  钻石约束无违反。' + C.x);
  }
  console.log(C.d + '  ⚠ 本校验【尚未固化】—— 项目未冻结，阈值仍可质疑。' + C.x + '\n');
  process.exit(0);
} else {
  console.log(C.r + `  钻石/钢铁失败 ${hardFail} 项 —— 阻断` + C.x);
  console.log(C.d + '  这些是碳基生理或硅基物理边界，任何目的不可豁免。' + C.x + '\n');
  process.exit(1);
}

