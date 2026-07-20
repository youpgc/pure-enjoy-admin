// 字典项新增/编辑表单弹窗（从 DictManagement.tsx 抽取，行为保持）
import { Modal, Form, Input, InputNumber, Switch } from 'antd'
import type { FormInstance } from 'antd'
import type { DictItem } from './types'

interface DictItemFormModalProps {
  open: boolean
  editingItem: DictItem | null
  saving: boolean
  form: FormInstance
  onOk: () => void
  onCancel: () => void
}

export function DictItemFormModal({
  open,
  editingItem,
  saving,
  form,
  onOk,
  onCancel,
}: DictItemFormModalProps) {
  return (
    <Modal
      title={editingItem ? '编辑字典项' : '新增字典项'}
      open={open}
      onOk={onOk}
      confirmLoading={saving}
      onCancel={onCancel}
      width={500}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="type_id"
          label="所属类型"
          hidden
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="code"
          label="编码"
          rules={[{ required: true, message: '请输入编码' }]}
        >
          <Input placeholder="请输入编码" disabled={!!editingItem} />
        </Form.Item>
        <Form.Item
          name="label"
          label="标签"
          rules={[{ required: true, message: '请输入标签' }]}
        >
          <Input placeholder="请输入标签" />
        </Form.Item>
        <Form.Item
          name="value"
          label="值"
        >
          <Input placeholder="请输入值" />
        </Form.Item>
        <Form.Item
          name="sort_order"
          label="排序"
        >
          <InputNumber style={{ width: '100%' }} placeholder="请输入排序" min={0} />
        </Form.Item>
        <Form.Item
          name="is_default"
          label="是否默认"
          valuePropName="checked"
        >
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
        <Form.Item
          name="is_active"
          label="状态"
          valuePropName="checked"
        >
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
