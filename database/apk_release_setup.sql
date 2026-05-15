-- =============================================================================
-- APK 发布系统补充配置
-- 在 schema_all_in_one.sql 基础上添加缺失的功能
-- =============================================================================

-- 1. 为 app_versions 表添加缺失的列
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS download_url TEXT;
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS checksum VARCHAR(64);
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS is_force_update BOOLEAN DEFAULT FALSE;
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'android';
ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);

-- 2. 创建获取最新版本函数
CREATE OR REPLACE FUNCTION get_latest_version(p_platform VARCHAR DEFAULT 'android')
RETURNS TABLE (
    id INTEGER,
    version VARCHAR,
    build_number INTEGER,
    download_url TEXT,
    release_notes TEXT,
    is_force_update BOOLEAN,
    file_size BIGINT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        av.id,
        av.version,
        av.build_number,
        av.download_url,
        av.release_notes,
        av.is_force_update,
        av.file_size,
        av.created_at
    FROM app_versions av
    WHERE av.status = 'released'
      AND (p_platform IS NULL OR av.release_type = p_platform)
    ORDER BY av.build_number DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建检查更新函数
CREATE OR REPLACE FUNCTION check_update(current_version VARCHAR, current_build INTEGER)
RETURNS TABLE (
    has_update BOOLEAN,
    is_force BOOLEAN,
    latest_version VARCHAR,
    download_url TEXT,
    release_notes TEXT
) AS $$
DECLARE
    latest RECORD;
BEGIN
    SELECT * INTO latest
    FROM app_versions
    WHERE status = 'released'
    ORDER BY build_number DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, false, NULL::VARCHAR, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    RETURN QUERY SELECT
        (latest.build_number > current_build)::BOOLEAN,
        latest.is_force_update::BOOLEAN,
        latest.version::VARCHAR,
        latest.download_url::TEXT,
        latest.release_notes::TEXT;
END;
$$ LANGUAGE plpgsql;
