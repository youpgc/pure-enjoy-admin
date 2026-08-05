// ==================== 操作日志 ====================
//
// OP_MODULE_MAP 覆盖所有可能写入 operation_logs.module 的值来源：
//   A) BaseService.audit() → this.tableName（各 Service / 页面实例化时的表名）
//   B) 直接 logOperation() 调用（rankingService / useUsers 等）
//   C) reportError() → 'api' 或上下文字符串
//   D) supabase 全局拦截器 → URL 推导表名 / 'unknown'
//   E) 历史遗留泛化值（user/users/system/novel/content）
//
// 新增表名时必须同步本映射，否则最近活动/操作日志/错误日志会回退显示原始英文。

import { SENSITIVE_CATEGORY_MAP, SENSITIVE_LEVEL_MAP, SENSITIVE_MATCH_MODE_MAP } from './sensitive'

export const ACTION_MAP: Record<string, { color: string; label: string }> = {
  create: { color: 'green', label: '创建' },
  update: { color: 'blue', label: '更新' },
  delete: { color: 'red', label: '删除' },
  read: { color: 'default', label: '查询' },
  create_user: { color: 'green', label: '创建用户' },
  update_user: { color: 'blue', label: '更新用户' },
  delete_user: { color: 'red', label: '删除用户' },
  toggle_user_status: { color: 'orange', label: '切换用户状态' },
  batch_delete: { color: 'red', label: '批量删除' },
}

export const ACTION_LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ACTION_MAP).map(([k, v]) => [k, v.label])
)

export const ACTION_OPTIONS = [
  { label: '创建', value: 'create' },
  { label: '更新', value: 'update' },
  { label: '删除', value: 'delete' },
  { label: '查询', value: 'read' },
]

/** 按业务域分组（与菜单结构对齐）的完整模块映射表 */
export const OP_MODULE_MAP: Record<string, { color: string; label: string }> = {
  // ── 用户中心 ──
  users: { color: 'blue', label: '用户管理' },
  point_records: { color: 'blue', label: '积分记录' },

  // ── 内容管理 ──
  novels: { color: 'green', label: '小说管理' },
  novel_comments: { color: 'green', label: '评论管理' },
  user_novels: { color: 'green', label: '书架管理' },
  bookmarks: { color: 'green', label: '阅读进度' },
  annotations: { color: 'green', label: '批注管理' },
  sensitive_words: { color: 'orange', label: '敏感词管理' },
  user_feedback: { color: 'orange', label: '问题反馈' },
  recommendations: { color: 'geekblue', label: '推荐管理' },

  // ── 生活服务 ──
  expenses: { color: 'cyan', label: '消费记录' },
  mood_diaries: { color: 'cyan', label: '心情日记' },
  weight_records: { color: 'cyan', label: '体重记录' },
  notes: { color: 'cyan', label: '笔记本' },
  user_favorites: { color: 'cyan', label: '收藏夹' },
  reminders: { color: 'cyan', label: '提醒事项' },
  habits: { color: 'cyan', label: '习惯打卡' },
  habit_checkins: { color: 'cyan', label: '打卡记录' },
  user_anniversaries: { color: 'cyan', label: '纪念日' },

  // ── 运营管理 ──
  versions: { color: 'magenta', label: '版本管理' },
  notifications: { color: 'magenta', label: '通知管理' },
  announcements: { color: 'magenta', label: '公告管理' },
  ranking_interventions: { color: 'magenta', label: '排行干预' },
  ranking_rules: { color: 'magenta', label: '排行规则' },

  // ── 系统设置 ──
  roles: { color: 'purple', label: '角色权限' },
  permissions: { color: 'purple', label: '权限配置' },
  operation_logs: { color: 'purple', label: '操作日志' },
  error_logs: { color: 'purple', label: '错误日志' },
  files: { color: 'purple', label: '文件管理' },
  dict_management: { color: 'purple', label: '字典管理' },
  app_configs: { color: 'purple', label: '配置管理' },
  system_monitor: { color: 'purple', label: '系统监控' },

  // ── TTS ──
  tts_management: { color: 'volcano', label: '听书管理' },

  // ── 历史遗留泛化值（旧代码写入的粗粒度 module，保留兼容）──
  user: { color: 'blue', label: '用户' },
  system: { color: 'purple', label: '系统' },
  novel: { color: 'green', label: '小说' },
  content: { color: 'orange', label: '内容' },

  // ── 系统 / 错误上报专用 ──
  api: { color: 'default', label: '接口请求' },
  unknown: { color: 'default', label: '未知模块' },
}

/** 仅取 label 的便捷视图（供 RecentActivities 等轻量场景） */
export const OP_MODULE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(OP_MODULE_MAP).map(([k, v]) => [k, v.label])
)

/** 全量 public 表名 → 中文名，与 src/types/database.ts 的 40 张表一一对应。
 *  供系统监控「数据规模 / 全表扫描热点」把真实表名翻译成中文释义；
 *  调用处对未命中项回退显示原始英文表名，不丢信息。
 *  注意：OP_MODULE_MAP 是「审计模块」映射（键名与真实表名有错位且不全），
 *        本表才是真实表名的权威中文映射，请勿混用。 */
