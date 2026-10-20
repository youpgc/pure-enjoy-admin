import type { Dayjs } from 'dayjs'
import type { UserFormData } from '../../types/user'

// 处理 birthday：string 或 Dayjs -> YYYY-MM-DD 字符串；空返回 null
export function formatBirthday(birthday: Dayjs | string | null | undefined): string | null {
  if (!birthday) return null
  if (typeof birthday === 'string') return birthday
  return birthday.format('YYYY-MM-DD')
}

// 构造创建用户入参（密码明文，由后端 BCrypt 编码；初始积分创建后走积分调整接口）
export function buildNewUser(formData: UserFormData): Record<string, unknown> {
  return {
    email: formData.email,
    password: formData.password,
    phone: formData.phone || null,
    nickname: formData.nickname || null,
    avatar_url: formData.avatar_url || null,
    // 扩展资料字段
    username: formData.username || null,
    bio: formData.bio || null,
    gender: formData.gender || null,
    birthday: formatBirthday(formData.birthday),
    location: formData.location || null,
    occupation: formData.occupation || null,
    company: formData.company || null,
    website: formData.website || null,
    height: formData.height ?? null,
    role: formData.role,
    member_level: formData.member_level,
  }
  // status 不走通用更新：后端 UpdateUserRequest 白名单不含 status，
  // 变更走独立端点 PUT /users/{id}/status（避免弹窗提示成功但状态未变的静默 no-op）
}

// 构造更新用户入参：编辑已拆分为详情抽屉的分区编辑（见 UserModuleEditModal），
// 各分区直接提交白名单字段子集；status 走独立端点，本文件不再提供整表更新构造。
