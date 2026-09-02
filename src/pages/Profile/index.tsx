import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Tabs, Avatar, Upload, Space, Button, message, Spin, Select, InputNumber } from 'antd'
import { UploadOutlined, UserOutlined } from '@ant-design/icons'
import { useAuth } from '../../App'
import {
  updateProfile,
  changePassword,
  changeEmail,
  uploadAvatar,
} from '../../services/adminProfileService'

interface PwdFormValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface ProfileFormValues {
  nickname?: string
  username?: string
  phone?: string
  email?: string
  gender?: string
  height?: number
}

const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '保密' },
]

const Profile: React.FC = () => {
  const { user } = useAuth()
  const [profileForm] = Form.useForm<ProfileFormValues>()
  const [pwdForm] = Form.useForm<PwdFormValues>()

  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar_url || '')
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        nickname: user.nickname || '',
        username: user.username || '',
        phone: user.phone || '',
        email: user.email || '',
        gender: user.gender || '',
        height: user.height,
      })
      setAvatarUrl(user.avatar_url || '')
      setAvatarBroken(false)
    }
  }, [user, profileForm])

  // 头像地址为空或加载失败时回退默认图标（UserOutlined），避免出现破损图片
  const effectiveAvatar = !avatarUrl || avatarBroken ? undefined : avatarUrl
  const renderAvatar = (size: number) => (
    <Avatar
      size={size}
      src={effectiveAvatar}
      icon={<UserOutlined />}
      onError={() => { setAvatarBroken(true); return false }}
      style={{ backgroundColor: (!avatarUrl || avatarBroken) ? '#6C63FF' : 'transparent' }}
    />
  )

  const handleUpload = async (file: File) => {
    try {
      setUploading(true)
      const url = await uploadAvatar(file)
      setAvatarUrl(url)
      setAvatarBroken(false)
      message.success('头像上传成功')
    } catch (e: any) {
      message.error(e?.message || '头像上传失败')
    } finally {
      setUploading(false)
    }
    return false
  }

  const onSaveProfile = async () => {
    try {
      const v = await profileForm.validateFields()
      setSavingProfile(true)
      // 资料字段双写 public.users（用户管理可见）+ auth.user_metadata（后台回显）
      await updateProfile({
        nickname: v.nickname || '',
        username: v.username || '',
        phone: v.phone || '',
        gender: v.gender || '',
        height: v.height,
        avatar_url: avatarUrl,
        email: v.email,
      })
      // 邮箱合并到同一栏维护：若发生变更，触发验证邮件流程
      if (v.email && v.email !== user?.email) {
        await changeEmail(v.email)
        message.success('资料已更新，新邮箱验证邮件已发送，请查收确认')
      } else {
        message.success('资料已更新')
      }
    } catch (e: any) {
      if (e?.message) message.error(e.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const onSavePwd = async () => {
    try {
      const v = await pwdForm.validateFields()
      if (v.newPassword !== v.confirmPassword) {
        message.error('两次输入的新密码不一致')
        return
      }
      setSavingPwd(true)
      await changePassword(v.currentPassword, v.newPassword)
      message.success('密码修改成功，请使用新密码重新登录')
      pwdForm.resetFields()
    } catch (e: any) {
      if (e?.message) message.error(e.message)
    } finally {
      setSavingPwd(false)
    }
  }

  if (!user) {
    return (
      <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
        <Spin />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <Card style={{ marginBottom: 16 }}>
        <Space align="center">
          {renderAvatar(72)}
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{user.nickname || user.email}</div>
            <div style={{ color: '#999' }}>{user.email}</div>
          </div>
        </Space>
      </Card>

      <Tabs
        defaultActiveKey="profile"
        items={[
          {
            key: 'profile',
            label: '基本资料',
            children: (
              <Card>
                <Form form={profileForm} layout="vertical">
                  <Form.Item name="nickname" label="昵称" rules={[{ max: 30, message: '昵称不超过30字' }]}>
                    <Input placeholder="请输入昵称" />
                  </Form.Item>
                  <Form.Item name="username" label="用户名" rules={[{ max: 30, message: '用户名不超过30字' }]}>
                    <Input placeholder="请输入用户名" />
                  </Form.Item>
                  <Form.Item
                    name="phone"
                    label="手机号"
                    rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', validateTrigger: 'onBlur' }]}
                  >
                    <Input placeholder="请输入手机号" maxLength={20} />
                  </Form.Item>
                  <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[
                      { required: true, message: '请输入邮箱' },
                      { type: 'email', message: '请输入有效的邮箱地址' },
                    ]}
                  >
                    <Input placeholder="请输入邮箱" />
                  </Form.Item>
                  <Form.Item name="gender" label="性别">
                    <Select placeholder="请选择性别" options={GENDER_OPTIONS} allowClear style={{ maxWidth: 240 }} />
                  </Form.Item>
                  <Form.Item name="height" label="身高 (cm)">
                    <InputNumber min={50} max={250} style={{ width: 240 }} placeholder="请输入身高" />
                  </Form.Item>
                  <Form.Item label="头像">
                    <Space direction="vertical" align="center">
                      {renderAvatar(100)}
                      <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*">
                        <Button icon={<UploadOutlined />} loading={uploading}>
                          {avatarUrl ? '更换头像' : '上传头像'}
                        </Button>
                      </Upload>
                      <Input
                        placeholder="或直接填写头像 URL（留空则显示默认头像）"
                        value={avatarUrl}
                        onChange={(e) => {
                          setAvatarUrl(e.target.value)
                          setAvatarBroken(false)
                        }}
                        style={{ width: 300 }}
                      />
                    </Space>
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" loading={savingProfile} onClick={onSaveProfile}>
                      保存资料
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'password',
            label: '修改密码',
            children: (
              <Card>
                <Form form={pwdForm} layout="vertical">
                  <Form.Item
                    name="currentPassword"
                    label="当前密码"
                    rules={[{ required: true, message: '请输入当前密码' }]}
                  >
                    <Input.Password placeholder="请输入当前密码" />
                  </Form.Item>
                  <Form.Item
                    name="newPassword"
                    label="新密码"
                    rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}
                  >
                    <Input.Password placeholder="至少6位" />
                  </Form.Item>
                  <Form.Item
                    name="confirmPassword"
                    label="确认新密码"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: '请再次输入新密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                          return Promise.reject(new Error('两次输入的新密码不一致'))
                        },
                      }),
                    ]}
                  >
                    <Input.Password placeholder="请再次输入新密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" loading={savingPwd} onClick={onSavePwd}>
                      修改密码
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}

export default Profile
