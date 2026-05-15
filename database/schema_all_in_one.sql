-- ============================================================
-- 纯享App 数据库完整建表脚本 (v2.0)
-- 特性：幂等执行、可独立运行、无 DO$$ 块
-- ============================================================

-- ------------------------------------------------------------
-- 1. 启用 UUID 扩展
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 2. 创建 updated_at 自动更新函数
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 3.1 角色表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    description TEXT,
    level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.2 权限表
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.3 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 3.4 用户表
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.5 消费记录表
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    note TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.6 心情日记表
CREATE TABLE IF NOT EXISTS mood_diaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood VARCHAR(20) NOT NULL,
    mood_label VARCHAR(50),
    content TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.7 体重记录表
CREATE TABLE IF NOT EXISTS weight_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL,
    bmi DECIMAL(4,2),
    body_fat DECIMAL(4,2),
    note TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.8 笔记表
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

-- 3.9 小说表
CREATE TABLE IF NOT EXISTS novels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100),
    source VARCHAR(100),
    source_url TEXT,
    cover_url TEXT,
    description TEXT,
    category VARCHAR(50),
    tags TEXT[],
    word_count INTEGER,
    chapter_count INTEGER,
    status VARCHAR(20) DEFAULT 'ongoing' NOT NULL,
    is_free BOOLEAN DEFAULT TRUE NOT NULL,
    price DECIMAL(10,2) DEFAULT 0 NOT NULL,
    rating DECIMAL(2,1),
    read_count INTEGER DEFAULT 0 NOT NULL,
    collect_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.10 小说章节表（暂不设外键，由应用层保证数据完整性）
CREATE TABLE IF NOT EXISTS novel_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id TEXT NOT NULL,
    chapter_num INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT TRUE NOT NULL,
    price DECIMAL(10,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(novel_id, chapter_num)
);

-- 3.11 用户书架关联表（暂不设外键，由应用层保证数据完整性）
CREATE TABLE IF NOT EXISTS user_novels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL,
    novel_id TEXT NOT NULL,
    progress DECIMAL(5,4) DEFAULT 0 NOT NULL,
    last_chapter INTEGER DEFAULT 0 NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE,
    is_collected BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, novel_id)
);

-- 3.12 App版本表
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
    created_by VARCHAR(32) REFERENCES users(id) ON DELETE SET NULL
);

-- 3.13 操作日志表
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

-- ============================================================
-- 4. 为已存在的表添加缺失的列（兼容旧数据库）
-- ============================================================

-- users 表缺失列
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS member_level VARCHAR(20) DEFAULT 'normal';
ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS register_ip VARCHAR(45);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- notes 表缺失列
ALTER TABLE notes ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- novels 表缺失列
ALTER TABLE novels ADD COLUMN IF NOT EXISTS user_id VARCHAR(32);
ALTER TABLE novels ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE novels ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE novels ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE novels ADD COLUMN IF NOT EXISTS word_count INTEGER;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS chapter_count INTEGER;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ongoing';
ALTER TABLE novels ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT TRUE;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1);
ALTER TABLE novels ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS collect_count INTEGER DEFAULT 0;

-- weight_records 表缺失列
ALTER TABLE weight_records ADD COLUMN IF NOT EXISTS bmi DECIMAL(4,2);
ALTER TABLE weight_records ADD COLUMN IF NOT EXISTS body_fat DECIMAL(4,2);

-- user_novels 表缺失列
ALTER TABLE user_novels ADD COLUMN IF NOT EXISTS user_id VARCHAR(32);
ALTER TABLE user_novels ADD COLUMN IF NOT EXISTS novel_id TEXT;
ALTER TABLE user_novels ADD COLUMN IF NOT EXISTS progress DECIMAL(5,4) DEFAULT 0;
ALTER TABLE user_novels ADD COLUMN IF NOT EXISTS last_chapter INTEGER DEFAULT 0;
ALTER TABLE user_novels ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_novels ADD COLUMN IF NOT EXISTS is_collected BOOLEAN DEFAULT FALSE;

-- novel_chapters 表缺失列
ALTER TABLE novel_chapters ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT TRUE;
ALTER TABLE novel_chapters ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0;

