# 数据库迁移说明：app_configs 表

## 基本信息

| 项目 | 内容 |
|------|------|
| 迁移文件 | `create_app_configs.sql` |
| 创建日期 | 2026-05-28 |
| 目标数据库 | Supabase PostgreSQL |
| 迁移类型 | 新建表 + 初始数据 + RLS 策略 |

## 迁移目的

创建 `app_configs` 表，用于存储 App 端的富文本配置内容，包括：
- 关于纯享
- 隐私政策
- 用户协议
- 帮助中心

## 表结构

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 主键 |
| `config_key` | VARCHAR(100) | NOT NULL, UNIQUE | 配置唯一标识（如 about, privacy_policy） |
| `title` | VARCHAR(200) | NOT NULL | 配置标题 |
| `content` | TEXT | NOT NULL, DEFAULT '' | 富文本内容（HTML 格式） |
| `config_type` | VARCHAR(50) | NOT NULL, DEFAULT 'rich_text' | 配置类型 |
| `sort_order` | INT | NOT NULL, DEFAULT 0 | 排序顺序 |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | 是否启用 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 创建时间 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 更新时间 |

## 索引

| 索引名 | 字段 | 用途 |
|--------|------|------|
| `idx_app_configs_key` | `config_key` | 按 config_key 快速查询 |
| `idx_app_configs_active` | `is_active` | 按启用状态筛选 |

## RLS 策略（行级安全）

| 策略名 | 操作 | 说明 |
|--------|------|------|
| `Anyone can view active app configs` | SELECT | 所有人可读取 is_active = true 的配置 |
| `Admins can manage app configs` | ALL | 仅 admin / super_admin 角色可增删改查全部配置 |

## 初始数据

| config_key | title | sort_order |
|------------|-------|------------|
| `about` | 关于纯享 | 1 |
| `privacy_policy` | 隐私政策 | 2 |
| `user_agreement` | 用户协议 | 3 |
| `help_center` | 帮助中心 | 4 |

## 执行方式

### 方式一：Supabase Dashboard（推荐）

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目
3. 进入 **SQL Editor**
4. 将 `create_app_configs.sql` 的内容粘贴进去
5. 点击 **Run** 执行

### 方式二：Supabase CLI

```bash
supabase db push
```

或将 SQL 文件复制到 `supabase/migrations/` 目录后执行：

```bash
cp create_app_configs.sql supabase/migrations/20260528_create_app_configs.sql
supabase db push
```

### 方式三：psql 命令行

```bash
psql "postgresql://postgres:[PASSWORD]@db.mhdrbjpqmzswswoazwjg.supabase.co:5432/postgres" -f create_app_configs.sql
```

## 回滚方案

如需回滚，执行以下 SQL：

```sql
DROP TABLE IF EXISTS app_configs;
```

## 注意事项

1. RLS 策略中引用了 `users` 表的 `role` 字段，请确保 `users` 表已存在且包含 `role` 字段。
2. `config_key` 字段设置了 UNIQUE 约束，插入数据时使用了 `ON CONFLICT DO NOTHING`，可安全重复执行。
3. `updated_at` 字段目前仅在插入时设置默认值，如需自动更新，建议额外创建触发器。
