import React from 'react'

// 通关条件中文描述（从 GameScores/index.tsx 抽离，审查 P1 单文件超 500 行）
// 纯代码搬迁，逻辑零变更。

/// 收集目标颜色映射（type → 展示色/中文名），与 App 端 kCandyColors 同源
const COLLECT_TYPE_COLORS: Record<number, string> = {
  0: '#EF5350',
  1: '#42A5F5',
  2: '#66BB6A',
  3: '#FFEE58',
  4: '#AB47BC',
  5: '#FFA726',
}
const COLLECT_TYPE_NAMES: Record<number, string> = {
  0: '红',
  1: '蓝',
  2: '绿',
  3: '黄',
  4: '紫',
  5: '橙',
}

/// 彩色圆点（按收集目标 type 实际颜色渲染，黑点无法辨识元素——2026-09-10）
function collectDot(type: number) {
  const t = ((type % 6) + 6) % 6
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: COLLECT_TYPE_COLORS[t] ?? '#666',
        border: '1px solid rgba(255,255,255,0.4)',
        marginRight: 4,
        verticalAlign: '-1px',
      }}
    />
  )
}

/// 按关卡 config/target 生成通关条件中文描述（各模式键见游戏模块配置参考文档 §3.3/§6）
///
/// [gameCode] 用于区分语义：g2048 的 target 是「合成目标方块」而非得分。
/// 注意：config 里的 types（方块种类数）/layers（堆叠深度）是难度旋钮而非
/// 通关条件，不进入描述（2026-09-10 用户反馈展示内容不符）。
/// 收集目标渲染为「彩色圆点 + 中文名×数量」（黑点 → 语义色，2026-09-10）。
export function levelConditionDesc(
  lv: Record<string, any> | undefined,
  gameCode?: string
): React.ReactNode {
  if (!lv) return '-'
  const c = (lv.config ?? {}) as Record<string, any>
  const parts: React.ReactNode[] = []
  if (c.time_limit) parts.push(`限时 ${c.time_limit}s`)
  else if (c.timeLimit) parts.push(`限时 ${c.timeLimit}s`)
  if (c.moves || c.max_moves) parts.push(`限 ${c.moves ?? c.max_moves} 步`)
  if (c.goal) parts.push(`得分≥${c.goal}`)
  if (c.jelly || c.jelly_layers) parts.push(`果冻 ${c.jelly ?? c.jelly_layers} 层`)
  // 颜色收集目标（新数组口径 → 彩色圆点 + 中文名；旧单值口径 → 纯文本）
  const collectDesc = (arr: any[]): React.ReactNode[] =>
    arr.map((g, i) => (
      <React.Fragment key={i}>
        {i > 0 && ' + '}
        {collectDot(Number(g.type))}
        {COLLECT_TYPE_NAMES[(Number(g.type) % 6 + 6) % 6] ?? g.type}×{g.count}
      </React.Fragment>
    ))
  if (Array.isArray(c.collect) && c.collect.length) parts.push(collectDesc(c.collect))
  else if (c.ingredients) parts.push(`收集 ${c.ingredients} 个`)
  if (c.orders) parts.push(`收集 ${c.orders} 个`)
  if (c.ice) parts.push(`冰块 ${c.ice}`)
  if (Array.isArray(c.iceCollect) && c.iceCollect.length) parts.push(collectDesc(c.iceCollect))
  if (typeof c.target === 'number') {
    // g2048 的 target = 合成目标方块（256/512/…/2048），与得分无关
    parts.push(gameCode === 'g2048' ? `合成 ${c.target}` : `目标 ${c.target}`)
  }
  const t = lv.target as Record<string, any> | null
  if (!parts.length && t?.score) parts.push(`得分≥${t.score}`)
  if (!parts.length && t?.type === 'none') parts.push('合成目标方块')
  if (!parts.length) return '-'
  // 各段以「·」分隔渲染
  return parts.map((p, i) => (
    <React.Fragment key={i}>
      {i > 0 && ' · '}
      {p}
    </React.Fragment>
  ))
}
