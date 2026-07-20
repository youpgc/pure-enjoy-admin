// 应用版本新增/编辑表单弹窗（从 VersionManagement.tsx 抽取，行为保持）
import { Modal, Form, Input, InputNumber, Select, Switch } from 'antd'
import type { FormInstance } from 'antd'
import { VERSION_PLATFORM_OPTIONS } from '../../constants'
import type { AppVersion } from './types'

interface VersionFormModalProps {
  open: boolean
  editingVersion: AppVersion | null
  saving: boolean
  form: FormInstance
  onOk: () => void
  onCancel: () => void
}

export function VersionFormModal({
  open,
  editingVersion,
  saving,
  form,
  onOk,
  onCancel,
}: VersionFormModalProps) {
  return (
    <Modal
      title={editingVersion ? '编辑版本' : '新增版本'}
      open={open}
      onOk={onOk}
      confirmLoading={saving}
      onCancel={onCancel}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="platform"
          label="平台"
          rules={[{ required: true, message: '请选择平台' }]}
        >
          <Select
            placeholder="请选择平台"
            options={VERSION_PLATFORM_OPTIONS}
          />
        </Form.Item>
        <Form.Item
          name="version"
          label="版本号"
          rules={[{ required: true, message: '请输入版本号' }]}
        >
          <Input placeholder="如: 1.0.0" />
        </Form.Item>
        <Form.Item
          name="build_number"
          label="构建号"
          rules={[{ required: true, message: '请输入构建号' }]}
        >
          <InputNumber style={{ width: '100%' }} placeholder="请输入构建号" min={0} />
        </Form.Item>
        <Form.Item
          name="release_notes"
          label="更新说明"
        >
          <Input.TextArea rows={4} placeholder="请输入更新说明" />
        </Form.Item>
        <Form.Item
          name="apk_url"
          label="APK下载地址"
        >
          <Input placeholder="请输入APK下载地址" />
        </Form.Item>
        <Form.Item
          name="file_name"
          label="文件名"
        >
          <Input placeholder="请输入文件名" />
        </Form.Item>
        <Form.Item
          name="apk_size"
          label="文件大小(字节)"
        >
          <InputNumber style={{ width: '100%' }} placeholder="请输入文件大小(字节)" min={0} />
        </Form.Item>
        <Form.Item
          name="checksum"
          label="校验值"
        >
          <Input placeholder="请输入校验值" />
        </Form.Item>
        <Form.Item
          name="is_force_update"
          label="强制更新"
          valuePropName="checked"
        >
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
