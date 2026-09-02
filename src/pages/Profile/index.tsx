import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Tabs, Avatar, Upload, Space, Button, message, Spin } from 'antd'
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

const Profile: React.FC = () => {
  const { user } = useAuth()
  const [profileForm] = Form.useForm<{ nickname?: string }>()
  const [pwdForm] = Form.useForm<PwdFormValues>()
  const [emailForm] = Form.useForm<{ newEmail?: string }>()

  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar_url || '')
  const [uploading, setUploading] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({ nickname: user.nickname || '' })
      setAvatarUrl(user.avatar_url || '')
    }
  }, [user, profileForm])

  const handleUpload = async (file: File) => {
    try {
      setUploading(true)
      const url = await uploadAvatar(file)
      setAvatarUrl(url)
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
      await updateProfile({ nickname: v.nickname || '', avatar_url: avatarUrl })
      message.success('资料已更新')
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

  const onSaveEmail = async () => {
    try {
      const v = await emailForm.validateFields()
      setSavingEmail(true)
      await changeEmail(v.newEmail || '')
      message.success('验证邮件已发送至新邮箱，请查收确认')
      emailForm.resetFields()
    } catch (e: any) {
      if (e?.message) message.error(e.message)
    } finally {
      setSavingEmail(false)
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
          <Avatar
            size={72}
            src={avatarUrl}
            icon={!avatarUrl && <UserOutlined />}
            style={{ backgroundColor: avatarUrl ? 'transparent' : '#6C63FF' }}
          />
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
                  <Form.Item label="头像">
                    <Space direction="vertical" align="center">
                      <Avatar
                        size={100}
                        src={avatarUrl}
                        icon={!avatarUrl && <UserOutlined />}
                        style={{ backgroundColor: avatarUrl ? 'transparent' : '#6C63FF' }}
                      />
                      <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*">
                        <Button icon={<UploadOutlined />} loading={uploading}>
                          {avatarUrl ? '更换头像' : '上传头像'}
                        </Button>
                      </Upload>
                      <Input
                        placeholder="或直接填写头像 URL"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        style={{ width: 280 }}
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
          {
            key: 'email',
            label: '修改邮箱',
            children: (
              <Card>
                <Form form={emailForm} layout="vertical">
                  <Form.Item label="当前邮箱">
                    <Input value={user.email} disabled />
                  </Form.Item>
                  <Form.Item
                    name="newEmail"
                    label="新邮箱"
                    rules={[
                      { required: true, message: '请输入新邮箱' },
                      { type: 'email', message: '请输入有效的邮箱地址' },
                    ]}
                  >
                    <Input placeholder="请输入新邮箱" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" loading={savingEmail} onClick={onSaveEmail}>
                      发送验证邮件
                    </Button>
                  </Form.Item>
                </Form>
                <div style={{ color: '#999', fontSize: 12 }}>
                  修改邮箱后，系统会向新邮箱发送确认邮件，确认后生效。
                </div>
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}

export default Profile
