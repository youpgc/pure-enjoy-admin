import React from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch, Button, Space } from 'antd'
import type { Database } from '../../types/database'
import { GAME_SHARED_ICON_BASE, GAME_SHARED_ICON_OPTIONS } from '../../constants/game'
import { playKindOptionsFor, CONFIG_TEMPLATES } from './modeMeta'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

type DbGameMode = Database['public']['Tables']['game_modes']['Row']

const iconOptions = GAME_SHARED_ICON_OPTIONS.map((o) => ({
  value: o.value,
  label: `[${o.group}] ${o.label}`,
}))

interface ModeFormModalProps {
  open: boolean
  /** 编辑目标；null = 新增 */
  editing: DbGameMode | null
  /** 列表当前筛选的游戏（新增时默认选中） */
  selectedGameId: string
  games: { id: string; code: string; name: string }[]
  saving: boolean
  /** 校验通过后回传表单原始值（config 仍是 JSON 字符串，由父级解析落库） */
  onOk: (values: Record<string, any>) => void
  onCancel: () => void
}

/**
 * 模式编辑弹窗（game_modes 表单）。
 * 表单联动：所属游戏 → 过滤 play_kind 可选值（跨游戏不可混用）；
 * play_kind → 提供该玩法语义的 config 推荐参数模板一键填充（防配置键错配）。
 */
const ModeFormModal: React.FC<ModeFormModalProps> = ({
  open,
  editing,
  selectedGameId,
  games,
  saving,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm()

  // 表单联动：所属游戏 → 过滤 play_kind 可选值；play_kind → config 推荐模板
  const watchedGameId = Form.useWatch('game_id', form)
  const watchedPlayKind = Form.useWatch('play_kind', form)
  const formGameCode = games.find((g) => g.id === watchedGameId)?.code
  const kindOptions = playKindOptionsFor(formGameCode)
  const configTemplate = watchedPlayKind ? CONFIG_TEMPLATES[watchedPlayKind] : undefined

  const formInitialValues = (): Record<string, unknown> => ({
    game_id: selectedGameId || undefined,
    code: '',
    name: '',
    icon: '',
    description: '',
    play_kind: '',
    config: '{}',
    enabled: true,
    sort_order: 0,
  })

  // 弹窗惰性挂载：open 后再 reset+回显，避免编辑串数据（与游戏模块其它表单一致）
  const afterOpenChange = (open: boolean) => {
    if (open) {
      form.resetFields()
      // 编辑时 config 为 DB 返回的 Json 对象，需序列化为字符串回填文本框；
      // 新增时回落 formInitialValues（已含 config:'{}'）。否则保存会静默清空 config。
      const initValues = editing
        ? { ...editing, config: JSON.stringify((editing as any)?.config ?? {}) }
        : formInitialValues()
      form.setFieldsValue(initValues)
    }
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    onOk(values)
  }

  return (
    <Modal
      title={editing ? '编辑模式' : '新增模式'}
      open={open}
      onOk={handleOk}
      confirmLoading={saving}
      onCancel={onCancel}
      afterOpenChange={afterOpenChange}
      width={560}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={formInitialValues()}>
        <Form.Item name="game_id" label="所属游戏" rules={[{ required: true, message: '请选择游戏' }]}>
          <Select
            placeholder="选择游戏"
            disabled={!!editing}
            options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
          />
        </Form.Item>
        <Form.Item name="code" label="模式编码" rules={[{ required: true, message: '请输入编码' }]}>
          <Input placeholder="如 classic / timed / challenge" disabled={!!editing} />
        </Form.Item>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如 经典模式" />
        </Form.Item>
        <Form.Item
          name="play_kind"
          label="玩法语义(play_kind)"
          tooltip="模式 ↔ 引擎行为的唯一链接；可选项随所属游戏过滤，跨游戏不可混用"
        >
          <Select
            allowClear
            placeholder={formGameCode ? '选择引擎子类型语义' : '先选所属游戏以过滤可选项'}
            options={kindOptions}
          />
        </Form.Item>
        <Form.Item name="icon" label="图标">
          <Select
            allowClear
            placeholder="选择共享图标资产（与 App 端同一套 SVG）"
            showSearch
            optionFilterProp="label"
            options={iconOptions.map((o) => ({
              value: o.value,
              label: (
                <span key={o.value} className={styles.iconOption}>
                  <img
                    src={`${GAME_SHARED_ICON_BASE}/${o.value}.svg`}
                    width={22}
                    height={22}
                    alt={o.label}
                  />
                  <span>{o.label}</span>
                </span>
              ),
            }))}
          />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} placeholder="玩法简介" />
        </Form.Item>
        <Form.Item
          name="config"
          label={
            <Space size={8}>
              <span>玩法参数(config, JSON)</span>
              {configTemplate && (
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() =>
                    form.setFieldsValue({ config: JSON.stringify(configTemplate, null, 2) })
                  }
                >
                  填入推荐模板
                </Button>
              )}
            </Space>
          }
          tooltip="模式级默认玩法参数（尺寸/限时/步数等），关卡可覆盖；键名须与 App 引擎读取键一致，推荐用模板填充防错"
        >
          <Input.TextArea rows={3} placeholder='如 {"size":4,"timeLimit":60}' />
        </Form.Item>
        <Form.Item name="sort_order" label="排序" initialValue={0}>
          <InputNumber className={common.fullWidth} min={0} />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked">
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ModeFormModal
