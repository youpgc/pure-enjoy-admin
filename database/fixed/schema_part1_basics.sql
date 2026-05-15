-- ============================================================
-- 纯享App后台管理系统 - 第一部分：基础表
-- 执行顺序：先执行此文件，再执行其他部分
-- ============================================================

-- 启用UUID扩展（Supabase默认已启用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建updated_at自动更新函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 基础表 - 角色和权限
-- ============================================================

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    description TEXT,
    level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE roles IS '角色表';
COMMENT ON COLUMN roles.name IS '角色标识：user/admin/super_admin';
COMMENT ON COLUMN roles.level IS '角色等级：1-普通用户，2-管理员，3-超级管理员';

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE permissions IS '权限表';
COMMENT ON COLUMN permissions.name IS '权限标识，如 users:read, users:write';
COMMENT ON COLUMN permissions.module IS '模块：users/expenses/moods/weights/notes/novels/versions/system';
COMMENT ON COLUMN permissions.action IS '操作类型：read/write/delete';

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

COMMENT ON TABLE role_permissions IS '角色权限关联表';
