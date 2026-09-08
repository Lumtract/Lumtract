import { defineConfig } from 'vitest/config';

/**
 * Lumtact · 测试配置
 *
 * 【这些测试不是普通单测】
 * 它们把「审计清单十一审」里的生理审、层级审、约束链审
 * 变成了可执行断言。
 *
 * 若某条失败，说明钻石或钢铁约束被违反——
 * 卷三 3.4.2：生存权第一优先，任何目的不可豁免。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['default'],
    // 约束校验是纯计算，跑得很快，不需要并发限制
    pool: 'forks',
  },
});
