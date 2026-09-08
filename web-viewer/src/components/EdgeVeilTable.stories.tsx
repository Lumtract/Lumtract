import type { Meta, StoryObj } from '@storybook/nextjs';
import { EdgeVeilTable, type EdgeVeilTableProps } from './EdgeVeilTable';

/**
 * Lumtact 表格 · 边缘截断遮蔽
 *
 * 【语义】内容在此处被截断，但那边还有更多。
 *
 * 图式：容器边缘是一道唇，content 从它下面穿过——
 * 唇在 content 上投下影，这个影就是「它没消失，只是被盖住了」的物证。
 */
interface Row {
  id: string;
  name: string;
  role: string;
  status: string;
  latency: string;
}


const meta = {
  title: 'Lumtact/03 · EdgeVeilTable 表格',
  component: EdgeVeilTable,
  parameters: {
    docs: {
      description: {
        component: [
          '### 四版推翻史（保留为诚实履历）',
          '',
          '| 版本 | 做法 | 错误本质 |',
          '|---|---|---|',
          '| v4 | 48px 渐变光带覆盖内容 | 用装饰侵略内容 [P-016][L-001] |',
          '| v5 | 2px 线 `left:-1px` + 向外阴影 | 存在于容器之外，归属不自洽 |',
          '| v6 | 容器自身 border 变色 | 说「这是边界」，不说「那边还有」，语义落空 |',
          '| **v7** | 圆角之内的遮蔽 veil | 采纳 |',
          '',
          '**位置判定**：遮挡发生在被遮物一侧 → content 在容器内 → 影必须在圆角之内。',
          '落在边上什么都没遮住，等于没说话。',
          '',
          '**极性 [PHYS: D-001]** 由动态范围决定，不是风格：',
          '- 昼 `#FFFFFF` 向上余 0 级 → 只能变暗（阴影）',
          '- 夜 `#1A1A1A` 向下余 26 级 → 只能变亮（微光）',
        ].join('\n'),
      },
    },
  },
  argTypes: {
    tier: { control: 'inline-radio', options: ['T0', 'T1', 'T2', 'T3'] },
    minWidth: { control: { type: 'range', min: 300, max: 1200, step: 20 } },
  },
} satisfies Meta<EdgeVeilTableProps<Row>>;

export default meta;

/**
 * 【泛型组件必须用 props 类型，不能用 typeof】
 *
 * `Meta<typeof EdgeVeilTable>` 会把 T 擦除成 unknown，
 * 于是 args 里 rowKey 的目标类型变成 `(row: unknown) => string`。
 * 由于参数是逆变的，任何 `(r: Row) => string` 都【不】可赋值——
 * 这就是上一版给 rowKey 加显式标注后仍然报错的原因。
 *
 * 正确写法是走 Meta<TCmpOrArgs> 的 Args 分支：
 * `Meta<EdgeVeilTableProps<Row>>`，让 T 在此处具体化为 Row。
 */
type Story = StoryObj<EdgeVeilTableProps<Row>>;

const rows: Row[] = [
  { id: '1', name: 'P-001', role: '韦伯阈值', status: '钻石', latency: '1–2%' },
  { id: '2', name: 'P-002', role: '对比敏感度函数', status: '钻石', latency: '3–5 cpd' },
  { id: '3', name: 'P-004', role: '因果感知下限', status: '钻石', latency: '100ms' },
  { id: '4', name: 'P-010', role: '热区尺寸', status: '钻石', latency: '44px' },
  { id: '5', name: 'P-014', role: '闭合性', status: '钻石', latency: '—' },
  { id: '6', name: 'D-001', role: 'sRGB 色域', status: '钢铁', latency: '安全交集' },
  { id: '7', name: 'D-003', role: 'Pentile 子像素', status: '钢铁', latency: '≥2px' },
  { id: '8', name: 'R-003', role: 'GPU 能耗', status: '钢铁', latency: '零闲置' },
];

const columns = [
  { key: 'name', header: '约束 ID', width: 110 },
  { key: 'role', header: '名称', width: 180 },
  { key: 'status', header: '硬度', width: 90 },
  { key: 'latency', header: '阈值', width: 110, align: 'right' as const },
];

/**
 * rowKey 只在这里定义一次。
 *
 * 【为什么必须显式标注 Row】
 * EdgeVeilTable 是泛型组件 `EdgeVeilTable<T>`。
 * 而 `Meta<typeof EdgeVeilTable>` 会把 T 擦除成 unknown ——
 * 这是 TS 处理泛型组件 + ComponentProps<typeof F> 的结构性限制，
 * 无法在组件侧修掉。
 *
 * 所以具体类型只能在使用侧绑定，而 Row 恰恰只在这里已知。
 *
 * 【为什么是单个 const 而不是四处各标一次】
 * 本文件此前有 4 处 rowKey，其中 1 处标了 `(r: Row)`、3 处没标。
 * 同一个事实在 4 个地方表达 = 漂移的定义（AUD-007 同源）。
 * 收敛到一处，4 个 story 共享。
 */
const rowKey = (r: Row): string => r.id;

/**
 * 默认：窄容器下横向滚动，截断侧出现遮蔽
 *
 * 拖动横向滚动条，观察两侧遮蔽的出现与消失。
 */
export const Default: Story = {
  args: {
    columns,
    rows,
    rowKey,
    minWidth: 720,
  },
};

/**
 * 层级单调验证
 *
 * 悬停任意行看 hover，点击看 selected。
 * 三者 ΔL*：斑马 2.96 < hover 6.40 < selected 10.91，单调成立。
 */
export const RowStates: Story = {
  args: {
    columns,
    rows,
    rowKey,
    minWidth: 720,
  },
  parameters: {
    docs: {
      description: {
        story: [
          '**状态互斥由逻辑层裁决**（`:not([aria-selected])`），不叠加 alpha [R-001]。',
          '',
          '若直接叠加，hover 在斑马行上会完全看不见——因为两者 ΔL* 相同。',
          '所以必须先降级斑马纹，再定义 hover。',
          '',
          'selected 额外有左侧 2px 竖条：[L-001] 层级不能只靠颜色。',
        ].join('\n'),
      },
    },
  },
};

/** 零态：[P-014] 闭合性要求零态必须自证 */
export const Empty: Story = {
  args: {
    columns,
    rows: [],
    rowKey,
    minWidth: 720,
    emptyText: '暂无约束记录',
  },
  parameters: {
    docs: {
      description: {
        story:
          '[P-014] 闭合性：人脑倾向把不完整的形状感知为完整。' +
          '空态若不解释「为什么空」，用户会以为加载失败。',
      },
    },
  },
};

/** 宽度对照：调 minWidth 观察遮蔽何时出现 */
export const WidthProbe: Story = {
  args: {
    columns,
    rows,
    rowKey,
    minWidth: 1000,
  },
  parameters: {
    docs: {
      description: {
        story:
          '调小 `minWidth` 直到内容不再溢出，两侧遮蔽会自动消失——' +
          '它与滚动位置实时联动，滚到尽头即消退。',
      },
    },
  },
};
