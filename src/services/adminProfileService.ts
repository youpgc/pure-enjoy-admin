import { supabase, handleSupabaseError } from '../utils/supabase'

export interface ProfileData {
  nickname: string
  avatar_url: string
}

/**
 * 更新当前管理员自身资料（昵称 / 头像），写入 auth.users.user_metadata。
 * ⚠️ 仅存 auth.user_metadata（展示用），不应作为业务权限 / 角色判定依据（详见 App.tsx InlineAuthProvider 注释）。
 */
export async function updateProfile(data: ProfileData): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { nickname: data.nickname, avatar_url: data.avatar_url },
  })
  if (error) throw new Error(handleSupabaseError(error, 'updateProfile'))
}

/**
 * 修改密码：先用当前密码 reauth 验证身份，再 updateUser 设置新密码。
 * reauth 复用 signInWithPassword（全版本兼容），失败即视为当前密码错误。
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('无法获取当前登录邮箱')
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (reauthError) throw new Error('当前密码错误，请重新输入')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(handleSupabaseError(error, 'changePassword'))
}

/**
 * 修改邮箱：updateUser 设置新邮箱，Supabase 会向新邮箱发送确认邮件，确认后生效。
 */
export async function changeEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) throw new Error(handleSupabaseError(error, 'changeEmail'))
}

/**
 * 上传头像到 Supabase Storage 公共桶 public，返回公开 URL（复用 UserFormModal 口径）。
 */
export async function uploadAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请上传图片文件')
  if (file.size > 2 * 1024 * 1024) throw new Error('图片大小不能超过 2MB')
  const fileExt = file.name.split('.').pop()
  const fileName = `avatars/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
  const { error } = await supabase.storage.from('public').upload(fileName, file)
  if (error) throw new Error(handleSupabaseError(error, 'uploadAvatar'))
  const { data: { publicUrl } } = supabase.storage.from('public').getPublicUrl(fileName)
  return publicUrl
}
