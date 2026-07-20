// 敏感词新增/编辑表单弹窗（从 SensitiveWords.tsx 抽取，行为保持）
import { Modal, Form, Input, Select, Switch } from 'antd'
import type { FormInstance } from 'antd'
import {
  SENSITIVE_CATEGORY_OPTIONS,
  SENSITIVE_LEVEL_OPTIONS,
  SENSITIVE_MATCH_MODE_OPTIONS,
} from '../../constants'
import type { SensitiveWord } from './types'

interface SensitiveWordsFormModalProps {
  open: boolean
  editingWord: SensitiveWord | null
  saving: boolean
  form: FormInstance
  onOk: () => void
  onCancel: () => void
}

export function SensitiveWordsFormModal({
  open,
  editingWord,
  saving,
  form,
  onOk,
  onCancel,
}: SensitiveWordsFormModalProps) {
  return (
    <Modal
      title={editingWord ? '编辑敏感词' : '新增敏感词'}
      open={open}
      onOk={onOk}
      confirmLoading={saving}
      onCancel={onCancel}
      width={500}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="word"
          label="敏感词"
          rules={[{ required: true, message: '请输入敏感词' }]}
        >
          <Input placeholder="请输入敏感词" />
        </Form.Item>
        <Form.Item
          name="replace_word"
          label="替换词"
        >
          <Input placeholder="替换为（可选）" />
        </Form.Item>
        <Form.Item
          name="description"
          label="描述"
        >
          <Input.TextArea rows={2} placeholder="请输入描述（可选）" />
        </Form.Item>
        <Form.Item
          name="category"
          label="分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select
            placeholder="请选择分类"
            options={SENSITIVE_CATEGORY_OPTIONS}
          />
        </Form.Item>
        <Form.Item
          name="level"
          label="等级"
          rules={[{ required: true, message: '请选择等级' }]}
        >
          <Select
            placeholder="请选择等级"
            options={SENSITIVE_LEVEL_OPTIONS}
          />
        </Form.Item>
        <Form.Item
          name="match_mode"
          label="匹配模式"
          rules={[{ required: true, message: '请选择匹配模式' }]}
        >
          <Select
            placeholder="请选择匹配模式"
            options={SENSITIVE_MATCH_MODE_OPTIONS}
          />
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
