'use client';

import { useEffect, useRef, useState } from 'react';
import { tier as TIER, type Tier } from '../design/tokens';

/**
 * Lumtact 降级档位探测
 * ────────────────────────────────────────────────────────
 * 卷三 3.5.3 定义了四阶梯，但没说【怎么检测】——所以当时它只是文档。
 * 本 hook 是它的运行时实现。
 *
 * 【关键难点】节能模式前端查不到
 *   它把刷新率压到 30Hz，但浏览器不会因此设置 prefers-reduced-motion。
 *   唯一诚实的办法是实测帧率。
 *
 * 【能耗悖论】
 *   常驻 rAF 循环去测帧率，自己就让 GPU 睡不着，违反 R-003。
 *   解法：搭车 —— 只在首次交互后的窗口内测量，那时 GPU 本来就醒着。
 *   [R-003] 原文：「交互流转搭车已有 GPU 活跃期，能耗可忽略」。
 *
 * 【AUD-005 修正 · 保留为诚实履历】
 *   初版把计时起点设为调用 probe() 的时刻，而非第一帧真正绘制的时刻。
 *   pointerdown 后要创建波纹 DOM、forced reflow、首次合成，
 *   首个 rAF 回调可能延迟 400ms 以上。
 *   只要首帧延迟 > 500ms，采样帧数就只有 1，fps 恒为 2 → 必然 T2。
 *   MacBook 只是恰好撞上了这个窗口。
 *
 *   四处修复：
 *   ① warm-up：丢弃首帧，从第二帧才重置计时起点
 *   ② 最小样本：至少 8 帧才判定，上限 1.5s
 *   ③ 二次确认：fps < 28 时重测一次，取较高值
 *   ④ 滞回：降档 <28 / 升档 ≥36（间隔 8fps）
 */

interface ProbeResult {
  fps: number;
  samples: number;
}

function measureFrameRate(signal: AbortSignal): Promise<ProbeResult> {
  return new Promise((resolve) => {
    let frames = 0;
    let start = 0;
    let warmed = false;
    let raf = 0;
    let done = false;

    const finish = (result: ProbeResult) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      signal.removeEventListener('abort', onAbort);
      resolve(result);
    };

    const onAbort = () => finish({ fps: 0, samples: frames });

    const tick = (now: number) => {
      if (!warmed) {
        // ① warm-up：丢弃首帧
        warmed = true;
        start = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      frames++;
      const elapsed = now - start;

      // ② 最小样本 + 时间上限
      if (frames >= TIER.minSamples || elapsed > TIER.maxProbeMs) {
        finish({
          fps: elapsed > 0 ? (frames * 1000) / elapsed : 0,
          samples: frames,
        });
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    signal.addEventListener('abort', onAbort);
    raf = requestAnimationFrame(tick);
  });
}

/** 从 CSS 环境读取静态信号 */
function readStaticSignals() {
  if (typeof window === 'undefined') {
    return { reducedMotion: false, coarse: false, hasJs: false, dpr: 1 };
  }
  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    coarse: window.matchMedia('(pointer: coarse)').matches,
    hasJs: true,
    dpr: window.devicePixelRatio || 1,
  };
}

/** 按滞回规则决定档位 */
function decide(
  fps: number,
  prev: Tier | null,
  reducedMotion: boolean,
  coarse: boolean,
): Tier {
  // 生存权优先：用户明确声明，直接降
  if (reducedMotion) return 'T2';

  if (prev === null) {
    // 首次判定：无历史，用降档阈值
    if (fps > 0 && fps < TIER.dropToT2) return 'T2';
    if (coarse || (fps > 0 && fps < TIER.dropToT1)) return 'T1';
    return 'T0';
  }

  // ④ 滞回：升档阈值高于降档阈值
  if (prev === 'T0') return fps < TIER.dropToT1 ? 'T1' : 'T0';
  if (prev === 'T1') {
    if (fps >= TIER.riseToT0) return 'T0';
    if (fps < TIER.dropToT2) return 'T2';
    return 'T1';
  }
  if (prev === 'T2') return fps >= TIER.riseToT1 ? 'T1' : 'T2';
  return prev;
}

export interface TierState {
  tier: Tier;
  fps: number;
  samples: number;
  reducedMotion: boolean;
  coarse: boolean;
  dpr: number;
  probed: boolean;
}

export function useTier(): TierState {
  const static_ = readStaticSignals();

  // 无 JS 环境：T3。HTML 默认也是 T3，不谎报能力 [R-004]
  const [state, setState] = useState<TierState>({
    tier: static_.hasJs ? 'T0' : 'T3',
    fps: 0,
    samples: 0,
    reducedMotion: static_.reducedMotion,
    coarse: static_.coarse,
    dpr: static_.dpr,
    probed: false,
  });

  const tierRef = useRef<Tier>(static_.hasJs ? 'T0' : 'T3');
  const probedRef = useRef(false);

  useEffect(() => {
    if (!static_.hasJs) return;

    // 搭车：仅在首次真实交互后测量，测完即止
    const run = async () => {
      if (probedRef.current) return;
      probedRef.current = true;

      const ctrl = new AbortController();
      let r = await measureFrameRate(ctrl.signal);

      // ③ 二次确认：低帧率重测一次，取较高值
      if (r.fps > 0 && r.fps < TIER.dropToT2) {
        const ctrl2 = new AbortController();
        const r2 = await measureFrameRate(ctrl2.signal);
        r = r2.fps > r.fps ? r2 : r;
      }

      const next = decide(r.fps, tierRef.current, static_.reducedMotion, static_.coarse);
      tierRef.current = next;

      setState({
        tier: next,
        fps: Math.round(r.fps * 10) / 10,
        samples: r.samples,
        reducedMotion: static_.reducedMotion,
        coarse: static_.coarse,
        dpr: static_.dpr,
        probed: true,
      });
    };

    const kick = () => {
      void run();
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };

    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });

    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 系统偏好变化实时响应
  useEffect(() => {
    if (!static_.hasJs) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      const rm = mq.matches;
      setState((s) => ({
        ...s,
        reducedMotion: rm,
        tier: rm ? 'T2' : s.tier,
      }));
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [static_.hasJs]);

  return state;
}
