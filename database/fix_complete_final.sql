-- ============================================
-- 完整修复：先改字段类型，再创建视图
-- ============================================

-- 第1步：删除所有外键（避免修改字段时报错）
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;
ALTER TABLE mood_diaries DROP CONSTRAINT IF EXISTS mood_diaries_user_id_fkey;
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;
ALTER TABLE weight_records DROP CONSTRAINT IF EXISTS weight_records_user_id_fkey;

-- 第2步：删除所有策略
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

-- 第3步：删除所有视图
DROP VIEW IF EXISTS expenses_with_user CASCADE;
DROP VIEW IF EXISTS mood_diaries_with_user CASCADE;
DROP VIEW IF EXISTS notes_with_user CASCADE;
DROP VIEW IF EXISTS weight_records_with_user CASCADE;

-- 第4步：修改字段类型（关键！先把 user_id 改成 VARCHAR）
ALTER TABLE expenses ALTER COLUMN user_id TYPE VARCHAR(32);
ALTER TABLE mood_diaries ALTER COLUMN user_id TYPE VARCHAR(32);
ALTER TABLE notes ALTER COLUMN user_id TYPE VARCHAR(32);
ALTER TABLE weight_records ALTER COLUMN user_id TYPE VARCHAR(32);

-- 第5步：添加 users 表字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nickname') THEN
        ALTER TABLE users ADD COLUMN nickname VARCHAR(50);
    END IF;
END $$;

-- 第6步：为现有用户生成 username
UPDATE users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;
UPDATE users SET nickname = COALESCE(nickname, SPLIT_PART(email, '@', 1)) WHERE nickname IS NULL;

-- 第7步：重新创建外键
ALTER TABLE expenses ADD CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE mood_diaries ADD CONSTRAINT mood_diaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notes ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE weight_records ADD CONSTRAINT weight_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 第8步：创建视图
CREATE OR REPLACE VIEW expenses_with_user AS
SELECT e.*, COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) as username, COALESCE(u.nickname, SPLIT_PART(u.email, '@', 1)) as nickname, u.email
FROM expenses e LEFT JOIN users u ON e.user_id = u.id;

CREATE OR REPLACE VIEW mood_diaries_with_user AS
SELECT m.*, COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) as username, COALESCE(u.nickname, SPLIT_PART(u.email, '@', 1)) as nickname, u.email
FROM mood_diaries m LEFT JOIN users u ON m.user_id = u.id;

CREATE OR REPLACE VIEW notes_with_user AS
SELECT n.*, COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) as username, COALESCE(u.nickname, SPLIT_PART(u.email, '@', 1)) as nickname, u.email
FROM notes n LEFT JOIN users u ON n.user_id = u.id;

CREATE OR REPLACE VIEW weight_records_with_user AS
SELECT w.*, COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) as username, COALESCE(u.nickname, SPLIT_PART(u.email, '@', 1)) as nickname, u.email
FROM weight_records w LEFT JOIN users u ON w.user_id = u.id;

-- 第9步：授予权限
GRANT SELECT ON expenses_with_user TO anon;
GRANT SELECT ON mood_diaries_with_user TO anon;
GRANT SELECT ON notes_with_user TO anon;
GRANT SELECT ON weight_records_with_user TO anon;

-- 验证
SELECT '字段类型检查' as check_type, table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('expenses', 'mood_diaries', 'notes', 'weight_records') AND column_name = 'user_id';
