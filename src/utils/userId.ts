/**
 * 用户 ID 工具（2026-09-14 双 ID 统一后瘦身）
 *
 * users.id ≡ auth uuid；旧 U 前缀业务 ID 的生成/校验/时间戳提取逻辑已删除。
 * 建号占位 id 由调用方用 crypto.randomUUID() 生成（仅满足 users 行 PK 非空），
 * 云端触发器建 auth 号时会把 users.id 统一改写为 auth uuid。
 */

/**
 * 构建 users 表查询的 id 过滤串。
 * 统一后所有 users.id 均为 uuid 形态，恒走 id 过滤；原「双键解析 or」
 * 适配层已无必要，保留函数以兼容 useUsernames / useUserDimension /
 * dashboardService 三个调用方的签名。
 *
 * @param ids 用户 ID 列表（非空）
 */
export function buildUserLookupOr(ids: string[]): string {
  return `id.in.(${ids.join(',')})`
}
