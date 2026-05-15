-- ============================================================
-- 修复脚本：为已存在的表添加缺失的列、索引和约束
-- 用于修复旧数据库，使其与 schema_complete.sql 一致
-- 使用前请备份数据库！
-- ============================================================

DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '开始修复数据库表结构...';
    RAISE NOTICE '========================================';

    -- ============================================================
    -- 1. 修复 users 表
    -- ============================================================
    RAISE NOTICE '修复 users 表...';

    -- 添加缺失的列
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS member_level VARCHAR(20) DEFAULT 'normal' NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0 NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS register_ip VARCHAR(45);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0 NOT NULL;

    -- 添加缺失的约束
    -- 检查并添加 valid_role 约束
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_role'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT valid_role CHECK (role IN ('user', 'admin', 'super_admin'));
    END IF;

    -- 检查并添加 valid_member_level 约束
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_member_level'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT valid_member_level CHECK (member_level IN ('normal', 'member', 'super_member'));
    END IF;

    -- 检查并添加 valid_status 约束
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_status'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT valid_status CHECK (status IN ('active', 'abnormal', 'disabled', 'banned'));
    END IF;

    -- ============================================================
    -- 2. 修复 notes 表
    -- ============================================================
    RAISE NOTICE '修复 notes 表...';

    ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags TEXT[];
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE NOT NULL;

    -- ============================================================
    -- 3. 修复 novels 表
    -- ============================================================
    RAISE NOTICE '修复 novels 表...';

    -- 添加缺失的列
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS user_id VARCHAR(32);
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS source VARCHAR(100);
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS source_url TEXT;
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS cover_url TEXT;
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS tags TEXT[];
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS chapter_count INTEGER DEFAULT 0;
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT TRUE NOT NULL;
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0;
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1);
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0 NOT NULL;
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS collect_count INTEGER DEFAULT 0 NOT NULL;

    -- 添加缺失的约束
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_novel_status'
    ) THEN
        ALTER TABLE novels ADD CONSTRAINT valid_novel_status CHECK (status IN ('ongoing', 'completed'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_rating'
    ) THEN
        ALTER TABLE novels ADD CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_novel_price'
    ) THEN
        ALTER TABLE novels ADD CONSTRAINT valid_novel_price CHECK (price >= 0);
    END IF;

    -- ============================================================
    -- 4. 修复 user_novels 表
    -- ============================================================
    RAISE NOTICE '修复 user_novels 表...';

    ALTER TABLE user_novels ADD COLUMN IF NOT EXISTS user_id VARCHAR(32);
    ALTER TABLE user_novels ADD COLUMN IF NOT EXISTS novel_id UUID;
    ALTER TABLE user_novels ADD COLUMN IF NOT EXISTS progress DECIMAL(5,4) DEFAULT 0 NOT NULL;
    ALTER TABLE user_novels ADD COLUMN IF NOT EXISTS last_chapter INTEGER DEFAULT 0 NOT NULL;
    ALTER TABLE user_novels ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE user_novels ADD COLUMN IF NOT EXISTS is_collected BOOLEAN DEFAULT FALSE NOT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_novel'
    ) THEN
        ALTER TABLE user_novels ADD CONSTRAINT unique_user_novel UNIQUE (user_id, novel_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_progress'
    ) THEN
        ALTER TABLE user_novels ADD CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 1);
    END IF;

    -- ============================================================
    -- 5. 修复 app_versions 表
    -- ============================================================
    RAISE NOTICE '修复 app_versions 表...';

    ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS release_notes TEXT;
    ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS apk_url TEXT;
    ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS apk_size INTEGER;
    ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' NOT NULL;
    ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS created_by VARCHAR(32);

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_release_type'
    ) THEN
        ALTER TABLE app_versions ADD CONSTRAINT valid_release_type CHECK (release_type IN ('hotfix', 'feature', 'force'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_version_status'
    ) THEN
        ALTER TABLE app_versions ADD CONSTRAINT valid_version_status CHECK (status IN ('draft', 'released', 'revoked'));
    END IF;

    -- ============================================================
    -- 6. 修复 operation_logs 表
    -- ============================================================
    RAISE NOTICE '修复 operation_logs 表...';

    ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS user_id VARCHAR(32);
    ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS action VARCHAR(100);
    ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS module VARCHAR(50);
    ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS target_id VARCHAR(100);
    ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS details JSONB;
    ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS ip VARCHAR(45);
    ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

END $$;

-- ============================================================
-- 2. 添加缺失的索引
-- ============================================================

DO $$
DECLARE
    index_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '添加缺失的索引...';
    RAISE NOTICE '========================================';

    -- users 表索引
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
    CREATE INDEX IF NOT EXISTS idx_users_member_level ON users(member_level);

    -- expenses 表索引
    CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_expenses_user_date_category ON expenses(user_id, date, category);

    -- mood_diaries 表索引
    CREATE INDEX IF NOT EXISTS idx_mood_diaries_user_id ON mood_diaries(user_id);
    CREATE INDEX IF NOT EXISTS idx_mood_diaries_date ON mood_diaries(date);
    CREATE INDEX IF NOT EXISTS idx_mood_diaries_user_date ON mood_diaries(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_mood_diaries_user_mood ON mood_diaries(user_id, mood);

    -- weight_records 表索引
    CREATE INDEX IF NOT EXISTS idx_weight_records_user_id ON weight_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_weight_records_date ON weight_records(date);
    CREATE INDEX IF NOT EXISTS idx_weight_records_user_date ON weight_records(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_weight_records_user_date_desc ON weight_records(user_id, date DESC);

    -- notes 表索引
    CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
    CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);
    CREATE INDEX IF NOT EXISTS idx_notes_user_pinned ON notes(user_id, is_pinned DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);
    CREATE INDEX IF NOT EXISTS idx_notes_user_created_desc ON notes(user_id, created_at DESC);

    -- novels 表索引
    CREATE INDEX IF NOT EXISTS idx_novels_user_id ON novels(user_id);
    CREATE INDEX IF NOT EXISTS idx_novels_category ON novels(category);
    CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status);
    CREATE INDEX IF NOT EXISTS idx_novels_is_free ON novels(is_free);
    CREATE INDEX IF NOT EXISTS idx_novels_tags ON novels USING GIN(tags);
    CREATE INDEX IF NOT EXISTS idx_novels_read_count ON novels(read_count DESC);
    CREATE INDEX IF NOT EXISTS idx_novels_collect_count ON novels(collect_count DESC);
    CREATE INDEX IF NOT EXISTS idx_novels_status_created ON novels(status, created_at DESC);

    -- novel_chapters 表索引
    CREATE INDEX IF NOT EXISTS idx_novel_chapters_novel_id ON novel_chapters(novel_id);
    CREATE INDEX IF NOT EXISTS idx_novel_chapters_chapter_num ON novel_chapters(novel_id, chapter_num);

    -- user_novels 表索引
    CREATE INDEX IF NOT EXISTS idx_user_novels_user_id ON user_novels(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_novels_novel_id ON user_novels(novel_id);
    CREATE INDEX IF NOT EXISTS idx_user_novels_collected ON user_novels(user_id, is_collected);

    -- app_versions 表索引
    CREATE INDEX IF NOT EXISTS idx_app_versions_status ON app_versions(status);
    CREATE INDEX IF NOT EXISTS idx_app_versions_created_at ON app_versions(created_at DESC);

    -- operation_logs 表索引
    CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_module ON operation_logs(module);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_details ON operation_logs USING GIN(details);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_user_created ON operation_logs(user_id, created_at DESC);

END $$;

-- ============================================================
-- 3. 重新创建触发器（删除旧的，创建新的）
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '重新创建 updated_at 触发器...';
    RAISE NOTICE '========================================';

    -- users 表触发器
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- expenses 表触发器
    DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
    CREATE TRIGGER update_expenses_updated_at
        BEFORE UPDATE ON expenses
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- mood_diaries 表触发器
    DROP TRIGGER IF EXISTS update_mood_diaries_updated_at ON mood_diaries;
    CREATE TRIGGER update_mood_diaries_updated_at
        BEFORE UPDATE ON mood_diaries
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- weight_records 表触发器
    DROP TRIGGER IF EXISTS update_weight_records_updated_at ON weight_records;
    CREATE TRIGGER update_weight_records_updated_at
        BEFORE UPDATE ON weight_records
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- notes 表触发器
    DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
    CREATE TRIGGER update_notes_updated_at
        BEFORE UPDATE ON notes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- novels 表触发器
    DROP TRIGGER IF EXISTS update_novels_updated_at ON novels;
    CREATE TRIGGER update_novels_updated_at
        BEFORE UPDATE ON novels
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- user_novels 表触发器
    DROP TRIGGER IF EXISTS update_user_novels_updated_at ON user_novels;
    CREATE TRIGGER update_user_novels_updated_at
        BEFORE UPDATE ON user_novels
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

END $$;

-- ============================================================
-- 4. 启用 RLS（如果尚未启用）
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '启用 Row Level Security...';
    RAISE NOTICE '========================================';

    -- 启用 RLS
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

END $$;

-- ============================================================
-- 5. 重新创建 RLS 策略（先删除旧的，再创建新的）
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '重新创建 RLS 策略...';
    RAISE NOTICE '========================================';

    -- 删除所有现有的 RLS 策略
    -- users
    DROP POLICY IF EXISTS "用户可以查看自己的信息" ON users;
    DROP POLICY IF EXISTS "管理员可以查看所有用户" ON users;
    DROP POLICY IF EXISTS "用户可以更新自己的信息" ON users;
    DROP POLICY IF EXISTS "管理员可以更新所有用户" ON users;
    DROP POLICY IF EXISTS "超级管理员可以插入用户" ON users;
    DROP POLICY IF EXISTS "超级管理员可以删除用户" ON users;

    -- expenses
    DROP POLICY IF EXISTS "用户可以查看自己的消费记录" ON expenses;
    DROP POLICY IF EXISTS "用户可以创建自己的消费记录" ON expenses;
    DROP POLICY IF EXISTS "用户可以更新自己的消费记录" ON expenses;
    DROP POLICY IF EXISTS "用户可以删除自己的消费记录" ON expenses;

    -- mood_diaries
    DROP POLICY IF EXISTS "用户可以查看自己的心情日记" ON mood_diaries;
    DROP POLICY IF EXISTS "用户可以创建自己的心情日记" ON mood_diaries;
    DROP POLICY IF EXISTS "用户可以更新自己的心情日记" ON mood_diaries;
    DROP POLICY IF EXISTS "用户可以删除自己的心情日记" ON mood_diaries;

    -- weight_records
    DROP POLICY IF EXISTS "用户可以查看自己的体重记录" ON weight_records;
    DROP POLICY IF EXISTS "用户可以创建自己的体重记录" ON weight_records;
    DROP POLICY IF EXISTS "用户可以更新自己的体重记录" ON weight_records;
    DROP POLICY IF EXISTS "用户可以删除自己的体重记录" ON weight_records;

    -- notes
    DROP POLICY IF EXISTS "用户可以查看自己的笔记" ON notes;
    DROP POLICY IF EXISTS "用户可以创建自己的笔记" ON notes;
    DROP POLICY IF EXISTS "用户可以更新自己的笔记" ON notes;
    DROP POLICY IF EXISTS "用户可以删除自己的笔记" ON notes;

    -- novels
    DROP POLICY IF EXISTS "用户可以查看公共小说和自己的小说" ON novels;
    DROP POLICY IF EXISTS "管理员可以创建小说" ON novels;
    DROP POLICY IF EXISTS "管理员可以更新小说" ON novels;
    DROP POLICY IF EXISTS "超级管理员可以删除小说" ON novels;

    -- novel_chapters
    DROP POLICY IF EXISTS "用户可以查看小说章节" ON novel_chapters;
    DROP POLICY IF EXISTS "管理员可以管理小说章节" ON novel_chapters;

    -- user_novels
    DROP POLICY IF EXISTS "用户可以查看自己的书架" ON user_novels;
    DROP POLICY IF EXISTS "用户可以添加小说到书架" ON user_novels;
    DROP POLICY IF EXISTS "用户可以更新自己的阅读进度" ON user_novels;
    DROP POLICY IF EXISTS "用户可以从书架移除小说" ON user_novels;

    -- app_versions
    DROP POLICY IF EXISTS "所有用户可以查看已发布的版本" ON app_versions;
    DROP POLICY IF EXISTS "管理员可以管理版本" ON app_versions;
    DROP POLICY IF EXISTS "管理员可以更新版本" ON app_versions;
    DROP POLICY IF EXISTS "超级管理员可以删除版本" ON app_versions;

    -- operation_logs
    DROP POLICY IF EXISTS "管理员可以查看操作日志" ON operation_logs;
    DROP POLICY IF EXISTS "系统可以插入操作日志" ON operation_logs;

END $$;

-- 创建辅助函数
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

-- 创建 RLS 策略
-- users 表
CREATE POLICY "用户可以查看自己的信息" ON users FOR SELECT USING (id = auth.uid()::TEXT);
CREATE POLICY "管理员可以查看所有用户" ON users FOR SELECT USING (is_admin());
CREATE POLICY "用户可以更新自己的信息" ON users FOR UPDATE USING (id = auth.uid()::TEXT);
CREATE POLICY "管理员可以更新所有用户" ON users FOR UPDATE USING (is_admin());
CREATE POLICY "超级管理员可以插入用户" ON users FOR INSERT WITH CHECK (is_super_admin() OR id = auth.uid()::TEXT);
CREATE POLICY "超级管理员可以删除用户" ON users FOR DELETE USING (is_super_admin());

-- expenses 表
CREATE POLICY "用户可以查看自己的消费记录" ON expenses FOR SELECT USING (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以创建自己的消费记录" ON expenses FOR INSERT WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以更新自己的消费记录" ON expenses FOR UPDATE USING (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以删除自己的消费记录" ON expenses FOR DELETE USING (user_id = auth.uid()::TEXT OR is_admin());

-- mood_diaries 表
CREATE POLICY "用户可以查看自己的心情日记" ON mood_diaries FOR SELECT USING (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以创建自己的心情日记" ON mood_diaries FOR INSERT WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以更新自己的心情日记" ON mood_diaries FOR UPDATE USING (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以删除自己的心情日记" ON mood_diaries FOR DELETE USING (user_id = auth.uid()::TEXT OR is_admin());

-- weight_records 表
CREATE POLICY "用户可以查看自己的体重记录" ON weight_records FOR SELECT USING (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以创建自己的体重记录" ON weight_records FOR INSERT WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以更新自己的体重记录" ON weight_records FOR UPDATE USING (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以删除自己的体重记录" ON weight_records FOR DELETE USING (user_id = auth.uid()::TEXT OR is_admin());

-- notes 表
CREATE POLICY "用户可以查看自己的笔记" ON notes FOR SELECT USING (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以创建自己的笔记" ON notes FOR INSERT WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以更新自己的笔记" ON notes FOR UPDATE USING (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以删除自己的笔记" ON notes FOR DELETE USING (user_id = auth.uid()::TEXT OR is_admin());

-- novels 表
CREATE POLICY "用户可以查看公共小说和自己的小说" ON novels FOR SELECT USING (user_id IS NULL OR user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "管理员可以创建小说" ON novels FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "管理员可以更新小说" ON novels FOR UPDATE USING (is_admin());
CREATE POLICY "超级管理员可以删除小说" ON novels FOR DELETE USING (is_super_admin());

-- novel_chapters 表
CREATE POLICY "用户可以查看小说章节" ON novel_chapters FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM novels
        WHERE novels.id = novel_chapters.novel_id
        AND (novels.user_id IS NULL OR novels.user_id = auth.uid()::TEXT OR is_admin())
    )
);
CREATE POLICY "管理员可以管理小说章节" ON novel_chapters FOR ALL USING (is_admin());

-- user_novels 表
CREATE POLICY "用户可以查看自己的书架" ON user_novels FOR SELECT USING (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以添加小说到书架" ON user_novels FOR INSERT WITH CHECK (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以更新自己的阅读进度" ON user_novels FOR UPDATE USING (user_id = auth.uid()::TEXT OR is_admin());
CREATE POLICY "用户可以从书架移除小说" ON user_novels FOR DELETE USING (user_id = auth.uid()::TEXT OR is_admin());

-- app_versions 表
CREATE POLICY "所有用户可以查看已发布的版本" ON app_versions FOR SELECT USING (status = 'released' OR is_admin());
CREATE POLICY "管理员可以管理版本" ON app_versions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "管理员可以更新版本" ON app_versions FOR UPDATE USING (is_admin());
CREATE POLICY "超级管理员可以删除版本" ON app_versions FOR DELETE USING (is_super_admin());

-- operation_logs 表
CREATE POLICY "管理员可以查看操作日志" ON operation_logs FOR SELECT USING (is_admin());
CREATE POLICY "系统可以插入操作日志" ON operation_logs FOR INSERT WITH CHECK (is_admin() OR user_id = auth.uid()::TEXT);

-- ============================================================
-- 6. 重新创建小说统计触发器
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '重新创建小说统计触发器...';
    RAISE NOTICE '========================================';

    -- 更新小说统计函数
    CREATE OR REPLACE FUNCTION update_novel_stats(p_novel_id UUID)
    RETURNS VOID AS $$
    BEGIN
        UPDATE novels
        SET chapter_count = (
            SELECT COUNT(*) FROM novel_chapters WHERE novel_id = p_novel_id
        ),
        word_count = (
            SELECT COALESCE(SUM(word_count), 0) FROM novel_chapters WHERE novel_id = p_novel_id
        )
        WHERE id = p_novel_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 更新小说统计触发器函数
    CREATE OR REPLACE FUNCTION update_novel_stats_trigger()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'INSERT' THEN
            PERFORM update_novel_stats(NEW.novel_id);
        ELSIF TG_OP = 'UPDATE' THEN
            PERFORM update_novel_stats(NEW.novel_id);
            IF NEW.novel_id != OLD.novel_id THEN
                PERFORM update_novel_stats(OLD.novel_id);
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            PERFORM update_novel_stats(OLD.novel_id);
        END IF;
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- 删除并重建触发器
    DROP TRIGGER IF EXISTS trigger_update_novel_stats ON novel_chapters;
    CREATE TRIGGER trigger_update_novel_stats
        AFTER INSERT OR UPDATE OR DELETE ON novel_chapters
        FOR EACH ROW
        EXECUTE FUNCTION update_novel_stats_trigger();

END $$;

-- ============================================================
-- 7. 验证表结构
-- ============================================================

DO $$
DECLARE
    tbl TEXT;
    col_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '验证表结构...';
    RAISE NOTICE '========================================';

    -- 检查 users
    SELECT COUNT(*) INTO col_count FROM information_schema.columns
    WHERE table_name = 'users';
    RAISE NOTICE 'users: % 列', col_count;

    -- 检查 expenses
    SELECT COUNT(*) INTO col_count FROM information_schema.columns
    WHERE table_name = 'expenses';
    RAISE NOTICE 'expenses: % 列', col_count;

    -- 检查 mood_diaries
    SELECT COUNT(*) INTO col_count FROM information_schema.columns
    WHERE table_name = 'mood_diaries';
    RAISE NOTICE 'mood_diaries: % 列', col_count;

    -- 检查 weight_records
    SELECT COUNT(*) INTO col_count FROM information_schema.columns
    WHERE table_name = 'weight_records';
    RAISE NOTICE 'weight_records: % 列', col_count;

    -- 检查 notes
    SELECT COUNT(*) INTO col_count FROM information_schema.columns
    WHERE table_name = 'notes';
    RAISE NOTICE 'notes: % 列', col_count;

    -- 检查 novels
    SELECT COUNT(*) INTO col_count FROM information_schema.columns
    WHERE table_name = 'novels';
    RAISE NOTICE 'novels: % 列', col_count;

    -- 检查 novel_chapters
    SELECT COUNT(*) INTO col_count FROM information_schema.columns
    WHERE table_name = 'novel_chapters';
    RAISE NOTICE 'novel_chapters: % 列', col_count;

    -- 检查 user_novels
    SELECT COUNT(*) INTO col_count FROM information_schema.columns
    WHERE table_name = 'user_novels';
    RAISE NOTICE 'user_novels: % 列', col_count;

    -- 检查 app_versions
    SELECT COUNT(*) INTO col_count FROM information_schema.columns
    WHERE table_name = 'app_versions';
    RAISE NOTICE 'app_versions: % 列', col_count;

    -- 检查 operation_logs
    SELECT COUNT(*) INTO col_count FROM information_schema.columns
    WHERE table_name = 'operation_logs';
    RAISE NOTICE 'operation_logs: % 列', col_count;

    RAISE NOTICE '========================================';
    RAISE NOTICE '数据库修复完成！';
    RAISE NOTICE '========================================';
END $$;
