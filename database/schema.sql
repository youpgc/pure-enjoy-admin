-- ============================================================
-- 纯享App后台管理系统 - 完整数据库表结构 (统一版)
-- 支持100万用户规模
-- 创建时间: 2024
-- ============================================================

-- ============================================================
-- 第一部分：扩展和工具函数
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
-- 第二部分：基础表 - 角色和权限
-- ============================================================

-- 2.1 角色表
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

-- 2.2 权限表
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

-- 2.3 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

COMMENT ON TABLE role_permissions IS '角色权限关联表';

-- ============================================================
-- 第三部分：用户表
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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 用户表updated_at触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 第四部分：业务数据表
-- ============================================================

-- 4.1 消费记录表
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    note TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- 约束
    CONSTRAINT valid_amount CHECK (amount >= 0),
    CONSTRAINT valid_expense_category CHECK (category IN ('餐饮', '交通', '购物', '娱乐', '其他'))
);

COMMENT ON TABLE expenses IS '消费记录表';
COMMENT ON COLUMN expenses.category IS '分类：餐饮/交通/购物/娱乐/其他';

-- 消费记录表索引
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);

-- 消费记录表updated_at触发器
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4.2 心情日记表
CREATE TABLE IF NOT EXISTS mood_diaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood VARCHAR(20) NOT NULL,
    mood_label VARCHAR(50),
    content TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- 约束
    CONSTRAINT valid_mood CHECK (mood IN ('开心', '平静', '一般', '难过', '焦虑'))
);

COMMENT ON TABLE mood_diaries IS '心情日记表';
COMMENT ON COLUMN mood_diaries.mood IS '心情：开心/平静/一般/难过/焦虑';

-- 心情日记表索引
CREATE INDEX IF NOT EXISTS idx_mood_diaries_user_id ON mood_diaries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_diaries_date ON mood_diaries(date);
CREATE INDEX IF NOT EXISTS idx_mood_diaries_user_date ON mood_diaries(user_id, date);

-- 心情日记表updated_at触发器
DROP TRIGGER IF EXISTS update_mood_diaries_updated_at ON mood_diaries;
CREATE TRIGGER update_mood_diaries_updated_at
    BEFORE UPDATE ON mood_diaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4.3 体重记录表
CREATE TABLE IF NOT EXISTS weight_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL,
    bmi DECIMAL(4,2),
    body_fat DECIMAL(4,2),
    note TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- 约束
    CONSTRAINT valid_weight CHECK (weight > 0 AND weight < 1000),
    CONSTRAINT valid_bmi CHECK (bmi IS NULL OR (bmi >= 0 AND bmi <= 100)),
    CONSTRAINT valid_body_fat CHECK (body_fat IS NULL OR (body_fat >= 0 AND body_fat <= 100))
);

COMMENT ON TABLE weight_records IS '体重记录表';

-- 体重记录表索引
CREATE INDEX IF NOT EXISTS idx_weight_records_user_id ON weight_records(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_date ON weight_records(date);
CREATE INDEX IF NOT EXISTS idx_weight_records_user_date ON weight_records(user_id, date);

-- 体重记录表updated_at触发器
DROP TRIGGER IF EXISTS update_weight_records_updated_at ON weight_records;
CREATE TRIGGER update_weight_records_updated_at
    BEFORE UPDATE ON weight_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4.4 笔记表
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category VARCHAR(50),
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE notes IS '笔记表';
COMMENT ON COLUMN notes.is_pinned IS '是否置顶';

-- 笔记表索引
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_user_pinned ON notes(user_id, is_pinned DESC);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);

-- 笔记表updated_at触发器
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4.5 小说表
CREATE TABLE IF NOT EXISTS novels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100),
    source VARCHAR(100),
    source_url TEXT,
    cover_url TEXT,
    description TEXT,
    category VARCHAR(50),
    tags TEXT[],
    word_count INTEGER DEFAULT 0,
    chapter_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ongoing' NOT NULL,
    is_free BOOLEAN DEFAULT TRUE NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    rating DECIMAL(2,1),
    read_count INTEGER DEFAULT 0 NOT NULL,
    collect_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- 约束
    CONSTRAINT valid_novel_status CHECK (status IN ('ongoing', 'completed')),
    CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
    CONSTRAINT valid_novel_price CHECK (price >= 0)
);

