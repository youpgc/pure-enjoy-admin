// 字典类型新增/编辑表单弹窗（从 DictManagement.tsx 抽取，行为保持）
import { Modal, Form, Input, InputNumber, Switch } from 'antd'
import type { FormInstance } from 'antd'
import type { DictType } from './types'

interface DictTypeFormModalProps {
  open: boolean
  editingType: DictType | null
  saving: boolean
  form: FormInstance
  onOk: () => void
  onCancel: () => void
}

export function DictTypeFormModal({
  open,
  editingType,
  saving,
  form,
  onOk,
  onCancel,
}: DictTypeFormModalProps) {
  return (
    <Modal
      title={editingType ? '编辑字典类型' : '新增字典类型'}
      open={open}
      onOk={onOk}
      confirmLoading={saving}
      onCancel={onCancel}
      width={500}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="code"
          label="类型编码"
          rules={[{ required: true, message: '请输入类型编码' }]}
        >
          <Input placeholder="请输入类型编码" disabled={!!editingType} />
        </Form.Item>
        <Form.Item
          name="name"
          label="类型名称"
          rules={[{ required: true, message: '请输入类型名称' }]}
        >
          <Input placeholder="请输入类型名称" />
        </Form.Item>
        <Form.Item
          name="description"
          label="描述"
        >
          <Input.TextArea rows={3} placeholder="请输入描述" />
        </Form.Item>
        <Form.Item
          name="sort_order"
          label="排序"
        >
          <InputNumber style={{ width: '100%' }} placeholder="请输入排序" min={0} />
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
