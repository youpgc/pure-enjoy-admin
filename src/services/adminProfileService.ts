// 管理员自助资料服务 —— 全部走本地后端，Supabase 依赖已移除。
// 资料持久化于 admin_users（nickname/avatar_url/email），改密走服务端 BCrypt 校验。
import { apiRequest, apiUpload, API_BASE_URL } from '../utils/adminHttp'
import type { AdminMe } from '../utils/adminSession'

export interface ProfileData {
  nickname: string
  avatar_url: string
  username?: string
  phone?: string
  gender?: string
  height?: number
  email?: string
}

/// PUT /auth/profile 出参即最新主体
type ProfileResult = AdminMe

/**
 * 更新当前管理员自身资料（昵称/头像/邮箱）。
 * ⚠️ username/phone/gender/height 不在 admin_users 模型内，服务端不落库；
 *    表单如仍展示这些字段，仅作为本地输入不持久化（后续随表单精简移除）。
 */
export async function updateProfile(data: ProfileData): Promise<void> {
  await apiRequest<ProfileResult>('PUT', '/auth/profile', {
    nickname: data.nickname,
    avatar_url: data.avatar_url,
    email: data.email || undefined,
  })
}

/**
 * 修改密码：服务端先验当前密码（BCrypt）再落新密码哈希。
 * 注意：后端全局 SNAKE_CASE，入参字段为 current_password / new_password。
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest<void>('PUT', '/auth/password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}

/**
 * 修改邮箱：随资料更新同端点提交（服务端做全表唯一性校验，立即生效，无验证邮件流程）。
 * 保留独立函数以兼容 Profile 页既有调用。
 */
export async function changeEmail(newEmail: string): Promise<void> {
  await apiRequest<ProfileResult>('PUT', '/auth/profile', { email: newEmail })
}

/**
 * 上传头像到本地后端文件服务（category=avatar），返回公开读取 URL。
 * 公开读仅限 avatar 类目（/files/public/{id}/content，服务端强校验类目）。
 */
export async function uploadAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请上传图片文件')
  if (file.size > 2 * 1024 * 1024) throw new Error('图片大小不能超过 2MB')
  const form = new FormData()
  form.append('file', file)
  form.append('category', 'avatar')
  // apiUpload：JWT 注入 + 401 静默续期重放（裸 fetch 在会话过期时直接失败）
  const meta = await apiUpload<{ id: string }>('/files/upload', form)
  if (!meta?.id) throw new Error('头像上传失败：服务端未返回文件标识')
  return `${API_BASE_URL}/files/public/${meta.id}/content`
}
