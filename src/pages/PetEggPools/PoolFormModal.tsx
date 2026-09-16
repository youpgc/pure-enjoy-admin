import React, { useEffect, useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch, Typography } from 'antd'
import type { PetEggPoolRow } from '../../types/pet'
import { petSpeciesService } from '../../services/petService'
import { NumberMapEditor } from '../../components/form/pet/editors/BasicEditors'
import {
  PET_FAMILY_LABELS,
  PET_RARITY_CODE_OPTIONS,
  PET_EGG_MODE_OPTIONS,
} from '../../constants/pet'
import { asObject } from '../../components/form/pet/editors/shared'

// ==================== 蛋池编辑弹窗（pet_egg_pools，概率结构化配置） ====================
//
// weights 结构与 rpc_pet_hatch_instant 消费同源：
//   fixed_species（固定产出）/ mode / families{系:权重} / rarity{首键=锁定评级} /
//   gender{male:0~1 概率, female} / note。
// 未知键保留（防覆写扩展配置）。

export interface PoolFormValues {
  pool_code: string
  config_version: number
  weights: Record<string, unknown>
  published: boolean
}

interface Props {
  open: boolean
  editing: PetEggPoolRow | null
  saving: boolean
  onOk: (values: PoolFormValues) => void
  onCancel: () => void
}

const FAMILY_FIELDS = Object.entries(PET_FAMILY_LABELS).map(([key, label]) => ({
  key,
  label: `${label}（${key}）`,
  min: 0,
}))

