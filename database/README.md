# 纯享App后台管理系统 - 数据库初始化指南

## 说明

由于 Supabase REST API 不支持直接执行 DDL（数据定义语言）SQL 语句，需要通过 Supabase Dashboard 的 SQL Editor 手动执行以下 SQL 文件。

## 执行顺序

请严格按照以下顺序执行 SQL 文件：

### 第一步：基础表（必须首先执行）
**文件：** `schema_part1_basics.sql`

创建内容：
- UUID 扩展
- `update_updated_at_column()` 函数
- `roles` 角色表
- `permissions` 权限表
- `role_permissions` 角色权限关联表

### 第二步：用户表
**文件：** `schema_part2_users.sql`

创建内容：
- `users` 用户表
- 用户表索引
- 用户表触发器

### 第三步：业务数据表
**文件：** `schema_part3_business.sql`

创建内容：
- `expenses` 消费记录表
- `mood_diaries` 心情日记表
- `weight_records` 体重记录表
- `notes` 笔记表
- `novels` 小说表
- `novel_chapters` 小说章节表
- `user_novels` 用户书架关联表
- `app_versions` App版本表
- `operation_logs` 操作日志表
- 各表的索引和触发器

### 第四步：初始数据
**文件：** `schema_part4_data.sql`

插入内容：
- 3个角色：普通用户(user)、管理员(admin)、超级管理员(super_admin)
- 32个权限（涵盖用户、消费记录、心情日记、体重记录、笔记、小说、版本管理、系统管理等模块）
- 角色权限关联数据

### 第五步：RLS 策略
**文件：** `schema_part5_rls.sql`

创建内容：
- 启用所有表的 RLS (Row Level Security)
- `is_admin()` 辅助函数
- `is_super_admin()` 辅助函数
- `get_current_user_role()` 辅助函数
- 各表的 RLS 策略（SELECT/INSERT/UPDATE/DELETE）

### 第六步：视图和存储过程
**文件：** `schema_part6_views.sql`

创建内容：
- `user_stats` 用户统计视图
- `system_overview` 系统概览视图
- `daily_stats` 每日活跃统计视图
- `create_user()` 创建用户函数
- `update_login_info()` 更新登录信息函数
- `log_operation()` 记录操作日志函数
- `get_user_permissions()` 获取用户权限函数
- `has_permission()` 检查权限函数

### 第七步：性能优化索引
**文件：** `schema_part7_indexes.sql`

创建内容：
- 复合索引优化常用查询

### 第八步：数据清理和维护函数
**文件：** `schema_part8_functions.sql`

创建内容：
- `clean_old_logs()` 清理旧日志函数
- `update_novel_stats()` 更新小说统计函数
- `update_novel_stats_trigger()` 小说统计自动更新触发器

## 执行方法

1. 登录 Supabase Dashboard: https://app.supabase.com
2. 选择项目: `mhdrbjpqmzswswoazwjg`
3. 进入 SQL Editor
4. 按顺序打开每个 SQL 文件，复制内容粘贴到 SQL Editor
5. 点击 "Run" 执行

## 验证

执行完成后，可以运行以下查询验证：

```sql
-- 查看所有表
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- 查看角色数据
SELECT * FROM roles;

-- 查看权限数量
SELECT COUNT(*) as permission_count FROM permissions;

-- 查看角色权限关联
SELECT r.name as role_name, COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name;
```

## 文件清单

| 文件 | 说明 | 执行顺序 |
|------|------|----------|
| schema_part1_basics.sql | 基础表（角色、权限） | 1 |
| schema_part2_users.sql | 用户表 | 2 |
| schema_part3_business.sql | 业务数据表 | 3 |
| schema_part4_data.sql | 初始数据 | 4 |
| schema_part5_rls.sql | RLS 策略 | 5 |
| schema_part6_views.sql | 视图和存储过程 | 6 |
| schema_part7_indexes.sql | 性能优化索引 | 7 |
| schema_part8_functions.sql | 维护函数 | 8 |
| schema.sql | 完整脚本（备用） | - |

## 注意事项

1. **必须按顺序执行**：后续 SQL 依赖于前面创建的表和函数
2. **检查错误**：每执行完一个文件，检查是否有错误信息
3. **幂等性**：所有 SQL 都使用了 `IF NOT EXISTS` 或 `ON CONFLICT DO NOTHING`，可以安全地重复执行
4. **RLS 策略**：执行完 RLS 策略后，普通用户只能访问自己的数据
