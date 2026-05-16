-- ============================================
-- 修复消费记录、心情日记等接口查询报错
-- ============================================

-- 1. 扩展 users 表，添加 username 和 nickname 字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS nickname VARCHAR(50);

-- 2. 为现有用户生成 username（基于 email 前缀）
UPDATE users 
SET username = SPLIT_PART(email, '@', 1),
    nickname = COALESCE(nickname, SPLIT_PART(email, '@', 1))
WHERE username IS NULL;

-- 3. 创建视图：消费记录带用户信息
CREATE OR REPLACE VIEW expenses_with_user AS
SELECT 
    e.*,
    u.username,
    u.nickname,
    u.email
FROM expenses e
LEFT JOIN users u ON e.user_id = u.id;

-- 4. 创建视图：心情日记带用户信息
CREATE OR REPLACE VIEW mood_diaries_with_user AS
SELECT 
    m.*,
    u.username,
    u.nickname,
    u.email
FROM mood_diaries m
LEFT JOIN users u ON m.user_id = u.id;

-- 5. 创建视图：笔记带用户信息
CREATE OR REPLACE VIEW notes_with_user AS
SELECT 
    n.*,
    u.username,
    u.nickname,
    u.email
FROM notes n
LEFT JOIN users u ON n.user_id = u.id;

-- 6. 创建视图：体重记录带用户信息
CREATE OR REPLACE VIEW weight_records_with_user AS
SELECT 
    w.*,
    u.username,
    u.nickname,
    u.email
FROM weight_records w
LEFT JOIN users u ON w.user_id = u.id;

-- 7. 创建视图：用户书架带小说信息
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

-- 8. 创建视图：小说章节带小说信息
CREATE OR REPLACE VIEW novel_chapters_with_novel AS
SELECT 
    nc.*,
    n.title as novel_title,
    n.author,
    n.is_free as novel_is_free,
    n.price as novel_price
FROM novel_chapters nc
LEFT JOIN novels n ON nc.novel_id = n.id::text;

-- 9. 启用 RLS 策略（如果之前没有启用）
-- 允许匿名用户读取公开数据
ALTER TABLE novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE novel_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- 10. 创建 RLS 策略：公开小说可读
DROP POLICY IF EXISTS novels_public_read ON novels;
CREATE POLICY novels_public_read ON novels
    FOR SELECT USING (true);

-- 11. 创建 RLS 策略：公开章节可读
DROP POLICY IF EXISTS novel_chapters_public_read ON novel_chapters;
CREATE POLICY novel_chapters_public_read ON novel_chapters
    FOR SELECT USING (true);

-- 12. 创建 RLS 策略：公开版本信息可读
DROP POLICY IF EXISTS app_versions_public_read ON app_versions;
CREATE POLICY app_versions_public_read ON app_versions
    FOR SELECT USING (is_active = true AND status = 'released');

-- 13. 授予匿名用户访问权限
GRANT SELECT ON novels TO anon;
GRANT SELECT ON novel_chapters TO anon;
GRANT SELECT ON app_versions TO anon;
GRANT SELECT ON expenses_with_user TO anon;
GRANT SELECT ON mood_diaries_with_user TO anon;
GRANT SELECT ON notes_with_user TO anon;
GRANT SELECT ON weight_records_with_user TO anon;
GRANT SELECT ON user_novels_with_details TO anon;
GRANT SELECT ON novel_chapters_with_novel TO anon;

-- ============================================
-- 验证数据
-- ============================================

-- 检查 users 表字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';

-- 检查视图是否创建成功
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE '%_with_%';
