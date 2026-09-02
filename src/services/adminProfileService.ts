import { supabase, handleSupabaseError, getCurrentBusinessUserId } from '../utils/supabase'

export interface ProfileData {
  nickname: string
  avatar_url: string
  username?: string
  phone?: string
  gender?: string
  height?: number
  email?: string
}

/**
 * 更新当前管理员自身资料：同时写入业务表 public.users（管理员自己的行，用户管理即时可见、App 端一致）
 * 与 auth.users.user_metadata（镜像，供后台即时回显）。
 * - 资料字段（昵称 / 用户名 / 手机号 / 性别 / 身高 / 头像）双写 public.users + user_metadata。
 * - 邮箱：若发生变更，public.users.email 立即同步（用户管理可见），同时由调用方走 changeEmail 触发验证邮件改登录邮箱。
 * ⚠️ 权限 / 角色判定仍以 public.users.role + is_admin RPC 为准，本函数不改 role；邮箱/密码登录逻辑不变。
 */
export async function updateProfile(data: ProfileData): Promise<void> {
  // 1) 业务表 public.users：更新管理员自己的行（RLS：auth_id = auth.uid() 放行，见 diag_users_update_404_v4）
  const businessId = await getCurrentBusinessUserId()

  // 规整：空字符串视为「未填写」写入 NULL，避免 '' 污染 username 唯一索引
  // （PostgreSQL 把 '' 当成一个真实值纳入唯一索引，会与其他空用户名行冲突触发 23505）
  const username = data.username && data.username.trim() ? data.username.trim() : null
  const phone = data.phone && data.phone.trim() ? data.phone.trim() : null

  // 读取自身当前值，用于「排除自己」的唯一性校验（自更新同值不会冲突，仅被其它行占用才冲突）
  const { data: cur } = await (supabase.from('users') as any)
    .select('username, phone')
    .eq('id', businessId)
    .maybeSingle()

  // 唯一性预校验：仅当值非空且与自身当前值不同，避免直接触发 23505，给出可读提示
  if (businessId && username && username !== cur?.username) {
    const { count } = await (supabase.from('users') as any)
      .select('*', { count: 'exact', head: true })
      .eq('username', username)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .neq('id', businessId)
    if (count && count > 0) throw new Error('用户名已存在，请更换其他用户名')
  }
  if (businessId && phone && phone !== cur?.phone) {
    const { count } = await (supabase.from('users') as any)
      .select('*', { count: 'exact', head: true })
      .eq('phone', phone)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .neq('id', businessId)
    if (count && count > 0) throw new Error('手机号已存在，请更换其他手机号')
  }

  if (businessId) {
    const usersUpdate: Record<string, unknown> = {
      nickname: data.nickname,
      avatar_url: data.avatar_url,
      username,
      phone,
      gender: data.gender ?? null,
      height: data.height ?? null,
      updated_at: new Date().toISOString(),
    }
    if (data.email) usersUpdate.email = data.email
    const { error: ue } = await (supabase.from('users') as any).update(usersUpdate).eq('id', businessId)
    if (ue) {
      if (ue.code === '23505') throw new Error('用户名或手机号已被占用，请更换后重试')
      throw new Error(handleSupabaseError(ue, 'updateProfile(users)'))
    }
  }
  // 2) 镜像到 auth.user_metadata（供后台即时回显，不改登录邮箱 / 密码）
  const { error } = await supabase.auth.updateUser({
    data: {
      nickname: data.nickname,
      avatar_url: data.avatar_url,
      username: data.username ?? '',
      phone: data.phone ?? '',
      gender: data.gender ?? '',
      height: data.height,
    },
  })
  if (error) throw new Error(handleSupabaseError(error, 'updateProfile(metadata)'))
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
