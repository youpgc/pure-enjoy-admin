import React from 'react'

interface NovelCoverProps {
  coverUrl?: string | null
  title: string
  width?: number | string
  height?: number | string
  borderRadius?: number
}

// 预定义的高级感渐变色板
const gradientPairs: [string, string][] = [
  ['#667eea', '#764ba2'], // 紫蓝
  ['#f093fb', '#f5576c'], // 粉紫
  ['#4facfe', '#00f2fe'], // 天蓝
  ['#43e97b', '#38f9d7'], // 翠绿
  ['#fa709a', '#fee140'], // 桃红-暖黄
  ['#fee140', '#fa709a'], // 金黄-桃红
  ['#30cfd0', '#330867'], // 青绿-深蓝紫
  ['#a8edea', '#fed6e3'], // 薄荷-粉白
  ['#ff9a9e', '#fecfef'], // 珊瑚-浅粉
  ['#fbc2eb', '#a18cd1'], // 淡紫-紫罗兰
  ['#8fd3f4', '#84fab0'], // 浅蓝-薄荷绿
  ['#84fab0', '#8fd3f4'], // 浅绿-天蓝
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) & 0x7fffffff
  }
  return h
}

function getGradient(title: string): [string, string] {
  const idx = Math.abs(hashString(title)) % gradientPairs.length
  return gradientPairs[idx]
}

const NovelCover: React.FC<NovelCoverProps> = ({
  coverUrl,
  title,
  width = 50,
  height = 70,
  borderRadius = 4,
}) => {
  const [start, end] = getGradient(title)

  const placeholder = (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(135deg, ${start}, ${end})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          textAlign: 'center',
          lineHeight: 1.4,
          textShadow: '0 1px 4px rgba(0,0,0,0.3)',
          wordBreak: 'break-all',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {title || '未知'}
      </span>
    </div>
  )

  if (!coverUrl) {
    return placeholder
  }

  return (
    <div style={{ width, height, borderRadius, overflow: 'hidden' }}>
      <img
        src={coverUrl}
        alt={title}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius,
        }}
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            const div = document.createElement('div')
            div.style.width = String(width)
            div.style.height = String(height)
            div.style.borderRadius = String(borderRadius)
            div.style.background = `linear-gradient(135deg, ${start}, ${end})`
            div.style.display = 'flex'
            div.style.alignItems = 'center'
            div.style.justifyContent = 'center'
            div.style.padding = '6px'
            div.style.overflow = 'hidden'
            div.innerHTML = `<span style="color:#fff;font-size:12px;font-weight:600;text-align:center;line-height:1.4;text-shadow:0 1px 4px rgba(0,0,0,0.3);word-break:break-all;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${title || '未知'}</span>`
            parent.appendChild(div)
          }
        }}
      />
    </div>
  )
}

export default NovelCover
