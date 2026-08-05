// 批注模块常量与展示辅助（从 Annotations.tsx 抽离，审查 P1 膨胀）

export const COLOR_MAP: Record<string, string> = {
  yellow: '#faad14',
  green: '#52c41a',
  blue: '#1890ff',
  red: '#f5222d',
}

export const SENSITIVE_WORDS = ['色情', '暴力', '赌博', '毒品', '反动', '政治', '傻逼', '他妈的']

export const ColorDot = ({ color }: { color: string }) => (
  <span
    style={{
      display: 'inline-block',
      width: 14,
      height: 14,
      borderRadius: 4,
      background: COLOR_MAP[color] || color,
      border: '1px solid #ddd',
    }}
  />
)

export const containsSensitive = (text: string) =>
  SENSITIVE_WORDS.filter((w) => text.includes(w))
