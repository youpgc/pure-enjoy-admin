/**
 * 用户显示名统一口径（全后台唯一实现，2026-09-15 立）
 *
 * 背景（2026-09-15 排查）：用户 ID 统一为 auth uuid 后，后台各处**自行拼装**用户显示名，
 * 出现 6 种口径 / 4 种兜底：
 *   · `UserName`（共享组件，9 处）      username → nickname → 原始 ID
 *   · `GameRewardRecords` 自建          nickname → **phone** → id.slice(0,8)
 *   · `useUserDimension`                username → nickname → '-'
 *   · `useDashboard`                    nickname → **原始 ID**
 *   · `Feedback/columns`                nickname → **用户{id 前 6 位}**
 *   · `CheckinManagement`               nickname → username → '未知用户'
 * 结果：同一用户在不同页面显示不同，且多处把**原始 ID**（uuid / 旧业务 ID）当用户名展示，
 * 表现为「用户名列展示为原来的 id」——信息重复且对人不友好（原始 ID 应由「用户ID」列承载）。
 *
 * 统一规则（本文件为唯一真相，改动口径只改这里）：
 *   ① 有效映射：`username` → `nickname`
 *      —— 与共享组件既有口径一致（不改已认可的表现）；两者都空则进入 ②
 *   ② 语义标签命中（`SEMANTIC_LABELS`：system / admin / __no_session__ …）→ 中文展示名
 *      —— 这些是**业务语义标识**而非人名，直接展示英文等于「未转译」
 *      （如 `feedback_flow_records.operator_id = 'system'` 应显示「系统」）
 *   ③ 机器码形态（uuid / 旧业务 ID `U+数字` / 纯数字内部 ID，如 `'1'`）→ 「未知用户」
 *      —— 不再把机器码当人名；原始值仍可通过悬停提示（`<UserName>` 的 Tooltip）与
 *      「用户ID」列看到，不丢线索
 *   ④ 其它无法解析的文本 → 原样展示（宁可显示原文，也不臆造）
 *   ⑤ 空值 → '-'
 *
 * ⚠️ 实测数据（2026-09-15，`fix_v2_uid_residue_20260915.sql` 执行结果）证明 ②③ 都必要：
 *   error_logs.user_id 有 192 行 = `'1'`（内部数字 ID 残留，非人名）；
 *   feedback_flow_records.operator_id 有 2 行 `'system'`、3 行 `'1'`；
 *   point_records.operator_id 1 行 `'1'`；sensitive_words.created_by 3 行 `'admin'`。
 *   这些值既不是 uuid 也不是旧业务 ID，却是**典型的机器码/英文标识**。
 */

/** 展示用的最小用户信息结构（`useUsernames` 的 `UserInfo` 结构上满足） */
export interface UserDisplayInfo {
  username?: string | null
  nickname?: string | null
}

/** 未解析出用户时的占位文案 */
export const UNKNOWN_USER_LABEL = '未知用户'

/**
 * 语义标签 → 中文展示名。
 *
 * 这些值出现在身份列里但**不是用户 ID**：是写入方留下的固定标识
 * （后台操作人为系统自动流转 / 管理员 / 无会话兜底）。
 * 不翻译就会以英文原样出现在「用户名 / 操作人」列，属「未正确展示转译后文案」。
 */
const SEMANTIC_LABELS: Record<string, string> = {
  system: '系统',
  admin: '管理员',
  __no_session__: '未登录操作',
}

/**
 * 机器码形态：都不是人名。
 * - uuid：现用户 ID 形态（2026-09-14 统一后）
 * - `U+数字`：旧业务 ID 形态（已废弃，历史数据可能有）
 * - 纯数字：更早期的内部自增 ID 残留（实测 `error_logs.user_id = '1'` 192 行）
 *
 * 注：纯数字一律视为机器码（含手机号形态）——用户名列不该把号码当人名展示，
 * 原始值仍可从「用户ID」列 / 悬停提示获取。
 */
const MACHINE_CODE_RE =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|U[0-9]{10,}|[0-9]+)$/i

/** 是否为「机器码」形态（uuid / 旧业务 ID / 纯数字内部 ID） */
export function isRawUserId(value?: string | null): boolean {
  const v = (value ?? '').trim()
  return v.length > 0 && MACHINE_CODE_RE.test(v)
}

/**
 * 账号标识形态：**邮箱 / 手机号**。
 *
 * 用于登录日志的「用户名」列——该列在不同时期写入的内容不同：
 * 归因成功时是用户名，归因失败时回落为**用户输入的登录账号**（手机号/邮箱）。
 * 把账号标识当人名展示就是用户反馈的「用户名列为手机号」。
 *
 * 注意与 `isRawUserId` 的区别：后者只覆盖 uuid / 旧业务 ID / 纯数字，
 * 不含邮箱；而邮箱形态同样不是人名。
 */
const ACCOUNT_IDENTIFIER_RE = /^(?:[^@\s]+@[^@\s]+\.[^@\s]+|1[3-9][0-9]{9})$/

/** 是否为「账号标识」形态（邮箱 / 手机号） */
export function isAccountIdentifier(value?: string | null): boolean {
  const v = (value ?? '').trim()
  return v.length > 0 && ACCOUNT_IDENTIFIER_RE.test(v)
}

/**
 * 计算列表/详情中展示的用户名。
 *
 * @param value 行上的用户标识（`user_id` / `operator_id` / `created_by` 等）
 * @param info  由 `useUsernames` 解析出的用户信息（无则视为未解析）
 */
export function userDisplayName(
  value?: string | null,
  info?: UserDisplayInfo | null,
): string {
  const raw = (value ?? '').trim()
  if (!raw) return '-'
  const name = info?.username?.trim() || info?.nickname?.trim()
  if (name) return name
  const semantic = SEMANTIC_LABELS[raw.toLowerCase()]
  if (semantic) return semantic
  return isRawUserId(raw) ? UNKNOWN_USER_LABEL : raw
}