export const TABLE_NAME_MAP: Record<string, string> = {
  admin_users: '后台管理员',
  announcements: '公告管理',
  app_configs: '应用配置',
  app_versions: '版本管理',
  dict_items: '字典项',
  dict_types: '字典类型',
  error_logs: '错误日志',
  expenses: '消费记录',
  feedback_flow_records: '反馈流转记录',
  files: '文件管理',
  habit_checkins: '打卡记录',
  habits: '习惯打卡',
  mood_diaries: '心情日记',
  notes: '笔记本',
  notifications: '通知管理',
  novel_annotations: '小说批注',
  novel_bookmarks: '小说书签',
  novel_chapters: '小说章节',
  novel_comments: '小说评论',
  novels: '小说管理',
  operation_logs: '操作日志',
  permissions: '权限配置',
  point_records: '积分记录',
  reading_history: '阅读历史',
  reminder_schedules: '提醒计划',
  reminders: '提醒事项',
  role_permissions: '角色权限关联',
  roles: '角色权限',
  sensitive_word_configs: '敏感词配置',
  sensitive_word_logs: '敏感词命中日志',
  sensitive_words: '敏感词',
  system_configs: '系统配置',
  tts_playback_logs: '听书播放日志',
  user_anniversaries: '纪念日',
  user_favorites: '收藏夹',
  user_feedback: '问题反馈',
  user_novels: '书架管理',
  user_recommendation_feedback: '推荐反馈',
  users: '用户管理',
  weight_records: '体重记录',

  // ── 物化视图（get_table_stats RPC 会把 MV 一并返回，需单独登记中文名）──
  mv_novel_chapters_index: '小说章节索引',
  mv_novel_rankings: '小说排行榜',
}

/** 模块中文名（回退链：OP_MODULE_MAP → TABLE_NAME_MAP → 原始英文）。
 *  保证任何写入 operation_logs.module 的值都有可读中文，审查 P3-2。 */
export function getModuleLabel(module: string): string {
  return OP_MODULE_MAP[module]?.label || TABLE_NAME_MAP[module] || module
}

/** 模块颜色（回退链：OP_MODULE_MAP → 默认蓝）。 */
export function getModuleColor(module: string): string {
  return OP_MODULE_MAP[module]?.color || 'blue'
}

/** 操作日志筛选下拉选项（按业务域分组展示） */
export const MODULE_OPTIONS = [
  { label: '用户管理', value: 'users' },
  { label: '积分记录', value: 'point_records' },
  { label: '小说管理', value: 'novels' },
  { label: '评论管理', value: 'novel_comments' },
  { label: '书架管理', value: 'user_novels' },
  { label: '敏感词管理', value: 'sensitive_words' },
  { label: '问题反馈', value: 'user_feedback' },
  { label: '消费记录', value: 'expenses' },
  { label: '心情日记', value: 'mood_diaries' },
  { label: '体重记录', value: 'weight_records' },
  { label: '笔记本', value: 'notes' },
  { label: '收藏夹', value: 'user_favorites' },
  { label: '提醒事项', value: 'reminders' },
  { label: '习惯打卡', value: 'habits' },
  { label: '纪念日', value: 'user_anniversaries' },
  { label: '版本管理', value: 'versions' },
  { label: '通知管理', value: 'notifications' },
  { label: '公告管理', value: 'announcements' },
  { label: '角色权限', value: 'roles' },
  { label: '文件管理', value: 'files' },
  { label: '字典管理', value: 'dict_management' },
  { label: '配置管理', value: 'app_configs' },
  { label: '操作日志', value: 'operation_logs' },
  { label: '错误日志', value: 'error_logs' },
]

// ==================== 操作内容枚举翻译 ====================
//
// 操作日志「操作内容」列对删除/更新快照中的枚举值做中文翻译。
// 按「模块(真实表名) -> 字段 -> 枚举值 -> 中文」三级映射，避免同名异义字段跨表误翻
// （如 category/level 仅对 sensitive_words 有意义，不能对所有表套用）。
// 枚举标签一律复用 constants 既有映射（禁止硬编码）；未命中回退原始值，不丢信息。
// 新增需要翻译的枚举：在此登记对应模块的字段即可（value 须与既有映射一致）。

/** 把 { value: { color, label } } 形式的枚举映射压成 value -> label，便于翻译查表 */
function enumToLabelMap(map: Record<string, { label: string }>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [value, { label }] of Object.entries(map)) out[value] = label
  return out
}

export const DETAIL_ENUM_MAP: Record<string, Record<string, Record<string, string>>> = {
  sensitive_words: {
    category: enumToLabelMap(SENSITIVE_CATEGORY_MAP),
    level: enumToLabelMap(SENSITIVE_LEVEL_MAP),
    match_mode: enumToLabelMap(SENSITIVE_MATCH_MODE_MAP),
  },
}