COMMENT ON TABLE novels IS '小说表';
COMMENT ON COLUMN novels.user_id IS '所属用户ID（书架），NULL表示公共小说';
COMMENT ON COLUMN novels.status IS '状态：ongoing-连载中，completed-已完结';
COMMENT ON COLUMN novels.is_free IS '是否免费';

-- 小说表索引
CREATE INDEX IF NOT EXISTS idx_novels_user_id ON novels(user_id);
CREATE INDEX IF NOT EXISTS idx_novels_category ON novels(category);
CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status);
CREATE INDEX IF NOT EXISTS idx_novels_is_free ON novels(is_free);
CREATE INDEX IF NOT EXISTS idx_novels_tags ON novels USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_novels_read_count ON novels(read_count DESC);
CREATE INDEX IF NOT EXISTS idx_novels_collect_count ON novels(collect_count DESC);

-- 小说表updated_at触发器
DROP TRIGGER IF EXISTS update_novels_updated_at ON novels;
CREATE TRIGGER update_novels_updated_at
    BEFORE UPDATE ON novels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4.6 小说章节表
CREATE TABLE IF NOT EXISTS novel_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_num INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT TRUE NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- 约束
    CONSTRAINT unique_chapter UNIQUE (novel_id, chapter_num),
    CONSTRAINT valid_chapter_price CHECK (price >= 0)
);

COMMENT ON TABLE novel_chapters IS '小说章节表';
COMMENT ON COLUMN novel_chapters.is_free IS '章节是否免费';

-- 小说章节表索引
CREATE INDEX IF NOT EXISTS idx_novel_chapters_novel_id ON novel_chapters(novel_id);
CREATE INDEX IF NOT EXISTS idx_novel_chapters_chapter_num ON novel_chapters(novel_id, chapter_num);

-- 4.7 用户书架关联表
CREATE TABLE IF NOT EXISTS user_novels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    progress DECIMAL(5,4) DEFAULT 0 NOT NULL,
    last_chapter INTEGER DEFAULT 0 NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE,
    is_collected BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- 约束
    CONSTRAINT unique_user_novel UNIQUE (user_id, novel_id),
    CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 1)
);

COMMENT ON TABLE user_novels IS '用户书架关联表';
COMMENT ON COLUMN user_novels.progress IS '阅读进度 0-1';
COMMENT ON COLUMN user_novels.is_collected IS '是否收藏';

-- 用户书架关联表索引
CREATE INDEX IF NOT EXISTS idx_user_novels_user_id ON user_novels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_novels_novel_id ON user_novels(novel_id);
CREATE INDEX IF NOT EXISTS idx_user_novels_collected ON user_novels(user_id, is_collected);

-- 用户书架关联表updated_at触发器
DROP TRIGGER IF EXISTS update_user_novels_updated_at ON user_novels;
CREATE TRIGGER update_user_novels_updated_at
    BEFORE UPDATE ON user_novels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4.8 App版本表
CREATE TABLE IF NOT EXISTS app_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    build_number INTEGER NOT NULL,
    release_type VARCHAR(20) NOT NULL,
    release_notes TEXT,
    apk_url TEXT,
    apk_size INTEGER,
    status VARCHAR(20) DEFAULT 'draft' NOT NULL,
    released_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by VARCHAR(32) REFERENCES users(id) ON DELETE SET NULL,

    -- 约束
    CONSTRAINT valid_release_type CHECK (release_type IN ('hotfix', 'feature', 'force')),
    CONSTRAINT valid_version_status CHECK (status IN ('draft', 'released', 'revoked')),
    CONSTRAINT unique_version_build UNIQUE (version, build_number)
);

COMMENT ON TABLE app_versions IS 'App版本表';
COMMENT ON COLUMN app_versions.release_type IS '发布类型：hotfix-热修复，feature-功能更新，force-强制更新';
COMMENT ON COLUMN app_versions.status IS '状态：draft-草稿，released-已发布，revoked-已撤销';

-- App版本表索引
CREATE INDEX IF NOT EXISTS idx_app_versions_status ON app_versions(status);
CREATE INDEX IF NOT EXISTS idx_app_versions_created_at ON app_versions(created_at DESC);

-- 4.9 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50),
    target_id VARCHAR(100),
    details JSONB,
    ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE operation_logs IS '操作日志表';
COMMENT ON COLUMN operation_logs.action IS '操作类型';
COMMENT ON COLUMN operation_logs.target_id IS '操作目标ID';

