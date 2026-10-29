import React, { useEffect, useRef, useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch, Typography, message } from 'antd'
import type { PetEggPoolRow, PetSpeciesRow } from '../../types/pet'
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
//   fixed_species（固定产出）/ initial_choices（初始蛋自选种属 {系:[SSR code]}）/
//   mode / families{系:权重} / rarity{code:权重 加权掷取; 单键=锁定该评级} /
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

// 评级权重字段（比例语义按总量归一；单键=锁定评级，多键=加权抽取如礼盒 N13/R35/SR50/SSR2）
const RARITY_FIELDS = PET_RARITY_CODE_OPTIONS.map((o) => ({
  key: o.value,
  label: o.label,
  min: 0,
}))

const PoolFormModal: React.FC<Props> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm()
  const [speciesRows, setSpeciesRows] = useState<PetSpeciesRow[]>([])
  // weights 初始快照：保存时与当前值比对，有变更才递增 config_version
  const weightsBaseline = useRef<string>('{}')
  // 池编码监听：仅 initial_ssr 展示「初始可选 SSR」编辑器
  const poolCode = Form.useWatch('pool_code', form)

  useEffect(() => {
    if (!open) return
    petSpeciesService.findAll().then((res) => {
      if (res.success && res.data) setSpeciesRows(res.data)
    })
  }, [open])

  const speciesOptions = speciesRows.map((s) => ({
    value: s.species_code,
    label: `${s.name_cn}（${s.species_code}）`,
  }))
  // 初始可选 SSR 候选：SSR 基础形（排除 _sN 进化阶）——同系多只由服务端随机
  const ssrOptions = speciesRows
    .filter((s) => s.rarity_code === 'SSR' && !/_s\d+$/.test(s.species_code))
    .map((s) => ({
      value: s.species_code,
      label: `${PET_FAMILY_LABELS[s.family] ?? s.family}·${s.name_cn}（${s.species_code}）`,
    }))

  // 初始可选 SSR:回显值在 WeightsFields 内从 weights 实时计算(Form 值变化只触发
  // WeightsFields 重渲染,父组件算会在勾选后不回显);此处仅保留写回回调
  const handleInitialChoicesChange = (codes: string[] | undefined) => {
    const cur = asObject(form.getFieldValue('weights'))
    const next = { ...cur }
    if (!codes || codes.length === 0) {
      delete next.initial_choices
    } else {
      const byFamily: Record<string, string[]> = {}
      for (const code of codes) {
        const fam = speciesRows.find((s) => s.species_code === code)?.family ?? 'other'
        ;(byFamily[fam] ??= []).push(code)
      }
      next.initial_choices = byFamily
    }
    form.setFieldsValue({ weights: next })
  }

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
  const handleNoteChange = (text: string) => {
    const cur = asObject(form.getFieldValue('weights'))
    const next = { ...cur }
    if (text) next.note = text
    else delete next.note
    form.setFieldsValue({ weights: next })
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    const weights = asObject(values.weights)
    // ★ 体系权重校验（审查报告 宠物 P2-4/SQL#4）：权重为比例语义（服务端按
    //   总量归一），只要求均为正数；全 0/负数会导致体系分布失真，阻止提交
    const familyVals = Object.values(asObject(weights.families ?? {})) as (number | string)[]
    if (familyVals.length > 0 && familyVals.some((v) => Number(v) <= 0 || Number.isNaN(Number(v)))) {
      message.error('体系权重必须为正数（服务端按总量归一，任意量纲均可，如 25/25/25/25）')
      return
    }
    const rarityVals = Object.values(asObject(weights.rarity ?? {})) as (number | string)[]
    if (rarityVals.length > 0 && rarityVals.some((v) => Number(v) <= 0 || Number.isNaN(Number(v)))) {
      message.error('评级权重必须为正数（按总量归一；0 权重的评级请直接删行，避免边界抽取）')
      return
    }
    if (editing) {
      // 审计口径：历史流水记录旧版本号，config_version 只能递增；概率未变则原值提交
      values.config_version =
        JSON.stringify(weights) === weightsBaseline.current
          ? editing.config_version
          : editing.config_version + 1
    }
    onOk({ ...values, weights })
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
          const initialWeights = editing ? asObject(editing.weights) : {}
          weightsBaseline.current = JSON.stringify(initialWeights)
          form.setFieldsValue(
            editing
              ? {
                  pool_code: editing.pool_code,
                  config_version: editing.config_version,
                  weights: initialWeights,
                  published: editing.published,
                }
              : { config_version: 1, weights: initialWeights, published: false }
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
          tooltip="版本规则：编辑既有池版本不可手改，保存时概率有变更自动 +1（只增不减）；新池默认 1 可填"
          rules={[{ required: true, message: '请输入配置版本' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} disabled={!!editing} />
        </Form.Item>

        <Form.Item name="weights" label="概率权重" rules={[{ required: true, message: '请配置权重' }]}>
          <WeightsFields
            speciesOptions={speciesOptions}
            disabled={false}
            poolCode={poolCode}
            ssrOptions={ssrOptions}
            onInitialChoicesChange={handleInitialChoicesChange}
            onGenderChange={handleGenderChange}
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
  poolCode?: string
  ssrOptions: Array<{ value: string; label: string }>
  onInitialChoicesChange: (codes: string[] | undefined) => void
  onGenderChange: (malePercent: number | null) => void
  onNoteChange: (text: string) => void
}> = ({
  value,
  onChange,
  speciesOptions,
  disabled,
  poolCode,
  ssrOptions,
  onInitialChoicesChange,
  onGenderChange,
  onNoteChange,
}) => {
  const obj = asObject(value)
  // 初始可选 SSR 回显:从 weights 实时摊平(Form 值变化随重渲染同步,勾选即回显)
  const initialSelected = Object.values(asObject(obj.initial_choices)).flatMap((v) =>
    Array.isArray(v) ? v.map(String) : []
  )
  const gender = asObject(obj.gender)
  const rarity = asObject(obj.rarity)
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
      {poolCode === 'initial_ssr' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
          <Typography.Text style={{ width: 130, flexShrink: 0, paddingTop: 4 }}>
            初始可选 SSR
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              App 选种属，同系多只随机；不配则按固定产出
            </Typography.Text>
          </Typography.Text>
          <div style={{ flex: 1 }}>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              value={initialSelected}
              placeholder="勾选可作为初始伙伴的 SSR（候选为空则用户无自选入口）"
              options={ssrOptions}
              allowClear
              showSearch
              optionFilterProp="label"
              maxTagCount="responsive"
              disabled={disabled}
              onChange={(v) => onInitialChoicesChange(v as string[])}
            />
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
        <Typography.Text style={{ width: 130, flexShrink: 0, paddingTop: 4 }}>
          评级权重
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            比例语义按总量归一；单键=锁定评级
          </Typography.Text>
        </Typography.Text>
        <div style={{ flex: 1 }}>
          <NumberMapEditor
            value={rarity}
            fields={RARITY_FIELDS}
            sumHint="比例语义，按总量归一（无需凑 100）"
            disabled={disabled}
            onChange={(next) => setKey('rarity', Object.keys(next).length > 0 ? next : null)}
          />
        </div>
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
          {/* 概率语义提示（审查报告 宠物 P2-4/SQL#4）：服务端按总量归一，任意正数量纲皆可 */}
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            比例语义，按总量归一
          </Typography.Text>
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
      {poolCode === 'lottery_s1' && (
        <Typography.Text
          type="secondary"
          style={{ display: 'block', fontSize: 12, marginBottom: 8 }}
        >
          礼盒的 SSR 保底阈值（缺省 40）、单价与终身/窗口限购在「宠物配置 → 全局参数」维护
        </Typography.Text>
      )}
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
          (k) =>
            !['fixed_species', 'initial_choices', 'mode', 'families', 'rarity', 'gender', 'note'].includes(k)
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