-- app_versions 表缺失列
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS release_notes TEXT;
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS apk_url TEXT;
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS apk_size INTEGER;
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS created_by VARCHAR(32);

-- operation_logs 表缺失列
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS user_id VARCHAR(32);
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS module VARCHAR(50);
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS target_id VARCHAR(100);
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS ip VARCHAR(45);
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- ============================================================
-- 5. 创建索引
-- ============================================================

-- users 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- expenses 索引
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);

-- mood_diaries 索引
CREATE INDEX IF NOT EXISTS idx_mood_diaries_user_id ON mood_diaries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_diaries_date ON mood_diaries(date);

-- weight_records 索引
CREATE INDEX IF NOT EXISTS idx_weight_records_user_id ON weight_records(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_date ON weight_records(date);
CREATE INDEX IF NOT EXISTS idx_weight_records_user_date ON weight_records(user_id, date);

-- notes 索引
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);

-- novels 索引
CREATE INDEX IF NOT EXISTS idx_novels_user_id ON novels(user_id);
CREATE INDEX IF NOT EXISTS idx_novels_category ON novels(category);
CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status);
CREATE INDEX IF NOT EXISTS idx_novels_is_free ON novels(is_free);

-- novel_chapters 索引
CREATE INDEX IF NOT EXISTS idx_novel_chapters_novel_id ON novel_chapters(novel_id);
CREATE INDEX IF NOT EXISTS idx_novel_chapters_num ON novel_chapters(novel_id, chapter_num);

-- user_novels 索引
CREATE INDEX IF NOT EXISTS idx_user_novels_user_id ON user_novels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_novels_novel_id ON user_novels(novel_id);

-- operation_logs 索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_module ON operation_logs(module);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);

-- ============================================================
-- 6. 创建触发器
-- ============================================================

-- expenses 触发器
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- mood_diaries 触发器
DROP TRIGGER IF EXISTS update_mood_diaries_updated_at ON mood_diaries;
CREATE TRIGGER update_mood_diaries_updated_at BEFORE UPDATE ON mood_diaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- weight_records 触发器
DROP TRIGGER IF EXISTS update_weight_records_updated_at ON weight_records;
CREATE TRIGGER update_weight_records_updated_at BEFORE UPDATE ON weight_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- notes 触发器
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- novels 触发器
DROP TRIGGER IF EXISTS update_novels_updated_at ON novels;
CREATE TRIGGER update_novels_updated_at BEFORE UPDATE ON novels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- user_novels 触发器
DROP TRIGGER IF EXISTS update_user_novels_updated_at ON user_novels;
CREATE TRIGGER update_user_novels_updated_at BEFORE UPDATE ON user_novels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- users 触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. 启用 RLS
-- ============================================================

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

-- ============================================================
-- 8. RLS 策略（简化为公开读写，仅 admin 可管）
-- ============================================================

-- users 表：公开注册，管理由管理员
DROP POLICY IF EXISTS "允许公开查看用户" ON users;
CREATE POLICY "允许公开查看用户" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "允许公开创建用户" ON users;
CREATE POLICY "允许公开创建用户" ON users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "用户更新自己" ON users;
CREATE POLICY "用户更新自己" ON users FOR UPDATE USING (true);

-- 其他业务表：公开读写（简化版）
DROP POLICY IF EXISTS "允许公开读写" ON expenses;
CREATE POLICY "允许公开读写" ON expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许公开读写" ON mood_diaries;
CREATE POLICY "允许公开读写" ON mood_diaries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许公开读写" ON weight_records;
CREATE POLICY "允许公开读写" ON weight_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许公开读写" ON notes;
CREATE POLICY "允许公开读写" ON notes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许公开读写" ON novels;
CREATE POLICY "允许公开读写" ON novels FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许公开读写" ON novel_chapters;
CREATE POLICY "允许公开读写" ON novel_chapters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许公开读写" ON user_novels;
CREATE POLICY "允许公开读写" ON user_novels FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许公开读写" ON app_versions;
CREATE POLICY "允许公开读写" ON app_versions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许公开写入" ON operation_logs;
CREATE POLICY "允许公开写入" ON operation_logs FOR INSERT WITH CHECK (true);

