import React from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch } from 'antd'
import type { Database } from '../../types/database'
import { ACHIEVEMENT_ICON_OPTIONS } from '../../constants/game'
import { COND_OPTIONS, isV2ConditionOf } from './achievementMeta'
import common from '../../styles/common.module.css'

type DbGameAchievement = Database['public']['Tables']['game_achievements']['Row']

interface AchievementFormModalProps {
  open: boolean
  /** 编辑目标；null = 新增 */
  editing: DbGameAchievement | null
  /** 所属游戏下拉（含「全局」首项由父级传入） */
  gameOptions: { value: string; label: string }[]
  /** 维度列表（score 条件类型的维度下拉，按所属游戏过滤） */
  dims: { game_id: string; code: string; name: string }[]
  saving: boolean
  /** 校验通过后回传表单原始值（condition 由父级按 v2 保护规则组装） */
  onOk: (values: Record<string, any>) => void
  onCancel: () => void
}

/**
 * 成就编辑弹窗（game_achievements 表单）。
 * v2 徽章条件（mode_tier 等）受保护：条件字段禁用 + 保存原样保留（见 achievementMeta）。
 */
const AchievementFormModal: React.FC<AchievementFormModalProps> = ({
  open,
  editing,
  gameOptions,
  dims,
  saving,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm()

  // condition JSON → 表单三个字段（类型 / 维度 / 阈值）
  const initialCond = (() => {
    const cond = (editing?.condition ?? {}) as Record<string, any>
    const type = cond?.type ?? 'first_clear'
    return {
      condType: type as string,
      condDimension: type === 'score' ? String(cond?.dimension ?? 'score') : undefined,
      condValue: type === 'score' ? (cond?.gte as number) : type === 'level' ? (cond?.min_level_no as number) : undefined,
    }
  })()

  const isV2Condition = isV2ConditionOf(editing?.condition)

  const handleOk = async () => {
    const values = await form.validateFields()
    onOk(values)
  }

  return (
    <Modal
      title={editing ? '编辑成就' : '新增成就'}
      open={open}
      onOk={handleOk}
      confirmLoading={saving}
      afterOpenChange={(open) => {
        // 修复编辑/新增弹窗表单串数据：Form.useForm 为单例，Modal 惰性挂载使 open 前
        // setFieldsValue 无效；弹窗真正打开（子组件已挂载）后重置并回显最新值。
        if (open) {
          form.resetFields()
          form.setFieldsValue(
            editing
              ? {
                  game_id: editing.game_id ?? undefined,
                  code: editing.code,
                  name: editing.name,
                  description: editing.description ?? '',
                  icon: editing.icon ?? undefined,
                  reward_points: editing.reward_points,
                  enabled: editing.enabled,
                  sort_order: editing.sort_order,
                  ...initialCond,
                }
              : { condType: 'first_clear', reward_points: 5, enabled: true, sort_order: 0 },
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        key={editing?.id ?? 'create'}
        initialValues={
          editing
            ? {
                game_id: editing.game_id ?? undefined,
                code: editing.code,
                name: editing.name,
                description: editing.description ?? '',
                icon: editing.icon ?? undefined,
                reward_points: editing.reward_points,
                enabled: editing.enabled,
                sort_order: editing.sort_order,
                ...initialCond,
              }
            : { condType: 'first_clear', reward_points: 5, enabled: true, sort_order: 0 }
        }
      >
        <Form.Item
          name="game_id"
          label="所属游戏"
          rules={[{ required: true, message: '请选择游戏' }]}
        >
          <Select placeholder="选择游戏" options={gameOptions} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item
          name="code"
          label="成就编码"
          rules={[{ required: true, message: '请输入编码' }]}
          tooltip="唯一标识，如 first_win / score_2048 / level_5；创建后建议不再修改"
        >
          <Input placeholder="如 first_win" />
        </Form.Item>
        <Form.Item name="name" label="成就名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如 首次获胜" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} placeholder="成就说明，展示给玩家" />
        </Form.Item>
        <Form.Item name="icon" label="成就图标" tooltip="成就 SVG 文件名；与游戏图标分目录存放，未设置则展示默认图标">
          <Select
            placeholder="选择成就图标"
            options={ACHIEVEMENT_ICON_OPTIONS}
            allowClear
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item
          name="condType"
          label="达成条件类型"
          tooltip="v2 徽章条件保存时原样保留"
          rules={[{ required: true, message: '请选择条件类型' }]}
        >
          <Select options={COND_OPTIONS} disabled={isV2Condition} />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, cur) =>
            prev.condType !== cur.condType || prev.game_id !== cur.game_id
          }
        >
          {({ getFieldValue }) => {
            const type = getFieldValue('condType')
            if (type === 'score') {
              const gameId = getFieldValue('game_id')
              const dimOptions = dims
                .filter((d) => !gameId || d.game_id === gameId)
                .map((d) => ({ value: d.code, label: `${d.name}（${d.code}）` }))
              return (
                <>
                  <Form.Item
                    name="condDimension"
                    label="达成维度"
                    rules={[{ required: true, message: '请选择维度' }]}
                  >
                    <Select
                      placeholder="选择维度"
                      options={dimOptions.length > 0 ? dimOptions : [{ value: 'score', label: 'score' }]}
                    />
                  </Form.Item>
                  <Form.Item
                    name="condValue"
                    label="达到阈值"
                    rules={[{ required: true, message: '请输入阈值' }]}
                  >
                    <InputNumber min={0} className={common.fullWidth} placeholder="如 2048" />
                  </Form.Item>
                </>
              )
            }
            if (type === 'level') {
              return (
                <Form.Item
                  name="condValue"
                  label="达到关卡号"
                  rules={[{ required: true, message: '请输入关卡号' }]}
                >
                  <InputNumber min={1} className={common.fullWidth} placeholder="如 5" />
                </Form.Item>
              )
            }
            return null
          }}
        </Form.Item>
        <Form.Item
          name="reward_points"
          label="奖励积分"
          tooltip="达成时发放；0 表示仅解锁不发分"
          rules={[{ required: true, message: '请输入奖励积分' }]}
        >
          <InputNumber min={0} className={common.fullWidth} addonAfter="分" />
        </Form.Item>
        <Form.Item name="sort_order" label="排序号">
          <InputNumber min={0} className={common.fullWidth} />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AchievementFormModal
