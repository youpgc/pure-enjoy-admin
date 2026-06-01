-- ============================================================
-- 修复 user_novels 表外键约束
-- 解决: Could not find a relationship between 'user_novels' and 'novel_id'
-- ============================================================

-- 第一步：查看孤立数据情况（可选，确认问题范围）
-- SELECT COUNT(*) as orphan_novels FROM user_novels WHERE novel_id NOT IN (SELECT id FROM novels);
-- SELECT COUNT(*) as orphan_users FROM user_novels WHERE user_id NOT IN (SELECT id FROM users);

-- 第二步：删除引用不存在小说的孤立记录
DELETE FROM user_novels
WHERE novel_id NOT IN (SELECT id FROM novels);

-- 第三步：删除引用不存在用户的孤立记录
DELETE FROM user_novels
WHERE user_id NOT IN (SELECT id FROM users);

-- 第四步：添加外键约束 - user_novels -> novels
ALTER TABLE user_novels
ADD CONSTRAINT user_novels_novel_id_fkey
FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE;

-- 第五步：添加外键约束 - user_novels -> users
ALTER TABLE user_novels
ADD CONSTRAINT user_novels_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 第六步：验证外键添加成功
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
