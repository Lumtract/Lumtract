'use client';

import { useEffect, useRef, useState } from 'react';
import { wave, type Tier } from '../design/tokens';

/**
 * Lumtact 输入框 · 光标呼吸波
 * ────────────────────────────────────────────────────────
 * 【语义追问】波纹该确认什么？
 *   不是「这个字符收到了」——字符出现在屏幕上已是完备反馈 [C-001]。
 *   再确认一次是噪音 [P-016 装饰性显著性]。
 *
 *   它确认的是：「焦点在此，我还活着」。
 *
 * 【为什么不是每键一道波纹】三条独立约束同时否定：
 *   [R-001] 并发叠加：8 字符/秒 × 900ms = 同时 7 道，alpha 叠 17 道逼近纯白
 *   [P-019] 光敏：打字 5–12Hz，远超 3Hz 安全线
 *   [C-001] 语义冗余：输入即所得，字符本身就是反馈
 *
 * 【最终形态】
 *   聚焦瞬间 → 从光标位置发一道唤醒波（因 = 我点了这里）
 *   聚焦期间 → 光标处持续呼吸涟漪，周期 1400ms（0.71Hz ≪ 3Hz）
 *   每次击键 → 不新增波纹，只让当前这道颤动一下（有回应，不叠加）
 *   失焦     → 立即停止
 *
 * 【呼吸波是 infinite 动画，为什么合法】
 *   [C-003] 静止暗示完成 —— 聚焦期间不动，用户会以为卡住了。
 *   且「闲置」的定义是：无用户行为 AND 无系统工作。
 *   聚焦本身就是持续的行为声明。失焦即停，不留残余。
 */

export interface BreathInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  tier?: Tier;
  /** 显示当前波纹层数（调试用） */
  debug?: boolean;
}

export function BreathInput({
  label,
  hint,
  tier = 'T0',
  debug = false,
  className = '',
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: BreathInputProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [layers, setLayers] = useState(0);

  // 唤醒波：聚焦瞬间从光标位置发出
  const spawnWake = () => {
    const wrap = wrapRef.current;
    const input = inputRef.current;
    if (!wrap || !input || tier === 'T2' || tier === 'T3') return;

    const value = input.value;
    const measurer = document.createElement('span');
    const cs = getComputedStyle(input);
    measurer.style.cssText = [
      'position:absolute',
      'visibility:hidden',
      'white-space:pre',
      `font:${cs.font}`,
      `letter-spacing:${cs.letterSpacing}`,
      `padding-left:${cs.paddingLeft}`,
    ].join(';');
    measurer.textContent = value.slice(0, input.selectionStart ?? value.length);
    wrap.appendChild(measurer);
    const caretX = measurer.offsetWidth;
    measurer.remove();

    const r = input.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();

    const el = document.createElement('span');
    el.className = 'lumtact-wave lumtact-wave--wake';
    const far = Math.max(caretX, r.width - caretX, r.height);
    el.style.cssText = [
      `left:${caretX + (r.left - wr.left)}px`,
      `top:${r.height / 2 + (r.top - wr.top)}px`,
      `width:${far * 2}px`,
      `height:${far * 2}px`,
      `margin-left:${-far}px`,
      `margin-top:${-far}px`,
      '--wave-from:0.06',
    ].join(';');

    wrap.appendChild(el);
    const cleanup = () => {
      el.remove();
      setLayers((n) => Math.max(0, n - 1));
    };
    el.addEventListener('animationend', cleanup, { once: true });
    window.setTimeout(cleanup, 1200);
    setLayers((n) => n + 1);
  };

  // 击键：不新增波，只颤动当前呼吸波
  const pulse = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const breath = wrap.querySelector<HTMLElement>('.lumtact-breath');
    if (!breath) return;
    breath.classList.remove('is-pulse');
    // 强制 reflow 以重启动画
    void breath.offsetWidth;
    breath.classList.add('is-pulse');
  };

  useEffect(() => {
    if (!focused) return;
    if (tier !== 'T0') return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    // 呼吸波：聚焦期间常驻，层数恒为 1
    const breath = document.createElement('span');
    breath.className = 'lumtact-breath';
    wrap.appendChild(breath);

    return () => {
      breath.remove();
    };
  }, [focused, tier]);

  return (
    <div className={`lumtact-field-wrap ${className}`}>
      {label && (
        <label className="lumtact-label" htmlFor={rest.id}>
          {label}
        </label>
      )}
      <div
        ref={wrapRef}
        className={`lumtact-field ${focused ? 'is-focused' : ''}`}
        data-tier={tier}
      >
        <input
          ref={inputRef}
          className="lumtact-field__input"
          onFocus={(e) => {
            setFocused(true);
            // 唤醒波在下一帧发，等布局稳定
            requestAnimationFrame(spawnWake);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          onKeyDown={(e) => {
            pulse();
            onKeyDown?.(e);
          }}
          {...rest}
        />
      </div>
      {hint && <p className="lumtact-hint">{hint}</p>}
      {debug && (
        <p className="lumtact-debug">
          波纹层数：{layers}（并发上限 {wave.maxConcurrent.value}，呼吸波恒为 1）
        </p>
      )}
    </div>
  );
}
