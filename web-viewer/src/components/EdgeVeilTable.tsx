'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tier } from '../design/tokens';

/**
 * Lumtact 表格 · 边缘截断遮蔽
 * ────────────────────────────────────────────────────────
 * 【语义】内容在此处被截断，但那边还有更多。
 *
 * 【四版推翻史 —— 保留为诚实履历】
 *   v4  48px 渐变光带覆盖内容   → 用装饰侵略内容        [P-016][L-001]
 *   v5  2px 线 left:-1px + 外溢 → 存在于容器之外        归属不自洽
 *   v6  容器自身 border 变色    → 说「这是边界」不说「那边还有」  语义落空
 *   v7  圆角之内的遮蔽 veil     → 采纳
 *
 * 【v7 推导】
 *   图式：容器边缘是一道唇，content 从它下面穿过
 *   → 唇在 content 上投下影 = 「它没消失，只是被盖住了」的物证
 *   → 遮挡发生在被遮物一侧 = content 在容器内 = 影必须在【圆角之内】
 *   → veil 自带同径圆角，轮廓 = 裁切曲线（与波纹同一条规则）
 *
 * [PHYS: D-001] 极性由动态范围决定，不是风格：
 *   昼 #FFFFFF 向上余 0 级 → 只能变暗（阴影）
 *   夜 #1A1A1A 向下余 26 级 → 只能变亮（微光）
 *
 * [PHYS: P-014] 闭合性：人脑倾向把不完整形状感知为完整
 *   → 裁切必须可见，否则用户以为内容就这么宽
 *   iOS/macOS 默认隐藏滚动条，「可滚动」这个信息完全丢失
 */

export interface EdgeVeilColumn<T> {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
}

export interface EdgeVeilTableProps<T> {
  columns: EdgeVeilColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** 最小列宽总和；超出容器即横向滚动（不压缩列宽） */
  minWidth?: number;
  maxHeight?: number;
  tier?: Tier;
  onRowSelect?: (row: T, index: number) => void;
  emptyText?: string;
}

export function EdgeVeilTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = 720,
  maxHeight,
  tier = 'T0',
  onRowSelect,
  emptyText = '暂无数据',
}: EdgeVeilTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = el.scrollLeft;
    // 2px 死区，避免亚像素抖动导致微光闪烁 [P-019]
    setCanLeft(x > 2);
    setCanRight(x < max - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener('scroll', updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      ro.disconnect();
    };
  }, [updateEdges, rows]);

  const pick = (row: T, index: number) => {
    const key = rowKey(row);
    setSelected((prev) => (prev === key ? null : key));
    onRowSelect?.(row, index);
  };

  return (
    <div
      className={`lumtact-table ${canLeft ? 'can-l' : ''} ${canRight ? 'can-r' : ''}`}
      data-tier={tier}
    >
      <div
        ref={scrollRef}
        className="lumtact-table__scroll"
        style={{ maxHeight }}
      >
        <table className="lumtact-table__el" style={{ minWidth }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ width: c.width, textAlign: c.align ?? 'left' }}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="lumtact-table__empty">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const key = rowKey(row);
                const isSel = selected === key;
                return (
                  <tr
                    key={key}
                    aria-selected={isSel}
                    tabIndex={0}
                    onClick={() => pick(row, i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        pick(row, i);
                      }
                    }}
                  >
                    {columns.map((c) => (
                      <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>
                        {c.render
                          ? c.render(row)
                          : String((row as Record<string, unknown>)[c.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
