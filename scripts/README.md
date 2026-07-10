# 小说导入工具

支持 **网页爬取** 和 **本地 TXT 导入** 两种模式，录入到 Supabase 数据库。

## 目录

- `novel_importer.py` — 主脚本
- `.env.example` — 环境变量模板
- `requirements.txt` — Python 依赖
- `crawler_config.json` — 批量爬取配置（保留旧格式）

## 快速开始

### 1. 安装依赖

```bash
cd pure-enjoy-admin/scripts
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入 SUPABASE_SERVICE_ROLE_KEY
```

Service Role Key 从 Supabase Dashboard → Project Settings → API → `service_role` 获取。

### 3. 查看支持的分类

```bash
python novel_importer.py --list-categories
```

输出：
```
支持的小说分类:
  - 玄幻奇幻
  - 都市言情
  - 历史军事
  - 科幻末世
  - 武侠仙侠
  - 悬疑灵异
  - 游戏竞技
  - 轻小说
```

## 使用方式

### 模式一：网页爬取（单本）

```bash
python novel_importer.py \
  --novel-url "https://example.com/book/123" \
  --title "星辰变" \
  --author "我吃西红柿" \
  --category "玄幻奇幻" \
  --source "起点" \
  --description "一个少年踏上修仙之路的故事"
```

参数说明：

| 参数 | 必填 | 说明 |
|------|------|------|
| `--novel-url` | 是 | 小说详情页 URL |
| `--title` | 是 | 小说标题 |
| `--author` | 是 | 作者名 |
| `--category` | 是 | 小说类型（见 `--list-categories`） |
| `--source` | 否 | 来源标识，默认 `original` |
| `--description` | 否 | 小说简介 |
| `--status` | 否 | `ongoing`（连载）或 `completed`（完结），默认 `ongoing` |
| `--tags` | 否 | 标签，逗号分隔，如 `修仙,热血,升级` |
| `--cover-url` | 否 | 封面图片 URL |
| `--user-id` | 否 | 上传者用户 ID |

### 模式二：本地 TXT 导入

```bash
python novel_importer.py \
  --file "/path/to/novel.txt" \
  --title "诛仙" \
  --author "萧鼎" \
  --category "武侠仙侠"
```

TXT 文件要求：
- 支持 UTF-8 / GBK / GB2312 / GB18030 自动检测
- 章节标题格式：`第一章 标题`、`第1章 标题`、`Chapter 1 标题`
- 无章节分隔符时，整本作为单个章节导入

### 模式三：批量爬取（保留旧格式）

```bash
python novel_importer.py --batch --config crawler_config.json
```

## 数据校验与自动处理

### 必填字段（不允许为空）

| 表 | 必填字段 | 校验逻辑 |
|----|----------|---------|
| `novels` | `title`, `author`, `category` | 标题和作者去空白；分类必须在标准列表中 |
| `novel_chapters` | `chapter_num`, `title`, `content` | 章节号 ≥ 1；标题和内容去空白 |

### 自动计算字段

| 字段 | 计算逻辑 |
|------|----------|
| `word_count`（章节） | `len(content.replace('\n', '').replace(' ', ''))` |
| `word_count`（小说） | 所有章节字数之和 |
| `chapter_count` | 数据库中实际章节数 |
| `status`（TXT） | 内容包含"完结"/"大结局"/"全书完" → `completed`，否则 `ongoing` |

### 默认值

| 字段 | 默认值 |
|------|--------|
| `source` | `'original'` |
| `status` | `'ongoing'` |
| `is_free` | `true` |
| `price` | `0` |
| `chapter_count` / `read_count` / `collect_count` / `rating_count` / `tts_play_count` | `0` |

### 防重复逻辑

- 网页导入：按 `source_url` 去重
- TXT 导入：按 `title` 去重
- 章节导入：按 `novel_id + chapter_num` 去重，已存在的章节自动跳过

## 数据库映射

```
NovelInfo          →  novels 表
  title            →  title
  author           →  author
  description      →  description
  category         →  category
  tags             →  tags (text[])
  word_count       →  word_count
  status           →  status
  cover_url        →  cover_url
  source_url       →  source_url
  source           →  source
  is_free          →  is_free
  price            →  price
  user_id          →  user_id

ChapterInfo        →  novel_chapters 表
  chapter_num      →  chapter_num
  title            →  title
  content          →  content
  word_count       →  word_count
  is_free          →  is_free
  price            →  price
  novel_id         →  novel_id (外键)
```

## 日志

运行日志同时输出到控制台和 `importer.log` 文件。

## 注意事项

1. **必须使用 Service Role Key**：Anon Key 受 RLS 限制无法插入数据
2. **网络请求间隔**：每章爬取间隔 1-2 秒，避免被封
3. **批量插入**：章节默认 50 条/批次，失败自动回退到单条插入
4. **编码检测**：TXT 文件自动尝试 UTF-8 / GBK / GB2312 / GB18030
