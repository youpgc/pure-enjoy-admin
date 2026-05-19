-- ============================================================
-- 自动设置 user_nickname 的触发器函数
-- 说明：在插入/更新记录时自动从 users 表获取昵称
-- ============================================================

-- 创建通用函数：自动设置 user_nickname
CREATE OR REPLACE FUNCTION auto_set_user_nickname()
RETURNS TRIGGER AS $$
DECLARE
    v_nickname VARCHAR(100);
    v_username VARCHAR(100);
    v_email VARCHAR(255);
BEGIN
    -- 从 users 表获取用户信息
    SELECT nickname, username, email
    INTO v_nickname, v_username, v_email
    FROM users
    WHERE id = NEW.user_id;

    -- 设置 user_nickname（优先级：nickname > username > email前缀）
    NEW.user_nickname := COALESCE(
        v_nickname,
        v_username,
        SPLIT_PART(v_email, '@', 1),
        '用户' || SUBSTRING(NEW.user_id FROM 1 FOR 6)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表创建触发器

-- 消费记录表
DROP TRIGGER IF EXISTS trg_expenses_set_nickname ON expenses;
CREATE TRIGGER trg_expenses_set_nickname
    BEFORE INSERT ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_user_nickname();

-- 心情日记表
DROP TRIGGER IF EXISTS trg_mood_diaries_set_nickname ON mood_diaries;
CREATE TRIGGER trg_mood_diaries_set_nickname
    BEFORE INSERT ON mood_diaries
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_user_nickname();

-- 体重记录表
DROP TRIGGER IF EXISTS trg_weight_records_set_nickname ON weight_records;
CREATE TRIGGER trg_weight_records_set_nickname
    BEFORE INSERT ON weight_records
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_user_nickname();

-- 笔记表
DROP TRIGGER IF EXISTS trg_notes_set_nickname ON notes;
CREATE TRIGGER trg_notes_set_nickname
    BEFORE INSERT ON notes
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_user_nickname();

-- 收藏夹表
DROP TRIGGER IF EXISTS trg_user_favorites_set_nickname ON user_favorites;
CREATE TRIGGER trg_user_favorites_set_nickname
    BEFORE INSERT ON user_favorites
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_user_nickname();

-- 提醒事项表
DROP TRIGGER IF EXISTS trg_user_reminders_set_nickname ON user_reminders;
CREATE TRIGGER trg_user_reminders_set_nickname
    BEFORE INSERT ON user_reminders
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_user_nickname();

-- 习惯打卡表
DROP TRIGGER IF EXISTS trg_user_habits_set_nickname ON user_habits;
CREATE TRIGGER trg_user_habits_set_nickname
    BEFORE INSERT ON user_habits
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_user_nickname();

-- ============================================================
-- SQL 执行完成
-- ============================================================
-- 说明：
-- 1. 插入新记录时会自动设置 user_nickname
-- 2. 用户信息修改时通过 sync_user_nickname 触发器同步
-- 3. 无需修改App端代码，数据库自动处理
-- ============================================================
