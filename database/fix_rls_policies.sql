-- ============================================================
-- 修复 RLS 策略：支持 super_admin 角色
-- 说明：原策略只检查 role = 'admin'，导致 super_admin 无法查看数据
-- ============================================================

-- ============================================================
-- 1. 修复 expenses 表 RLS 策略
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all expenses" ON expenses;
CREATE POLICY "Admin can view all expenses"
    ON expenses FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role IN ('admin', 'super_admin')));

-- ============================================================
-- 2. 修复 mood_diaries 表 RLS 策略
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all mood_diaries" ON mood_diaries;
CREATE POLICY "Admin can view all mood_diaries"
    ON mood_diaries FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role IN ('admin', 'super_admin')));

-- ============================================================
-- 3. 修复 weight_records 表 RLS 策略
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all weight_records" ON weight_records;
CREATE POLICY "Admin can view all weight_records"
    ON weight_records FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role IN ('admin', 'super_admin')));

-- ============================================================
-- 4. 修复 notes 表 RLS 策略
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all notes" ON notes;
CREATE POLICY "Admin can view all notes"
    ON notes FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role IN ('admin', 'super_admin')));

-- ============================================================
-- 5. 修复 user_favorites 表 RLS 策略
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all favorites" ON user_favorites;
CREATE POLICY "Admin can view all favorites"
    ON user_favorites FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role IN ('admin', 'super_admin')));

-- ============================================================
-- 6. 修复 user_reminders 表 RLS 策略
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all reminders" ON user_reminders;
CREATE POLICY "Admin can view all reminders"
    ON user_reminders FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role IN ('admin', 'super_admin')));

-- ============================================================
-- 7. 修复 user_habits 表 RLS 策略
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all habits" ON user_habits;
CREATE POLICY "Admin can view all habits"
    ON user_habits FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role IN ('admin', 'super_admin')));

-- ============================================================
-- 8. 修复 habit_checkins 表 RLS 策略
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all checkins" ON habit_checkins;
CREATE POLICY "Admin can view all checkins"
    ON habit_checkins FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role IN ('admin', 'super_admin')));

-- ============================================================
-- SQL 执行完成
-- ============================================================
-- 说明：此脚本修复了所有业务表的 RLS 策略，使 super_admin 也能查看所有数据
-- ============================================================
