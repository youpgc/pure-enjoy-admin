import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
} from 'antd'
import type { User, UserFormData, UserRole, MemberLevel, UserStatus } from '../types/user'
import { USER_ROLE_OPTIONS, MEMBER_LEVEL_OPTIONS, USER_STATUS_OPTIONS } from '../types/user'

interface UserFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  user?: User | null
  onCancel: () => void
  onSubmit: (data: UserFormData) => Promise<void>
  loading?: boolean
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  open,
  mode,
  user,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm<UserFormData>()
  const [submitting, setSubmitting] = useState(false)

  // 初始化表单值
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && user) {
        form.setFieldsValue({
          email: user.email,
          phone: user.phone || '',
          nickname: user.nickname || '',
          role: user.role,
          member_level: user.member_level,
          status: user.status,
          points: user.points,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          role: 'user',
          member_level: 'normal',
          status: 'active',
          points: 0,
        })
      }
    }
  }, [open, mode, user, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      await onSubmit(values)
      message.success(mode === 'create' ? '用户创建成功' : '用户更新成功')
      form.resetFields()
      onCancel()
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title={mode === 'create' ? '新增用户' : '编辑用户'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={submitting || loading}
      width={520}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          role: 'user' as UserRole,
          member_level: 'normal' as MemberLevel,
          status: 'active' as UserStatus,
          points: 0,
        }}
      >
        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input
            placeholder="请输入邮箱"
            disabled={mode === 'edit'}
          />
        </Form.Item>

        {mode === 'create' && (
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
        )}

        {mode === 'edit' && (
          <Form.Item
            name="password"
            label="新密码"
            extra="留空则不修改密码"
            rules={[{ min: 6, message: '密码至少6位' }]}
          >
            <Input.Password placeholder="留空则不修改密码" />
          </Form.Item>
        )}

        <Form.Item
          name="phone"
          label="手机号"
          rules={[
            {
              pattern: /^1[3-9]\d{9}$/,
              message: '请输入有效的手机号',
            },
          ]}
        >
          <Input placeholder="请输入手机号" />
        </Form.Item>

        <Form.Item
          name="nickname"
          label="昵称"
        >
          <Input placeholder="请输入昵称" />
        </Form.Item>

        <Form.Item
          name="role"
          label="角色"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select options={USER_ROLE_OPTIONS} placeholder="请选择角色" />
        </Form.Item>

        <Form.Item
          name="member_level"
          label="会员等级"
          rules={[{ required: true, message: '请选择会员等级' }]}
        >
          <Select options={MEMBER_LEVEL_OPTIONS} placeholder="请选择会员等级" />
        </Form.Item>

        <Form.Item
          name="status"
          label="状态"
          rules={[{ required: true, message: '请选择状态' }]}
        >
          <Select options={USER_STATUS_OPTIONS} placeholder="请选择状态" />
        </Form.Item>

        <Form.Item
          name="points"
          label="积分"
          rules={[{ required: true, message: '请输入积分' }]}
        >
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            placeholder="请输入积分"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default UserFormModal
