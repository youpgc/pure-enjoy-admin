import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
  Divider,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
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
          // 扩展资料字段
          username: user.username || '',
          bio: user.bio || '',
          gender: user.gender || '保密',
          birthday: user.birthday ? dayjs(user.birthday) : undefined,
          location: user.location || '',
          occupation: user.occupation || '',
          company: user.company || '',
          website: user.website || '',
          role: user.role,
          member_level: user.member_level,
          status: user.status,
          points: user.points,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          gender: '保密',
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
      // 处理日期字段 - DatePicker 返回 dayjs 对象
      const birthdayValue = values.birthday 
        ? String((values.birthday as unknown as Dayjs).format('YYYY-MM-DD'))
        : null
      
      const submitData = {
        ...values,
        birthday: birthdayValue,
      }
      setSubmitting(true)
      await onSubmit(submitData)
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
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          gender: '保密',
          role: 'user' as UserRole,
          member_level: 'normal' as MemberLevel,
          status: 'active' as UserStatus,
          points: 0,
        }}
      >
        <Divider orientation="left">基本信息</Divider>

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

        <Divider orientation="left">扩展资料</Divider>

        <Form.Item
          name="username"
          label="用户名"
        >
          <Input placeholder="请输入用户名" />
        </Form.Item>

        <Form.Item
          name="bio"
          label="个性签名"
        >
          <Input.TextArea rows={2} placeholder="介绍一下自己" />
        </Form.Item>

        <Form.Item
          name="gender"
          label="性别"
        >
          <Select placeholder="请选择性别">
            <Select.Option value="男">男</Select.Option>
            <Select.Option value="女">女</Select.Option>
            <Select.Option value="保密">保密</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="birthday"
          label="生日"
        >
          <DatePicker
            style={{ width: '100%' }}
            placeholder="选择生日"
            format="YYYY-MM-DD"
          />
        </Form.Item>

        <Form.Item
          name="location"
          label="所在地"
        >
          <Input placeholder="请输入所在城市" />
        </Form.Item>

        <Form.Item
          name="occupation"
          label="职业"
        >
          <Input placeholder="请输入职业" />
        </Form.Item>

        <Form.Item
          name="company"
          label="公司/组织"
        >
          <Input placeholder="请输入公司或组织名称" />
        </Form.Item>

        <Form.Item
          name="website"
          label="个人网站"
        >
          <Input placeholder="https://example.com" />
        </Form.Item>

        <Divider orientation="left">账户设置</Divider>

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
