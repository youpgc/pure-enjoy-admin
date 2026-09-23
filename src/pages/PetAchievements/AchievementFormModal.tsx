import React from 'react'
import { Form, Input, InputNumber, Select, Switch } from 'antd'
import { Modal } from 'antd'
import type { PetAchievementRow } from '../../types/pet'
import {
  PET_ACH_CONDITION_RARITY_KEYS,
  PET_ACH_CONDITION_TYPE_OPTIONS,
  PET_ACH_TIER_OPTIONS,
  PET_ACH_TIER_TYPES,
  PET_RARITY_CODE_SELECT_OPTIONS,
} from '../../constants/pet'
import { RewardsEditor } from '../../components/form/pet/editors/QuestEditors'
import { asObject, extraKeys, numOf } from '../../components/form/pet/editors/shared'
import common from '../../styles/common.module.css'

// ==================== 成就编辑弹窗（pet_achievements） ====================
//
// 与服务端同源（feature_pet_p2_rpcs_20260923 §6）：
// - condition_type 必须落在 11 值白名单内，否则 rpc_pet_achievement_check 算出的进度恒为 0；
// - 目标值键位 value 优先（兼容 target，缺省 1）；rarity_owned 额外读 condition_value.rarity；
// - reward_package 与任务 rewards 同 schema：{gold?, points?, items:[{code,count}]}。

export interface AchievementFormValues {
  code: string
  title: string
  icon?: string | null
  condition_type: string
  condition_value: Record<string, unknown>
  reward_package: Record<string, unknown>
  tier: string
  sort_order: number
  enabled: boolean
}

interface Props {
  open: boolean
  editing: PetAchievementRow | null
  saving: boolean
  items: Array<{ item_code: string; name: string; category: string }>
  onOk: (values: AchievementFormValues) => void
  onCancel: () => void
}

/// condition_value 结构化字段（受控：由 Form.Item 注入 value/onChange，未知键保留）
const ConditionValueFields: React.FC<{
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  conditionType?: string
}> = ({ value, onChange, conditionType }) => {
  const obj = asObject(value)
  const known = ['value', 'target', 'rarity']
  const extra = Object.keys(extraKeys(obj, known))
  const needRarity = PET_ACH_CONDITION_RARITY_KEYS.includes(String(conditionType))

  const patch = (key: string, v: unknown) => {
    const next = { ...obj }
    if (v === null || v === undefined || v === '') delete next[key]
    else next[key] = v
    onChange?.(next)
  }

  return (
    <div>
      <span style={{ marginRight: 8 }}>目标值</span>
      <InputNumber
        min={1}
        style={{ width: 160 }}
        disabled={!onChange}
        value={numOf(obj.value, numOf(obj.target, null))}
        onChange={(v) => patch('value', v)}
      />
      {needRarity && (
        <>
          <span style={{ marginLeft: 16, marginRight: 8 }}>指定评级</span>
          <Select
            style={{ width: 140 }}
            disabled={!onChange}
            value={typeof obj.rarity === 'string' ? obj.rarity : undefined}
            placeholder="必填，缺省按 SSR"
            options={PET_RARITY_CODE_SELECT_OPTIONS}
            onChange={(v) => patch('rarity', v)}
          />
        </>
      )}
      <div className={common.smallText} style={{ color: '#999' }}>
        {needRarity
          ? '服务端读取优先级：value → target → 1；rarity 缺省时按 SSR 统计'
          : '留空 = 目标 1 次；累计类填总次数，level_max/pets_owned 等填达到值'}
        {extra.length > 0 && <>；其余扩展键已保留：{extra.join('、')}</>}
      </div>
    </div>
  )
}

const AchievementFormModal: React.FC<Props> = ({
  open,
  editing,
  saving,
  items,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm()
  const conditionType = Form.useWatch('condition_type', form)

  return (
    <Modal
      title={editing ? '编辑成就' : '新增成就'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        onOk({
          ...values,
          condition_value: asObject(values.condition_value),
          reward_package: asObject(values.reward_package),
        })
      }}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(
            editing
              ? {
                  ...editing,
                  condition_value: asObject(editing.condition_value),
                  reward_package: asObject(editing.reward_package),
                }
              : {
                  condition_value: {},
                  reward_package: {},
                  tier: PET_ACH_TIER_TYPES.NORMAL,
                  sort_order: 0,
                  enabled: false,
                }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={660}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="code"
          label="成就编码"
          tooltip="如 ach_feed_100；App 端按此对齐文案与埋点"
          rules={[{ required: true, message: '请输入成就编码' }]}
        >
          <Input placeholder="如 ach_feed_100" />
        </Form.Item>
        <Form.Item name="title" label="成就名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如 喂养达人" />
        </Form.Item>
        <Form.Item name="icon" label="图标" tooltip="图标标识，留空走 App 默认成就图标">
          <Input placeholder="如 trophy" />
        </Form.Item>
        <Form.Item
          name="condition_type"
          label="达成条件类型"
          tooltip="白名单外的取值服务端不报错，但进度恒为 0"
          rules={[{ required: true, message: '请选择达成条件类型' }]}
        >
          <Select options={PET_ACH_CONDITION_TYPE_OPTIONS} placeholder="选择统计口径" />
        </Form.Item>
        <Form.Item name="condition_value" label="达成条件">
          <ConditionValueFields conditionType={conditionType ?? editing?.condition_type} />
        </Form.Item>
        <Form.Item name="reward_package" label="奖励包">
          <RewardsEditor items={items} />
        </Form.Item>
        <Form.Item name="tier" label="档位" rules={[{ required: true, message: '请选择档位' }]}>
          <Select options={PET_ACH_TIER_OPTIONS} />
        </Form.Item>
        <Form.Item name="sort_order" label="排序号">
          <InputNumber min={0} className={common.fullWidth} />
        </Form.Item>
        <Form.Item
          name="enabled"
          label="启用"
          valuePropName="checked"
          tooltip="停用后 rpc_pet_achievement_check 不再重算该成就进度（存量进度保留）"
        >
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AchievementFormModal
