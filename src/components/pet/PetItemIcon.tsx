import React, { useState } from 'react'
import { Tag } from 'antd'

// ==================== 宠物道具图标（pet_items.icon → public/pet-icons） ====================

/** icon 字段值（icon/<key>）→ 资源键；非该格式返回 null */
export const iconKey = (icon: string | null): string | null => {
  if (!icon) return null
  return icon.startsWith('icon/') ? icon.slice(5) : icon
}

/** 图标：双端资源（public/pet-icons/<key>.svg）缺失时回退键名
 *  ⚠️ 必须带 import.meta.env.BASE_URL 前缀：本工程 vite base 为 /pure-enjoy-admin/，
 *  写绝对路径 /pet-icons/... 部署后 404（同 constants/game.ts 图标基址口径）
 *  主题道具特例（icon/theme_<x>）：直用场景实景缩略图 public/pet-scenes/scene_<x>.png
 *  （双端同名同步，实景比通用 svg 可辨识；新增主题无需再补 svg） */
export const PetItemIcon: React.FC<{ icon: string | null; size?: number }> = ({
  icon,
  size = 32,
}) => {
  const [failed, setFailed] = useState(false)
  const key = iconKey(icon)
  if (!key) return <Tag>无图标</Tag>
  if (key.startsWith('theme_')) {
    if (failed)
      return (
        <Tag style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {key}
        </Tag>
      )
    return (
      <img
        alt={key}
        src={`${import.meta.env.BASE_URL}pet-scenes/scene_${key.slice(6)}.png`}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ display: 'block', borderRadius: 6, objectFit: 'cover', background: '#fafafa' }}
      />
    )
  }
  if (failed)
    return (
      <Tag style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {key}
      </Tag>
    )
  return (
    <img
      alt={key}
      src={`${import.meta.env.BASE_URL}pet-icons/${key}.svg`}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ display: 'block', borderRadius: 6, background: '#fafafa' }}
    />
  )
}
