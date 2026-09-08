import type { Meta, StoryObj } from '@storybook/nextjs';
import { useState } from 'react';
import { LumtactRipple } from './LumtactRipple';
import { wave, type Tier } from '../design/tokens';

/**
 * Lumtact 波纹实验台
 *
 * 核心规则：**果从因的位置长出。**
 *
 * 这不是装饰。普通按钮点击是「整块变色」，表达「这个按钮被按了」；
 * 涟漪从触点扩散，表达「你按的是这里」——空间位置本身就是信息。
 */
const meta = {
  title: 'Lumtact/04 · Ripple 实验台',
  parameters: {
    docs: {
      description: {
        component: [
          '## 规则：果从因的位置长出',
          '',
          '任何反馈的起点，必须是触发它的那个空间坐标。',
          '',
          '动效会被抄走，抄走后没人知道它来自 Lumtact。',
          '规则抄不走，且能持续长出新的形态。',
        ].join('\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const EASINGS: Record<string, { label: string; value: string; note: string }> = {
  calm: {
    label: 'calm（默认）',
    value: 'cubic-bezier(.6, 0, 1, 1)',
    note: '柔和起手，尾部收敛。你偏好这个——「不打扰，反而更有空间掌控感」',
  },
  brisk: {
    label: 'brisk',
    value: 'cubic-bezier(.2, 0, 0, 1)',
    note: '果断起手，快速铺开',
  },
  swift: {
    label: 'swift',
    value: 'cubic-bezier(.34, 1.2, .64, 1)',
    note: '尾部轻微过冲',
  },
};

/** 水面：点击任意位置，波从该点扩散 */
export const Water: Story = {
  render: () => {
    const [easing, setEasing] = useState<string>('calm');
    const [dur, setDur] = useState<number>(wave.duration.value);

    return (
      <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--text-2)' }}>
            缓动 [GENE]
            <select
              value={easing}
              onChange={(e) => setEasing(e.target.value)}
              style={{ marginLeft: 8, padding: '4px 8px', fontSize: 13 }}
            >
              {Object.entries(EASINGS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13, color: 'var(--text-2)' }}>
            时长 [PHYS: P-006]
            <input
              type="range"
              min={200}
              max={900}
              step={20}
              value={dur}
              onChange={(e) => setDur(Number(e.target.value))}
              style={{ marginLeft: 8 }}
            />
            <span style={{ fontFamily: 'ui-monospace, monospace', marginLeft: 4 }}>
              {dur}ms
            </span>
          </label>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
          {EASINGS[easing].note}
          {dur > 600 && '　⚠ 超过 600ms 心流打断线 [P-006]'}
          {dur < 200 && '　⚠ 短于 200ms 会被感知为跳变 [P-005]'}
        </p>

        <LumtactRipple
          style={{
            display: 'block',
            width: '100%',
            height: 200,
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            cursor: 'pointer',
            '--wave-ease': EASINGS[easing].value,
            '--wave-dur': `${dur}ms`,
          } as React.CSSProperties}
        >
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text-3)',
              fontSize: 13,
              pointerEvents: 'none',
            }}
          >
            点击任意位置 —— 波从那个点扩散
          </span>
        </LumtactRipple>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          '波峰是环而非实心圆——环被裁切后，剩余方向仍在扩散，' +
          '依然是可辨识的波前。所以大水面不必担心「波跑出去了」。',
      },
    },
  },
};

/**
 * 缓动方向对比 · 定格测量
 *
 * 同一时长，只换缓动方向，100ms 时的位移差 14 倍。
 * 环默认定格，拖动滑块观察不同时刻——不产生持续动画 [R-003]。
 */