-- 操作日志表索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_module ON operation_logs(module);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);
CREATE INDEX IF NOT EXISTS idx_operation_logs_details ON operation_logs USING GIN(details);

-- ============================================================
-- 第五部分：初始数据
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

-- ============================================================
-- 第六部分：Row Level Security (RLS) 策略
-- ============================================================

-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE novel_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- 创建辅助函数：检查用户角色
-- 注意：auth.uid() 返回 UUID，需要转换为 TEXT 与 VARCHAR(32) 比较
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()::TEXT
        AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()::TEXT
        AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR(20) AS $$
DECLARE
    user_role VARCHAR(20);
BEGIN
    SELECT role INTO user_role
    FROM users
    WHERE id = auth.uid()::TEXT;
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 6.1 用户表 RLS 策略
-- ============================================================

CREATE POLICY "用户可以查看自己的信息" ON users
    FOR SELECT
    USING (id = auth.uid()::TEXT);

CREATE POLICY "管理员可以查看所有用户" ON users
    FOR SELECT
    USING (is_admin());

CREATE POLICY "用户可以更新自己的信息" ON users
    FOR UPDATE
    USING (id = auth.uid()::TEXT);

CREATE POLICY "管理员可以更新所有用户" ON users
    FOR UPDATE
    USING (is_admin());

CREATE POLICY "超级管理员可以插入用户" ON users
    FOR INSERT
    WITH CHECK (is_super_admin() OR id = auth.uid()::TEXT);

CREATE POLICY "超级管理员可以删除用户" ON users
    FOR DELETE
    USING (is_super_admin());

-- ============================================================
-- 6.2 消费记录表 RLS 策略
-- ============================================================

CREATE POLICY "用户可以查看自己的消费记录" ON expenses
    FOR SELECT
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以创建自己的消费记录" ON expenses
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以更新自己的消费记录" ON expenses
    FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以删除自己的消费记录" ON expenses
    FOR DELETE
    USING (user_id = auth.uid()::TEXT OR is_admin());

-- ============================================================
-- 6.3 心情日记表 RLS 策略
-- ============================================================

CREATE POLICY "用户可以查看自己的心情日记" ON mood_diaries
    FOR SELECT
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以创建自己的心情日记" ON mood_diaries
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以更新自己的心情日记" ON mood_diaries
    FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以删除自己的心情日记" ON mood_diaries
    FOR DELETE
    USING (user_id = auth.uid()::TEXT OR is_admin());

-- ============================================================
-- 6.4 体重记录表 RLS 策略
-- ============================================================

CREATE POLICY "用户可以查看自己的体重记录" ON weight_records
    FOR SELECT
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以创建自己的体重记录" ON weight_records
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以更新自己的体重记录" ON weight_records
    FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以删除自己的体重记录" ON weight_records
    FOR DELETE
    USING (user_id = auth.uid()::TEXT OR is_admin());

-- ============================================================
-- 6.5 笔记表 RLS 策略
-- ============================================================

CREATE POLICY "用户可以查看自己的笔记" ON notes
    FOR SELECT
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以创建自己的笔记" ON notes
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以更新自己的笔记" ON notes
    FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以删除自己的笔记" ON notes
    FOR DELETE
    USING (user_id = auth.uid()::TEXT OR is_admin());

-- ============================================================
-- 6.6 小说表 RLS 策略
-- ============================================================

-- 小说比较特殊：公共小说所有人可见，私有小说只有拥有者可见
CREATE POLICY "用户可以查看公共小说和自己的小说" ON novels
    FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "管理员可以创建小说" ON novels
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "管理员可以更新小说" ON novels
    FOR UPDATE
    USING (is_admin());

CREATE POLICY "超级管理员可以删除小说" ON novels
    FOR DELETE
    USING (is_super_admin());

-- ============================================================
-- 6.7 小说章节表 RLS 策略
-- ============================================================

CREATE POLICY "用户可以查看小说章节" ON novel_chapters
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM novels
            WHERE novels.id = novel_chapters.novel_id
            AND (novels.user_id IS NULL OR novels.user_id = auth.uid()::TEXT OR is_admin())
        )
    );

CREATE POLICY "管理员可以管理小说章节" ON novel_chapters
    FOR ALL
    USING (is_admin());

-- ============================================================
-- 6.8 用户书架关联表 RLS 策略
-- ============================================================

