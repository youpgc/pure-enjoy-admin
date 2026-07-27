// ==================== 权限系统 ====================

export const ROLE_STATUS_LABELS: Record<string, string> = {
  active: '启用',
  disabled: '禁用',
}

export const ROLE_STATUS_COLORS: Record<string, string> = {
  active: 'green',
  disabled: 'red',
}

// 角色状态枚举单一源（避免页面硬编码 'active' / 'disabled'）
export const ROLE_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const

export const PERMISSION_TYPE_LABELS: Record<string, string> = {
  menu: '菜单',
  action: '操作',
}

export const MODULE_DISPLAY_NAMES: Record<string, string> = {
  users: '用户中心',
  content: '内容管理',
  life: '生活服务',
  operations: '运营管理',
  system: '系统设置',
  dashboard: '数据概览',
  expenses: '消费记录',
  moods: '心情日记',
  weights: '体重记录',
  notes: '笔记本',
  novels: '小说管理',
  versions: '版本管理',
  feedback: '问题反馈',
  announcements: '公告管理',
}

export const MODULE_COLORS: Record<string, string> = {
  users: '#1890ff',
  content: '#52c41a',
  life: '#faad14',
  operations: '#722ed1',
  system: '#f5222d',
  dashboard: '#13c2c2',
  expenses: '#eb2f96',
  moods: '#fa8c16',
  weights: '#a0d911',
  notes: '#2f54eb',
  novels: '#fa541c',
  versions: '#13c2c2',
  feedback: '#1890ff',
  announcements: '#52c41a',
}
