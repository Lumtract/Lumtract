import type { Meta, StoryObj } from '@storybook/nextjs';
import { BreathInput } from './BreathInput';

/**
 * Lumtact 输入框 · 光标呼吸波
 *
 * 【语义追问】波纹该确认什么？
 *
 * 不是「这个字符收到了」——字符出现在屏幕上已是完备反馈 [C-001]，
 * 再确认一次是噪音 [P-016]。
 *
 * 它确认的是：**焦点在此，我还活着**。
 */
const meta = {
  title: 'Lumtact/02 · BreathInput 输入框',
  component: BreathInput,
  parameters: {
    docs: {
      description: {
        component: [
          '**为什么不是每键一道波纹**——三条独立约束同时否定：',
          '',
          '| 约束 | 数字 |',
          '|---|---|',
          '| [R-001] 并发叠加 | 8 字符/秒 × 900ms = 同时 7 道；alpha 叠 17 道逼近纯白 |',
          '| [P-019] 光敏 | 打字 5–12Hz，远超 3Hz 安全线 |',
          '| [C-001] 语义冗余 | 输入即所得，字符本身已是反馈 |',
          '',
          '**最终形态**：',
          '- 聚焦瞬间 → 从光标位置发一道唤醒波',
          '- 聚焦期间 → 光标处持续呼吸涟漪，1400ms = 0.71Hz ≪ 3Hz',
          '- 每次击键 → 不新增波纹，只让当前这道颤动一下',
          '- 失焦 → 立即停止',
        ].join('\n'),
      },
    },
  },
  argTypes: {
    tier: {
      control: 'inline-radio',
      options: ['T0', 'T1', 'T2', 'T3'],
    },
    debug: { control: 'boolean', description: '显示波纹层数' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: '标签',
    placeholder: '点击此处，看光标处的呼吸波',
    hint: '聚焦后光标处会出现一道持续呼吸的涟漪',
  },
} satisfies Meta<typeof BreathInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 默认：聚焦后光标呼吸 */
export const Default: Story = {};

/** 打字测试：快速输入，观察波形不叠加 */
export const Typing: Story = {
  args: {
    label: '打字测试',
    placeholder: '快速输入，看波是否糊成一片',
    debug: true,
    hint: '每键只让当前波颤动一下，层数恒为 1，不会叠加',
  },
  parameters: {
    docs: {
      description: {
        story:
          '若改成「每键一道波纹」，快速输入下同时存在 7 道，alpha 叠加后逼近纯白，' +
          '且频率远超光敏安全线。当前实现规避了这一点。',
      },
    },
  },
};

/** 波纹层数可视化 */
export const LayerDebug: Story = {
  args: {
    label: '并发调试',
    debug: true,
    hint: '观察「波纹层数」：呼吸波恒为 1，唤醒波短暂 +1 后归零',
  },
};

/** 各档位表现 */
export const Tiers: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
      {(['T0', 'T1', 'T2', 'T3'] as const).map((t) => (
        <BreathInput
          {...args}
          key={t}
          tier={t}
          label={`${t}`}
          placeholder={`${t} 档位表现`}
        />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'T1 起不再有呼吸波（只剩唤醒波），T2/T3 全部停止。' +
          '但聚焦边框仍会变蓝——触碰必须有回应。',
      },
    },
  },
};
