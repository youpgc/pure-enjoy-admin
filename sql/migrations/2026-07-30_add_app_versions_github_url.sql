-- ============================================================
-- 版本更新功能：app_versions 表补齐 github_url 备用源 + 匿名读取策略
-- 适用：Supabase 云端库（PostgreSQL 15+）
-- 应用端逻辑：version_check_service.dart 以 github_url 作为 Gitee 主源失败时的 fallbackUrl
-- 管理后台：VersionFormModal 已暴露该输入项并随版本记录落库
-- ============================================================

-- ------------------------------------------------------------
-- ① 验证当前状态（先跑，确认要不要补 RLS）
-- ------------------------------------------------------------
-- 1.1 列是否已存在
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'app_versions' AND column_name = 'github_url';
--    → 有行说明已加过列，第②步可跳过

-- 1.2 RLS 是否开启 + 现有策略
SELECT relname,
       relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'app_versions';

SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'app_versions';
--   → 若 cmd=SELECT 的策略里不含 anon，且上面 rls_enabled=true，
--     则 App 在未登录/匿名态检查更新会静默失败，需执行第③步

-- ------------------------------------------------------------
-- ② 必执行：补充 github_url 列（幂等）
-- ------------------------------------------------------------
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS github_url text;

COMMENT ON COLUMN app_versions.github_url
IS '备用下载源（GitHub Releases 直链），主源(Gitee apk_url)失败时回退';

-- ------------------------------------------------------------
-- ③ 按需执行：允许 anon / authenticated 读取 released 版本
--    （仅当第①步确认 RLS 已开启且缺 SELECT 策略时执行）
-- ------------------------------------------------------------
-- 3.1 确保 RLS 开启（幂等）
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- 3.2 允许匿名与已登录用户读取已发布(released)版本（含平台过滤由应用端传参）
--     PostgreSQL 15+ 支持 CREATE POLICY ... IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'app_versions'
      AND policyname = 'app_versions_anon_read_released'
  ) THEN
    CREATE POLICY app_versions_anon_read_released
      ON app_versions
      FOR SELECT
      TO anon, authenticated
      USING (status = 'released');
  END IF;
END $$;

-- ------------------------------------------------------------
-- ④ 执行后复核
-- ------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'app_versions'
ORDER BY ordinal_position;

SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'app_versions';
