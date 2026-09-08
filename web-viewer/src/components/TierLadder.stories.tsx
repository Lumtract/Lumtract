import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { useTier } from './useTier';
import { WaveButton } from './WaveButton';
import { tier as TIER } from '../design/tokens';

/**
 * Lumtact 降级阶梯
 *
 * 卷三 3.5.3 定义了四阶梯，但没说【怎么检测】——所以当时它只是文档。
 * useTier 是它的运行时实现。
 */
const meta = {
  title: 'Lumtact/05 · Tier 降级阶梯',
  parameters: {
    docs: {
      description: {
        component: [
          '| 档位 | 内容 | 触发 |',
          '|---|---|---|',
          '| **T0 FULL** | 涟漪 + 呼吸 + 微光 | ≥46fps |',
          '| **T1 CALM** | 涟漪单道，无呼吸 | 28–46fps 或 coarse |',
          '| **T2 STATIC** | 瞬时亮度阶梯 | <28fps 或 reduced-motion |',
          '| **T3 NOJS** | 纯 CSS 状态 | 无 JS |',
          '',
          '**不可降级的底线**（卷三 3.5.4）：',
          '- 反馈必须存在（公理二）',
          '- 对比度 ≥ 4.5:1',
          '- 热区 ≥ 44px',
          '- 零态自证',
          '- 设计令牌零硬编码',
        ].join('\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** 实时诊断面板：每个信号逐项列出 */
export const Diagnostics: Story = {
  render: () => {
    const s = useTier();
    const rows: [string, string, string][] = [
      ['档位', s.tier, s.probed ? '实测' : '未探测（先交互一次）'],
      ['帧率', s.fps ? `${s.fps} fps` : '—', `样本 ${s.samples} 帧`],
      ['reduced-motion', String(s.reducedMotion), s.reducedMotion ? '→ 强制 T2' : ''],
      ['coarse pointer', String(s.coarse), s.coarse ? '→ 至少 T1' : ''],
      ['DPR', String(s.dpr), ''],
      ['降档阈值', `< ${TIER.dropToT1} / < ${TIER.dropToT2}`, 'fps'],
      ['升档阈值', `≥ ${TIER.riseToT1} / ≥ ${TIER.riseToT0}`, 'fps（滞回带 8fps）'],
    ];
    return (
      <div style={{ maxWidth: 620, display: 'grid', gap: 16 }}>
        <div
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            border: '1px solid var(--line)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {rows.map(([k, v, note]) => (
            <div
              key={k}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                gap: 8,
                padding: '8px 12px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <span style={{ color: 'var(--text-3)' }}>{k}</span>
              <span style={{ color: 'var(--text-1)' }}>
                {v}
                {note && <span style={{ color: 'var(--text-3)' }}>　{note}</span>}
              </span>
            </div>
          ))}
        </div>

        <WaveButton tier={s.tier}>按此按钮触发帧率探针</WaveButton>

        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
          探针搭车首次交互后的 GPU 活跃期测量，测完即止——
          常驻 rAF 自己就让 GPU 睡不着，违反 [R-003]。
        </p>
      </div>
    );
  },
};

/** 手动切换四档，逐级验证反馈是否还在 */
export const ManualTiers: Story = {
  render: () => {
    const [t, setT] = useState<'T0' | 'T1' | 'T2' | 'T3'>('T0');
    return (
      <div style={{ maxWidth: 620, display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['T0', 'T1', 'T2', 'T3'] as const).map((x) => (
            <button
              key={x}
              onClick={() => setT(x)}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: t === x ? 600 : 400,
              }}
            >
              {x}
            </button>
          ))}
        </div>
        <WaveButton tier={t}>当前 {t} —— 点击看反馈</WaveButton>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
          {t === 'T0' && '完整：涟漪 + 呼吸 + 微光'}
          {t === 'T1' && '涟漪单道，无呼吸波'}
          {t === 'T2' && '波已熄灭，但按下时 brightness(1.4) 顶上——光可以熄，触碰必须有回应'}
          {t === 'T3' && '纯 CSS 状态，不假设 JS 能力'}
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          '逐级切换验证：<strong>每一档都必须有反馈</strong>。' +
          '降级不是减少功能，是在不同约束集下重新推导。',
      },
    },
  },
};
