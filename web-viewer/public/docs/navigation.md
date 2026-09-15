# 导航中枢・Navigation

> **这份文档是图谱的枢纽。**
> 它把四卷体系、组件资产、约束库、校验工具连接成一张可导航的网。
> `dag-generator`
>
>  扫描本目录时会提取其中的 Markdown 链接，
> 于是「从任何一个设计值走到支撑它的约束」成为可能。



***

## 一・三层结构



| 层    | 名字                        | 隐喻                  | 位置                       |
| -- | ------------------------- | ------------------- | ------------------------ |
| 容器  | **Lumtact**・水之波光（设计体系）      | **水**・设计            | `web-viewer/src/design/` |
| 内容  | **Lumtract** 文档图谱          | **光**・被表达的信息       | `web-viewer/public/docs/` |
| 观测者 | **人**（用户与设计者）              | 相遇的前提               | 任何一次使用 / 推导             |
| 相遇  | **波光**                    | 关系（不属于任何单一实体）     | —                        |

> 波光是关系，不是属性——它不属于水，不属于光，不属于人。本文档所描述的导航网是光的形态之一，不是波光本身。



***

## 二・四卷体系

知识从上往下流，质疑从下往上流。



| 卷  | 文档                                     | 性质        | 可变性             |
| -- | -------------------------------------- | --------- | --------------- |
| 卷一 | [philosophy.md](philosophy.md)         | 公理系统      | 极慢。认知科学范式转移时才升级 |
| 卷二 | [constraints.md](constraints.md)       | 知识库（硬边界）  | 慢。随研究与技术演进      |
| 卷三 | [derivation.md](derivation.md)         | 方法论（推导协议） | 中。随实践反馈优化       |
| 卷四 | [archive.md](archive.md)               | 实例档案      | 快。每项目独立维护       |
| 总纲 | [system-summary.md](system-summary.md) | 体系总纲      | —               |

**流向规则**



```
哲学 → 约束 → 引擎 → 实例      （知识流）

实例 → 质疑 → 约束/引擎        （质疑流，通过版本迭代解决）
```

> 实例永远不能反向修改公理。若实例与公理冲突，
> 要么是实例推导错误，要么是公理需要升级 —— 升级通过新版本实现，不原地修改。



***

## 三・组件资产（卷四・应用记录）

每一条都是一次完整推导。**值可被抄，推导链不能。**



