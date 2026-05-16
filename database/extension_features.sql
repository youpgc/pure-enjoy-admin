-- 扩展功能表：收藏夹
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    url TEXT,
    category VARCHAR(50),
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 扩展功能表：日程提醒
CREATE TABLE IF NOT EXISTS user_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 扩展功能表：习惯打卡
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
    color VARCHAR(20) DEFAULT '#1890FF',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 习惯打卡记录
CREATE TABLE IF NOT EXISTS habit_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(habit_id, checkin_date)
);

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_category ON user_favorites(category);
CREATE INDEX IF NOT EXISTS idx_user_favorites_is_pinned ON user_favorites(is_pinned);

CREATE INDEX IF NOT EXISTS idx_user_reminders_user_id ON user_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reminders_remind_at ON user_reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_user_reminders_is_completed ON user_reminders(is_completed);

CREATE INDEX IF NOT EXISTS idx_user_habits_user_id ON user_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_habits_is_active ON user_habits(is_active);

CREATE INDEX IF NOT EXISTS idx_habit_checkins_habit_id ON habit_checkins(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_checkin_date ON habit_checkins(checkin_date);

-- 添加表注释
COMMENT ON TABLE user_favorites IS '用户收藏夹表';
COMMENT ON TABLE user_reminders IS '用户日程提醒表';
COMMENT ON TABLE user_habits IS '用户习惯打卡表';
COMMENT ON TABLE habit_checkins IS '习惯打卡记录表';
