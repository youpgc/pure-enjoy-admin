// Dashboard 数字格式化（从 Dashboard.tsx 抽取，供卡片与列表复用）

export function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}
