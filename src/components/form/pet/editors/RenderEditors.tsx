import React from 'react'
import { Input, Typography } from 'antd'
import { asObject, extraKeys } from './shared'
import { NumberMapEditor } from './BasicEditors'
import { PET_RENDER_ACTION_FIELDS } from '../../../../constants/pet'

// ==================== 种属 2D 渲染配置编辑器（render2d） ====================
//
// 结构 = App 端 `lib/features/pets/utils/pet_art_resolver.dart` 的契约 v1，**只有两键**：
//   { base: 整只底图素材码（-> assets/pets/<code>.png，需已随包）,
//     frames: { 动作 code -> 整图真帧数 }（-> assets/pets/frames/<species_code>_<action>_N.png） }
// 底图与真帧都只在「整图补间」那条路上被消费：已登记分层弯曲几何的形态由 App 编译期决定
// 走弯曲，改这里的帧数对它无效（App 侧同一口径写在 pet_art_resolver.dart 顶部）。
//
// 未知键保留（防覆写清空服务端/种子写入的扩展键）。
//
// 3D 一期已整体下线（实现效果不达标），render3d 编辑器随之下线；
// pet_species.render3d 列与其存量数据均保留不动，后台不再编辑/展示，
// 3D 转后期迭代重写渲染层时再一并恢复本编辑器。

const KNOWN_KEYS = ['base', 'frames']

interface Render2dEditorProps {
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  disabled?: boolean
}

export const Render2dEditor: React.FC<Render2dEditorProps> = ({ value, onChange, disabled }) => {
  const obj = asObject(value)
  const extra = extraKeys(value, KNOWN_KEYS)

  const setTop = (key: string, v: unknown) => {
    const next = asObject(value)
    if (v === undefined || v === null || v === '') delete next[key]
    else next[key] = v
    onChange?.(next)
  }

  const frames = obj.frames
  const frameExtras = extraKeys(frames, PET_RENDER_ACTION_FIELDS.map((f) => f.key))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 150, flexShrink: 0 }}>底图素材码 base</Typography.Text>
        <Input
          style={{ width: 260 }}
          placeholder="如 cat_ssr1_01（App 侧立绘随包素材码）"
          value={typeof obj.base === 'string' ? obj.base : ''}
          disabled={disabled}
          onChange={(e) => setTop('base', e.target.value)}
        />
      </div>

      <Typography.Text style={{ display: 'block', marginBottom: 8 }}>
        整图真帧帧数 frames（留空 = 未配置该动作）
      </Typography.Text>
      <NumberMapEditor
        value={frames}
        disabled={disabled}
        fields={PET_RENDER_ACTION_FIELDS}
        onChange={(v) => setTop('frames', Object.keys(v).length > 0 ? v : undefined)}
      />

      {(Object.keys(extra).length > 0 || Object.keys(frameExtras).length > 0) && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          其余扩展键已保留：
          {[...Object.keys(extra), ...Object.keys(frameExtras).map((k) => `frames.${k}`)].join('、')}
        </Typography.Text>
      )}
    </div>
  )
}
