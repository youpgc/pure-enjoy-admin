-- ============================================================
-- 纯享App后台管理系统 - 第三部分：业务数据表
-- 执行顺序：在 part1, part2 之后执行
-- ============================================================

-- 消费记录表
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    note TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- 约束
    CONSTRAINT valid_amount CHECK (amount >= 0),
    CONSTRAINT valid_expense_category CHECK (category IN ('餐饮', '交通', '购物', '娱乐', '其他'))
);

COMMENT ON TABLE expenses IS '消费记录表';
COMMENT ON COLUMN expenses.category IS '分类：餐饮/交通/购物/娱乐/其他';

-- 消费记录表索引
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);

-- 消费记录表updated_at触发器
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 心情日记表
CREATE TABLE IF NOT EXISTS mood_diaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood VARCHAR(20) NOT NULL,
    mood_label VARCHAR(50),
    content TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- 约束
    CONSTRAINT valid_mood CHECK (mood IN ('开心', '平静', '一般', '难过', '焦虑'))
);

COMMENT ON TABLE mood_diaries IS '心情日记表';
COMMENT ON COLUMN mood_diaries.mood IS '心情：开心/平静/一般/难过/焦虑';

-- 心情日记表索引
CREATE INDEX IF NOT EXISTS idx_mood_diaries_user_id ON mood_diaries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_diaries_date ON mood_diaries(date);
CREATE INDEX IF NOT EXISTS idx_mood_diaries_user_date ON mood_diaries(user_id, date);

-- 心情日记表updated_at触发器
DROP TRIGGER IF EXISTS update_mood_diaries_updated_at ON mood_diaries;
CREATE TRIGGER update_mood_diaries_updated_at
    BEFORE UPDATE ON mood_diaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 体重记录表
CREATE TABLE IF NOT EXISTS weight_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL,
    bmi DECIMAL(4,2),
    body_fat DECIMAL(4,2),
    note TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- 约束
    CONSTRAINT valid_weight CHECK (weight > 0 AND weight < 1000),
    CONSTRAINT valid_bmi CHECK (bmi IS NULL OR (bmi >= 0 AND bmi <= 100)),
    CONSTRAINT valid_body_fat CHECK (body_fat IS NULL OR (body_fat >= 0 AND body_fat <= 100))
);

COMMENT ON TABLE weight_records IS '体重记录表';

-- 体重记录表索引
CREATE INDEX IF NOT EXISTS idx_weight_records_user_id ON weight_records(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_date ON weight_records(date);
CREATE INDEX IF NOT EXISTS idx_weight_records_user_date ON weight_records(user_id, date);

-- 体重记录表updated_at触发器
DROP TRIGGER IF EXISTS update_weight_records_updated_at ON weight_records;
CREATE TRIGGER update_weight_records_updated_at
    BEFORE UPDATE ON weight_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 笔记表
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category VARCHAR(50),
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE notes IS '笔记表';
COMMENT ON COLUMN notes.is_pinned IS '是否置顶';

-- 笔记表索引
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_user_pinned ON notes(user_id, is_pinned DESC);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);

-- 笔记表updated_at触发器
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 小说表
CREATE TABLE IF NOT EXISTS novels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100),
    source VARCHAR(100),
    source_url TEXT,
    cover_url TEXT,
    description TEXT,
    category VARCHAR(50),
    tags TEXT[],
    word_count INTEGER DEFAULT 0,
    chapter_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ongoing' NOT NULL,
    is_free BOOLEAN DEFAULT TRUE NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    rating DECIMAL(2,1),
    read_count INTEGER DEFAULT 0 NOT NULL,
    collect_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- 约束
    CONSTRAINT valid_novel_status CHECK (status IN ('ongoing', 'completed')),
    CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
    CONSTRAINT valid_novel_price CHECK (price >= 0)
);

COMMENT ON TABLE novels IS '小说表';
COMMENT ON COLUMN novels.user_id IS '所属用户ID（书架），NULL表示公共小说';
COMMENT ON COLUMN novels.status IS '状态：ongoing-连载中，completed-已完结';
COMMENT ON COLUMN novels.is_free IS '是否免费';

