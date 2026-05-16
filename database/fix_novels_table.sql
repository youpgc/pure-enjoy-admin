-- ============================================================
-- 修复 novels 表缺失字段
-- 执行环境：Supabase SQL Editor
-- ============================================================

-- 添加 novels 表可能缺失的字段
ALTER TABLE novels ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE novels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 添加其他可能缺失的字段
ALTER TABLE novels ADD COLUMN IF NOT EXISTS user_id VARCHAR(32) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE novels ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE novels ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT TRUE;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1);
ALTER TABLE novels ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0;
ALTER TABLE novels ADD COLUMN IF NOT EXISTS collect_count INTEGER DEFAULT 0;

-- 为已有记录填充 created_at
UPDATE novels SET created_at = NOW() WHERE created_at IS NULL;
UPDATE novels SET updated_at = NOW() WHERE updated_at IS NULL;

-- ============================================================
-- 验证
-- ============================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'novels' 
ORDER BY ordinal_position;
