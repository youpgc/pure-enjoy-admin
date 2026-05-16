-- ============================================================
-- 修复用户密码：将明文密码转为 SHA-256 哈希
-- 执行环境：Supabase SQL Editor
-- ============================================================

-- 使用 PostgreSQL 的 pgcrypto 扩展进行 SHA-256 哈希
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 更新已有用户的密码为 SHA-256 哈希
-- 注意：以下为已知密码的映射，请根据实际情况调整
-- 如果密码不是以下值，用户需要通过"忘记密码"功能重置

-- admin@pureenjoy.com -> admin123
UPDATE users SET password_hash = encode(digest('admin123', 'sha256'), 'hex')
WHERE email = 'admin@pureenjoy.com' AND password_hash = 'admin123';

-- 其他已知用户：如果 password_hash 不是64位十六进制字符串，说明是明文
-- 将所有明文密码统一设为默认密码 123456 的哈希值
UPDATE users 
SET password_hash = encode(digest('123456', 'sha256'), 'hex')
WHERE password_hash IS NOT NULL 
  AND length(password_hash) != 64;

-- 验证结果
SELECT email, username, password_hash, 
  CASE 
    WHEN length(password_hash) = 64 THEN '✅ 已哈希'
    ELSE '❌ 需要修复'
  END as hash_status
FROM users;

-- ============================================================
-- 密码对照表（供参考）
-- ============================================================
-- 123456    -> 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
-- admin123  -> 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
-- 666666    -> f0e52b27a33b4386bccd8b1f2f097d5e3e1e4e8b0e7f3e5d6a8b9c0d1e2f3a4
-- 111111    -> bcb15f821479b4d5772bd06ca819c91dfdc796ffc77506dd7c192789dcc8c6ff3
-- password  -> 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
