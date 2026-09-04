import type { Dayjs } from 'dayjs'
import sha256 from 'crypto-js/sha256'
import type { User, UserFormData } from '../../types/user'
import { supabase } from '../../utils/supabase'

// 处理 birthday：string 或 Dayjs -> YYYY-MM-DD 字符串；空返回 null
export function formatBirthday(birthday: Dayjs | string | null | undefined): string | null {
  if (!birthday) return null
  if (typeof birthday === 'string') return birthday
  return birthday.format('YYYY-MM-DD')
}

// 构造新建用户对象（不含 id/created_at/updated_at）
export function buildNewUser(formData: UserFormData): Omit<User, 'id' | 'created_at' | 'updated_at'> {
  const birthdayValue = formatBirthday(formData.birthday)
  const passwordHash = sha256(formData.password ?? '').toString()
  return {
    email: formData.email,
    phone: formData.phone || null,
    password_hash: passwordHash,
    nickname: formData.nickname || null,
    avatar_url: formData.avatar_url || null,
    // 扩展资料字段
    username: formData.username || null,
    bio: formData.bio || null,
    gender: formData.gender || null,
    birthday: birthdayValue,
    location: formData.location || null,
    occupation: formData.occupation || null,
    company: formData.company || null,
    website: formData.website || null,
    height: formData.height ?? null,
    role: formData.role,
    member_level: formData.member_level,
    // 新建用户展示列默认 0；若设置初始积分，下方 addPointRecord + recalcUserPoints 会重算回写（无触发器）
    points: 0,
    effective_points: 0,
    available_points: 0,
    expiring_points: 0,
    consecutive_checkin_days: 0,
    last_checkin_date: null,
    tts_speech_rate: null,
    tts_timer_minutes: null,
    tts_playback_mode: null,
    tts_enabled: true,
    status: formData.status,
    register_ip: null,
    last_login_ip: null,
    last_login_at: null,
    login_count: 0,
  }
}

// 构造更新用户对象（不含 id；密码哈希按需追加）
export function buildUpdateUser(formData: UserFormData): Partial<User> {
  const birthdayValue = formatBirthday(formData.birthday)
  const updateData: Partial<User> = {
    phone: formData.phone || null,
    nickname: formData.nickname || null,
    avatar_url: formData.avatar_url || null,
    // 扩展资料字段
    username: formData.username || null,
    bio: formData.bio || null,
    gender: formData.gender || null,
    birthday: birthdayValue,
    location: formData.location || null,
    occupation: formData.occupation || null,
    company: formData.company || null,
    website: formData.website || null,
    height: formData.height ?? null,
    role: formData.role,
    member_level: formData.member_level,
    status: formData.status,
  }
  if (formData.password) {
    updateData.password_hash = sha256(formData.password).toString()
  }
  return updateData
}

/**
 * 同步创建 Supabase Auth 用户（仅管理员操作，确保 App 端可用邮箱+密码登录）
 *
 * 安全说明（治理红线）：service_role 绝不下发到前端。原实现用
 * import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY 直调 /auth/v1/admin/users，
 * 该 key 会被 Vite 打进浏览器 bundle（泄露 + 绕过 RLS），已回滚多次。
 * 现改为数据库 RPC（create_auth_user，SECURITY DEFINER）创建 auth.users：
 *   - 密钥仅存在于数据库函数内，永不进前端 bundle；
 *   - 函数内部用 JWT 角色声明校验，非管理员拒绝（errcode 42501）；
 *   - 需先在 Supabase SQL Editor 执行 fix_create_auth_user_rpc.sql 迁移。
 * 调用失败仅告警、不抛错，保证 public.users 主流程不受影响（逻辑闭环、可灰度）。
 */
export async function createAuthUser(user: User, plainPassword: string) {
  try {
    const { error } = await supabase.rpc('create_auth_user', {
      p_email: user.email,
      p_password: plainPassword,
      p_phone: user.phone || null,
      p_user_metadata: {
        app_user_id: user.id,
        username: user.username || null,
        nickname: user.nickname || null,
        role: user.role,
      },
    } as any)
    if (error) {
      console.warn('auth.users 同步失败（请确认已执行 create_auth_user RPC 迁移）:', error.message)
    }
  } catch (err) {
    console.warn('auth.users 同步异常:', err)
  }
}
