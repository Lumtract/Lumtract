/**
 * Lumtact · 水之波光 · 触境
 * 设计令牌 · TypeScript 单一事实源
 * v10.0.0-alpha
 *
 * 【为什么有 TS 版本】
 * CSS 变量无法被类型检查，也无法在 JS 逻辑里被引用。
 * 波纹的起始半径计算、帧率探针的阈值判定，都需要读令牌。
 * 若 JS 里硬编码 44 / 9 / 0.15，就违反卷三 3.5.4「设计令牌零硬编码」
 * （该条被列为不可降级底线）。
 *
 * 【纪律】本文件的每个值必须与 lumtact-tokens.css 一致。
 * 二者同源，不得各自漂移。
 */

/** 来源标注标签（卷三 2.4） */
export type Source = 'PHYS' | 'ENG' | 'GENE' | 'PURPOSE';

export interface Annotated<T> {
  value: T;
  source: Source[];
  /** 支撑该值的约束 ID，如 P-001 / D-003 */
  constraints: string[];
  /** 该约束如何支撑此值 */
  why: string;
  /** 硬度：钻石(碳基) / 钢铁(硅基) / 陶土(约定) */
  hardness: 'diamond' | 'steel' | 'clay';
}

function tok<T>(
  value: T,
  source: Source[],
  constraints: string[],
  why: string,
  hardness: Annotated<T>['hardness'],
): Annotated<T> {
  return { value, source, constraints, why, hardness };
}

/**
 * 波纹核心令牌
 * 规则：果从因的位置长出。
 */
export const wave = {
  /**
   * 起始半径下限。
   * [PHYS: P-004] 因果感知下限 100ms —— 起手必须立刻可见。
   *
   * 推导史（AUD-004 修正，保留为诚实履历）：
   * 曾用 scale(0) 起步，50px 小按钮上 ease-in 仅 1.7px、ease-out 仅 5.8px，
   * 均不可见。给起始半径一个物理下限后，两档缓动在小容器上全部达标。
   * 病灶是 scale(0)，不是缓动曲线。
   */
  minRadius: tok(
    9,
    ['PHYS'],
    ['P-004', 'P-002'],
    '起始半径下限，保证任何缓动在 100ms 时都已可见；不随容器尺寸漂移',
    'diamond',
  ),

  /**
   * 缓动曲线。三档可选。
   * [GENE] 这是风格选择，不是生理约束。
   *
   * AUD-003 修正：曾把 ease-in 判为 EXCLUDED，属「基因冒充约束」。
   * 可见性由 minRadius 保证，不由缓动保证。
   */
  easing: {
    calm:  tok('cubic-bezier(.6, 0, 1, 1)',    ['GENE'], [], '柔和起手，尾部收敛；默认', 'clay'),
    brisk: tok('cubic-bezier(.2, 0, 0, 1)',    ['GENE'], [], '果断起手，快速铺开', 'clay'),
    swift: tok('cubic-bezier(.34, 1.2, .64, 1)', ['GENE'], [], '尾部轻微过冲', 'clay'),
  },

  /**
   * 单次波纹时长。
   * [PHYS: P-006] 心流打断阈值 600ms —— 超过即被视为打断。
   */
  duration: tok(
    520,
    ['PHYS'],
    ['P-006'],
    '单次波纹全流程 < 600ms 心流打断线',
    'diamond',
  ),

  /**
   * 输入框光标呼吸周期。
   * [PHYS: P-019] 闪烁 > 3Hz 可能触发光敏性癫痫。
   * 1400ms = 0.71Hz，远低于 3Hz 安全线。
   */
  breath: tok(
    1400,
    ['PHYS'],
    ['P-019', 'C-003'],
    '0.71Hz ≪ 3Hz 光敏安全线；同时满足 C-003 静止暗示完成的焦虑规避',
    'diamond',
  ),

  /**
   * 并发上限。
   * [PHYS: R-001] 多数半透明层叠加不产生可预测颜色。
   * 注意：6 为理论推导值，未做真机验证（诚实清单）。
   */
  maxConcurrent: tok(
    6,
    ['PHYS'],
    ['R-001'],
    'Alpha 叠加不可预测；超限时回收最旧的波。真机未验证',
    'steel',
  ),

  /** 反光不透明度。无彩色，不触发 D-003 子像素借色彩边。 */
  opacity: tok(0.22, ['PHYS'], ['P-001', 'D-003'], 'ΔL* ≈23；白色无彩色避免彩边', 'diamond'),
  ringWidth: tok(1.5, ['PHYS'], ['P-002'], '配合抗锯齿降低高频噪声', 'diamond'),
} as const;

/**
 * 热区。
 * [PHYS: P-010] 成人食指接触面积 8–10mm ≈ 44–56px。
 * 语义必须唯一 —— 不得用它表达「被排除的错误方案」。
 */
export const hit = {
  min: tok(
    44,
    ['PHYS'],
    ['P-010'],
    '热区最小尺寸；屏幕边缘垂直方向可降至 32px（边缘目标无限大效应）',
    'diamond',
  ),
  edgeMin: tok(32, ['PHYS'], ['P-010'], '屏幕边缘方向的放宽值', 'diamond'),
} as const;

/**
 * 边缘截断提示。
 * 语义：容器边缘这道唇在 content 上投下的影。
 * 位置：圆角之内（遮挡发生在被遮物一侧）。
 */
export const edge = {
  width: tok(
    24,
    ['ENG'],
    [],
    '= 2 × 单元格内边距，与 padding 同源，非任意值',
    'clay',
  ),
  /** 昼：叠黑（白底无上升空间） */
  alphaLight: tok(0.15, ['PHYS'], ['D-001', 'P-001'], 'ΔL* 13.39；被遮处正文 CR 12.78:1', 'diamond'),
  /** 夜：叠白（近黑仅剩 26 级下降空间） */
  alphaDark: tok(0.12, ['PHYS'], ['D-001', 'P-001'], 'ΔL* 13.12；被遮处正文 CR 10.61:1', 'diamond'),
} as const;

/**
 * 降级阶梯阈值。
 * [ENG] 滞回区间 —— 单一阈值必然在边界抖动（AUD-005 实测）。
 */
export const tier = {
  /** 降档阈值 */
  dropToT1: 46,
  dropToT2: 28,
  /** 升档阈值（高于降档，形成 8fps 滞回带） */
  riseToT1: 36,
  riseToT0: 54,
  /** 探针最小采样帧数 —— 低于此不判定，避免首帧抖动误判 */
  minSamples: 8,
  /** 探针最长测量时长 */
  maxProbeMs: 1500,
} as const;

export type Tier = 'T0' | 'T1' | 'T2' | 'T3';

/** 时间令牌 */
export const dur = {
  press: tok(120, ['PHYS'], ['P-004'], '> 100ms 因果可感知下限', 'diamond'),
  state: tok(200, ['PHYS'], ['P-005'], '200–350ms 注意力切换舒适区', 'diamond'),
  enter: tok(260, ['PHYS'], ['P-005'], '入场转场', 'diamond'),
} as const;

/** 空间令牌（4px 网格） */
export const sp = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24 } as const;

/** 圆角 */
export const radius = { sm: 4, md: 8, lg: 12 } as const;
