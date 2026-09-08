'use client';

import { forwardRef, useCallback, useRef } from 'react';
import { LumtactRipple } from './LumtactRipple';
import type { Tier } from '../design/tokens';

/**
 * Lumtact 按钮
 * ────────────────────────────────────────────────────────
 * 热区 [PHYS: P-010]：视觉可小，热区不可小于 44px。
 * 小尺寸按钮用 ::after 伪元素撑热区 —— 不占布局空间，
 * 密度与生存权同时满足。这不算降级，是解。
 */

export type WaveButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type WaveButtonSize = 'sm' | 'md' | 'lg';

export interface WaveButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: React.ReactNode;
  variant?: WaveButtonVariant;
  size?: WaveButtonSize;
  tier?: Tier;
  /** 加载态：[C-003] 静止暗示完成 = 不确定性 = 焦虑 */
  busy?: boolean;
  fullWidth?: boolean;
}

export const WaveButton = forwardRef<HTMLButtonElement, WaveButtonProps>(
  function WaveButton(
    {
      children,
      variant = 'primary',
      size = 'md',
      tier = 'T0',
      busy = false,
      fullWidth = false,
      className = '',
      onKeyDown,
      ...rest
    },
    ref,
  ) {
    const btnRef = useRef<HTMLButtonElement | null>(null);

    const setRef = useCallback(
      (node: HTMLButtonElement | null) => {
        btnRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      },
      [ref],
    );

    // 键盘激活时，波从按钮中心长出（因的位置 = 按钮本身）
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const node = btnRef.current;
          if (node) {
            const r = node.getBoundingClientRect();
            node.dispatchEvent(
              new PointerEvent('pointerdown', {
                clientX: r.left + r.width / 2,
                clientY: r.top + r.height / 2,
                bubbles: true,
              }),
            );
          }
        }
        onKeyDown?.(e);
      },
      [onKeyDown],
    );

    return (
      <LumtactRipple
        as="span"
        tier={tier}
        className="lumtact-btn-wrap"
        style={fullWidth ? { display: 'block', width: '100%' } : undefined}
      >
        <button
          ref={setRef}
          className={[
            'lumtact-btn',
            `lumtact-btn--${variant}`,
            `lumtact-btn--${size}`,
            fullWidth ? 'lumtact-btn--full' : '',
            busy ? 'is-busy' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          data-tier={tier}
          aria-busy={busy || undefined}
          onKeyDown={handleKeyDown}
          {...rest}
        >
          {busy && <span className="lumtact-spinner" aria-hidden="true" />}
          <span className="lumtact-btn__label">{children}</span>
        </button>
      </LumtactRipple>
    );
  },
);
