-- ============================================================
-- 纯享 App 扩展功能数据库表结构
-- 执行顺序：请按照本文档中的顺序依次执行
-- 说明：此 SQL 文件包含收藏夹、提醒事项、习惯打卡三个扩展功能所需的表
-- 注意：users.id 为 VARCHAR(32)，所以所有 user_id 外键均为 VARCHAR(32)
--       auth.uid() 返回 UUID，需要 ::TEXT 转换后与 VARCHAR 比较
-- ============================================================

-- ============================================================
-- 1. 收藏夹表 (user_favorites)
-- 用途：存储用户的收藏内容（文章、视频、链接等）
-- ============================================================
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_category ON user_favorites(category);
CREATE INDEX IF NOT EXISTS idx_favorites_is_pinned ON user_favorites(is_pinned);

-- 创建更新时间触发器函数（所有表共用）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_favorites_updated_at ON user_favorites;
CREATE TRIGGER update_favorites_updated_at
    BEFORE UPDATE ON user_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 启用 RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（auth.uid()::TEXT 与 VARCHAR(32) 的 user_id 比较）
DROP POLICY IF EXISTS "Users can view own favorites" ON user_favorites;
CREATE POLICY "Users can view own favorites"
    ON user_favorites FOR SELECT
    USING (user_id = auth.uid()::TEXT);

DROP POLICY IF EXISTS "Users can insert own favorites" ON user_favorites;
CREATE POLICY "Users can insert own favorites"
    ON user_favorites FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT);

DROP POLICY IF EXISTS "Users can update own favorites" ON user_favorites;
CREATE POLICY "Users can update own favorites"
    ON user_favorites FOR UPDATE
    USING (user_id = auth.uid()::TEXT);

DROP POLICY IF EXISTS "Users can delete own favorites" ON user_favorites;
CREATE POLICY "Users can delete own favorites"
    ON user_favorites FOR DELETE
    USING (user_id = auth.uid()::TEXT);

-- 管理员可以查看所有收藏
DROP POLICY IF EXISTS "Admin can view all favorites" ON user_favorites;
CREATE POLICY "Admin can view all favorites"
    ON user_favorites FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));

-- ============================================================
-- 2. 提醒事项表 (user_reminders)
-- 用途：存储用户的提醒事项和待办任务
-- ============================================================
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON user_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_is_completed ON user_reminders(is_completed);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON user_reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_priority ON user_reminders(priority);

-- 创建更新时间触发器
DROP TRIGGER IF EXISTS update_reminders_updated_at ON user_reminders;
CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON user_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 启用 RLS
ALTER TABLE user_reminders ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
DROP POLICY IF EXISTS "Users can view own reminders" ON user_reminders;
CREATE POLICY "Users can view own reminders"
    ON user_reminders FOR SELECT
    USING (user_id = auth.uid()::TEXT);

DROP POLICY IF EXISTS "Users can insert own reminders" ON user_reminders;
CREATE POLICY "Users can insert own reminders"
    ON user_reminders FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT);

DROP POLICY IF EXISTS "Users can update own reminders" ON user_reminders;
CREATE POLICY "Users can update own reminders"
    ON user_reminders FOR UPDATE
    USING (user_id = auth.uid()::TEXT);

DROP POLICY IF EXISTS "Users can delete own reminders" ON user_reminders;
CREATE POLICY "Users can delete own reminders"
    ON user_reminders FOR DELETE
    USING (user_id = auth.uid()::TEXT);

-- 管理员可以查看所有提醒
DROP POLICY IF EXISTS "Admin can view all reminders" ON user_reminders;
CREATE POLICY "Admin can view all reminders"
    ON user_reminders FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));

-- ============================================================
-- 3. 习惯打卡表 (user_habits)
-- 用途：存储用户的习惯追踪数据
-- ============================================================
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON user_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_is_active ON user_habits(is_active);
CREATE INDEX IF NOT EXISTS idx_habits_frequency ON user_habits(frequency);

-- 创建更新时间触发器
DROP TRIGGER IF EXISTS update_habits_updated_at ON user_habits;
CREATE TRIGGER update_habits_updated_at
    BEFORE UPDATE ON user_habits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 启用 RLS
ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
DROP POLICY IF EXISTS "Users can view own habits" ON user_habits;
CREATE POLICY "Users can view own habits"
    ON user_habits FOR SELECT
    USING (user_id = auth.uid()::TEXT);

DROP POLICY IF EXISTS "Users can insert own habits" ON user_habits;
CREATE POLICY "Users can insert own habits"
    ON user_habits FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT);

DROP POLICY IF EXISTS "Users can update own habits" ON user_habits;
CREATE POLICY "Users can update own habits"
    ON user_habits FOR UPDATE
    USING (user_id = auth.uid()::TEXT);

DROP POLICY IF EXISTS "Users can delete own habits" ON user_habits;
CREATE POLICY "Users can delete own habits"
    ON user_habits FOR DELETE
    USING (user_id = auth.uid()::TEXT);

-- 管理员可以查看所有习惯
DROP POLICY IF EXISTS "Admin can view all habits" ON user_habits;
CREATE POLICY "Admin can view all habits"
    ON user_habits FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));

-- ============================================================
-- 4. 习惯打卡记录表 (habit_checkins)
-- 用途：存储用户的每日打卡记录
-- ============================================================
CREATE TABLE IF NOT EXISTS habit_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
    checkin_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_checkins_habit_id ON habit_checkins(habit_id);
CREATE INDEX IF NOT EXISTS idx_checkins_checkin_at ON habit_checkins(checkin_at);

-- 启用 RLS
ALTER TABLE habit_checkins ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（通过 habit 关联到用户）
DROP POLICY IF EXISTS "Users can view own checkins" ON habit_checkins;
CREATE POLICY "Users can view own checkins"
    ON habit_checkins FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_habits
        WHERE user_habits.id = habit_checkins.habit_id
        AND user_habits.user_id = auth.uid()::TEXT
    ));

DROP POLICY IF EXISTS "Users can insert own checkins" ON habit_checkins;
CREATE POLICY "Users can insert own checkins"
    ON habit_checkins FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_habits
        WHERE user_habits.id = habit_checkins.habit_id
        AND user_habits.user_id = auth.uid()::TEXT
    ));

DROP POLICY IF EXISTS "Users can delete own checkins" ON habit_checkins;
CREATE POLICY "Users can delete own checkins"
    ON habit_checkins FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM user_habits
        WHERE user_habits.id = habit_checkins.habit_id
        AND user_habits.user_id = auth.uid()::TEXT
    ));

-- 管理员可以查看所有打卡记录
DROP POLICY IF EXISTS "Admin can view all checkins" ON habit_checkins;
CREATE POLICY "Admin can view all checkins"
    ON habit_checkins FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));

-- ============================================================
-- 5. 添加注释说明
-- ============================================================
COMMENT ON TABLE user_favorites IS '用户收藏夹表';
COMMENT ON TABLE user_reminders IS '用户提醒事项表';
COMMENT ON TABLE user_habits IS '用户习惯打卡表';
COMMENT ON TABLE habit_checkins IS '习惯打卡记录表';

-- ============================================================
-- SQL 执行完成
-- ============================================================
-- 请确认以下检查项：
-- 1. 所有表已成功创建
-- 2. 所有索引已成功创建
-- 3. 所有触发器已成功创建
-- 4. 所有 RLS 策略已成功启用
-- 5. 在 Supabase Dashboard 中验证表结构
-- ============================================================
