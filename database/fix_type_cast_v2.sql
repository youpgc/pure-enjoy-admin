-- ============================================
-- 修复类型不匹配问题（UUID vs VARCHAR）
-- 步骤：先删除策略 -> 修改字段 -> 重新创建策略
-- ============================================

-- 1. 删除依赖 user_id 的 RLS 策略
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

DROP POLICY IF EXISTS "Users can view own mood_diaries" ON mood_diaries;
DROP POLICY IF EXISTS "Users can insert own mood_diaries" ON mood_diaries;
DROP POLICY IF EXISTS "Users can update own mood_diaries" ON mood_diaries;
DROP POLICY IF EXISTS "Users can delete own mood_diaries" ON mood_diaries;

DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

DROP POLICY IF EXISTS "Users can view own weight_records" ON weight_records;
DROP POLICY IF EXISTS "Users can insert own weight_records" ON weight_records;
DROP POLICY IF EXISTS "Users can update own weight_records" ON weight_records;
DROP POLICY IF EXISTS "Users can delete own weight_records" ON weight_records;

DROP POLICY IF EXISTS "Users can view own user_novels" ON user_novels;
DROP POLICY IF EXISTS "Users can insert own user_novels" ON user_novels;
DROP POLICY IF EXISTS "Users can update own user_novels" ON user_novels;
DROP POLICY IF EXISTS "Users can delete own user_novels" ON user_novels;

-- 2. 删除旧视图（如果存在）
DROP VIEW IF EXISTS expenses_with_user;
DROP VIEW IF EXISTS mood_diaries_with_user;
DROP VIEW IF EXISTS notes_with_user;
DROP VIEW IF EXISTS weight_records_with_user;
DROP VIEW IF EXISTS user_novels_with_details;
DROP VIEW IF EXISTS novel_chapters_with_novel;

-- 3. 修改所有表的 user_id 字段类型为 VARCHAR(32)
ALTER TABLE expenses ALTER COLUMN user_id TYPE VARCHAR(32);
ALTER TABLE mood_diaries ALTER COLUMN user_id TYPE VARCHAR(32);
ALTER TABLE notes ALTER COLUMN user_id TYPE VARCHAR(32);
ALTER TABLE weight_records ALTER COLUMN user_id TYPE VARCHAR(32);
ALTER TABLE user_novels ALTER COLUMN user_id TYPE VARCHAR(32);
ALTER TABLE novels ALTER COLUMN user_id TYPE VARCHAR(32);

-- 4. 重新创建视图：消费记录带用户信息
CREATE OR REPLACE VIEW expenses_with_user AS
SELECT 
    e.*,
    u.username,
    u.nickname,
    u.email
FROM expenses e
LEFT JOIN users u ON e.user_id = u.id;

-- 5. 重新创建视图：心情日记带用户信息
CREATE OR REPLACE VIEW mood_diaries_with_user AS
SELECT 
    m.*,
    u.username,
    u.nickname,
    u.email
FROM mood_diaries m
LEFT JOIN users u ON m.user_id = u.id;

-- 6. 重新创建视图：笔记带用户信息
CREATE OR REPLACE VIEW notes_with_user AS
SELECT 
    n.*,
    u.username,
    u.nickname,
    u.email
FROM notes n
LEFT JOIN users u ON n.user_id = u.id;

-- 7. 重新创建视图：体重记录带用户信息
CREATE OR REPLACE VIEW weight_records_with_user AS
SELECT 
    w.*,
    u.username,
    u.nickname,
    u.email
FROM weight_records w
LEFT JOIN users u ON w.user_id = u.id;

-- 8. 重新创建视图：用户书架带小说信息
CREATE OR REPLACE VIEW user_novels_with_details AS
SELECT 
    un.*,
    n.title as novel_title,
    n.author,
    n.cover_url,
    n.category,
    n.status as novel_status,
    u.username,
    u.nickname
FROM user_novels un
LEFT JOIN novels n ON un.novel_id = n.id::text
LEFT JOIN users u ON un.user_id = u.id;

-- 9. 重新创建视图：小说章节带小说信息
CREATE OR REPLACE VIEW novel_chapters_with_novel AS
SELECT 
    nc.*,
    n.title as novel_title,
    n.author,
    n.is_free as novel_is_free,
    n.price as novel_price
FROM novel_chapters nc
LEFT JOIN novels n ON nc.novel_id = n.id::text;

-- 10. 授予匿名用户访问权限
GRANT SELECT ON expenses_with_user TO anon;
GRANT SELECT ON mood_diaries_with_user TO anon;
GRANT SELECT ON notes_with_user TO anon;
GRANT SELECT ON weight_records_with_user TO anon;
GRANT SELECT ON user_novels_with_details TO anon;
GRANT SELECT ON novel_chapters_with_novel TO anon;

-- ============================================
-- 验证
-- ============================================

-- 检查字段类型
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('expenses', 'mood_diaries', 'notes', 'weight_records', 'user_novels', 'novels') 
AND column_name = 'user_id';

-- 测试视图
SELECT * FROM expenses_with_user LIMIT 1;