export const EasingFreeze: Story = {
  render: () => {
    const [t, setT] = useState(100);
    const [playId, setPlayId] = useState(0);
    const [playing, setPlaying] = useState(false);

    const items = [
      { key: 'calm', label: 'calm · ease-in', v: EASINGS.calm.value },
      { key: 'brisk', label: 'brisk · ease-out', v: EASINGS.brisk.value },
    ];

    return (
      <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setPlayId((n) => n + 1);
              setPlaying(true);
              window.setTimeout(() => setPlaying(false), 600);
            }}
            style={{ padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
          >
            播放一次
          </button>
          <label style={{ fontSize: 13, color: 'var(--text-2)' }}>
            定格时刻
            <input
              type="range"
              min={20}
              max={500}
              step={10}
              value={t}
              onChange={(e) => setT(Number(e.target.value))}
              style={{ marginLeft: 8 }}
            />
            <span style={{ fontFamily: 'ui-monospace, monospace', marginLeft: 4 }}>{t}ms</span>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {items.map((item) => (
            <div key={item.key}>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                {item.label}
              </div>
              <div
                style={{
                  height: 170,
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <span
                  // key 变化 → 重新挂载 → 重新播放
                  key={`${item.key}-${playId}`}
                  className="lumtact-wave"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: 140,
                    height: 140,
                    marginLeft: -70,
                    marginTop: -70,
                    // 定格：负延迟 + paused，精确停在 t 时刻
                    animationDelay: playing ? '0ms' : `-${t}ms`,
                    animationPlayState: playing ? 'running' : 'paused',
                    animationIterationCount: 1,
                    ['--wave-ease' as string]: item.v,
                    ['--wave-dur' as string]: '520ms',
                    ['--wave-from' as string]: '0.128',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
          定格后可直接量出两个环的半径差。
          calm 起手慢，但<strong>起始半径下限 9px 保证了它在 100ms 时依然可见</strong>——
          可见性由半径保证，不由缓动保证。
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: [
          '### AUD-003 修正（保留为诚实履历）',
          '',
          'v3 曾把 ease-in 判为 EXCLUDED，理由「100ms 只完成 3.4%，因果链断裂」。',
          '',
          '**这是基因冒充约束**——缓动曲线是 [GENE] 风格，不是 [PHYS] 生理边界。',
          '',
          '真正的病灶是 `scale(0)` 起步：',
          '',
          '| 容器 | 缓动 | 旧 scale(0) | 新 起始 9px |',
          '|---|---|---|---|',
          '| 50px 小按钮 | ease-in | 1.7px ✗ | 10.4px ✓ |',
          '| 50px 小按钮 | ease-out | 5.8px ✗ | 13.7px ✓ |',
          '',
          '**ease-out 在小容器上也只有 5.8px**——两档踩的是同一个坑。',
        ].join('\n'),
      },
    },
  },
};

/** 容器尺寸对照：验证小容器上起始半径仍达标 */
export const ContainerSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {[
        { w: 76, h: 36, label: '小按钮 76×36' },
        { w: 120, h: 44, label: '按钮 120×44' },
        { w: 240, h: 130, label: '卡片 240×130' },
        { w: 420, h: 200, label: '水面 420×200' },
      ].map((c) => (
        <div key={c.label}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>{c.label}</div>
          <LumtactRipple
            style={{
              width: c.w,
              height: c.h,
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              color: 'var(--text-3)',
            }}
          >
            点击
          </LumtactRipple>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '起始半径下限 9px 由 JS 换算成 scale 起点，不随容器尺寸漂移。' +
          '所以在小按钮上，calm 缓动依然可见。',
      },
    },
  },
};

/** 并发上限：[R-001] alpha 叠加不可预测 */
export const Concurrency: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <LumtactRipple
        style={{
          height: 180,
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
          color: 'var(--text-3)',
        }}
      >
        尽快连点（并发上限 {wave.maxConcurrent.value}）
      </LumtactRipple>
      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
        [R-001] 多数半透明层叠加不产生可预测颜色。
        超过上限时回收最旧的波，层数恒定 ≤ {wave.maxConcurrent.value}。
        <br />
        ⚠ 该值为理论推导，<strong>未做真机性能验证</strong>。
      </p>
    </div>
  ),
};

/** 主题对照：昼=波谷折射暗，夜=微光亮 */
export const Themes: Story = {
  render: () => {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    return (
      <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTheme(t);
                document.documentElement.setAttribute('data-theme', t);
              }}
              style={{
                padding: '6px 12px',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: theme === t ? 600 : 400,
              }}
            >
              {t === 'dark' ? '夜 · 微光（亮）' : '昼 · 波谷折射（暗）'}
            </button>
          ))}
        </div>
        <LumtactRipple
          style={{
            height: 180,
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            color: 'var(--text-3)',
          }}
        >
          点击看反光极性
        </LumtactRipple>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
          [PHYS: D-001] 白底向上余 0 级，所以浅色主题下反光改为<strong>波谷折射暗</strong>；
          近黑向下仅剩 26 级，所以暗色主题用亮。同为无彩色亮度变化，方向相反。
        </p>
      </div>
    );
  },
};

/** 无 JS 环境：[R-004] 不假设交互能力 */
export const NoJs: Story = {
  render: () => (
    <div style={{ maxWidth: 560 }}>
      <LumtactRipple
        tier={'T3' as Tier}
        style={{
          height: 140,
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
          color: 'var(--text-3)',
        }}
      >
        T3：不出波
      </LumtactRipple>
      <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
        [R-004] 无 JS 环境不假设交互能力。HTML 默认{' '}
        <code>data-tier=&quot;T3&quot;</code>，JS 启动后才改为实测档位——
        <strong>页面不该声明自己具备还没有的能力</strong>。
      </p>
    </div>
  ),
};
