import React from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch } from 'antd'
import {
  GAME_ENGINE_OPTIONS,
  GAME_DIMENSION_VALUE_TYPE_OPTIONS,
  GAME_DIMENSION_AGGREGATE_OPTIONS,
  GAME_SHARED_ICON_OPTIONS,
  GAME_SHARED_ICON_BASE,
} from '../../constants'
import common from '../../styles/common.module.css'
import styles from './index.module.css'

interface ConfigFormModalProps {
  open: boolean
  /** 当前 Tab：games（游戏配置）或 dimensions（成绩维度配置） */
  activeTab: 'games' | 'dimensions'
  /** 编辑目标；null = 新增（DbGame 或 DbGameDimension，随 activeTab 而定） */
  editing: Record<string, any> | null
  /** Tab2 维度表单的默认所属游戏 / Tab2 游戏下拉 */
  games: { id: string; code: string; name: string }[]
  selectedGameId: string
  saving: boolean
  /** 校验通过后回传表单原始值（games.config 仍是 JSON 字符串，由父级解析） */
  onOk: (values: Record<string, any>) => void
  onCancel: () => void
}

/**
 * 游戏 / 维度编辑弹窗（双模式：随 activeTab 切换表单字段组）。
 * 表单回显走 afterOpenChange 重置回填（Modal 惰性挂载前 setFieldsValue 无效）。
 */
const ConfigFormModal: React.FC<ConfigFormModalProps> = ({
  open,
  activeTab,
  editing,
  games,
  selectedGameId,
  saving,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm()

  // 表单初始值（Form 重挂载时生效）
  const formInitialValues = (): Record<string, any> => {
    if (activeTab === 'games') {
      if (editing) {
        const g = editing as Record<string, any>
        return { ...g, config: JSON.stringify(g.config ?? {}) }
      }
      return { engine: 'widget', enabled: true, sort_order: 0, version: 1, level_selectable: false, config: '{}' }
    }
    if (editing) return { ...(editing as Record<string, any>) }
    return {
      game_id: selectedGameId || undefined,
      value_type: 'int',
      aggregate: 'max',
      is_primary: false,
      enabled: true,
      sort_order: 0,
    }
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    onOk(values)
  }

  return (
    <Modal
      title={editing ? '编辑' : '新增'}
      open={open}
      onOk={handleOk}
      confirmLoading={saving}
      afterOpenChange={(open) => {
        // 修复编辑/新增弹窗表单串数据：Form.useForm 为单例，initialValues 仅首次挂载消费；
        // Modal 惰性挂载，open 前 setFieldsValue 无效。弹窗真正打开（子组件已挂载）后重置并回显。
        if (open) {
          form.resetFields()
          form.setFieldsValue(formInitialValues())
        }
      }}
      onCancel={onCancel}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        key={`${activeTab}-${editing?.id ?? 'create'}`}
        initialValues={formInitialValues()}
      >
        {activeTab === 'games' ? (
          <>
            <Form.Item name="code" label="游戏编码" rules={[{ required: true, message: '请输入编码' }]}>
              <Input placeholder="如 sheep / g2048 / match3" disabled={!!editing} />
            </Form.Item>
            <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
              <Input placeholder="如 羊了个羊" />
            </Form.Item>
            <Form.Item name="icon" label="图标">
              <Select
                allowClear
                placeholder="选择共享图标资产（与 App 端同一套 SVG）"
                showSearch
                optionFilterProp="label"
                options={GAME_SHARED_ICON_OPTIONS.map((o) => ({
                  value: o.value,
                  label: (
                    <span key={o.value} className={styles.iconOption}>
                      <img
                        src={`${GAME_SHARED_ICON_BASE}/${o.value}.svg`}
                        width={22}
                        height={22}
                        alt={o.label}
                      />
                      <span>[{o.group}] {o.label}</span>
                    </span>
                  ),
                }))}
              />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={2} placeholder="玩法简介" />
            </Form.Item>
            <Form.Item name="engine" label="渲染引擎" rules={[{ required: true }]} tooltip="引擎为初始化默认选项，禁止编辑">
              <Select options={GAME_ENGINE_OPTIONS} disabled={!!editing} />
            </Form.Item>
            <Form.Item name="config" label="玩法参数(config, JSON)">
              <Input.TextArea rows={3} placeholder='如 {"size":4,"target":2048}' />
            </Form.Item>
            <Form.Item name="sort_order" label="排序" initialValue={0}>
              <InputNumber className={common.fullWidth} min={0} />
            </Form.Item>
            <Form.Item name="version" label="配置版本" initialValue={1}>
              <InputNumber className={common.fullWidth} min={1} />
            </Form.Item>
            <Form.Item name="level_selectable" label="允许选关" valuePropName="checked">
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, cur) => prev.level_selectable !== cur.level_selectable}
            >
              {({ getFieldValue }) =>
                getFieldValue('level_selectable') ? (
                  <Form.Item name="level_select_mode" label="选关模式" initialValue="gated">
                    <Select
                      options={[
                        { value: 'gated', label: '需通关后选关（前置未通关则上锁，已通关可重挑战）' },
                        { value: 'free', label: '直接选关挑战（无视前置关卡是否通关）' },
                      ]}
                    />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item name="game_id" label="所属游戏" rules={[{ required: true, message: '请选择游戏' }]}>
              <Select
                placeholder="选择游戏"
                options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
              />
            </Form.Item>
            <Form.Item name="code" label="维度编码" rules={[{ required: true, message: '请输入编码' }]}>
              <Input placeholder="如 score / duration_ms / level" />
            </Form.Item>
            <Form.Item name="name" label="维度名称" rules={[{ required: true, message: '请输入名称' }]}>
              <Input placeholder="如 最高分 / 用时 / 关卡" />
            </Form.Item>
            <Form.Item name="unit" label="单位">
              <Input placeholder="如 分 / ms / 关" />
            </Form.Item>
            <Form.Item name="value_type" label="值类型" rules={[{ required: true }]}>
              <Select options={GAME_DIMENSION_VALUE_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item name="aggregate" label="最佳成绩聚合" rules={[{ required: true }]}>
              <Select options={GAME_DIMENSION_AGGREGATE_OPTIONS} />
            </Form.Item>
            <Form.Item name="is_primary" label="是否主维度" valuePropName="checked">
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
            <Form.Item name="sort_order" label="排序" initialValue={0}>
              <InputNumber className={common.fullWidth} min={0} />
            </Form.Item>
          </>
        )}
        <Form.Item name="enabled" label="状态" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ConfigFormModal
