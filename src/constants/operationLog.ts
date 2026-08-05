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
