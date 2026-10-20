import React, { useEffect, useState } from 'react'
import { Modal, Form, Input, Select, DatePicker, InputNumber, Button, Upload, Avatar, Space, message } from 'antd'
import { UserOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import type { User } from '../../types/user'
import { userService } from '../../services/userService'
import { apiUpload } from '../../utils/adminHttp'
import { handleApiError } from '../../utils/apiClient'
import { useDictOptions } from '../../hooks/useDictOptions'

// 用户详情抽屉的分区编辑弹窗：单次保存只维护对应分区的字段
// （后端 UpdateUserRequest 白名单：phone/nickname/avatarUrl/bio/gender/birthday/
//   location/occupation/company/website/height/role/memberLevel/password；
//   status 走独立端点 PUT /users/{id}/status，积分走 /admin/points/adjust）

export type UserEditModule = 'basic' | 'profile' | 'account'

interface UserModuleEditModalProps {
  open: boolean
  module: UserEditModule | null
  user: User | null
  onClose: () => void
  /** 保存成功后回调：携带合并后的最新用户对象（父级同步列表与抽屉） */
  onSaved: (merged: User) => void
}

const MODAL_TITLE: Record<UserEditModule, string> = {
  basic: '编辑基本信息',
  profile: '编辑扩展资料',
  account: '编辑账户设置',
}

const UserModuleEditModal: React.FC<UserModuleEditModalProps> = ({
  open,
  module,
  user,
  onClose,
  onSaved,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const { options: roleOptions } = useDictOptions('user_role')
  const { options: levelOptions } = useDictOptions('member_level')
  const { options: statusOptions } = useDictOptions('user_status')

  // 打开时按模块回填当前值
  useEffect(() => {
    if (!open || !user || !module) return
    setAvatarUrl(user.avatar_url || '')
    if (module === 'basic') {
      form.setFieldsValue({
        nickname: user.nickname || '',
        phone: user.phone || '',
      })
    } else if (module === 'profile') {
      form.setFieldsValue({
        gender: user.gender || '保密',
        birthday: user.birthday ? dayjs(user.birthday) : undefined,
        height: user.height ?? undefined,
        location: user.location || '',
        occupation: user.occupation || '',
        company: user.company || '',
        website: user.website || '',
        bio: user.bio || '',
      })
    } else {
      form.setFieldsValue({
        role: user.role,
        member_level: user.member_level,
        status: user.status,
      })
    }
  }, [open, module, user, form])

  const handleAvatarUpload = async (file: File) => {
    try {
      setUploading(true)
      if (!file.type.startsWith('image/')) {
        message.error('请上传图片文件')
        return false
      }
      if (file.size > 2 * 1024 * 1024) {
        message.error('图片大小不能超过 2MB')
        return false
      }
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', 'avatar')
      const meta = await apiUpload<{ url: string | null }>('/files/upload', fd)
      const publicUrl = meta?.url ?? ''
      if (!publicUrl) {
        message.error('头像上传失败：服务端未返回访问地址')
        return false
      }
      setAvatarUrl(publicUrl)
      message.success('头像上传成功，保存后生效')
      return false
    } catch (error) {
      handleApiError(error, 'UserModuleEditModal-头像上传')
      return false
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!user || !module || submitting) return
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      if (module === 'basic') {
        const result = await userService.update(user.id, {
          nickname: values.nickname || null,
          phone: values.phone || null,
          avatar_url: avatarUrl || null,
        })
        if (!result.success) {
          message.error(result.errorMessage || '保存失败')
          return
        }
        onSaved({ ...user, nickname: values.nickname || null, phone: values.phone || null, avatar_url: avatarUrl || null })
      } else if (module === 'profile') {
        const birthday = values.birthday ? (values.birthday as Dayjs).format('YYYY-MM-DD') : null
        const result = await userService.update(user.id, {
          gender: values.gender || null,
          birthday,
          height: values.height ?? null,
          location: values.location || null,
          occupation: values.occupation || null,
          company: values.company || null,
          website: values.website || null,
          bio: values.bio || null,
        })
        if (!result.success) {
          message.error(result.errorMessage || '保存失败')
          return
        }
        onSaved({
          ...user,
          gender: values.gender || null,
          birthday,
          height: values.height ?? null,
          location: values.location || null,
          occupation: values.occupation || null,
          company: values.company || null,
          website: values.website || null,
          bio: values.bio || null,
        })
      } else {
        // 账户设置：角色/会员等级走通用更新；状态走独立端点；积分按差额走调整事务。
        // 部分失败时把已生效字段如实合并回显（避免 UI 与服务端状态脱节），弹窗保持打开可重试失败项
        const result = await userService.update(user.id, {
          role: values.role,
          member_level: values.member_level,
        })
        if (!result.success) {
          message.error(result.errorMessage || '保存失败')
          return
        }
        const merged: User = { ...user, role: values.role, member_level: values.member_level }
        let ok = true
        if (values.status !== user.status) {
          const statusResult = await userService.toggleStatus(user.id, values.status)
          if (statusResult.success) {
            merged.status = values.status
          } else {
            message.warning('账户信息已更新，但状态修改失败：' + (statusResult.errorMessage || '未知错误'))
            ok = false
          }
        }
        // 积分不在此编辑：变动只能走「积分管理」页的单用户增减（补偿/扣除全量走积分流水留痕）
        onSaved(merged)
        if (!ok) return // 部分失败：弹窗保持打开，失败项可单独重试（重提交幂等）
      }
      message.success(MODAL_TITLE[module].replace('编辑', '') + '已保存')
      form.resetFields()
      onClose()
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={module ? MODAL_TITLE[module] : ''}
      open={open && !!module}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      confirmLoading={submitting}
      onOk={handleSubmit}
      okText="保存"
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        {module === 'basic' && (
          <>
            <Form.Item name="nickname" label="昵称" rules={[{ max: 30, message: '昵称不超过30字' }]}>
              <Input placeholder="请输入昵称" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="手机号"
              rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', validateTrigger: 'onBlur' }]}
            >
              <Input placeholder="请输入手机号" maxLength={20} />
            </Form.Item>
            <Form.Item label="头像">
              <Space direction="vertical" align="center">
                <Avatar size={72} src={avatarUrl} icon={<UserOutlined />} />
                <Upload beforeUpload={handleAvatarUpload} showUploadList={false} accept="image/*">
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    {avatarUrl ? '更换头像' : '上传头像'}
                  </Button>
                </Upload>
              </Space>
            </Form.Item>
          </>
        )}

        {module === 'profile' && (
          <>
            <Form.Item name="gender" label="性别">
              <Select placeholder="请选择性别" allowClear>
                <Select.Option value="男">男</Select.Option>
                <Select.Option value="女">女</Select.Option>
                <Select.Option value="保密">保密</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="birthday" label="生日">
              <DatePicker style={{ width: '100%' }} placeholder="请选择生日" />
            </Form.Item>
            <Form.Item name="height" label="身高 (cm)">
              <InputNumber min={50} max={250} style={{ width: '100%' }} placeholder="请输入身高" />
            </Form.Item>
            <Form.Item name="location" label="所在地">
              <Input placeholder="请输入所在地" />
            </Form.Item>
            <Form.Item name="occupation" label="职业">
              <Input placeholder="请输入职业" />
            </Form.Item>
            <Form.Item name="company" label="公司">
              <Input placeholder="请输入公司" />
            </Form.Item>
            <Form.Item
              name="website"
              label="个人网站"
              rules={[{ type: 'url', message: '请输入有效的网址', validateTrigger: 'onBlur' }]}
            >
              <Input placeholder="请输入个人网站" />
            </Form.Item>
            <Form.Item name="bio" label="个人简介">
              <Input.TextArea rows={3} placeholder="请输入个人简介" maxLength={500} showCount />
            </Form.Item>
          </>
        )}

        {module === 'account' && (
          <>
            <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
              <Select options={roleOptions} placeholder="请选择角色" />
            </Form.Item>
            <Form.Item name="member_level" label="会员等级" rules={[{ required: true, message: '请选择会员等级' }]}>
              <Select options={levelOptions} placeholder="请选择会员等级" />
            </Form.Item>
            <Form.Item name="status" label="状态" tooltip="状态变更走独立端点，保存时一并提交">
              <Select options={statusOptions} placeholder="请选择状态" />
            </Form.Item>
            {/* 可用积分不在此编辑：积分变动只能走「积分管理」页的单用户增减
                （补偿/扣除），全量生成 point_records 流水留痕 */}
          </>
        )}
      </Form>
    </Modal>
  )
}

// ==================== 重置密码弹窗（基本信息分区入口） ====================

interface UserResetPasswordModalProps {
  open: boolean
  user: User | null
  onClose: () => void
  onSaved: () => void
}

export const UserResetPasswordModal: React.FC<UserResetPasswordModalProps> = ({
  open,
  user,
  onClose,
  onSaved,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!user || submitting) return
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const result = await userService.update(user.id, { password: values.password })
      if (!result.success) {
        message.error(result.errorMessage || '重置密码失败')
        return
      }
      message.success('密码已重置')
      form.resetFields()
      onSaved()
      onClose()
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={`重置密码${user ? ` - ${user.nickname || user.email}` : ''}`}
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      confirmLoading={submitting}
      onOk={handleSubmit}
      okText="重置"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="password"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, max: 16, message: '密码长度为 6~16 位' },
          ]}
        >
          <Input.Password placeholder="请输入新密码（6~16 位）" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="确认新密码"
          dependencies={['password']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || value === getFieldValue('password')
                  ? Promise.resolve()
                  : Promise.reject(new Error('两次输入的密码不一致')),
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default UserModuleEditModal
