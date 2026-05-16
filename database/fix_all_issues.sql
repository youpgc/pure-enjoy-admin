-- ============================================
-- 全面修复类型不匹配问题
-- 步骤：删外键 -> 删策略 -> 删视图 -> 改字段 -> 重建外键 -> 重建视图
-- ============================================

-- ============================================
-- 第1步：删除所有外键约束
-- ============================================

-- expenses 表外键
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;

-- mood_diaries 表外键
ALTER TABLE mood_diaries DROP CONSTRAINT IF EXISTS mood_diaries_user_id_fkey;

-- notes 表外键
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;

-- weight_records 表外键
ALTER TABLE weight_records DROP CONSTRAINT IF EXISTS weight_records_user_id_fkey;

-- user_novels 表外键
ALTER TABLE user_novels DROP CONSTRAINT IF EXISTS user_novels_user_id_fkey;
ALTER TABLE user_novels DROP CONSTRAINT IF EXISTS user_novels_novel_id_fkey;

-- novels 表外键（如果有）
ALTER TABLE novels DROP CONSTRAINT IF EXISTS novels_user_id_fkey;

-- app_versions 表外键
ALTER TABLE app_versions DROP CONSTRAINT IF EXISTS app_versions_created_by_fkey;

-- operation_logs 表外键
ALTER TABLE operation_logs DROP CONSTRAINT IF EXISTS operation_logs_user_id_fkey;

-- ============================================
-- 第2步：删除所有依赖 user_id 的 RLS 策略
-- ============================================

-- expenses 策略
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

-- mood_diaries 策略
DROP POLICY IF EXISTS "Users can view own mood_diaries" ON mood_diaries;
DROP POLICY IF EXISTS "Users can insert own mood_diaries" ON mood_diaries;
DROP POLICY IF EXISTS "Users can update own mood_diaries" ON mood_diaries;
DROP POLICY IF EXISTS "Users can delete own mood_diaries" ON mood_diaries;

-- notes 策略
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

-- weight_records 策略
DROP POLICY IF EXISTS "Users can view own weight_records" ON weight_records;
DROP POLICY IF EXISTS "Users can insert own weight_records" ON weight_records;
DROP POLICY IF EXISTS "Users can update own weight_records" ON weight_records;
DROP POLICY IF EXISTS "Users can delete own weight_records" ON weight_records;

-- user_novels 策略
DROP POLICY IF EXISTS "Users can view own user_novels" ON user_novels;
DROP POLICY IF EXISTS "Users can insert own user_novels" ON user_novels;
DROP POLICY IF EXISTS "Users can update own user_novels" ON user_novels;
DROP POLICY IF EXISTS "Users can delete own user_novels" ON user_novels;

-- ============================================
-- 第3步：删除所有视图
-- ============================================
DROP VIEW IF EXISTS expenses_with_user;
DROP VIEW IF EXISTS mood_diaries_with_user;
DROP VIEW IF EXISTS notes_with_user;
DROP VIEW IF EXISTS weight_records_with_user;
DROP VIEW IF EXISTS user_novels_with_details;
DROP VIEW IF EXISTS novel_chapters_with_novel;

-- ============================================
-- 第4步：修改所有表的 user_id 字段类型为 VARCHAR(32)
-- ============================================

-- 修改 expenses 表
ALTER TABLE expenses ALTER COLUMN user_id TYPE VARCHAR(32);

-- 修改 mood_diaries 表
ALTER TABLE mood_diaries ALTER COLUMN user_id TYPE VARCHAR(32);

-- 修改 notes 表
ALTER TABLE notes ALTER COLUMN user_id TYPE VARCHAR(32);

-- 修改 weight_records 表
ALTER TABLE weight_records ALTER COLUMN user_id TYPE VARCHAR(32);

-- 修改 user_novels 表
ALTER TABLE user_novels ALTER COLUMN user_id TYPE VARCHAR(32);
ALTER TABLE user_novels ALTER COLUMN novel_id TYPE VARCHAR(32);

-- 修改 novels 表
ALTER TABLE novels ALTER COLUMN user_id TYPE VARCHAR(32);

-- 修改 app_versions 表
ALTER TABLE app_versions ALTER COLUMN created_by TYPE VARCHAR(32);

-- 修改 operation_logs 表
ALTER TABLE operation_logs ALTER COLUMN user_id TYPE VARCHAR(32);

-- ============================================
-- 第5步：重新创建外键约束
-- ============================================

-- expenses 外键
ALTER TABLE expenses ADD CONSTRAINT expenses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- mood_diaries 外键
ALTER TABLE mood_diaries ADD CONSTRAINT mood_diaries_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- notes 外键
ALTER TABLE notes ADD CONSTRAINT notes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- weight_records 外键
ALTER TABLE weight_records ADD CONSTRAINT weight_records_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- user_novels 外键
ALTER TABLE user_novels ADD CONSTRAINT user_novels_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- 第6步：重新创建视图
-- ============================================

-- 消费记录带用户信息
CREATE OR REPLACE VIEW expenses_with_user AS
SELECT 
    e.*,
    u.username,
    u.nickname,
    u.email
FROM expenses e
LEFT JOIN users u ON e.user_id = u.id;

-- 心情日记带用户信息
CREATE OR REPLACE VIEW mood_diaries_with_user AS
SELECT 
    m.*,
    u.username,
    u.nickname,
    u.email
FROM mood_diaries m
LEFT JOIN users u ON m.user_id = u.id;

-- 笔记带用户信息
CREATE OR REPLACE VIEW notes_with_user AS
SELECT 
    n.*,
    u.username,
    u.nickname,
    u.email
FROM notes n
LEFT JOIN users u ON n.user_id = u.id;

-- 体重记录带用户信息
CREATE OR REPLACE VIEW weight_records_with_user AS
SELECT 
    w.*,
    u.username,
    u.nickname,
    u.email
FROM weight_records w
LEFT JOIN users u ON w.user_id = u.id;

-- 用户书架带小说信息
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

-- 小说章节带小说信息
CREATE OR REPLACE VIEW novel_chapters_with_novel AS
SELECT 
    nc.*,
    n.title as novel_title,
    n.author,
    n.is_free as novel_is_free,
    n.price as novel_price
FROM novel_chapters nc
LEFT JOIN novels n ON nc.novel_id = n.id::text;

-- ============================================
-- 第7步：授予权限
-- ============================================
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
WHERE table_name IN ('expenses', 'mood_diaries', 'notes', 'weight_records', 'user_novels', 'novels', 'app_versions', 'operation_logs') 
AND column_name IN ('user_id', 'novel_id', 'created_by')
ORDER BY table_name;
