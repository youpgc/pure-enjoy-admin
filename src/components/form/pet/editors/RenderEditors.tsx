import React from 'react'
import { Input, Typography } from 'antd'
import { asObject, extraKeys } from './shared'

// ==================== 种属 2D 渲染配置编辑器（render2d） ====================
//
// render2d 为渲染层引用配置（App 按 code 取素材路径），结构 {code, ...扩展}。
// 未知键保留（防覆写素材管线的扩展配置）。
//
// 3D 一期已整体下线（实现效果不达标），render3d 编辑器随之下线；
// pet_species.render3d 列与其存量数据均保留不动，后台不再编辑/展示，
// 3D 转后期迭代重写渲染层时再一并恢复本编辑器。

interface Render2dEditorProps {
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  disabled?: boolean
}

export const Render2dEditor: React.FC<Render2dEditorProps> = ({ value, onChange, disabled }) => {
  const obj = asObject(value)
  const extra = extraKeys(value, ['code'])
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 110, flexShrink: 0 }}>2D 素材码</Typography.Text>
        <Input
          style={{ width: 260 }}
          placeholder="如 cat_ssr1（对应 App assets/pets/<code>.png 立绘）"
          value={typeof obj.code === 'string' ? obj.code : ''}
          disabled={disabled}
          onChange={(e) => {
            const next = { ...obj }
            if (e.target.value) next.code = e.target.value
            else delete next.code
            onChange?.(next)
          }}
        />
      </div>
      {Object.keys(extra).length > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          其余扩展键已保留：{Object.keys(extra).join('、')}
        </Typography.Text>
      )}
    </div>
  )
}