-- 小说表索引
CREATE INDEX IF NOT EXISTS idx_novels_user_id ON novels(user_id);
CREATE INDEX IF NOT EXISTS idx_novels_category ON novels(category);
CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status);
CREATE INDEX IF NOT EXISTS idx_novels_is_free ON novels(is_free);
CREATE INDEX IF NOT EXISTS idx_novels_tags ON novels USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_novels_read_count ON novels(read_count DESC);
CREATE INDEX IF NOT EXISTS idx_novels_collect_count ON novels(collect_count DESC);

-- 小说表updated_at触发器
DROP TRIGGER IF EXISTS update_novels_updated_at ON novels;
CREATE TRIGGER update_novels_updated_at
    BEFORE UPDATE ON novels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 小说章节表
CREATE TABLE IF NOT EXISTS novel_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_num INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT TRUE NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- 约束
    CONSTRAINT unique_chapter UNIQUE (novel_id, chapter_num),
    CONSTRAINT valid_chapter_price CHECK (price >= 0)
);

COMMENT ON TABLE novel_chapters IS '小说章节表';
COMMENT ON COLUMN novel_chapters.is_free IS '章节是否免费';

-- 小说章节表索引
CREATE INDEX IF NOT EXISTS idx_novel_chapters_novel_id ON novel_chapters(novel_id);
CREATE INDEX IF NOT EXISTS idx_novel_chapters_chapter_num ON novel_chapters(novel_id, chapter_num);

-- 用户书架关联表
CREATE TABLE IF NOT EXISTS user_novels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    progress DECIMAL(5,4) DEFAULT 0 NOT NULL,
    last_chapter INTEGER DEFAULT 0 NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE,
    is_collected BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- 约束
    CONSTRAINT unique_user_novel UNIQUE (user_id, novel_id),
    CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 1)
);

COMMENT ON TABLE user_novels IS '用户书架关联表';
COMMENT ON COLUMN user_novels.progress IS '阅读进度 0-1';
COMMENT ON COLUMN user_novels.is_collected IS '是否收藏';

-- 用户书架关联表索引
CREATE INDEX IF NOT EXISTS idx_user_novels_user_id ON user_novels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_novels_novel_id ON user_novels(novel_id);
CREATE INDEX IF NOT EXISTS idx_user_novels_collected ON user_novels(user_id, is_collected);

-- 用户书架关联表updated_at触发器
DROP TRIGGER IF EXISTS update_user_novels_updated_at ON user_novels;
CREATE TRIGGER update_user_novels_updated_at
    BEFORE UPDATE ON user_novels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- App版本表
CREATE TABLE IF NOT EXISTS app_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    build_number INTEGER NOT NULL,
    release_type VARCHAR(20) NOT NULL,
    release_notes TEXT,
    apk_url TEXT,
    apk_size INTEGER,
    status VARCHAR(20) DEFAULT 'draft' NOT NULL,
    released_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by VARCHAR(32) REFERENCES users(id) ON DELETE SET NULL,

    -- 约束
    CONSTRAINT valid_release_type CHECK (release_type IN ('hotfix', 'feature', 'force')),
    CONSTRAINT valid_version_status CHECK (status IN ('draft', 'released', 'revoked')),
    CONSTRAINT unique_version_build UNIQUE (version, build_number)
);

COMMENT ON TABLE app_versions IS 'App版本表';
COMMENT ON COLUMN app_versions.release_type IS '发布类型：hotfix-热修复，feature-功能更新，force-强制更新';
COMMENT ON COLUMN app_versions.status IS '状态：draft-草稿，released-已发布，revoked-已撤销';

-- App版本表索引
CREATE INDEX IF NOT EXISTS idx_app_versions_status ON app_versions(status);
CREATE INDEX IF NOT EXISTS idx_app_versions_created_at ON app_versions(created_at DESC);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50),
    target_id VARCHAR(100),
    details JSONB,
    ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE operation_logs IS '操作日志表';
COMMENT ON COLUMN operation_logs.action IS '操作类型';
COMMENT ON COLUMN operation_logs.target_id IS '操作目标ID';

-- 操作日志表索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_module ON operation_logs(module);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);
CREATE INDEX IF NOT EXISTS idx_operation_logs_details ON operation_logs USING GIN(details);
