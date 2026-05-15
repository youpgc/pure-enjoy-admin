-- ============================================================
-- 纯享App后台管理系统 - 第六部分：视图和存储过程
-- 执行顺序：在 part1, part2, part3, part4, part5 之后执行
-- ============================================================

-- 7.1 用户统计视图
-- 注：经检查，users.id 和 expenses.user_id 都是 VARCHAR(32)，类型匹配
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.nickname,
    u.role,
    u.member_level,
    u.status,
    COUNT(DISTINCT e.id) as expense_count,
    COUNT(DISTINCT md.id) as mood_count,
    COUNT(DISTINCT wr.id) as weight_count,
    COUNT(DISTINCT n.id) as note_count,
    COUNT(DISTINCT un.id) as novel_count,
    u.created_at,
    u.last_login_at
FROM users u
LEFT JOIN expenses e ON u.id = e.user_id
LEFT JOIN mood_diaries md ON u.id = md.user_id
LEFT JOIN weight_records wr ON u.id = wr.user_id
LEFT JOIN notes n ON u.id = n.user_id
LEFT JOIN user_novels un ON u.id = un.user_id
GROUP BY u.id;

-- 7.2 系统概览视图
CREATE OR REPLACE VIEW system_overview AS
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_count,
    (SELECT COUNT(*) FROM users WHERE member_level != 'normal') as member_count,
    (SELECT COUNT(*) FROM expenses) as total_expenses,
    (SELECT COUNT(*) FROM mood_diaries) as total_mood_diaries,
    (SELECT COUNT(*) FROM weight_records) as total_weight_records,
    (SELECT COUNT(*) FROM notes) as total_notes,
    (SELECT COUNT(*) FROM novels) as total_novels,
    (SELECT COUNT(*) FROM app_versions WHERE status = 'released') as released_versions;

-- 7.3 每日活跃统计视图
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
    DATE(created_at) as date,
    (SELECT COUNT(*) FROM users u WHERE DATE(u.created_at) = DATE(e.created_at)) as new_users,
    COUNT(DISTINCT e.user_id) as active_users,
    COUNT(*) as expense_count,
    (SELECT COUNT(*) FROM mood_diaries md WHERE DATE(md.created_at) = DATE(e.created_at)) as mood_count,
    (SELECT COUNT(*) FROM weight_records wr WHERE DATE(wr.created_at) = DATE(e.created_at)) as weight_count,
    (SELECT COUNT(*) FROM notes n WHERE DATE(n.created_at) = DATE(e.created_at)) as note_count
FROM expenses e
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 7.4 创建用户存储过程
CREATE OR REPLACE FUNCTION create_user(
    p_id VARCHAR(32),
    p_email VARCHAR(255),
    p_phone VARCHAR(20),
    p_password_hash VARCHAR(255),
    p_nickname VARCHAR(50),
    p_avatar_url TEXT,
    p_register_ip VARCHAR(45)
)
RETURNS VARCHAR(32) AS $$
BEGIN
    INSERT INTO users (id, email, phone, password_hash, nickname, avatar_url, register_ip)
    VALUES (p_id, p_email, p_phone, p_password_hash, p_nickname, p_avatar_url, p_register_ip);
    RETURN p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.5 更新用户登录信息存储过程
CREATE OR REPLACE FUNCTION update_login_info(
    p_user_id VARCHAR(32),
    p_login_ip VARCHAR(45)
)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET last_login_ip = p_login_ip,
        last_login_at = NOW(),
        login_count = login_count + 1
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.6 记录操作日志存储过程
CREATE OR REPLACE FUNCTION log_operation(
    p_user_id VARCHAR(32),
    p_action VARCHAR(100),
    p_module VARCHAR(50),
    p_target_id VARCHAR(100),
    p_details JSONB,
    p_ip VARCHAR(45),
    p_user_agent TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO operation_logs (user_id, action, module, target_id, details, ip, user_agent)
    VALUES (p_user_id, p_action, p_module, p_target_id, p_details, p_ip, p_user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.7 获取用户权限列表函数
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id VARCHAR(32))
RETURNS TABLE(name VARCHAR(100), display_name VARCHAR(100), module VARCHAR(50), action VARCHAR(20)) AS $$
BEGIN
    RETURN QUERY
    SELECT p.name, p.display_name, p.module, p.action
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN roles r ON rp.role_id = r.id
    JOIN users u ON u.role = r.name
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7.8 检查用户是否有特定权限
CREATE OR REPLACE FUNCTION has_permission(p_user_id VARCHAR(32), p_permission_name VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        JOIN users u ON u.role = r.name
        WHERE u.id = p_user_id AND p.name = p_permission_name
    ) INTO has_perm;
    
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
