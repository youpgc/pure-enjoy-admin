-- ============================================================
-- 纯享 App 登录注册修复 SQL
-- 执行环境：Supabase SQL Editor
-- 说明：添加 users 表缺失的字段，修复登录注册问题
-- ============================================================

-- 1. 添加 username 字段（用户名登录需要）
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- 2. 添加 sms_code 字段（验证码登录需要）
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code VARCHAR(10);

-- 3. 添加 sms_code_expires_at 字段（验证码过期时间）
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code_expires_at TIMESTAMPTZ;

-- 4. 为已有用户生成默认 username
UPDATE users SET username = SPLIT_PART(email, '@', 1) 
WHERE username IS NULL;

-- 5. 创建 username 索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 6. 添加字段注释
COMMENT ON COLUMN users.username IS '用户名，用于用户名+密码登录';
COMMENT ON COLUMN users.sms_code IS '短信验证码';
COMMENT ON COLUMN users.sms_code_expires_at IS '短信验证码过期时间';

-- 7. 确保 RLS 策略允许 App 端访问
-- 允许查询（登录需要）
DROP POLICY IF EXISTS "Allow select on users" ON users;
CREATE POLICY "Allow select on users" ON users FOR SELECT USING (true);

-- 允许插入（注册需要）
DROP POLICY IF EXISTS "Allow insert on users" ON users;
CREATE POLICY "Allow insert on users" ON users FOR INSERT WITH CHECK (true);

-- 允许更新（更新验证码、登录时间等需要）
DROP POLICY IF EXISTS "Allow update on users" ON users;
CREATE POLICY "Allow update on users" ON users FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================================
-- 验证语句（执行后检查结果）
-- ============================================================
-- 检查 users 表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('username', 'sms_code', 'sms_code_expires_at', 'password_hash');

-- 检查 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- ============================================================
-- SQL 执行完成
-- ============================================================
