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
  Upload,
  Avatar,
  Space,
  Button,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { UploadOutlined, UserOutlined } from '@ant-design/icons'
import type { User, UserFormData } from '../types/user'
import { supabase } from '../utils/supabase'
import { useDictOptions } from '../hooks/useDictOptions'
import { apiExecute, handleApiError } from '../utils/apiClient'
import { DEFAULT_USER_FORM_VALUES } from '../constants'

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
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  // 字典查询
  const { options: roleOptions } = useDictOptions('user_role')
  const { options: levelOptions } = useDictOptions('member_level')
  const { options: statusOptions } = useDictOptions('user_status')

  // 初始化表单值
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && user) {
        form.setFieldsValue({
          email: user.email,
          phone: user.phone || '',
          nickname: user.nickname || '',
          avatar_url: user.avatar_url || '',
          // 扩展资料字段
          username: user.username || '',
          bio: user.bio || '',
          gender: user.gender || '保密',
          birthday: user.birthday ? dayjs(user.birthday) : undefined,
          height: user.height ?? undefined,
          location: user.location || '',
          occupation: user.occupation || '',
          company: user.company || '',
          website: user.website || '',
          role: user.role,
          member_level: user.member_level,
          status: user.status,
          available_points: user.available_points ?? 0,
        })
        setAvatarUrl(user.avatar_url || '')
      } else {
        form.resetFields()
        form.setFieldsValue(DEFAULT_USER_FORM_VALUES)
        setAvatarUrl('')
      }
    }
  }, [open, mode, user, form])

  // 上传头像到 Supabase Storage
  const handleAvatarUpload = async (file: File) => {
    try {
      setUploading(true)
      
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        message.error('请上传图片文件')
        return false
      }
      
      // 验证文件大小 (2MB)
      if (file.size > 2 * 1024 * 1024) {
        message.error('图片大小不能超过 2MB')
        return false
      }

      // 生成唯一文件名
      const fileExt = file.name.split('.').pop()
      const fileName = `avatars/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`

      // 上传到 Supabase Storage
      const uploadResult = await apiExecute(
        () => supabase.storage.from('public').upload(fileName, file),
        'UserFormModal-头像上传'
      )

      if (!uploadResult.success) {
        message.error('头像上传失败')
        return false
      }

      // 获取公开 URL
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(fileName)

      setAvatarUrl(publicUrl)
      form.setFieldsValue({ avatar_url: publicUrl })
      message.success('头像上传成功')
      return false // 阻止默认上传行为
    } catch (error) {
      handleApiError(error, 'UserFormModal-头像上传')
      return false
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (submitting) return
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
          ...DEFAULT_USER_FORM_VALUES,
        } as any}
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

        <Form.Item
          name="avatar_url"
          label="头像"
        >
          <Space direction="vertical" align="center">
            <Avatar
              size={100}
              src={avatarUrl}
              icon={!avatarUrl && <UserOutlined />}
              style={{ backgroundColor: avatarUrl ? 'transparent' : '#1890ff' }}
            />
            <Upload
              beforeUpload={handleAvatarUpload}
              showUploadList={false}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                {avatarUrl ? '更换头像' : '上传头像'}
              </Button>
            </Upload>
            <Input type="hidden" />
          </Space>
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
          name="height"
          label="身高(cm)"
        >
          <InputNumber placeholder="请输入身高" min={50} max={250} step={0.1} style={{ width: '100%' }} />
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
          <Select options={roleOptions} placeholder="请选择角色" />
        </Form.Item>

        <Form.Item
          name="member_level"
          label="会员等级"
          rules={[{ required: true, message: '请选择会员等级' }]}
        >
          <Select options={levelOptions} placeholder="请选择会员等级" />
        </Form.Item>

        <Form.Item
          name="status"
          label="状态"
          rules={[{ required: true, message: '请选择状态' }]}
        >
          <Select options={statusOptions} placeholder="请选择状态" />
        </Form.Item>

        <Form.Item
          name="available_points"
          label="可用积分（当前余额）"
          tooltip="调整用户的当前可用积分余额；增/减都会生成一条 admin_adjust 流水并由后台重算回写。累计获得为只读展示，不在此处变动。"
          rules={[{ required: true, message: '请输入可用积分' }]}
        >
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            placeholder="请输入可用积分（当前余额）"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default UserFormModal
