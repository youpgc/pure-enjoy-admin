-- ============================================================
-- 修复 user_novels 表外键约束
-- 问题: PostgREST 关联查询需要外键才能工作
-- 错误: Could not find a relationship between 'user_novels' and 'novel_id'
-- ============================================================

-- 1. 添加 user_novels -> novels 的外键约束
ALTER TABLE user_novels
DROP CONSTRAINT IF EXISTS user_novels_novel_id_fkey;

ALTER TABLE user_novels
ADD CONSTRAINT user_novels_novel_id_fkey
FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE;

-- 2. 添加 user_novels -> users 的外键约束（可选，用于关联用户信息）
-- 注意: users 表的 id 是 VARCHAR(32)，不是 UUID
ALTER TABLE user_novels
DROP CONSTRAINT IF EXISTS user_novels_user_id_fkey;

ALTER TABLE user_novels
ADD CONSTRAINT user_novels_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 3. 验证外键
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'user_novels';

-- 4. 刷新 schema cache（Supabase 会自动刷新，但可以手动触发）
-- NOTIFY pgrst, 'reload schema';