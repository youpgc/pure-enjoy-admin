-- ============================================
-- 富文本内容页面表 (content_pages)
-- 用于管理关于我们、隐私政策、用户协议等富文本内容
-- ============================================

-- 创建表
CREATE TABLE IF NOT EXISTS content_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加表注释
COMMENT ON TABLE content_pages IS '富文本内容页面表，存储关于我们、隐私政策、用户协议等内容';
COMMENT ON COLUMN content_pages.id IS '主键ID';
COMMENT ON COLUMN content_pages.key IS '唯一标识键，如 about, privacy, terms';
COMMENT ON COLUMN content_pages.title IS '页面标题';
COMMENT ON COLUMN content_pages.content IS '富文本内容（HTML格式）';
COMMENT ON COLUMN content_pages.is_published IS '是否发布';
COMMENT ON COLUMN content_pages.created_at IS '创建时间';
COMMENT ON COLUMN content_pages.updated_at IS '更新时间';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_content_pages_key ON content_pages(key);
CREATE INDEX IF NOT EXISTS idx_content_pages_is_published ON content_pages(is_published);
CREATE INDEX IF NOT EXISTS idx_content_pages_updated_at ON content_pages(updated_at DESC);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_content_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_content_pages_updated_at ON content_pages;
CREATE TRIGGER trigger_content_pages_updated_at
    BEFORE UPDATE ON content_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_content_pages_updated_at();

-- 启用 RLS (行级安全)
ALTER TABLE content_pages ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
-- 允许所有用户读取已发布的内容
CREATE POLICY "允许读取已发布内容" ON content_pages
    FOR SELECT
    USING (is_published = true);

-- 允许认证用户读取所有内容（用于管理后台）
CREATE POLICY "允许认证用户读取所有内容" ON content_pages
    FOR SELECT
    TO authenticated
    USING (true);

-- 允许认证用户插入内容
CREATE POLICY "允许认证用户插入内容" ON content_pages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 允许认证用户更新内容
CREATE POLICY "允许认证用户更新内容" ON content_pages
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 允许认证用户删除内容
CREATE POLICY "允许认证用户删除内容" ON content_pages
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- 插入默认数据
-- ============================================

-- 关于我们
INSERT INTO content_pages (key, title, content, is_published) VALUES
('about', '关于我们', '<h1>关于我们</h1><p>欢迎使用纯享应用！</p><p>我们致力于为用户提供优质的内容和服务。</p>', true)
ON CONFLICT (key) DO NOTHING;

-- 隐私政策
INSERT INTO content_pages (key, title, content, is_published) VALUES
('privacy', '隐私政策', '<h1>隐私政策</h1><p>我们非常重视您的隐私保护。</p><p>本政策说明了我们如何收集、使用和保护您的个人信息。</p>', true)
ON CONFLICT (key) DO NOTHING;

-- 用户协议
INSERT INTO content_pages (key, title, content, is_published) VALUES
('terms', '用户协议', '<h1>用户协议</h1><p>欢迎使用我们的服务！</p><p>请仔细阅读以下条款，使用我们的服务即表示您同意这些条款。</p>', true)
ON CONFLICT (key) DO NOTHING;

-- 使用帮助
INSERT INTO content_pages (key, title, content, is_published) VALUES
('help', '使用帮助', '<h1>使用帮助</h1><p>这里提供了应用的详细使用说明。</p><p>如有问题，请联系客服。</p>', false)
ON CONFLICT (key) DO NOTHING;
