-- ============================================================
-- 纯享 App 数据库变更 SQL（完整版）
-- 执行环境：Supabase SQL Editor
-- 执行顺序：请按模块编号顺序执行
-- ============================================================

-- ============================================================
-- 模块1：users 表新增字段
-- 说明：新增 username、sms_code、sms_code_expires_at 字段
-- 注意：如果字段已存在会报错，可忽略 "already exists" 错误
-- ============================================================

-- 1.1 新增 username 字段（用户名，用于用户名登录）
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- 1.2 新增 sms_code 字段（短信验证码）
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code VARCHAR(10);

-- 1.3 新增 sms_code_expires_at 字段（验证码过期时间）
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code_expires_at TIMESTAMPTZ;

-- 1.4 为已有用户生成默认 username（基于邮箱前缀）
UPDATE users SET username = SPLIT_PART(email, '@', 1) 
WHERE username IS NULL;

-- 1.5 添加字段注释
COMMENT ON COLUMN users.username IS '用户名，用于用户名+密码登录';
COMMENT ON COLUMN users.sms_code IS '短信验证码';
COMMENT ON COLUMN users.sms_code_expires_at IS '短信验证码过期时间';

-- 1.6 创建 username 索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);


-- ============================================================
-- 模块2：扩展功能表（收藏夹、提醒事项、习惯打卡）
-- 说明：如果之前已执行过 extension_features.sql，可跳过此模块
-- ============================================================

-- 2.1 收藏夹表
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    url TEXT,
    category VARCHAR(50) DEFAULT 'other',
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_category ON user_favorites(category);
CREATE INDEX IF NOT EXISTS idx_favorites_is_pinned ON user_favorites(is_pinned);

-- 2.2 提醒事项表
CREATE TABLE IF NOT EXISTS user_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    remind_at TIMESTAMPTZ NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON user_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_is_completed ON user_reminders(is_completed);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON user_reminders(remind_at);

-- 2.3 习惯打卡表
CREATE TABLE IF NOT EXISTS user_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(20) DEFAULT 'daily',
    target_days INTEGER DEFAULT 21,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    total_checkins INTEGER DEFAULT 0,
    color VARCHAR(20) DEFAULT 'blue',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON user_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_is_active ON user_habits(is_active);

-- 2.4 习惯打卡记录表
CREATE TABLE IF NOT EXISTS habit_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
    checkin_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_habit_id ON habit_checkins(habit_id);
CREATE INDEX IF NOT EXISTS idx_checkins_checkin_at ON habit_checkins(checkin_at);


-- ============================================================
-- 模块3：更新时间触发器（所有表共用）
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_favorites_updated_at ON user_favorites;
CREATE TRIGGER update_favorites_updated_at
    BEFORE UPDATE ON user_favorites FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reminders_updated_at ON user_reminders;
CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON user_reminders FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_habits_updated_at ON user_habits;
CREATE TRIGGER update_habits_updated_at
    BEFORE UPDATE ON user_habits FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 模块4：RLS 策略（扩展功能表）
-- 说明：由于 App 端不再使用 Supabase Auth，改用自定义认证
--       RLS 策略需要调整为允许通过 anon key + x-user-id 访问
--       或者暂时禁用 RLS 以便 App 端正常访问
-- ============================================================

-- 4.1 收藏夹 RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on user_favorites" ON user_favorites;
CREATE POLICY "Allow all on user_favorites"
    ON user_favorites FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4.2 提醒事项 RLS
ALTER TABLE user_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on user_reminders" ON user_reminders;
CREATE POLICY "Allow all on user_reminders"
    ON user_reminders FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4.3 习惯打卡 RLS
ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on user_habits" ON user_habits;
CREATE POLICY "Allow all on user_habits"
    ON user_habits FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4.4 打卡记录 RLS
ALTER TABLE habit_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on habit_checkins" ON habit_checkins;
CREATE POLICY "Allow all on habit_checkins"
    ON habit_checkins FOR ALL
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- 模块5：调整已有表的 RLS 策略
-- 说明：App 端不再使用 Supabase Auth，需要放宽 RLS 策略
--       使 App 端通过 anon key 也能正常访问数据
-- 注意：这些策略是开放式的，生产环境建议后续接入
--       真正的认证中间件（如 Supabase Edge Functions）
-- ============================================================

-- 5.1 users 表 - 允许查询（登录需要）
DROP POLICY IF EXISTS "Allow select on users" ON users;
CREATE POLICY "Allow select on users"
    ON users FOR SELECT
    USING (true);

-- 5.2 users 表 - 允许插入（注册需要）
DROP POLICY IF EXISTS "Allow insert on users" ON users;
CREATE POLICY "Allow insert on users"
    ON users FOR INSERT
    WITH CHECK (true);

-- 5.3 users 表 - 允许更新（设置验证码等需要）
DROP POLICY IF EXISTS "Allow update on users" ON users;
CREATE POLICY "Allow update on users"
    ON users FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 5.4 expenses 表
DROP POLICY IF EXISTS "Allow all on expenses" ON expenses;
CREATE POLICY "Allow all on expenses"
    ON expenses FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5.5 mood_diaries 表
DROP POLICY IF EXISTS "Allow all on mood_diaries" ON mood_diaries;
CREATE POLICY "Allow all on mood_diaries"
    ON mood_diaries FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5.6 weight_records 表
DROP POLICY IF EXISTS "Allow all on weight_records" ON weight_records;
CREATE POLICY "Allow all on weight_records"
    ON weight_records FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5.7 notes 表
DROP POLICY IF EXISTS "Allow all on notes" ON notes;
CREATE POLICY "Allow all on notes"
    ON notes FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5.8 novels 表
DROP POLICY IF EXISTS "Allow all on novels" ON novels;
CREATE POLICY "Allow all on novels"
    ON novels FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5.9 novel_chapters 表
DROP POLICY IF EXISTS "Allow all on novel_chapters" ON novel_chapters;
CREATE POLICY "Allow all on novel_chapters"
    ON novel_chapters FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5.10 user_novels 表
DROP POLICY IF EXISTS "Allow all on user_novels" ON user_novels;
CREATE POLICY "Allow all on user_novels"
    ON user_novels FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5.11 operation_logs 表
DROP POLICY IF EXISTS "Allow all on operation_logs" ON operation_logs;
CREATE POLICY "Allow all on operation_logs"
    ON operation_logs FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5.12 app_versions 表
DROP POLICY IF EXISTS "Allow all on app_versions" ON app_versions;
CREATE POLICY "Allow all on app_versions"
    ON app_versions FOR ALL
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- 模块6：表注释
-- ============================================================
COMMENT ON TABLE user_favorites IS '用户收藏夹表';
COMMENT ON TABLE user_reminders IS '用户提醒事项表';
COMMENT ON TABLE user_habits IS '用户习惯打卡表';
COMMENT ON TABLE habit_checkins IS '习惯打卡记录表';


-- ============================================================
-- SQL 执行完成
-- ============================================================
-- 验证清单：
-- [1] users 表新增 username、sms_code、sms_code_expires_at 字段
-- [2] user_favorites、user_reminders、user_habits、habit_checkins 表已创建
-- [3] 所有索引已创建
-- [4] 所有触发器已创建
-- [5] RLS 策略已调整为允许 anon key 访问
-- [6] 在 Supabase Dashboard 中验证表结构
-- ============================================================
