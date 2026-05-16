-- ============================================================
-- 修复版本状态：仅保留最新版本为已发布，其他改为已下架
-- 执行环境：Supabase SQL Editor
-- ============================================================

-- 将所有版本先设为已下架
UPDATE app_versions SET status = 'revoked', revoked_at = NOW() WHERE status = 'released';

-- 将最新版本（按 created_at 排序）设为已发布
UPDATE app_versions 
SET status = 'released', revoked_at = NULL
WHERE id = (
  SELECT id FROM app_versions 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- 验证结果
SELECT id, version, build_number, status, released_at, revoked_at 
FROM app_versions 
ORDER BY created_at DESC;