| #  | Story            | 验证的约束                                                                                                 |
| -- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| 01 | WaveButton 按钮    | [P-010](constraints.md#p-010) 热区・[P-004](constraints.md#p-004) 起始可见・T0–T3                             |
| 02 | BreathInput 输入框  | [P-019](constraints.md#p-019) 光敏・[R-001](constraints.md#r-001) 并发・[C-003](constraints.md#c-003) 情绪时间  |
| 03 | EdgeVeilTable 表格 | [P-014](constraints.md#p-014) 闭合性・[D-001](constraints.md#d-001) 极性・[L-001](constraints.md#l-001) 层级-视觉同构 |
| 04 | Ripple 实验台       | 缓动三档定格（[P-004](constraints.md#p-004) 因果感知下限）・容器尺寸・昼夜极性（[D-001](constraints.md#d-001)） |
| 05 | Tier 降级阶梯        | 帧率探针・滞回（[R-003](constraints.md#r-003) 零闲置）・实时诊断 |

**源码位置**



| 文件                                 | 职责                                             |
| ---------------------------------- | ---------------------------------------------- |
| `src/design/lumtact-tokens.css`    | 令牌单一事实源（带来源标注）                                 |
| `src/design/tokens.ts`             | TS 令牌（`source / constraints / why / hardness`） |
| `src/design/contrast.ts`           | 颜色计算（sRGB 线性化、CIE L\*、WCAG）                    |
| `src/design/css-scan.ts`           | CSS 结构化解析                                      |
| `src/components/LumtactRipple.tsx` | 波纹引擎                                           |
| `src/components/useTier.ts`        | 降级档位探测                                         |



***

## 四・IP 规则

> **果，从因的那个位置长出。**
> 任何反馈的起点，必须是触发它的那个空间坐标。

这条规则能长出无数形态 —— 卡片涟漪、输入框呼吸、边缘遮蔽、加载水纹。

**别人抄走任何一个形态，都抄不走这条规则。**

三条边界（缺了就退化成装饰）：



| 边界   | 约束                                                            | 含义                  |
| ---- | ------------------------------------------------------------- | ------------------- |
| 起手快  | [P-004](constraints.md#p-004)                                 | <100ms 必须可见，尾部才允许缓慢 |
| 并发上限 | [R-001](constraints.md#r-001)                                 | 层数恒定，不叠加 alpha      |
| 零闲置  | [R-003](constraints.md#r-003) · [D-002](constraints.md#d-002) | 因动而动，无行为即无动画        |



***

## 五・三道关卡

审计清单（十一审）中可自动化的部分。



| 关卡     | 命令                                | 查什么                  |
| ------ | --------------------------------- | -------------------- |
| ① 约束校验 | `node scripts/lumtract-verify.mjs` | 设计值 vs 钻石约束（25 项）＋N-系列推导完整性（来源锚定 / 平台登记） |
| ② 契约测试 | `npx vitest run`                  | 令牌契约・层级单调・零硬编码・导出一致性 |
| ③ 类型检查 | `npm run build`                   | 类型闭合（**唯一不可替代**）     |

> 三者查的是三件不同的事：
> `verify`
>
>  管不了类型；
>
> `vitest`
>
>  用 esbuild 只擦除不校验，也管不了类型。
> 实测：一次泛型逆变错误，前两道全绿，只有 build 抓到。



***

## 六・约束快速索引

按硬度分组排列（原"按消费频次"意图未兑现：P/C/L 系列被组件消费，N-系列 23 条目前零组件消费——engineering-guide 待启动，见 [§八](#八已知负债)）。点击跳往 [constraints.md](constraints.md)（卷二主体）与 [constraints-navigation.md](constraints-navigation.md)（导航分册）对应条目。

### 碳基・钻石（不可妥协）



| ID                            | 名称      | 阈值         | 消费处              |
| ----------------------------- | ------- | ---------- | ---------------- |
| [P-001](constraints.md#p-001) | 韦伯定律    | ΔL/L 1–2%  | 对比度・振幅台          |
| [P-002](constraints.md#p-002) | 对比敏感度函数 | 峰值 3–5 cpd | 圆角・环宽            |
| [P-004](constraints.md#p-004) | 因果感知下限  | 100ms      | `dur-press`・起始半径 |
| [P-010](constraints.md#p-010) | 热区      | ≥44px      | `hit-min`        |
| [P-014](constraints.md#p-014) | 闭合性     | —          | 边缘遮蔽・零态          |
| [P-019](constraints.md#p-019) | 光敏性癫痫   | ≤3Hz       | 呼吸波周期            |
| [C-003](constraints.md#c-003) | 情绪时间    | —          | 骨架屏・呼吸波          |

### 硅基・钢铁



| ID                            | 名称        | 消费处       |
| ----------------------------- | --------- | --------- |
| [D-001](constraints.md#d-001) | sRGB 安全交集 | 昼夜极性      |
| [D-002](constraints.md#d-002) | LTPO 刷新率  | 闲置动画停止    |
| [R-001](constraints.md#r-001) | Alpha 合成  | 状态互斥・并发上限 |
| [R-003](constraints.md#r-003) | GPU 能耗    | 零闲置       |

### 内容逻辑



| ID                            | 名称        | 消费处              |
| ----------------------------- | --------- | ---------------- |
| [L-001](constraints.md#l-001) | 层级 - 视觉同构 | 行状态三级单调          |
| [L-002](constraints.md#l-002) | 语义色相强制    | 语义色・反光无彩色        |
| [L-003](constraints.md#l-003) | 状态互斥      | 逻辑层裁决・data-state |

### 导航与流转（N - 系列，v10.2.0 拆分至 constraints-navigation.md）



| ID                            | 名称                  | 硬度        | 核心边界                    |
| ----------------------------- | ------------------- | --------- | ----------------------- |
| [N-001](constraints-navigation.md#n-001) | 扁平层级优先              | 钻石 + 陶土   | 两级优于三级，深度增加认知负载         |
| [N-002](constraints-navigation.md#n-002) | 单级选项数约束             | 陶土（P-020 已摘除）    | 顶级导航 ≤5 [ENG]，随机列表 4–8 项 [ENG] |
| [N-003](constraints-navigation.md#n-003) | 位置感持续线索             | 钻石        | 每界面必须有 "我在哪" 指示         |
| [N-004](constraints-navigation.md#n-004) | 层级主干优于网络            | 钻石        | 非线性结构增加迷失               |
| [N-005](constraints-navigation.md#n-005) | 返回始终可用              | 钻石 + 陶土   | 导航栈 LIFO，禁边缘返回需理由       |
| [N-006](constraints-navigation.md#n-006) | 面包屑显示层级             | 钻石 + 陶土   | 非浏览历史，Web / 桌面约定        |
| [N-007](constraints-navigation.md#n-007) | 中断恢复需外部线索           | 钻石        | 恢复滞后约 2× 正常间隔           |
| [N-008](constraints-navigation.md#n-008) | 导航形态由数量 × 屏宽决定      | 陶土 + 钻石   | 底部 3–5，Rail 3–7，≥5 评估抽屉 |
| [N-009](constraints-navigation.md#n-009) | 可见导航优先于隐藏           | 钻石        | 汉堡菜单可发现性降～50%           |
| [N-010](constraints-navigation.md#n-010) | 模态用于任务中断            | 陶土 + 钻石   | 非层级导航，单一路径，始终有出口        |
| [N-011](constraints-navigation.md#n-011) | 深链直达重建上下文           | 陶土 + 钻石   | 孤立详情页违反位置感              |
| [N-012](constraints-navigation.md#n-012) | 冷启动恢复导航状态           | 钻石 + 陶土   | 状态丢失 = 预测误差             |
| [N-013](constraints-navigation.md#n-013) | 零态 / 错误态 / 加载态必须有出路 | 钻石        | 闭合性 + 情绪时间              |
| [N-014](constraints-navigation.md#n-014) | 模态必须有显式出口           | 钻石 + 陶土   | 按钮 + 手势双保险，区分取消 / 关闭    |
| [N-015](constraints-navigation.md#n-015) | 优先可逆而非确认对话框         | 钻石 + 陶土   | 频繁确认训练机械跳过（假说）          |
| [N-016](constraints-navigation.md#n-016) | 破坏性操作可撤销或后果预览       | 钻石        | 运动误差必然 + 因果不虚           |
| [N-017](constraints-navigation.md#n-017) | 站内导航一致性             | 钻石 + 陶土   | 站内一致 > 跨站惯例             |
| [N-018](constraints-navigation.md#n-018) | 标签语义一致（信息气味）        | 钻石        | 模糊标签 = 低气味，禁止 "点击这里"    |
| [N-019](constraints-navigation.md#n-019) | 同功能不同入口行为一致         | 钻石        | WCAG 3.2.4 AA           |
| [N-020](constraints-navigation.md#n-020) | 绕过重复导航块             | 陶土（WCAG A 合规）    | WCAG 2.4.1，"跳到主内容" 链接   |
| [N-021](constraints-navigation.md#n-021) | 焦点顺序保留意义            | 钻石（P-021）+ 陶土（WCAG A/AA） | WCAG 2.4.3 + 2.4.11     |
| [N-022](constraints-navigation.md#n-022) | 多种定位页面方式            | 陶土（WCAG AA 合规）   | WCAG 2.4.5，搜索 + 站点地图    |
| [N-023](constraints-navigation.md#n-023) | 拖拽手势须有非拖拽替代         | 钻石（P-010/P-011）+ 陶土（WCAG AA）   | WCAG 2.5.7，按钮替代滑动       |

> N - 系列约束的引入依据 [ADR-0001](adrs/ADR-0001-navigation-constraints.md)（已 Superseded）；v10.2.0 硬度与来源修订依据 [ADR-0002](adrs/ADR-0002-revise-navigation-constraints.md)；v10.3.0 硬度-来源一致性修订依据 [ADR-0003](adrs/ADR-0003-hardness-source-consistency.md)。外部来源索引见 constraints-navigation.md §2.4.10。



***

## 七・阅读路径



| 你是               | 建议路径                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------ |
| **设计者**（想知道值从哪来） | [philosophy.md](philosophy.md) → [derivation.md](derivation.md) → [archive.md](archive.md) |
| **开发者**（要改组件）    | 本文档第三节 → `src/design/tokens.ts` → 对应 story                                                 |
| **审计者**（要验证诚实性）  | 三道关卡 → [constraints.md](constraints.md) → 逐条比对标注                                           |



***

## 八・已知负债

诚实清单。这些是**尚未解决**的问题，不是遗漏。



| 项        | 状态                                                      |
| -------- | ------------------------------------------------------- |
| 目的档案     | 未经真实用户访谈，`[PURPOSE]` 均为临时值                              |
| 并发上限 6   | 理论推导，未做真机验证                                             |
| DEBT-006 | 暗部 ΔL/L 与 ΔL\* 判据打架，[P-001](constraints.md#p-001) 缺分段阈值 |
| 色觉障碍     | 未做全谱验证                                                  |
| N-系列（23 条） | 零组件实现消费、零实例档案推导验证；verify 已覆盖来源完整性（派生锚 / 平台登记 / 来源类型），阈值与设计值均未实例验证 |



***

`[ALIGN: Lumtact · 水之波光 · 触境] @ v10.3.0`