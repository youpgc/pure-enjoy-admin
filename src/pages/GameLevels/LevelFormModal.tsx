import React from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch } from 'antd'
import type { FormInstance } from 'antd'
import type { DbGame, DbGameLevel } from '../../types/database'
import common from '../../styles/common.module.css'

// 关卡新增/编辑弹窗（从 GameLevels/index.tsx 抽离，审查 P1 单文件超 500 行）
// 纯代码搬迁：form 实例、初始值与保存逻辑仍由父页持有，字段与文案零变更。

interface LevelFormModalProps {
  open: boolean
  editing: DbGameLevel | null
  saving: boolean
  form: FormInstance
  /** 回显值来源：弹窗挂载/每次真正打开时取最新（编辑与新增共用） */
  resolveValues: () => Record<string, any>
  games: DbGame[]
  modes: { id: string; code: string; name: string }[]
  /** Form 重挂载 key（编辑态 + 当前游戏，保证切换后回显） */
  formKey: string
  onSubmit: () => void
  onClose: () => void
}

const LevelFormModal: React.FC<LevelFormModalProps> = ({
  open,
  editing,
  saving,
  form,
  resolveValues,
  games,
  modes,
  formKey,
  onSubmit,
  onClose,
}) => (
  <Modal
    title={editing ? '编辑关卡' : '新增关卡'}
    open={open}
    onOk={onSubmit}
    confirmLoading={saving}
    afterOpenChange={(opened) => {
      // 修复编辑/新增弹窗表单串数据：Form.useForm 为单例，initialValues 仅首次挂载消费；
      // Modal 惰性挂载，open 前 setFieldsValue 无效。弹窗真正打开（子组件已挂载）后重置并回显。
      if (opened) {
        form.resetFields()
        form.setFieldsValue(resolveValues())
      }
    }}
    onCancel={onClose}
    width={600}
  >
    <Form form={form} layout="vertical" key={formKey} initialValues={resolveValues()}>
      <Form.Item name="game_id" label="所属游戏" rules={[{ required: true, message: '请选择游戏' }]}>
        <Select
          placeholder="选择游戏"
          options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
        />
      </Form.Item>
      <Form.Item name="mode_id" label="所属模式" tooltip="关卡归属的模式；与上方「模式」筛选联动">
        <Select
          placeholder="选择模式"
          allowClear
          options={modes.map((m) => ({ value: m.id, label: `${m.name}（${m.code}）` }))}
        />
      </Form.Item>
      <Form.Item name="level_no" label="关卡号" rules={[{ required: true, message: '请输入关卡号' }]}>
        <InputNumber className={common.fullWidth} min={1} />
      </Form.Item>
      <Form.Item name="name" label="关卡名称" rules={[{ required: true, message: '请输入名称' }]}>
        <Input placeholder="如 第 1 关 / 第二关" />
      </Form.Item>
      <Form.Item name="config" label="关卡布局(config, JSON)">
        <Input.TextArea rows={3} placeholder='如 {}' />
      </Form.Item>
      <Form.Item
        name="propUnlock"
        label="道具解锁配置(propUnlock, JSON)"
        tooltip='可选。{"hint":1,"shuffle":5,"hammer":10} 表示第 N 关起允许使用对应道具；留空 = 全部允许。未解锁的道具在 App 道具栏不渲染。'
      >
        <Input.TextArea rows={2} placeholder='留空 = 全部允许；如 {"shuffle":5,"hammer":10}' />
      </Form.Item>
      <Form.Item name="target" label="通关条件(target, JSON)">
        <Input.TextArea rows={3} placeholder='如 {"level":2}' />
      </Form.Item>
      <Form.Item name="count_for_daily_clear" label="计入每日首次通关奖励" valuePropName="checked" tooltip="仅当开启时，通关该关才会触发每日首通奖励（应对首关过简单场景）">
        <Switch checkedChildren="计入" unCheckedChildren="不计" />
      </Form.Item>
      <Form.Item name="reward_points" label="通关奖励积分" tooltip="通关该关获得的积分；0 表示无通关奖励">
        <InputNumber className={common.fullWidth} min={0} />
      </Form.Item>
      <Form.Item name="reward_repeatable" label="可重复通关获取" valuePropName="checked" tooltip="开启后每次通关均可获得（受单日上限约束）；关闭则仅首次通关获得（终身一次）">
        <Switch checkedChildren="可重复" unCheckedChildren="仅一次" />
      </Form.Item>
      <Form.Item name="sort_order" label="排序" initialValue={0}>
        <InputNumber className={common.fullWidth} min={0} />
      </Form.Item>
      <Form.Item name="enabled" label="状态" valuePropName="checked">
        <Switch checkedChildren="启用" unCheckedChildren="停用" />
      </Form.Item>
    </Form>
  </Modal>
)

export default LevelFormModal
