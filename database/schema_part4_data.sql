-- ============================================================
-- 纯享App后台管理系统 - 第四部分：初始数据
-- 执行顺序：在 part1, part2, part3 之后执行
-- ============================================================

-- 5.1 插入角色数据
INSERT INTO roles (name, display_name, description, level) VALUES
('user', '普通用户', 'App普通用户，只能操作自己的数据', 1),
('admin', '管理员', '后台管理员，可以管理所有用户和业务数据', 2),
('super_admin', '超级管理员', '系统超级管理员，拥有所有权限', 3)
ON CONFLICT (name) DO NOTHING;

-- 5.2 插入权限数据

-- 用户模块权限
INSERT INTO permissions (name, display_name, module, action, description) VALUES
-- 用户模块
('users:read', '查看用户', 'users', 'read', '查看用户列表和详情'),
('users:write', '编辑用户', 'users', 'write', '创建和编辑用户信息'),
('users:delete', '删除用户', 'users', 'delete', '删除用户账号'),
('users:export', '导出用户', 'users', 'read', '导出用户数据'),

-- 消费记录模块
('expenses:read', '查看消费记录', 'expenses', 'read', '查看消费记录列表和详情'),
('expenses:write', '编辑消费记录', 'expenses', 'write', '创建和编辑消费记录'),
('expenses:delete', '删除消费记录', 'expenses', 'delete', '删除消费记录'),
('expenses:export', '导出消费记录', 'expenses', 'read', '导出消费记录数据'),

-- 心情日记模块
('moods:read', '查看心情日记', 'moods', 'read', '查看心情日记列表和详情'),
('moods:write', '编辑心情日记', 'moods', 'write', '创建和编辑心情日记'),
('moods:delete', '删除心情日记', 'moods', 'delete', '删除心情日记'),
('moods:export', '导出心情日记', 'moods', 'read', '导出心情日记数据'),

-- 体重记录模块
('weights:read', '查看体重记录', 'weights', 'read', '查看体重记录列表和详情'),
('weights:write', '编辑体重记录', 'weights', 'write', '创建和编辑体重记录'),
('weights:delete', '删除体重记录', 'weights', 'delete', '删除体重记录'),
('weights:export', '导出体重记录', 'weights', 'read', '导出体重记录数据'),

-- 笔记模块
('notes:read', '查看笔记', 'notes', 'read', '查看笔记列表和详情'),
('notes:write', '编辑笔记', 'notes', 'write', '创建和编辑笔记'),
('notes:delete', '删除笔记', 'notes', 'delete', '删除笔记'),
('notes:export', '导出笔记', 'notes', 'read', '导出笔记数据'),

-- 小说模块
('novels:read', '查看小说', 'novels', 'read', '查看小说列表和详情'),
('novels:write', '编辑小说', 'novels', 'write', '创建和编辑小说'),
('novels:delete', '删除小说', 'novels', 'delete', '删除小说'),
('novels:export', '导出小说', 'novels', 'read', '导出小说数据'),

-- 版本管理模块
('versions:read', '查看版本', 'versions', 'read', '查看App版本列表和详情'),
('versions:write', '编辑版本', 'versions', 'write', '创建和编辑App版本'),
('versions:delete', '删除版本', 'versions', 'delete', '删除App版本'),
('versions:release', '发布版本', 'versions', 'write', '发布和撤销App版本'),

-- 系统管理模块
('system:read', '查看系统设置', 'system', 'read', '查看系统设置和日志'),
('system:write', '编辑系统设置', 'system', 'write', '修改系统设置'),
('system:logs', '查看操作日志', 'system', 'read', '查看系统操作日志'),
('system:stats', '查看统计数据', 'system', 'read', '查看系统统计数据')
ON CONFLICT (name) DO NOTHING;

-- 5.3 插入角色权限关联

-- 普通用户权限（只能操作自己的数据，通过RLS实现）
-- 普通用户在业务表上有基本读写权限，但通过RLS限制只能操作自己的数据
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'user' 
AND p.name IN (
    'expenses:read', 'expenses:write', 'expenses:delete',
    'moods:read', 'moods:write', 'moods:delete',
    'weights:read', 'weights:write', 'weights:delete',
    'notes:read', 'notes:write', 'notes:delete',
    'novels:read'
)
ON CONFLICT DO NOTHING;

-- 管理员权限（可以管理所有用户和业务数据）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin'
AND p.name IN (
    'users:read', 'users:write', 'users:delete', 'users:export',
    'expenses:read', 'expenses:write', 'expenses:delete', 'expenses:export',
    'moods:read', 'moods:write', 'moods:delete', 'moods:export',
    'weights:read', 'weights:write', 'weights:delete', 'weights:export',
    'notes:read', 'notes:write', 'notes:delete', 'notes:export',
    'novels:read', 'novels:write', 'novels:delete', 'novels:export',
    'versions:read', 'versions:write', 'versions:release',
    'system:read', 'system:logs', 'system:stats'
)
ON CONFLICT DO NOTHING;

-- 超级管理员权限（拥有所有权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;