CREATE POLICY "用户可以查看自己的书架" ON user_novels
    FOR SELECT
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以添加小说到书架" ON user_novels
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以更新自己的阅读进度" ON user_novels
    FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以从书架移除小说" ON user_novels
    FOR DELETE
    USING (user_id = auth.uid()::TEXT OR is_admin());

-- ============================================================
-- 6.9 App版本表 RLS 策略
-- ============================================================

-- 所有用户可以查看已发布的版本
CREATE POLICY "所有用户可以查看已发布的版本" ON app_versions
    FOR SELECT
    USING (status = 'released' OR is_admin());

CREATE POLICY "管理员可以管理版本" ON app_versions
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "管理员可以更新版本" ON app_versions
    FOR UPDATE
    USING (is_admin());

CREATE POLICY "超级管理员可以删除版本" ON app_versions
    FOR DELETE
    USING (is_super_admin());

-- ============================================================
-- 6.10 操作日志表 RLS 策略
-- ============================================================

CREATE POLICY "管理员可以查看操作日志" ON operation_logs
    FOR SELECT
    USING (is_admin());

CREATE POLICY "系统可以插入操作日志" ON operation_logs
    FOR INSERT
    WITH CHECK (is_admin() OR user_id = auth.uid()::TEXT);

-- ============================================================
-- 第七部分：视图和存储过程
-- ============================================================

-- 7.1 用户统计视图
CREATE OR REPLACE VIEW user_stats AS
SELECT
    u.id,
    u.nickname,
    u.role,
    u.member_level,
    u.status,
    COUNT(DISTINCT e.id) as expense_count,
    COUNT(DISTINCT md.id) as mood_count,
    COUNT(DISTINCT wr.id) as weight_count,
    COUNT(DISTINCT n.id) as note_count,
    COUNT(DISTINCT un.id) as novel_count,
    u.created_at,
    u.last_login_at
FROM users u
LEFT JOIN expenses e ON u.id = e.user_id
LEFT JOIN mood_diaries md ON u.id = md.user_id
LEFT JOIN weight_records wr ON u.id = wr.user_id
LEFT JOIN notes n ON u.id = n.user_id
LEFT JOIN user_novels un ON u.id = un.user_id
GROUP BY u.id;

-- 7.2 系统概览视图
CREATE OR REPLACE VIEW system_overview AS
SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_count,
    (SELECT COUNT(*) FROM users WHERE member_level != 'normal') as member_count,
    (SELECT COUNT(*) FROM expenses) as total_expenses,
    (SELECT COUNT(*) FROM mood_diaries) as total_mood_diaries,
    (SELECT COUNT(*) FROM weight_records) as total_weight_records,
    (SELECT COUNT(*) FROM notes) as total_notes,
    (SELECT COUNT(*) FROM novels) as total_novels,
    (SELECT COUNT(*) FROM app_versions WHERE status = 'released') as released_versions;

-- 7.3 每日活跃统计视图
CREATE OR REPLACE VIEW daily_stats AS
SELECT
    DATE(created_at) as date,
    (SELECT COUNT(*) FROM users u WHERE DATE(u.created_at) = DATE(e.created_at)) as new_users,
    COUNT(DISTINCT e.user_id) as active_users,
    COUNT(*) as expense_count,
    (SELECT COUNT(*) FROM mood_diaries md WHERE DATE(md.created_at) = DATE(e.created_at)) as mood_count,
    (SELECT COUNT(*) FROM weight_records wr WHERE DATE(wr.created_at) = DATE(e.created_at)) as weight_count,
    (SELECT COUNT(*) FROM notes n WHERE DATE(n.created_at) = DATE(e.created_at)) as note_count
FROM expenses e
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 7.4 创建用户存储过程
CREATE OR REPLACE FUNCTION create_user(
    p_id VARCHAR(32),
    p_email VARCHAR(255),
    p_phone VARCHAR(20),
    p_password_hash VARCHAR(255),
    p_nickname VARCHAR(50),
    p_avatar_url TEXT,
    p_register_ip VARCHAR(45)
)
RETURNS VARCHAR(32) AS $$
BEGIN
    INSERT INTO users (id, email, phone, password_hash, nickname, avatar_url, register_ip)
    VALUES (p_id, p_email, p_phone, p_password_hash, p_nickname, p_avatar_url, p_register_ip);
    RETURN p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.5 更新用户登录信息存储过程
