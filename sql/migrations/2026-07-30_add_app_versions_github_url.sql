-- 版本更新功能：为 app_versions 增加 github_url 备份下载源字段
-- 应用端(version_check_service.dart)以 github_url 作为 Gitee 主源失败时的备用下载源(fallbackUrl)。
-- 管理后台(VersionFormModal)已暴露该输入项并随版本记录一并落库。
-- 需在 Supabase 云端库执行以下 DDL（App 端 ApiClient.get 默认 select *，加列后即可返回）。

ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS github_url text;

COMMENT ON COLUMN app_versions.github_url IS '备用下载源（GitHub Releases 直链），主源(Gitee apk_url)失败时回退';

-- 说明：app_versions 表对匿名角色(anon)需开放 select 权限，
-- 否则 App 启动时检查更新(未登录态也可能触发)会静默失败。
-- 若尚未开放，请确认 RLS policy 允许 anon 读取 status='released' 的行。
