-- ============================================================
-- 纯享App后台管理系统 - 第二部分：用户表
-- 执行顺序：在 part1 之后执行
-- ============================================================

-- 3.1 用户表
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(32) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    nickname VARCHAR(50),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    member_level VARCHAR(20) DEFAULT 'normal' NOT NULL,
    points INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    register_ip VARCHAR(45),
    last_login_ip VARCHAR(45),
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- 约束
    CONSTRAINT valid_role CHECK (role IN ('user', 'admin', 'super_admin')),
    CONSTRAINT valid_member_level CHECK (member_level IN ('normal', 'member', 'super_member')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'abnormal', 'disabled', 'banned'))
);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.id IS '用户ID，格式：U + 时间戳(10位) + 随机码(6位) + 校验码(2位)';
COMMENT ON COLUMN users.role IS '角色：user-普通用户，admin-管理员，super_admin-超级管理员';
COMMENT ON COLUMN users.member_level IS '会员等级：normal-普通，member-会员，super_member-超级会员';
COMMENT ON COLUMN users.status IS '状态：active-正常，abnormal-异常，disabled-禁用，banned-封禁';

-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 用户表updated_at触发器
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