CREATE OR REPLACE FUNCTION update_login_info(
    p_user_id VARCHAR(32),
    p_login_ip VARCHAR(45)
)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET last_login_ip = p_login_ip,
        last_login_at = NOW(),
        login_count = login_count + 1
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.6 记录操作日志存储过程
CREATE OR REPLACE FUNCTION log_operation(
    p_user_id VARCHAR(32),
    p_action VARCHAR(100),
    p_module VARCHAR(50),
    p_target_id VARCHAR(100),
    p_details JSONB,
    p_ip VARCHAR(45),
    p_user_agent TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO operation_logs (user_id, action, module, target_id, details, ip, user_agent)
    VALUES (p_user_id, p_action, p_module, p_target_id, p_details, p_ip, p_user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.7 获取用户权限列表函数
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id VARCHAR(32))
RETURNS TABLE(name VARCHAR(100), display_name VARCHAR(100), module VARCHAR(50), action VARCHAR(20)) AS $$
BEGIN
    RETURN QUERY
    SELECT p.name, p.display_name, p.module, p.action
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN roles r ON rp.role_id = r.id
    JOIN users u ON u.role = r.name
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7.8 检查用户是否有特定权限
CREATE OR REPLACE FUNCTION has_permission(p_user_id VARCHAR(32), p_permission_name VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        JOIN users u ON u.role = r.name
        WHERE u.id = p_user_id AND p.name = p_permission_name
    ) INTO has_perm;

    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 第八部分：性能优化索引（补充）
-- ============================================================

-- 复合索引优化常用查询
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_member_level ON users(member_level);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date_category ON expenses(user_id, date, category);
CREATE INDEX IF NOT EXISTS idx_mood_diaries_user_mood ON mood_diaries(user_id, mood);
CREATE INDEX IF NOT EXISTS idx_weight_records_user_date_desc ON weight_records(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_created_desc ON notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_novels_status_created ON novels(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_created ON operation_logs(user_id, created_at DESC);

-- ============================================================
-- 第九部分：数据清理和维护
-- ============================================================

-- 创建清理过期会话的函数（可选，用于定时任务）
CREATE OR REPLACE FUNCTION clean_old_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM operation_logs
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建更新统计数据的函数
CREATE OR REPLACE FUNCTION update_novel_stats(p_novel_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE novels
    SET chapter_count = (
        SELECT COUNT(*) FROM novel_chapters WHERE novel_id = p_novel_id
    ),
    word_count = (
        SELECT COALESCE(SUM(word_count), 0) FROM novel_chapters WHERE novel_id = p_novel_id
    )
    WHERE id = p_novel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：章节变更时自动更新小说统计
CREATE OR REPLACE FUNCTION update_novel_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_novel_stats(NEW.novel_id);
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM update_novel_stats(NEW.novel_id);
        IF NEW.novel_id != OLD.novel_id THEN
            PERFORM update_novel_stats(OLD.novel_id);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_novel_stats(OLD.novel_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_novel_stats ON novel_chapters;
CREATE TRIGGER trigger_update_novel_stats
    AFTER INSERT OR UPDATE OR DELETE ON novel_chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_novel_stats_trigger();

-- ============================================================
-- 完成提示
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '纯享App数据库表结构创建完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已创建的表：';
    RAISE NOTICE '  - roles (角色表)';
    RAISE NOTICE '  - permissions (权限表)';
    RAISE NOTICE '  - role_permissions (角色权限关联表)';
    RAISE NOTICE '  - users (用户表)';
    RAISE NOTICE '  - expenses (消费记录表)';
    RAISE NOTICE '  - mood_diaries (心情日记表)';
    RAISE NOTICE '  - weight_records (体重记录表)';
    RAISE NOTICE '  - notes (笔记表)';
    RAISE NOTICE '  - novels (小说表)';
    RAISE NOTICE '  - novel_chapters (小说章节表)';
    RAISE NOTICE '  - user_novels (用户书架关联表)';
    RAISE NOTICE '  - app_versions (App版本表)';
    RAISE NOTICE '  - operation_logs (操作日志表)';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已创建的视图：';
    RAISE NOTICE '  - user_stats (用户统计视图)';
    RAISE NOTICE '  - system_overview (系统概览视图)';
    RAISE NOTICE '  - daily_stats (每日活跃统计视图)';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已启用的功能：';
    RAISE NOTICE '  - RLS (Row Level Security)';
    RAISE NOTICE '  - updated_at 自动更新触发器';
    RAISE NOTICE '  - 小说统计自动更新触发器';
    RAISE NOTICE '========================================';
END $$;
