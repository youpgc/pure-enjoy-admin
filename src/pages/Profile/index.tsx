import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Tabs, Avatar, Upload, Space, Button, message, Spin } from 'antd'
import { UploadOutlined, UserOutlined } from '@ant-design/icons'
import { useAuth } from '../../App'
import {
  updateProfile,
  changePassword,
  uploadAvatar,
} from '../../services/adminProfileService'
import { logoutAdmin } from '../../utils/adminSession'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

interface PwdFormValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface ProfileFormValues {
  nickname?: string
  email?: string
}

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
        email: user.email || '',
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
      // updateProfile 同端点携带 email（服务端全表唯一性校验，立即生效）
      await updateProfile({
        nickname: v.nickname || '',
        avatar_url: avatarUrl,
        email: v.email,
      })
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
      // 改密成功：服务端已吊销本账号全部会话，主动登出并整页跳登录页重新登录
      message.success('密码修改成功，请使用新密码重新登录')
      await logoutAdmin()
      setTimeout(() => {
        window.location.href = '/pure-enjoy-admin/login'
      }, 900)
    } catch (e: any) {
      if (e?.message) message.error(e.message)
      setSavingPwd(false)
    }
  }

  if (!user) {
    return (
      <div className={`${common.p24} ${styles.centerFlex}`}>
        <Spin />
      </div>
    )
  }

  return (
    <div className={styles.pageWrap}>
      <Card className={common.mb16}>
        <Space align="center">
          {renderAvatar(72)}
          <div>
            <div className={styles.nameText}>{user.nickname || user.email}</div>
            <div className={styles.emailText}>{user.email}</div>
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
                  {/* username/phone/gender/height 不在 admin_users 模型内（服务端不落库），不提供编辑 */}
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
                        className={styles.inputWidth300}
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
                    rules={[{ required: true, message: '请输入新密码' }, { min: 6, max: 16, message: '密码长度为 6~16 位' }]}
                  >
                    <Input.Password placeholder="请输入新密码（6~16 位）" />
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
