-- ============================================================
-- 为业务表添加 user_nickname 字段并迁移历史数据
-- 说明：将用户昵称冗余存储到业务表，避免查询时关联查询
-- ============================================================

-- ============================================================
-- 1. 为所有业务表添加 user_nickname 字段
-- ============================================================

-- 消费记录表
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_nickname VARCHAR(100);
COMMENT ON COLUMN expenses.user_nickname IS '用户昵称（冗余存储，避免关联查询）';

-- 心情日记表
ALTER TABLE mood_diaries ADD COLUMN IF NOT EXISTS user_nickname VARCHAR(100);
COMMENT ON COLUMN mood_diaries.user_nickname IS '用户昵称（冗余存储，避免关联查询）';

-- 体重记录表
ALTER TABLE weight_records ADD COLUMN IF NOT EXISTS user_nickname VARCHAR(100);
COMMENT ON COLUMN weight_records.user_nickname IS '用户昵称（冗余存储，避免关联查询）';

-- 笔记表
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_nickname VARCHAR(100);
COMMENT ON COLUMN notes.user_nickname IS '用户昵称（冗余存储，避免关联查询）';

-- 收藏夹表
ALTER TABLE user_favorites ADD COLUMN IF NOT EXISTS user_nickname VARCHAR(100);
COMMENT ON COLUMN user_favorites.user_nickname IS '用户昵称（冗余存储，避免关联查询）';

-- 提醒事项表
ALTER TABLE user_reminders ADD COLUMN IF NOT EXISTS user_nickname VARCHAR(100);
COMMENT ON COLUMN user_reminders.user_nickname IS '用户昵称（冗余存储，避免关联查询）';

-- 习惯打卡表
ALTER TABLE user_habits ADD COLUMN IF NOT EXISTS user_nickname VARCHAR(100);
COMMENT ON COLUMN user_habits.user_nickname IS '用户昵称（冗余存储，避免关联查询）';

-- ============================================================
-- 2. 迁移历史数据：从 users 表获取昵称更新到业务表
-- ============================================================

-- 更新消费记录表
UPDATE expenses e
SET user_nickname = COALESCE(
    (SELECT nickname FROM users u WHERE u.id = e.user_id),
    (SELECT username FROM users u WHERE u.id = e.user_id),
    (SELECT SPLIT_PART(email, '@', 1) FROM users u WHERE u.id = e.user_id),
    '用户' || SUBSTRING(e.user_id FROM 1 FOR 6)
)
WHERE user_nickname IS NULL;

-- 更新心情日记表
UPDATE mood_diaries m
SET user_nickname = COALESCE(
    (SELECT nickname FROM users u WHERE u.id = m.user_id),
    (SELECT username FROM users u WHERE u.id = m.user_id),
    (SELECT SPLIT_PART(email, '@', 1) FROM users u WHERE u.id = m.user_id),
    '用户' || SUBSTRING(m.user_id FROM 1 FOR 6)
)
WHERE user_nickname IS NULL;

-- 更新体重记录表
UPDATE weight_records w
SET user_nickname = COALESCE(
    (SELECT nickname FROM users u WHERE u.id = w.user_id),
    (SELECT username FROM users u WHERE u.id = w.user_id),
    (SELECT SPLIT_PART(email, '@', 1) FROM users u WHERE u.id = w.user_id),
    '用户' || SUBSTRING(w.user_id FROM 1 FOR 6)
)
WHERE user_nickname IS NULL;

-- 更新笔记表
UPDATE notes n
SET user_nickname = COALESCE(
    (SELECT nickname FROM users u WHERE u.id = n.user_id),
    (SELECT username FROM users u WHERE u.id = n.user_id),
    (SELECT SPLIT_PART(email, '@', 1) FROM users u WHERE u.id = n.user_id),
    '用户' || SUBSTRING(n.user_id FROM 1 FOR 6)
)
WHERE user_nickname IS NULL;

-- 更新收藏夹表
UPDATE user_favorites f
SET user_nickname = COALESCE(
    (SELECT nickname FROM users u WHERE u.id = f.user_id),
    (SELECT username FROM users u WHERE u.id = f.user_id),
    (SELECT SPLIT_PART(email, '@', 1) FROM users u WHERE u.id = f.user_id),
    '用户' || SUBSTRING(f.user_id FROM 1 FOR 6)
)
WHERE user_nickname IS NULL;

-- 更新提醒事项表
UPDATE user_reminders r
SET user_nickname = COALESCE(
    (SELECT nickname FROM users u WHERE u.id = r.user_id),
    (SELECT username FROM users u WHERE u.id = r.user_id),
    (SELECT SPLIT_PART(email, '@', 1) FROM users u WHERE u.id = r.user_id),
    '用户' || SUBSTRING(r.user_id FROM 1 FOR 6)
)
WHERE user_nickname IS NULL;

-- 更新习惯打卡表
UPDATE user_habits h
SET user_nickname = COALESCE(
    (SELECT nickname FROM users u WHERE u.id = h.user_id),
    (SELECT username FROM users u WHERE u.id = h.user_id),
    (SELECT SPLIT_PART(email, '@', 1) FROM users u WHERE u.id = h.user_id),
    '用户' || SUBSTRING(h.user_id FROM 1 FOR 6)
)
WHERE user_nickname IS NULL;

-- ============================================================
-- 3. 创建函数：自动同步用户昵称（当用户信息更新时）
-- ============================================================

-- 创建更新用户昵称的函数
CREATE OR REPLACE FUNCTION update_user_nickname_on_user_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新所有业务表中的用户昵称
    UPDATE expenses SET user_nickname = COALESCE(NEW.nickname, NEW.username, SPLIT_PART(NEW.email, '@', 1)) WHERE user_id = NEW.id;
    UPDATE mood_diaries SET user_nickname = COALESCE(NEW.nickname, NEW.username, SPLIT_PART(NEW.email, '@', 1)) WHERE user_id = NEW.id;
    UPDATE weight_records SET user_nickname = COALESCE(NEW.nickname, NEW.username, SPLIT_PART(NEW.email, '@', 1)) WHERE user_id = NEW.id;
    UPDATE notes SET user_nickname = COALESCE(NEW.nickname, NEW.username, SPLIT_PART(NEW.email, '@', 1)) WHERE user_id = NEW.id;
    UPDATE user_favorites SET user_nickname = COALESCE(NEW.nickname, NEW.username, SPLIT_PART(NEW.email, '@', 1)) WHERE user_id = NEW.id;
    UPDATE user_reminders SET user_nickname = COALESCE(NEW.nickname, NEW.username, SPLIT_PART(NEW.email, '@', 1)) WHERE user_id = NEW.id;
    UPDATE user_habits SET user_nickname = COALESCE(NEW.nickname, NEW.username, SPLIT_PART(NEW.email, '@', 1)) WHERE user_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：当用户信息更新时自动同步昵称
DROP TRIGGER IF EXISTS sync_user_nickname ON users;
CREATE TRIGGER sync_user_nickname
    AFTER UPDATE OF nickname, username, email ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_nickname_on_user_change();

-- ============================================================
-- SQL 执行完成
-- ============================================================
-- 请确认以下检查项：
-- 1. 所有业务表已添加 user_nickname 字段
-- 2. 历史数据已迁移完成
-- 3. 触发器已创建，用户信息更新时会自动同步
-- ============================================================
