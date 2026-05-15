-- ============================================================
-- 纯享App后台管理系统 - 第五部分：RLS 策略
-- 执行顺序：在 part1, part2, part3, part4 之后执行
-- ============================================================

-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE novel_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- 创建辅助函数：检查用户角色
-- 修复：auth.uid() 返回 UUID，需要转换为 TEXT 与 VARCHAR(32) 比较
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid()::TEXT 
        AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid()::TEXT 
        AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR(20) AS $$
DECLARE
    user_role VARCHAR(20);
BEGIN
    SELECT role INTO user_role 
    FROM users 
    WHERE id = auth.uid()::TEXT;
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 6.1 用户表 RLS 策略
-- ============================================================

-- 普通用户只能查看和更新自己的信息
-- 修复：auth.uid()::TEXT 替代 auth.uid()::VARCHAR(32)
CREATE POLICY "用户可以查看自己的信息" ON users
    FOR SELECT
    USING (id = auth.uid()::TEXT);

CREATE POLICY "管理员可以查看所有用户" ON users
    FOR SELECT
    USING (is_admin());

CREATE POLICY "用户可以更新自己的信息" ON users
    FOR UPDATE
    USING (id = auth.uid()::TEXT);

CREATE POLICY "管理员可以更新所有用户" ON users
    FOR UPDATE
    USING (is_admin());

CREATE POLICY "超级管理员可以插入用户" ON users
    FOR INSERT
    WITH CHECK (is_super_admin() OR id = auth.uid()::TEXT);

CREATE POLICY "超级管理员可以删除用户" ON users
    FOR DELETE
    USING (is_super_admin());

-- ============================================================
-- 6.2 消费记录表 RLS 策略
-- ============================================================

-- 修复：auth.uid()::TEXT 替代 auth.uid()::VARCHAR(32)
CREATE POLICY "用户可以查看自己的消费记录" ON expenses
    FOR SELECT
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以创建自己的消费记录" ON expenses
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以更新自己的消费记录" ON expenses
    FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以删除自己的消费记录" ON expenses
    FOR DELETE
    USING (user_id = auth.uid()::TEXT OR is_admin());

-- ============================================================
-- 6.3 心情日记表 RLS 策略
-- ============================================================

-- 修复：auth.uid()::TEXT 替代 auth.uid()::VARCHAR(32)
CREATE POLICY "用户可以查看自己的心情日记" ON mood_diaries
    FOR SELECT
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以创建自己的心情日记" ON mood_diaries
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以更新自己的心情日记" ON mood_diaries
    FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以删除自己的心情日记" ON mood_diaries
    FOR DELETE
    USING (user_id = auth.uid()::TEXT OR is_admin());

-- ============================================================
-- 6.4 体重记录表 RLS 策略
-- ============================================================

-- 修复：auth.uid()::TEXT 替代 auth.uid()::VARCHAR(32)
CREATE POLICY "用户可以查看自己的体重记录" ON weight_records
    FOR SELECT
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以创建自己的体重记录" ON weight_records
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以更新自己的体重记录" ON weight_records
    FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以删除自己的体重记录" ON weight_records
    FOR DELETE
    USING (user_id = auth.uid()::TEXT OR is_admin());

-- ============================================================
-- 6.5 笔记表 RLS 策略
-- ============================================================

-- 修复：auth.uid()::TEXT 替代 auth.uid()::VARCHAR(32)
CREATE POLICY "用户可以查看自己的笔记" ON notes
    FOR SELECT
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以创建自己的笔记" ON notes
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以更新自己的笔记" ON notes
    FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以删除自己的笔记" ON notes
    FOR DELETE
    USING (user_id = auth.uid()::TEXT OR is_admin());

-- ============================================================
-- 6.6 小说表 RLS 策略
-- ============================================================

-- 小说比较特殊：公共小说所有人可见，私有小说只有拥有者可见
-- 修复：auth.uid()::TEXT 替代 auth.uid()::VARCHAR(32)
CREATE POLICY "用户可以查看公共小说和自己的小说" ON novels
    FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "管理员可以创建小说" ON novels
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "管理员可以更新小说" ON novels
    FOR UPDATE
    USING (is_admin());

CREATE POLICY "超级管理员可以删除小说" ON novels
    FOR DELETE
    USING (is_super_admin());

-- ============================================================
-- 6.7 小说章节表 RLS 策略
-- ============================================================

-- 修复：auth.uid()::TEXT 替代 auth.uid()::VARCHAR(32)
CREATE POLICY "用户可以查看小说章节" ON novel_chapters
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM novels 
            WHERE novels.id = novel_chapters.novel_id 
            AND (novels.user_id IS NULL OR novels.user_id = auth.uid()::TEXT OR is_admin())
        )
    );

CREATE POLICY "管理员可以管理小说章节" ON novel_chapters
    FOR ALL
    USING (is_admin());

-- ============================================================
-- 6.8 用户书架关联表 RLS 策略
-- ============================================================

-- 修复：auth.uid()::TEXT 替代 auth.uid()::VARCHAR(32)
CREATE POLICY "用户可以查看自己的书架" ON user_novels
    FOR SELECT
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以添加小说到书架" ON user_novels
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以更新自己的阅读进度" ON user_novels
    FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR is_admin());

CREATE POLICY "用户可以从书架移除小说" ON user_novels
    FOR DELETE
    USING (user_id = auth.uid()::TEXT OR is_admin());

-- ============================================================
-- 6.9 App版本表 RLS 策略
-- ============================================================

-- 所有用户可以查看已发布的版本
CREATE POLICY "所有用户可以查看已发布的版本" ON app_versions
    FOR SELECT
    USING (status = 'released' OR is_admin());

CREATE POLICY "管理员可以管理版本" ON app_versions
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "管理员可以更新版本" ON app_versions
    FOR UPDATE
    USING (is_admin());

CREATE POLICY "超级管理员可以删除版本" ON app_versions
    FOR DELETE
    USING (is_super_admin());

-- ============================================================
-- 6.10 操作日志表 RLS 策略
-- ============================================================

-- 修复：auth.uid()::TEXT 替代 auth.uid()::VARCHAR(32)
CREATE POLICY "管理员可以查看操作日志" ON operation_logs
    FOR SELECT
    USING (is_admin());

CREATE POLICY "系统可以插入操作日志" ON operation_logs
    FOR INSERT
    WITH CHECK (is_admin() OR user_id = auth.uid()::TEXT);
