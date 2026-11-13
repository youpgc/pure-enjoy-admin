import { useEffect, useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch } from 'antd'
import { handleApiError } from '../../utils/apiClient'
import { journeyDailyMapService, journeyMonsterService } from '../../services/gameService'
import { usePermission } from '../../hooks/usePermission'
import type { DbJourneyDailyMap } from '../../types/database'

/// 每日游历 · 地图配置弹窗（GameLevels「游历·XX」行 → 配置入口）：
/// 独立表单编辑该地图基础字段（名称/主题色/里程碑/排序/启用）
/// + 按图怪物池（多选普通怪；journey_daily_maps.monster_pool 逗号分隔，
/// 空=引擎内置全怪池兜底；妖王不进每日池）。
const JourneyDailyMapModal: React.FC<{
  open: boolean
  mapRow: DbJourneyDailyMap | null
  onClose: () => void
  onSaved: () => void
}> = ({ open, mapRow, onClose, onSaved }) => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [mobOptions, setMobOptions] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    if (!open) return
    journeyMonsterService.findAll().then((res) => {
      if (!res.success) return
      const rows = (res.data ?? []) as { code: string; name: string; ai_tier: string | null }[]
      setMobOptions(
        rows
          .filter((m) => m.ai_tier !== 'boss')
          .map((m) => ({ value: m.code, label: `${m.name}（${m.code}）` }))
      )
    })
  }, [open])

  return (
    <Modal
      title={`游历地图 · 关卡配置${mapRow ? `（${mapRow.name}）` : ''}`}
      open={open}
      onCancel={onClose}
      confirmLoading={saving}
      okButtonProps={{ disabled: !canWrite }}
      onOk={async () => {
        if (!mapRow || saving) return
        // 校验失败（reject {errorFields}）走行内红字，不误报为 API 错误
        let values: Record<string, any>
        try {
          values = await form.validateFields()
        } catch {
          return
        }
        setSaving(true)
        try {
          const payload = {
            ...values,
            // NOT NULL 数值列归一（清空→0），主题色空串回落默认色
            milestone_li: values.milestone_li ?? 0,
            sort: values.sort ?? 0,
            theme_color:
              values.theme_color && String(values.theme_color).trim() !== ''
                ? values.theme_color
                : '#E8C470',
            monster_pool: (values.monster_pool ?? []).join(','),
          }
          const res = await journeyDailyMapService.update(mapRow.id, payload)
          if (!res.success) {
            handleApiError(res.errorMessage, 'JourneyDailyMapModal-保存')
            return
          }
          onSaved()
          onClose()
        } catch (error) {
          handleApiError(error, 'JourneyDailyMapModal-保存')
        } finally {
          setSaving(false)
        }
      }}
      width={640}
      destroyOnClose
    >
      {mapRow && (
        <Form
          form={form}
          // form 实例常驻（rc-field-form preserve 保留旧 store 值）：
          // 按地图 id 强制重挂载，防第二张地图回显上一张的旧值
          key={mapRow.id}
          layout="vertical"
          initialValues={{
            name: mapRow.name,
            theme_color: mapRow.theme_color ?? '',
            milestone_li: mapRow.milestone_li ?? 0,
            description: mapRow.description ?? '',
            sort: mapRow.sort ?? 0,
            enabled: mapRow.enabled ?? false,
            monster_pool: (mapRow.monster_pool ?? '').split(',').map((s) => s.trim()).filter(Boolean),
          }}
        >
          <Form.Item name="name" label="地图名称" rules={[{ required: true, message: '请填写地图名称' }]}>
            <Input disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="theme_color" label="主题色（hex，驱动地图渲染）">
            <Input placeholder="#6FBF9A" disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="milestone_li" label="里程碑里数（进关播报）">
            <InputNumber min={0} className="w-full" disabled={!canWrite} />
          </Form.Item>
          <Form.Item
            name="monster_pool"
            label="怪物池（多选普通怪；空=全怪池兜底；妖王不进每日游历）"
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              allowClear
              placeholder="不选=全怪池"
              disabled={!canWrite}
              options={mobOptions}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={0} className="w-full" disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch checkedChildren="开放" unCheckedChildren="禁用" disabled={!canWrite} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}

export default JourneyDailyMapModal
