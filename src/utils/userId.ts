/**
 * 用户ID生成工具
 * ID格式：U + 时间戳(10位) + 随机码(6位) + 校验码(2位)
 * 示例：U1704067200ABC12345
 */

/**
 * 生成校验码
 * @param str 需要计算校验码的字符串
 * @returns 2位校验码
 */
function generateChecksum(str: string): string {
  let sum = 0
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i)
  }
  return (sum % 100).toString().padStart(2, '0')
}

/**
 * 生成用户ID
 * @returns 用户ID字符串
 */
export function generateUserId(): string {
  // 时间戳(10位) - 秒级时间戳
  const timestamp = Math.floor(Date.now() / 1000).toString().padStart(10, '0')
  
  // 随机码(6位) - 大写字母和数字组合
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  
  // 校验码(2位)
  const checksum = generateChecksum(timestamp + random)
  
  return `U${timestamp}${random}${checksum}`
}

/**
 * 验证用户ID格式
 * @param userId 用户ID
 * @returns 是否有效
 */
export function validateUserId(userId: string): boolean {
  // 检查格式：U + 10位数字 + 6位字母数字 + 2位数字
  const pattern = /^U\d{10}[A-Z0-9]{6}\d{2}$/
  if (!pattern.test(userId)) {
    return false
  }
  
  // 验证校验码
  const timestamp = userId.substring(1, 11)
  const random = userId.substring(11, 17)
  const checksum = userId.substring(17, 19)
  const expectedChecksum = generateChecksum(timestamp + random)
  
  return checksum === expectedChecksum
}

/**
 * 从用户ID中提取时间戳
 * @param userId 用户ID
 * @returns Date 对象或 null
 */
export function extractTimestamp(userId: string): Date | null {
  if (!validateUserId(userId)) {
    return null
  }
  
  const timestamp = parseInt(userId.substring(1, 11), 10)
  return new Date(timestamp * 1000)
}

/**
 * 判断字符串是否为标准 UUID（v1~v5，36 位带连字符）。
 * 用于区分「业务ID(U...)」与「auth UUID」，避免把业务ID传入 uuid 类型列导致 22P02。
 */
export function isUuid(value: string | null | undefined): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * 构建 users 表「双键解析」查询的 or 过滤串。
 * - 业务ID（U...，文本列 users.id）走 id 过滤；
 * - 仅 UUID 形态的值走 auth_id（uuid 类型列）过滤。
 * 关键：业务ID 绝不进入 auth_id 过滤，否则 PostgreSQL 解析整个 IN 数组时
 *       因 U... 无法转 uuid 而报 22P02 invalid input syntax for type uuid。
 *
 * @param ids 业务ID 或 UUID 混合列表（非空）
 */
export function buildUserLookupOr(ids: string[]): string {
  const uuidIds = ids.filter(isUuid)
  const idClause = `id.in.(${ids.join(',')})`
  return uuidIds.length ? `${idClause},auth_id.in.(${uuidIds.join(',')})` : idClause
}