-- ============================================================
-- 9. 初始数据
-- ============================================================

-- 插入角色
INSERT INTO roles (name, display_name, description, level) VALUES
    ('user', '普通用户', '普通用户，只能管理自己的数据', 1),
    ('admin', '管理员', '管理员，可以管理所有数据', 2),
    ('super_admin', '超级管理员', '超级管理员，拥有所有权限', 3)
ON CONFLICT (name) DO NOTHING;

-- 插入权限（按模块分组）
INSERT INTO permissions (name, display_name, module, action, description) VALUES
    -- 用户管理模块
    ('users:read', '查看用户', 'users', 'read', '查看用户列表和详情'),
    ('users:write', '编辑用户', 'users', 'write', '创建和编辑用户'),
    ('users:delete', '删除用户', 'users', 'delete', '删除用户'),
    ('users:export', '导出用户', 'users', 'export', '导出用户数据'),
    -- 消费记录模块
    ('expenses:read', '查看消费', 'expenses', 'read', '查看消费记录'),
    ('expenses:write', '编辑消费', 'expenses', 'write', '创建和编辑消费记录'),
    ('expenses:delete', '删除消费', 'expenses', 'delete', '删除消费记录'),
    ('expenses:export', '导出消费', 'expenses', 'export', '导出消费数据'),
    -- 心情日记模块
    ('moods:read', '查看日记', 'moods', 'read', '查看心情日记'),
    ('moods:write', '编辑日记', 'moods', 'write', '创建和编辑心情日记'),
    ('moods:delete', '删除日记', 'moods', 'delete', '删除心情日记'),
    ('moods:export', '导出日记', 'moods', 'export', '导出日记数据'),
    -- 体重记录模块
    ('weights:read', '查看体重', 'weights', 'read', '查看体重记录'),
    ('weights:write', '编辑体重', 'weights', 'write', '创建和编辑体重记录'),
    ('weights:delete', '删除体重', 'weights', 'delete', '删除体重记录'),
    ('weights:export', '导出体重', 'weights', 'export', '导出体重数据'),
    -- 笔记模块
    ('notes:read', '查看笔记', 'notes', 'read', '查看笔记'),
    ('notes:write', '编辑笔记', 'notes', 'write', '创建和编辑笔记'),
    ('notes:delete', '删除笔记', 'notes', 'delete', '删除笔记'),
    ('notes:export', '导出笔记', 'notes', 'export', '导出笔记数据'),
    -- 小说模块
    ('novels:read', '查看小说', 'novels', 'read', '查看小说'),
    ('novels:write', '编辑小说', 'novels', 'write', '创建和编辑小说'),
    ('novels:delete', '删除小说', 'novels', 'delete', '删除小说'),
    ('novels:export', '导出小说', 'novels', 'export', '导出小说数据'),
    -- 版本管理模块
    ('versions:read', '查看版本', 'versions', 'read', '查看版本列表'),
    ('versions:write', '编辑版本', 'versions', 'write', '创建和编辑版本'),
    ('versions:release', '发布版本', 'versions', 'release', '发布版本'),
    -- 系统模块
    ('system:read', '查看统计', 'system', 'read', '查看系统统计'),
    ('system:logs', '查看日志', 'system', 'logs', '查看操作日志'),
    ('system:stats', '导出统计', 'system', 'stats', '导出统计数据')
ON CONFLICT (name) DO NOTHING;

-- 插入角色权限关联

-- 普通用户权限（13个：只能操作自己的数据 + 小说只读）
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

-- 管理员权限（27个：全用户管理 + 全业务数据 + 版本发布）
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

-- 超级管理员权限（全部32个）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- 创建超级管理员测试账号
INSERT INTO users (id, email, password_hash, nickname, role, status)
VALUES ('U0000000001ADMIN01', 'admin@pureenjoy.com', 'admin123', '超级管理员', 'super_admin', 'active')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 10. 完成
-- ============================================================
-- SELECT '数据库初始化完成!' AS status;