const PoolFormModal: React.FC<Props> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm()
  const [speciesOptions, setSpeciesOptions] = useState<Array<{ value: string; label: string }>>([])

  useEffect(() => {
    if (!open) return
    petSpeciesService.findAll().then((res) => {
      if (res.success && res.data) {
        setSpeciesOptions(
          res.data.map((s) => ({
            value: s.species_code,
            label: `${s.name_cn}（${s.species_code}）`,
          }))
        )
      }
    })
  }, [open])

  const handleGenderChange = (malePercent: number | null) => {
    const cur = asObject(form.getFieldValue('weights'))
    const next = { ...cur }
    if (malePercent === null) {
      delete next.gender
    } else {
      const male = Math.round(malePercent) / 100
      next.gender = { male, female: Math.round((1 - male) * 100) / 100 }
    }
    form.setFieldsValue({ weights: next })
  }
  const handleRarityChange = (code: string | undefined) => {
    const cur = asObject(form.getFieldValue('weights'))
    const next = { ...cur }
    if (!code) delete next.rarity
    else next.rarity = { [code]: 1 }
    form.setFieldsValue({ weights: next })
  }
  const handleNoteChange = (text: string) => {
    const cur = asObject(form.getFieldValue('weights'))
    const next = { ...cur }
    if (text) next.note = text
    else delete next.note
    form.setFieldsValue({ weights: next })
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    onOk({ ...values, weights: asObject(values.weights) })
  }

  return (
    <Modal
      title={editing ? '编辑蛋池' : '新增蛋池'}
      open={open}
      onOk={handleOk}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(
            editing
              ? {
                  pool_code: editing.pool_code,
                  config_version: editing.config_version,
                  weights: asObject(editing.weights),
                  published: editing.published,
                }
              : { config_version: 1, weights: {}, published: false }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={680}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="pool_code"
          label="池编码"
          tooltip="initial_ssr（初始蛋）/ egg_n / egg_r / egg_sr / egg_ssr 等；App 公示与判定同源键"
          rules={[{ required: true, message: '请输入池编码' }]}
        >
          <Input placeholder="如 egg_n" disabled={!!editing} />
        </Form.Item>
        <Form.Item
          name="config_version"
          label="配置版本"
          tooltip="概率变更必须递增版本：每次孵化审计记录判定所用版本，公示与判定同源"
          rules={[{ required: true, message: '请输入配置版本' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="weights" label="概率权重" rules={[{ required: true, message: '请配置权重' }]}>
          <WeightsFields
            speciesOptions={speciesOptions}
            disabled={false}
            onGenderChange={handleGenderChange}
            onRarityChange={handleRarityChange}
            onNoteChange={handleNoteChange}
          />
        </Form.Item>

        <Form.Item
          name="published"
          label="发布状态"
          valuePropName="checked"
          tooltip="发布后 App 公示可见；未发布仅后台可见，可反复编辑"
        >
          <Switch checkedChildren="已发布" unCheckedChildren="未发布" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ---------- weights 结构化字段（读取 Form 值内层，联动经回调写回） ----------
const WeightsFields: React.FC<{
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  speciesOptions: Array<{ value: string; label: string }>
  disabled: boolean
  onGenderChange: (malePercent: number | null) => void
  onRarityChange: (code: string | undefined) => void
  onNoteChange: (text: string) => void
}> = ({ value, onChange, speciesOptions, disabled, onGenderChange, onRarityChange, onNoteChange }) => {
  const obj = asObject(value)
  const gender = asObject(obj.gender)
  const rarity = asObject(obj.rarity)
  const rarityCode = Object.keys(rarity)[0]
  const malePercent = typeof gender.male === 'number' ? Math.round(gender.male * 100) : null

  const setKey = (key: string, v: unknown) => {
    const next = { ...asObject(value) }
    if (v === null || v === undefined || v === '') delete next[key]
    else next[key] = v
    onChange?.(next)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 130, flexShrink: 0 }}>固定产出种属</Typography.Text>
        <Select
          style={{ width: 260 }}
          value={typeof obj.fixed_species === 'string' ? obj.fixed_species : undefined}
          placeholder="固定产出（如初始蛋；可空 = 按权重抽取）"
          options={speciesOptions}
          allowClear
          showSearch
          optionFilterProp="label"
          disabled={disabled}
          onChange={(v) => setKey('fixed_species', v ?? null)}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 130, flexShrink: 0 }}>锁定评级</Typography.Text>
        <Select
          style={{ width: 220 }}
          value={rarityCode}
          placeholder="可空 = 不锁定"
          options={PET_RARITY_CODE_OPTIONS}
          allowClear
          disabled={disabled}
          onChange={(v) => onRarityChange(v)}
        />
        {rarityCode && (
          <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            服务端取 rarity 首键作为锁定评级
          </Typography.Text>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 130, flexShrink: 0 }}>孵化方式</Typography.Text>
        <Select
          style={{ width: 220 }}
          value={typeof obj.mode === 'string' ? obj.mode : undefined}
          placeholder="可空 = 跟随道具 effect.mode"
          options={PET_EGG_MODE_OPTIONS}
          allowClear
          disabled={disabled}
          onChange={(v) => setKey('mode', v ?? null)}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
        <Typography.Text style={{ width: 130, flexShrink: 0, paddingTop: 4 }}>
          体系权重
        </Typography.Text>
        <div style={{ flex: 1 }}>
          <NumberMapEditor
            value={asObject(obj.families)}
            fields={FAMILY_FIELDS}
            disabled={disabled}
            onChange={(next) => setKey('families', Object.keys(next).length > 0 ? next : null)}
          />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 130, flexShrink: 0 }}>公的概率（%）</Typography.Text>
        <InputNumber
          style={{ width: 160 }}
          min={0}
          max={100}
          value={malePercent ?? undefined}
          placeholder="50 = 各半"
          disabled={disabled}
          onChange={(v) => onGenderChange(typeof v === 'number' ? v : null)}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
          服务端读 gender.male（0~1 概率），母的 = 1 - 公
        </Typography.Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 130, flexShrink: 0 }}>备注</Typography.Text>
        <Input
          style={{ width: 320 }}
          value={typeof obj.note === 'string' ? obj.note : ''}
          disabled={disabled}
          onChange={(e) => onNoteChange(e.target.value)}
        />
      </div>
      {(() => {
        const extraKeysList = Object.keys(obj).filter(
          (k) => !['fixed_species', 'mode', 'families', 'rarity', 'gender', 'note'].includes(k)
        )
        if (extraKeysList.length === 0) return null
        return (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            其余扩展键已保留：{extraKeysList.join('、')}
          </Typography.Text>
        )
      })()}
    </div>
  )
}

export default PoolFormModal
