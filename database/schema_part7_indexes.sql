-- ============================================================
-- 纯享App后台管理系统 - 第七部分：性能优化索引
-- 执行顺序：在 part1, part2, part3 之后执行
-- ============================================================

-- 复合索引优化常用查询
-- 注：经检查，users.status 列存在（schema_part2_users.sql 第17行），无错误
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_member_level ON users(member_level);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date_category ON expenses(user_id, date, category);
CREATE INDEX IF NOT EXISTS idx_mood_diaries_user_mood ON mood_diaries(user_id, mood);
CREATE INDEX IF NOT EXISTS idx_weight_records_user_date_desc ON weight_records(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_created_desc ON notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_novels_status_created ON novels(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_created ON operation_logs(user_id, created_at DESC);
