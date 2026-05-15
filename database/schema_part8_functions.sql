-- ============================================================
-- 纯享App后台管理系统 - 第八部分：数据清理和维护函数
-- 执行顺序：在所有表创建完成后执行
-- ============================================================

-- 创建清理过期会话的函数（可选，用于定时任务）
CREATE OR REPLACE FUNCTION clean_old_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM operation_logs 
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建更新统计数据的函数
-- 注：经检查，novel_chapters 表在 schema_part3_business.sql 第176行已创建，无错误
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

-- 创建触发器：章节变更时自动更新小说统计
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

CREATE TRIGGER trigger_update_novel_stats
    AFTER INSERT OR UPDATE OR DELETE ON novel_chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_novel_stats_trigger();
