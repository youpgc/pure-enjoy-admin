import { useEffect, useState } from 'react'
import { ACHIEVEMENT_SHARED_ICON_BASE } from '../../constants/game'

/// 成就进阶等级色（青铜→王者 7 档），与 App 端 icon_colors.json 口径一致
const ACH_ADV_COLORS: Record<number, string> = {
  1: '#90caf9', 2: '#4fc3f7', 3: '#4dd0e1', 4: '#81c784', 5: '#ffd54f', 6: '#ff8a65', 7: '#e57373',
}

const _svgCache = new Map<string, string>()
async function _loadSvg(url: string): Promise<string> {
  if (_svgCache.has(url)) return _svgCache.get(url)!
  const res = await fetch(url)
  const text = await res.text()
  _svgCache.set(url, text)
  return text
}

/**
 * 成就图标：按 game_achievements.icon 令牌渲染（元素模板 + 进阶等级上色）。
 * - `badge_N` / `ach_global_*` → 直接引用固定已上色 SVG；
 * - `ach_<el>_c<rank>` → 加载元素模板 `ach_<el>.svg`，将占位色 #ICON_MAIN
 *   替换为进阶等级色（与 App 端 shared/achievement_icon.dart 同一套文件与口径）。
 */
function AchievementIcon({ icon, size = 36 }: { icon?: string | null; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    if (!icon) { setSrc(null); return }
    let file = ''
    let color: string | null = null
    if (icon.startsWith('badge_') || icon.startsWith('ach_global_')) {
      file = `${icon}.svg`
    } else {
      const m = /^ach_([a-z0-9_]+?)_c(\d+)$/.exec(icon)
      if (m) {
        file = `ach_${m[1]}.svg`
        const rank = parseInt(m[2] ?? '1', 10) || 1
        color = ACH_ADV_COLORS[rank] ?? ACH_ADV_COLORS[1] ?? '#90caf9'
      }
    }
    if (!file) { setSrc(null); return }
    _loadSvg(`${ACHIEVEMENT_SHARED_ICON_BASE}/${file}`).then((raw) => {
      if (cancelled) return
      const svg = color ? raw.replace(/#ICON_MAIN/g, color) : raw
      setSrc(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`)
    })
    return () => { cancelled = true }
  }, [icon])
  if (!src) return <span style={{ width: size, height: size, display: 'inline-block' }} />
  return <img src={src} width={size} height={size} alt={icon ?? ''} />
}

export default AchievementIcon
