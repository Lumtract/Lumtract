/**
 * Lumtact · 颜色计算工具
 * ────────────────────────────────────────────────────────
 * 【为什么它是生产代码，不是测试工具】
 * 约束测试需要它；未来的设计工具（对比度检查器、令牌编辑器）也需要它。
 * 放在 src/design/ 而非 __tests__/，是因为它属于体系，不属于测试。
 *
 * 【物理依据】
 * WCAG 2.x 的相对亮度与对比度基于 sRGB 线性化：
 *   [PHYS: D-001] 8bit sRGB 是安全交集，所有计算以此为准。
 *   CIE L* 用于感知均匀性判断——ΔL* 1 约等于 1 JND。
 */

/** sRGB 通道 → 线性光 */
export function srgbToLinear(channel8: number): number {
  const c = channel8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** 相对亮度 Y（0–1） */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return (
    0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
  );
}

/** CIE L*（感知明度，0–100） */
export function lstar(hex: string): number {
  const y = relativeLuminance(hex);
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
}

/** WCAG 对比度（1–21） */
export function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Alpha 合成。
 * [PHYS: R-001] Result = Src × SrcAlpha + Dst × (1 - SrcAlpha)
 * 注意：这是在线性空间外做的近似（与浏览器一致），
 * 浏览器在 sRGB 空间混合，所以这里跟随浏览器行为。
 */
export function composite(fg: string, bg: string, alpha: number): string {
  const f = parseHex(fg);
  const b = parseHex(bg);
  const ch = (x: number, y: number) =>
    Math.round(Math.min(255, Math.max(0, x * alpha + y * (1 - alpha))));
  return toHex(ch(f.r, b.r), ch(f.g, b.g), ch(f.b, b.b));
}

/** ΔL*（感知明度差）。1 ≈ 1 JND */
export function deltaL(a: string, b: string): number {
  return Math.abs(lstar(a) - lstar(b));
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || !/^[0-9a-f]{6}$/i.test(h)) {
    throw new Error(`不是合法的 hex 颜色：${hex}`);
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function toHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** 从 CSS 源码中解析变量（测试用） */
export function parseCssVars(css: string, selector?: string): Record<string, string> {
  let scope = css;
  if (selector) {
    const i = css.indexOf(selector);
    if (i < 0) return {};
    const open = css.indexOf('{', i);
    let depth = 0;
    let end = open;
    for (let k = open; k < css.length; k++) {
      if (css[k] === '{') depth++;
      else if (css[k] === '}') {
        depth--;
        if (depth === 0) {
          end = k;
          break;
        }
      }
    }
    scope = css.slice(open + 1, end);
  }
  const out: Record<string, string> = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope))) out[m[1]] = m[2].trim();
  return out;
}

/** 取 CSS 值里的第一个数字 */
export function numOf(cssValue: string): number {
  const m = cssValue.match(/-?[\d.]+/);
  return m ? parseFloat(m[0]) : NaN;
}
