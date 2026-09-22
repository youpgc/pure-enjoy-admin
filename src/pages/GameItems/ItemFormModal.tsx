import React from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch } from 'antd'
import type { FormInstance } from 'antd'
import type { DbGameItem } from '../../types/database'
import {
  GAME_SHARED_ICON_BASE,
  PROP_ICON_OPTIONS,
} from '../../constants/game'
import { ITEM_TYPE_OPTIONS } from './constants'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

// 道具新增/编辑弹窗（从 GameItems/index.tsx 抽离，审查 P1 单文件超 500 行）
// 纯代码搬迁：form 实例、初始值与保存逻辑仍由父页持有，字段与提示文案零变更。

interface ItemFormModalProps {
  open: boolean
  editing: DbGameItem | null
  saving: boolean
  form: FormInstance
  /** 表单 initialValues（弹窗首次挂载回显） */
  initialValues: Record<string, any>
  /** 每次弹窗真正打开后重新取值的回显来源（编辑/新增串数据修复） */
  restoreValues: () => Record<string, any>
  gameOptions: { value: string; label: string }[]
  modeOptions: { value: string; label: string }[]
  onSubmit: () => void
  onClose: () => void
}

const ItemFormModal: React.FC<ItemFormModalProps> = ({
  open,
  editing,
  saving,
  form,
  initialValues,
  restoreValues,
  gameOptions,
  modeOptions,
  onSubmit,
  onClose,
}) => (
  <Modal
    title={editing ? '编辑道具' : '新增道具'}
    open={open}
    onOk={onSubmit}
    confirmLoading={saving}
    afterOpenChange={(opened) => {
      // 修复编辑/新增弹窗表单串数据：Form.useForm 为单例，Modal 惰性挂载使 open 前
      // setFieldsValue 无效；弹窗真正打开（子组件已挂载）后重置并回显最新值。
      if (opened) {
        form.resetFields()
        form.setFieldsValue(restoreValues())
      }
    }}
    onCancel={onClose}
    destroyOnHidden
  >
    <Form
      form={form}
      layout="vertical"
      preserve={false}
      key={editing?.id ?? 'create'}
      initialValues={initialValues}
    >
      <Form.Item
        name="game_code"
        label="适用游戏"
        rules={[{ required: true, message: '请选择游戏' }]}
      >
        <Select
          placeholder="选择游戏"
          options={gameOptions}
          showSearch
          optionFilterProp="label"
          onChange={() => {
            // 2026-09-10 审查：切换游戏后模式归属失效，重置为「通用」
            // 防止旧游戏的 mode 编码随新游戏落库成脏数据（如 g2048+jelly）
            form.setFieldValue('mode', '')
          }}
        />
      </Form.Item>
      <Form.Item name="mode" label="模式" tooltip="「通用」表示适用于该游戏全部模式；也可指定消消乐某一模式">
        <Select options={modeOptions} />
      </Form.Item>
      <Form.Item
        name="item_type"
        label="道具类型"
        rules={[{ required: true, message: '请选择类型' }]}
      >
        <Select placeholder="选择类型" options={ITEM_TYPE_OPTIONS} />
      </Form.Item>
      <Form.Item
        name="name"
        label="名称"
        rules={[{ required: true, message: '请输入名称' }]}
      >
        <Input placeholder="如 移出卡" />
      </Form.Item>
      <Form.Item name="description" label="说明">
        <Input.TextArea rows={2} placeholder="道具效果说明" />
      </Form.Item>
      <Form.Item
        name="icon"
        label="图标"
        tooltip="与游戏/成就图标同机制：下拉选择定版道具图标（App 道具栏/确认弹窗/商城页同步生效）；留空 = App 内置图标"
      >
        <Select
          allowClear
          placeholder="选择道具图标（留空使用内置图标）"
          showSearch
          optionFilterProp="label"
          options={PROP_ICON_OPTIONS.map((o) => ({
            value: o.value,
            label: (
              <span key={o.value} className={styles.iconOption}>
                <img
                  src={`${GAME_SHARED_ICON_BASE}/${o.value}.svg`}
                  width={22}
                  height={22}
                  alt={o.label}
                />
                <span>
                  [{o.group}] {o.label}
                </span>
              </span>
            ),
          }))}
        />
      </Form.Item>
      <Form.Item
        name="point_cost"
        label="积分成本"
        rules={[{ required: true, message: '请输入积分成本' }]}
      >
        <InputNumber min={0} className={common.fullWidth} addonAfter="分" />
      </Form.Item>
      <Form.Item
        name="per_game_limit"
        label="单局使用上限"
        rules={[{ required: true, message: '请输入上限' }]}
      >
        <InputNumber min={1} className={common.fullWidth} addonAfter="次" />
      </Form.Item>
      <Form.Item
        name="free_per_game"
        label="每局免费次数"
        tooltip="单局内免费使用次数，不消耗购买库存；超出部分才消耗库存。全游戏可配。"
        rules={[{ required: true, message: '请输入免费次数' }]}
      >
        <InputNumber min={0} className={common.fullWidth} addonAfter="次" />
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

export default ItemFormModal
