import React from 'react'
import { Input, Select, Switch, Typography } from 'antd'
import { asObject, extraKeys } from './shared'

// ==================== 种属渲染配置编辑器（render2d / render3d） ====================
//
// render2d / render3d 为渲染层引用配置（App 按 code 取素材路径/包内文件），
// 结构：render2d {code, ...扩展}；render3d {code, enabled, variants[], ...扩展}。
// 未知键保留（防覆写素材管线的扩展配置）。

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

interface Render3dEditorProps {
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  disabled?: boolean
}

export const Render3dEditor: React.FC<Render3dEditorProps> = ({ value, onChange, disabled }) => {
  const obj = asObject(value)
  const extra = extraKeys(value, ['code', 'enabled', 'variants'])
  const variants = Array.isArray(obj.variants)
    ? obj.variants.filter((v): v is string => typeof v === 'string')
    : []

  const setField = (key: string, v: unknown) => {
    const next = { ...obj }
    if (v === null || v === undefined || v === '') delete next[key]
    else next[key] = v
    onChange?.(next)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 110, flexShrink: 0 }}>3D 模型码</Typography.Text>
        <Input
          style={{ width: 260 }}
          placeholder="如 cat_ssr1（对应资源包内 <code>.glb）"
          value={typeof obj.code === 'string' ? obj.code : ''}
          disabled={disabled}
          onChange={(e) => setField('code', e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 110, flexShrink: 0 }}>启用 3D</Typography.Text>
        <Switch
          checked={obj.enabled === true}
          disabled={disabled}
          onChange={(v) => setField('enabled', v ? true : null)}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
          关闭 = 该种属始终以 2D 渲染（一键回退）
        </Typography.Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 110, flexShrink: 0 }}>皮肤 variants</Typography.Text>
        <Select
          mode="tags"
          style={{ width: 260 }}
          placeholder="回车添加，如 default / rare"
          value={variants}
          disabled={disabled}
          onChange={(vs) => setField('variants', vs.length > 0 ? vs : null)}
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
