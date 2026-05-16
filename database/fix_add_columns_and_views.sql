-- ============================================
-- 一键修复：添加缺失字段 + 创建视图
-- ============================================

-- 第1步：添加缺失字段（IF NOT EXISTS 避免重复报错）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nickname') THEN
        ALTER TABLE users ADD COLUMN nickname VARCHAR(50);
    END IF;
END $$;

-- 第2步：为现有用户生成 username（基于 email 前缀）
UPDATE users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;
UPDATE users SET nickname = COALESCE(nickname, SPLIT_PART(email, '@', 1)) WHERE nickname IS NULL;

-- 第3步：删除旧视图
DROP VIEW IF EXISTS expenses_with_user CASCADE;
DROP VIEW IF EXISTS mood_diaries_with_user CASCADE;
DROP VIEW IF EXISTS notes_with_user CASCADE;
DROP VIEW IF EXISTS weight_records_with_user CASCADE;
DROP VIEW IF EXISTS user_novels_with_details CASCADE;
DROP VIEW IF EXISTS novel_chapters_with_novel CASCADE;

-- 第4步：创建视图（使用 COALESCE 防止字段为空）
CREATE OR REPLACE VIEW expenses_with_user AS
SELECT 
    e.*,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) as username,
    COALESCE(u.nickname, SPLIT_PART(u.email, '@', 1)) as nickname,
    u.email
FROM expenses e
LEFT JOIN users u ON e.user_id = u.id;

CREATE OR REPLACE VIEW mood_diaries_with_user AS
SELECT 
    m.*,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) as username,
    COALESCE(u.nickname, SPLIT_PART(u.email, '@', 1)) as nickname,
    u.email
FROM mood_diaries m
LEFT JOIN users u ON m.user_id = u.id;

CREATE OR REPLACE VIEW notes_with_user AS
SELECT 
    n.*,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) as username,
    COALESCE(u.nickname, SPLIT_PART(u.email, '@', 1)) as nickname,
    u.email
FROM notes n
LEFT JOIN users u ON n.user_id = u.id;

CREATE OR REPLACE VIEW weight_records_with_user AS
SELECT 
    w.*,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) as username,
    COALESCE(u.nickname, SPLIT_PART(u.email, '@', 1)) as nickname,
    u.email
FROM weight_records w
LEFT JOIN users u ON w.user_id = u.id;

CREATE OR REPLACE VIEW user_novels_with_details AS
SELECT 
    un.*,
    n.title as novel_title,
    n.author,
    n.cover_url,
    n.category,
    n.status as novel_status,
    COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) as username,
    COALESCE(u.nickname, SPLIT_PART(u.email, '@', 1)) as nickname
FROM user_novels un
LEFT JOIN novels n ON un.novel_id = n.id::text
LEFT JOIN users u ON un.user_id = u.id;

CREATE OR REPLACE VIEW novel_chapters_with_novel AS
SELECT 
    nc.*,
    n.title as novel_title,
    n.author,
    n.is_free as novel_is_free,
    n.price as novel_price
FROM novel_chapters nc
LEFT JOIN novels n ON nc.novel_id = n.id::text;

-- 第5步：授予权限
GRANT SELECT ON expenses_with_user TO anon;
GRANT SELECT ON mood_diaries_with_user TO anon;
GRANT SELECT ON notes_with_user TO anon;
GRANT SELECT ON weight_records_with_user TO anon;
GRANT SELECT ON user_novels_with_details TO anon;
GRANT SELECT ON novel_chapters_with_novel TO anon;

-- 验证
SELECT 'users字段' as check_item, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('username', 'nickname');

SELECT '视图创建' as check_item, table_name 
FROM information_schema.views 
WHERE table_schema = 'public' AND table_name LIKE '%_with_%';
