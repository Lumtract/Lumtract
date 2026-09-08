'use client';

import { useCallback, useEffect, useRef } from 'react';
import { wave, type Tier } from '../design/tokens';

/**
 * Lumtact 波纹 · 核心 IP 载体
 * ────────────────────────────────────────────────────────
 * 规则：果从因的位置长出。
 * 任何反馈的起点，必须是触发它的那个空间坐标。
 *
 * 这不是装饰。普通按钮点击是「整块变色」，表达「这个按钮被按了」；
 * 涟漪从触点扩散，表达「你按的是这里」——空间位置本身就是信息。
 *
 * 【为什么用 DOM 直接操作而非 React state】
 *   波纹是高频瞬时元素，走 React 重渲染会引入不必要的调度开销。
 *   直接 append/remove 节点，且播完自我销毁 —— R-003 零闲置。
 */

export type WaveEasing = 'calm' | 'brisk' | 'swift';

interface SpawnOptions {
  easing?: WaveEasing;
  duration?: number;
  /** 强制起始半径（用于演示对比，默认读 --wave-min-r） */
  minRadiusOverride?: number | null;
}

export interface RippleHostProps {
  children: React.ReactNode;
  tier?: Tier;
  className?: string;
  style?: React.CSSProperties;
  /** 容器自身是否作为波源（true 时点击任意位置都从该点扩散） */
  as?: 'div' | 'span';
  disabled?: boolean;
}

function readNum(varName: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function LumtactRipple({
  children,
  tier = 'T0',
  className = '',
  style,
  as: Tag = 'div',
  disabled = false,
}: RippleHostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<Set<HTMLElement>>(new Set());

  const spawn = useCallback(
    (clientX: number, clientY: number, opts: SpawnOptions = {}) => {
      const host = hostRef.current;
      if (!host) return;

      // T2 及以下不出波：光可以熄，触碰必须有回应（由亮度阶梯承载）
      if (tier === 'T2' || tier === 'T3') return;
      if (disabled) return;

      // 并发上限 [R-001] alpha 叠加不可预测
      const max = wave.maxConcurrent.value;
      if (liveRef.current.size >= max) {
        const oldest = liveRef.current.values().next().value;
        if (oldest) {
          oldest.remove();
          liveRef.current.delete(oldest);
        }
      }

      const rect = host.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const w = host.offsetWidth;
      const h = host.offsetHeight;

      // 终半径：覆盖最远角
      const far = Math.max(
        Math.hypot(x, y),
        Math.hypot(w - x, y),
        Math.hypot(x, h - y),
        Math.hypot(w - x, h - y),
      );
      if (far <= 0) return;

      // 起始半径下限 [PHYS: P-004] —— 保证 100ms 时已可见
      const minR = opts.minRadiusOverride ?? readNum('--wave-min-r', wave.minRadius.value);
      const startScale = Math.min(1, minR / far);

      const dur =
        opts.duration ??
        readNum('--wave-dur', wave.duration.value);
      const easing =
        opts.easing ??
        (getComputedStyle(document.documentElement)
          .getPropertyValue('--wave-ease')
          .trim() || wave.easing.calm.value);

      const el = document.createElement('span');
      el.className = 'lumtact-wave';
      el.style.cssText = [
        `left:${x}px`,
        `top:${y}px`,
        `width:${far * 2}px`,
        `height:${far * 2}px`,
        `margin-left:${-far}px`,
        `margin-top:${-far}px`,
        `--wave-from:${startScale}`,
        `--wave-dur:${dur}ms`,
        `--wave-ease:${easing}`,
      ].join(';');

      host.appendChild(el);
      liveRef.current.add(el);

      // 播完自我销毁 —— R-003：不留节点，不维持合成
      const cleanup = () => {
        el.remove();
        liveRef.current.delete(el);
      };
      el.addEventListener('animationend', cleanup, { once: true });
      // 兜底：animationend 在某些情况下不触发
      window.setTimeout(cleanup, dur + 200);
    },
    [tier, disabled],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      spawn(e.clientX, e.clientY);
    },
    [spawn],
  );

  // 卸载时清理
  useEffect(() => {
    const live = liveRef.current;
    return () => {
      live.forEach((el) => el.remove());
      live.clear();
    };
  }, []);

  return (
    <Tag
      ref={hostRef as never}
      className={`lumtact-ripple-host ${className}`}
      style={style}
      onPointerDown={onPointerDown}
      data-tier={tier}
    >
      {children}
    </Tag>
  );
}

/** 供外部手动触发（如按钮的键盘激活） */
export function spawnWaveAt(
  host: HTMLElement | null,
  clientX: number,
  clientY: number,
) {
  if (!host) return;
  host.dispatchEvent(
    new PointerEvent('pointerdown', {
      clientX,
      clientY,
      bubbles: true,
    }),
  );
}
