// ==================== 操作日志 ====================

export const ACTION_MAP: Record<string, { color: string; label: string }> = {
  create: { color: 'green', label: '创建' },
  update: { color: 'blue', label: '更新' },
  delete: { color: 'red', label: '删除' },
  read: { color: 'default', label: '查询' },
  create_user: { color: 'green', label: '创建用户' },
  update_user: { color: 'blue', label: '更新用户' },
  delete_user: { color: 'red', label: '删除用户' },
  toggle_user_status: { color: 'orange', label: '切换用户状态' },
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

export const OP_MODULE_MAP: Record<string, { color: string; label: string }> = {
  user: { color: 'blue', label: '用户' },
  users: { color: 'blue', label: '用户' },
  system: { color: 'purple', label: '系统' },
  novel: { color: 'green', label: '小说' },
  content: { color: 'orange', label: '内容' },
}

export const OP_MODULE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(OP_MODULE_MAP).map(([k, v]) => [k, v.label])
)

export const MODULE_OPTIONS = [
  { label: '用户', value: 'user' },
  { label: '系统', value: 'system' },
  { label: '小说', value: 'novel' },
  { label: '内容', value: 'content' },
]
