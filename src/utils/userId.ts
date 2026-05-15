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
