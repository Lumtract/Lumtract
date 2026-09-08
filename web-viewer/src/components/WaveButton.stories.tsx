import type { Meta, StoryObj } from '@storybook/nextjs';
import { WaveButton } from './WaveButton';
import { useTier } from './useTier';

/**
 * Lumtact 按钮 · 触点涟漪
 *
 * 规则：果从因的位置长出。
 *
 * 点击任意位置，波从【触点】扩散——不是中心，不是整块泛光。
 * 普通按钮点击是「整块变色」，表达「这个按钮被按了」；
 * 涟漪从触点扩散，表达「你按的是这里」——空间位置本身就是信息。
 */
const meta = {
  title: 'Lumtact/01 · WaveButton 按钮',
  component: WaveButton,
  parameters: {
    docs: {
      description: {
        component: [
          '**热区 [PHYS: P-010]** 视觉可小，热区不可小于 44px。',
          '小尺寸按钮用 `::after` 伪元素撑开热区——不占布局空间，密度与生存权同时满足。',
          '这不算降级，是解。',
          '',
          '**波纹 [PHYS: P-004]** 起始半径下限 9px，保证 100ms 时已可见。',
          '**缓动 [GENE]** calm / brisk / swift 三档可换——这是风格选择，不是生理约束。',
        ].join('\n'),
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
      description: '语义变体',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description: '尺寸。sm 视觉仅 32px，但热区仍为 44px',
    },
    tier: {
      control: 'inline-radio',
      options: ['T0', 'T1', 'T2', 'T3'],
      description: '降级档位。T2 以下不出波，改用 brightness 承载回应',
    },
    busy: { control: 'boolean', description: '忙碌态 spinner [C-003]' },
    disabled: { control: 'boolean' },
  },
  args: { children: '触碰水面', variant: 'primary', size: 'md' },
} satisfies Meta<typeof WaveButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 默认：主按钮，波从触点扩散 */
export const Primary: Story = {};

/** 四种语义变体 */
export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <WaveButton {...args} variant="primary">主操作</WaveButton>
      <WaveButton {...args} variant="secondary">次操作</WaveButton>
      <WaveButton {...args} variant="ghost">幽灵</WaveButton>
      <WaveButton {...args} variant="danger">危险</WaveButton>
    </div>
  ),
};

/**
 * 尺寸与热区
 *
 * sm 视觉高度仅 32px，但热区仍是 44px——用伪元素撑开，不占布局。
 * 把指针移到按钮上下各 6px 的位置，依然可点。
 */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <WaveButton {...args} size="sm">小 32px</WaveButton>
      <WaveButton {...args} size="md">中 40px</WaveButton>
      <WaveButton {...args} size="lg">大 48px</WaveButton>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '[PHYS: P-010] 成人食指接触面积 8–10mm ≈ 44–56px。视觉尺寸与热区尺寸解耦。',
      },
    },
  },
};

/** 忙碌态：[C-003] 静止暗示完成 = 不确定性 = 焦虑 */
export const Busy: Story = {
  args: { busy: true, children: '处理中' },
  parameters: {
    docs: {
      description: {
        story:
          'spinner 是 infinite 动画，但它是「系统正在工作」的指示器，不构成闲置能耗 [R-003]。',
      },
    },
  },
};

/** 降级：T2 波熄，回应不熄 */
export const Degraded: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {(['T0', 'T1', 'T2', 'T3'] as const).map((t) => (
        <WaveButton {...args} key={t} tier={t}>
          {t}
        </WaveButton>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: [
          '**T2/T3 不出波**，但按下时 `brightness(1.4)` 顶上。',
          '',
          '> 光可以熄，触碰必须有回应——这是公理二的底线，不是可选优化。',
        ].join('\n'),
      },
    },
  },
};

/** 实时档位：由 useTier 探测的结果驱动 */
export const LiveTier: Story = {
  render: (args) => {
    const state = useTier();
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            color: 'var(--text-2)',
            padding: 12,
            border: '1px solid var(--line)',
            borderRadius: 8,
          }}
        >
          <div>当前档位：<strong>{state.tier}</strong></div>
          <div>实测帧率：{state.fps || '—'} fps（样本 {state.samples} 帧）</div>
          <div>reduced-motion：{String(state.reducedMotion)}</div>
          <div>coarse pointer：{String(state.coarse)}</div>
          <div>DPR：{state.dpr}</div>
        </div>
        <WaveButton {...args} tier={state.tier}>
          按此按钮触发探针
        </WaveButton>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          '首次交互后测量帧率（搭车已有 GPU 活跃期，不额外耗电 [R-003]）。' +
          '探针含 warm-up + 最小样本 + 二次确认 + 滞回四处修复（AUD-005）。',
      },
    },
  },
};
