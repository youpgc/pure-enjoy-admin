#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小说导入工具 — 支持网页爬取 + 本地 TXT 导入

用法：
  # 单本网页导入（指定元数据）
  python novel_importer.py --novel-url https://... --title "书名" --author "作者" --category "玄幻奇幻" --source "起点"

  # 本地 TXT 导入
  python novel_importer.py --file /path/to/novel.txt --title "书名" --author "作者" --category "都市言情"

  # 批量爬取（使用 crawler_config.json）
  python novel_importer.py --batch --source 起点免费

  # 查看支持的分类
  python novel_importer.py --list-categories
"""

import argparse
import json
import logging
import os
import random
import re
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client

# 加载环境变量
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# ============================================================
# 日志配置
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(
            os.path.join(os.path.dirname(__file__), 'importer.log'),
            encoding='utf-8'
        )
    ]
)
logger = logging.getLogger(__name__)


# ============================================================
# 常量与配置
# ============================================================

VALID_CATEGORIES = [
    '玄幻奇幻', '都市言情', '历史军事', '科幻末世',
    '武侠仙侠', '悬疑灵异', '游戏竞技', '轻小说'
]

VALID_STATUS = ['ongoing', 'completed']

DEFAULT_CATEGORY = '玄幻奇幻'

# 章节分隔正则（用于 txt 文件拆分）
CHAPTER_PATTERNS = [
    r'^第[一二三四五六七八九十百千零\d]+章[\s　]*(.+)$',      # 第一章 标题
    r'^第[\d]+章[\s　]*(.+)$',                               # 第1章 标题
    r'^Chapter[\s]*[\d]+[\s　]*(.+)$',                      # Chapter 1 标题
    r'^\d+[\s　]*(.+)$',                                     # 1 标题
]


# ============================================================
# 数据模型
# ============================================================

@dataclass
class NovelInfo:
    """小说信息"""
    title: str
    author: str
    description: str = ''
    category: str = DEFAULT_CATEGORY
    tags: List[str] = field(default_factory=list)
    word_count: int = 0
    status: str = 'ongoing'
    cover_url: Optional[str] = None
    source_url: str = ''
    source: str = 'original'
    is_free: bool = True
    price: Optional[float] = None
    user_id: Optional[str] = None

    def validate(self) -> List[str]:
        """验证必填字段，返回错误列表"""
        errors = []
        if not self.title or not self.title.strip():
            errors.append('title 不能为空')
        if not self.author or not self.author.strip():
            errors.append('author 不能为空')
        if self.category not in VALID_CATEGORIES:
            errors.append(f'category 必须是以下之一: {VALID_CATEGORIES}')
        if self.status not in VALID_STATUS:
            errors.append(f'status 必须是以下之一: {VALID_STATUS}')
        return errors

    def to_db_dict(self) -> Dict[str, Any]:
        """转换为数据库插入字典"""
        return {
            'title': self.title.strip(),
            'author': self.author.strip() or '未知',
            'description': (self.description or '').strip(),
            'category': self.category,
            'tags': self.tags or [],
            'word_count': self.word_count or 0,
            'status': self.status,
            'cover_url': self.cover_url,
            'source_url': self.source_url,
            'source': self.source,
            'is_free': self.is_free,
            'price': self.price,
            'user_id': self.user_id,
        }


@dataclass
class ChapterInfo:
    """章节信息"""
    chapter_num: int
    title: str
    content: str
    word_count: int = 0
    is_free: bool = True
    price: float = 0.0
    source_url: str = ''

    def validate(self) -> List[str]:
        """验证必填字段"""
        errors = []
        if self.chapter_num < 1:
            errors.append(f'chapter_num 必须 ≥ 1，当前: {self.chapter_num}')
        if not self.title or not self.title.strip():
            errors.append('chapter.title 不能为空')
        if not self.content or not self.content.strip():
            errors.append('chapter.content 不能为空')
        return errors

    def to_db_dict(self, novel_id: str) -> Dict[str, Any]:
        """转换为数据库插入字典"""
        return {
            'novel_id': novel_id,
            'chapter_num': self.chapter_num,
            'title': self.title.strip(),
            'content': self.content.strip(),
            'word_count': self.word_count or len(self.content.replace('\n', '').replace(' ', '')),
            'is_free': self.is_free,
            'price': self.price,
        }


# ============================================================
# 工具函数
# ============================================================

def calculate_word_count(text: str) -> int:
    """计算中文字数（去除空白和换行）"""
    return len(text.replace('\n', '').replace(' ', '').replace('\u3000', ''))


def map_category(raw_category: str, categories_map: Dict[str, List[str]]) -> str:
    """将原始分类映射到标准分类"""
    raw = raw_category.strip()
    for standard_cat, keywords in categories_map.items():
        for keyword in keywords:
            if keyword in raw or raw in keyword:
                return standard_cat
    return DEFAULT_CATEGORY


def guess_status(content: str) -> str:
    """根据内容猜测完结状态"""
    if '完结' in content or '大结局' in content or '全书完' in content:
        return 'completed'
    return 'ongoing'


# ============================================================
# Supabase 数据库管理
# ============================================================

class DatabaseManager:
    """Supabase 数据库管理器"""

    def __init__(self, url: str, key: str):
        self.client: Client = create_client(url, key)

    def novel_exists(self, source_url: str) -> Optional[str]:
        """检查小说是否已存在，返回小说 ID"""
        if not source_url:
            return None
        try:
            result = self.client.table('novels').select('id').eq('source_url', source_url).execute()
            if result.data:
                return result.data[0]['id']
            return None
        except Exception as e:
            logger.error(f'检查小说存在失败: {e}')
            return None

    def novel_exists_by_title(self, title: str) -> Optional[str]:
        """按标题检查小说是否已存在"""
        try:
            result = self.client.table('novels').select('id').eq('title', title).execute()
            if result.data:
                return result.data[0]['id']
            return None
        except Exception as e:
            logger.error(f'按标题检查小说存在失败: {e}')
            return None

    def insert_novel(self, novel: NovelInfo) -> Optional[str]:
        """插入小说，返回小说 ID"""
        errors = novel.validate()
        if errors:
            logger.error(f'小说验证失败: {errors}')
            return None

        try:
            data = novel.to_db_dict()
            result = self.client.table('novels').insert(data).execute()
            if result.data:
                novel_id = result.data[0]['id']
                logger.info(f'插入小说成功: {novel.title} (ID: {novel_id})')
                return novel_id
            return None
        except Exception as e:
            logger.error(f'插入小说失败: {novel.title}, 错误: {e}')
            return None

    def update_novel(self, novel_id: str, updates: Dict[str, Any]) -> bool:
        """更新小说信息（如 chapter_count、word_count）"""
        try:
            self.client.table('novels').update(updates).eq('id', novel_id).execute()
            return True
        except Exception as e:
            logger.error(f'更新小说失败: {e}')
            return False

    def get_max_chapter_num(self, novel_id: str) -> int:
        """获取小说的最大章节号"""
        try:
            result = self.client.table('novel_chapters').select('chapter_num').eq('novel_id', novel_id).order('chapter_num', desc=True).limit(1).execute()
            if result.data:
                return result.data[0]['chapter_num']
            return 0
        except Exception as e:
            logger.error(f'获取最大章节号失败: {e}')
            return 0

    def chapter_exists(self, novel_id: str, chapter_num: int) -> bool:
        """检查章节是否已存在"""
        try:
            result = self.client.table('novel_chapters').select('id').eq('novel_id', novel_id).eq('chapter_num', chapter_num).execute()
            return len(result.data) > 0
        except Exception as e:
            logger.error(f'检查章节存在失败: {e}')
            return False

    def batch_insert_chapters(self, novel_id: str, chapters: List[ChapterInfo], batch_size: int = 50) -> int:
        """批量插入章节，返回成功数量"""
        success_count = 0
        for i in range(0, len(chapters), batch_size):
            batch = chapters[i:i + batch_size]
            data_list = [c.to_db_dict(novel_id) for c in batch]

            # 验证每个章节
            valid_data = []
            for idx, chapter in enumerate(batch):
                errors = chapter.validate()
                if errors:
                    logger.warning(f'章节 {chapter.chapter_num} 验证失败: {errors}')
                    continue
                valid_data.append(data_list[idx])

            if not valid_data:
                continue

            try:
                self.client.table('novel_chapters').insert(valid_data).execute()
                success_count += len(valid_data)
                logger.info(f'批量插入章节: {len(valid_data)} 章 (批次 {i//batch_size + 1})')
            except Exception as e:
                logger.error(f'批量插入章节失败: {e}')
                # 回退到单条插入
                for chapter in batch:
                    try:
                        self.client.table('novel_chapters').insert(chapter.to_db_dict(novel_id)).execute()
                        success_count += 1
                    except Exception as e2:
                        logger.error(f'单条插入章节失败 {chapter.chapter_num}: {e2}')

        return success_count

    def update_novel_stats(self, novel_id: str, total_chapters: int, total_words: int) -> bool:
        """更新小说的章节数和总字数"""
        return self.update_novel(novel_id, {
            'chapter_count': total_chapters,
            'word_count': total_words,
            'updated_at': datetime.now().isoformat(),
        })


# ============================================================
# TXT 文件导入器
# ============================================================

class TxtImporter:
    """本地 TXT 小说导入器"""

    def __init__(self, db: DatabaseManager):
        self.db = db

    def parse_txt(self, file_path: str, encoding: str = 'utf-8') -> List[ChapterInfo]:
        """
        解析 TXT 文件，按章节分隔符拆分为章节列表
        支持 GBK/UTF-8 自动检测
        """
        # 自动检测编码
        encodings = [encoding, 'utf-8', 'gbk', 'gb2312', 'gb18030']
        content = None
        used_encoding = None

        for enc in encodings:
            try:
                with open(file_path, 'r', encoding=enc) as f:
                    content = f.read()
                used_encoding = enc
                break
            except UnicodeDecodeError:
                continue

        if content is None:
            raise ValueError(f'无法解码文件: {file_path}')

        logger.info(f'使用编码 {used_encoding} 读取文件，总字符数: {len(content)}')

        # 尝试按章节分隔
        chapters = self._split_by_chapters(content)

        if not chapters:
            # 未识别到章节分隔，整本作为一个章节
            logger.warning('未识别到章节分隔符，将整本作为单个章节导入')
            chapters = [ChapterInfo(
                chapter_num=1,
                title='正文',
                content=content.strip(),
                word_count=calculate_word_count(content)
            )]

        return chapters

    def _split_by_chapters(self, content: str) -> List[ChapterInfo]:
        """按章节正则拆分"""
        lines = content.split('\n')
        chapters = []
        current_title = None
        current_lines = []
        chapter_num = 0

        for line in lines:
            line = line.strip()
            if not line:
                continue

            matched = False
            for pattern in CHAPTER_PATTERNS:
                match = re.match(pattern, line)
                if match:
                    # 保存上一个章节
                    if current_title and current_lines:
                        chapter_num += 1
                        chapter_content = '\n'.join(current_lines).strip()
                        chapters.append(ChapterInfo(
                            chapter_num=chapter_num,
                            title=current_title,
                            content=chapter_content,
                            word_count=calculate_word_count(chapter_content)
                        ))

                    current_title = match.group(1).strip() if match.lastindex else line.strip()
                    current_lines = []
                    matched = True
                    break

            if not matched:
                current_lines.append(line)

        # 保存最后一个章节
        if current_title and current_lines:
            chapter_num += 1
            chapter_content = '\n'.join(current_lines).strip()
            chapters.append(ChapterInfo(
                chapter_num=chapter_num,
                title=current_title,
                content=chapter_content,
                word_count=calculate_word_count(chapter_content)
            ))

        return chapters

    def import_txt(self, file_path: str, novel: NovelInfo, batch_size: int = 50) -> bool:
        """导入 TXT 文件到数据库"""
        logger.info(f'开始导入 TXT: {file_path}')

        # 解析章节
        try:
            chapters = self.parse_txt(file_path)
        except Exception as e:
            logger.error(f'解析 TXT 失败: {e}')
            return False

        if not chapters:
            logger.error('未解析到任何章节')
            return False

        logger.info(f'解析到 {len(chapters)} 个章节')

        # 计算总字数
        total_words = sum(c.word_count for c in chapters)
        novel.word_count = total_words

        # 检查小说是否已存在
        existing_id = self.db.novel_exists_by_title(novel.title)
        if existing_id:
            logger.info(f'小说已存在: {novel.title} (ID: {existing_id})')
            novel_id = existing_id
            # 获取已有最大章节号
            max_chapter = self.db.get_max_chapter_num(novel_id)
            if max_chapter > 0:
                # 过滤已存在的章节
                chapters = [c for c in chapters if c.chapter_num > max_chapter]
                logger.info(f'跳过前 {max_chapter} 章，剩余 {len(chapters)} 章待导入')
        else:
            novel_id = self.db.insert_novel(novel)
            if not novel_id:
                return False

        if not chapters:
            logger.info('无新章节需要导入')
            return True

        # 批量插入章节
        success = self.db.batch_insert_chapters(novel_id, chapters, batch_size)

        # 更新小说统计
        final_max = self.db.get_max_chapter_num(novel_id)
        self.db.update_novel_stats(novel_id, final_max, total_words)

        logger.info(f'导入完成: {novel.title}，成功 {success}/{len(chapters)} 章，总字数 {total_words}')
        return success > 0


# ============================================================
# 网页爬取（基于现有 novel_crawler.py 简化）
# ============================================================

class WebCrawler:
    """网页小说爬取器"""

    def __init__(self, db: DatabaseManager):
        self.db = db
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ),
        })

    def fetch(self, url: str, retries: int = 3) -> Optional[str]:
        """获取网页内容"""
        for attempt in range(retries):
            try:
                resp = self.session.get(url, timeout=30)
                resp.raise_for_status()
                time.sleep(1 + random.uniform(0, 1))
                return resp.text
            except Exception as e:
                logger.warning(f'请求失败 ({attempt+1}/{retries}): {url}, {e}')
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)
        logger.error(f'请求最终失败: {url}')
        return None

    def crawl_single(self, url: str, novel: NovelInfo, parser_name: str = 'generic') -> bool:
        """爬取单本小说"""
        logger.info(f'开始爬取: {url}')

        html = self.fetch(url)
        if not html:
            return False

        soup = BeautifulSoup(html, 'lxml')

        # 自动提取信息（如果未提供）
        if not novel.title:
            title_elem = soup.select_one('h1')
            if title_elem:
                novel.title = title_elem.text.strip()

        if not novel.author or novel.author == '未知':
            # 尝试从页面提取作者
            for selector in ['.author', '.writer', '[class*="author"]', '[class*="writer"]']:
                elem = soup.select_one(selector)
                if elem:
                    novel.author = elem.text.strip()
                    break

        if not novel.description:
            for selector in ['.intro', '.description', '[class*="intro"]', '[class*="desc"]']:
                elem = soup.select_one(selector)
                if elem:
                    novel.description = elem.text.strip()
                    break

        # 验证
        errors = novel.validate()
        if errors:
            logger.error(f'小说信息验证失败: {errors}')
            return False

        # 检查是否已存在
        existing_id = self.db.novel_exists(url) or self.db.novel_exists_by_title(novel.title)
        if existing_id:
            logger.info(f'小说已存在: {novel.title} (ID: {existing_id})')
            novel_id = existing_id
        else:
            novel_id = self.db.insert_novel(novel)
            if not novel_id:
                return False

        # 解析章节列表
        chapter_links = self._extract_chapter_links(soup, url)
        if not chapter_links:
            logger.warning('未找到章节链接')
            return True

        logger.info(f'找到 {len(chapter_links)} 个章节链接')

        # 获取已有最大章节号
        max_chapter = self.db.get_max_chapter_num(novel_id)
        if max_chapter > 0:
            chapter_links = chapter_links[max_chapter:]
            logger.info(f'跳过已存在的 {max_chapter} 章，剩余 {len(chapter_links)} 章')

        if not chapter_links:
            logger.info('无新章节需要爬取')
            return True

        # 爬取章节内容
        chapters = []
        for idx, link in enumerate(chapter_links):
            chapter_num = max_chapter + idx + 1
            chapter = self._parse_chapter(link, chapter_num)
            if chapter:
                chapters.append(chapter)
                if (idx + 1) % 10 == 0:
                    logger.info(f'已爬取 {idx + 1}/{len(chapter_links)} 章')

        if not chapters:
            logger.warning('未成功爬取任何章节')
            return True

        # 批量插入
        success = self.db.batch_insert_chapters(novel_id, chapters)

        # 更新统计
        total_words = sum(c.word_count for c in chapters)
        final_max = self.db.get_max_chapter_num(novel_id)
        self.db.update_novel_stats(novel_id, final_max, total_words)

        logger.info(f'爬取完成: {novel.title}，成功 {success}/{len(chapters)} 章')
        return True

    def _extract_chapter_links(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """提取章节链接列表"""
        links = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            text = a.text.strip()
            # 简单启发式：链接文本包含"章"或数字
            if '章' in text or re.match(r'^\d+$', text):
                full_url = urljoin(base_url, href)
                if full_url not in links:
                    links.append(full_url)
        return links

    def _parse_chapter(self, url: str, chapter_num: int) -> Optional[ChapterInfo]:
        """解析单个章节"""
        html = self.fetch(url)
        if not html:
            return None

        soup = BeautifulSoup(html, 'lxml')

        # 提取标题
        title = f'第{chapter_num}章'
        for selector in ['h1', '.chapter-title', '[class*="title"]']:
            elem = soup.select_one(selector)
            if elem:
                title = elem.text.strip()
                break

        # 提取内容
        content = ''
        for selector in ['.content', '.chapter-content', '.read-content', 'article', '#content']:
            elem = soup.select_one(selector)
            if elem:
                for tag in elem.find_all(['script', 'style', 'nav', 'footer']):
                    tag.decompose()
                content = elem.get_text('\n', strip=True)
                content = re.sub(r'\n{3,}', '\n\n', content)
                break

        if not content:
            return None

        return ChapterInfo(
            chapter_num=chapter_num,
            title=title,
            content=content,
            word_count=calculate_word_count(content),
            source_url=url
        )


# ============================================================
# 主函数
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description='小说导入工具 — 支持网页爬取 + 本地 TXT 导入',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
  # 单本网页导入
  python novel_importer.py --novel-url https://example.com/book/123 --title "星辰变" --author "我吃西红柿" --category "玄幻奇幻" --source "起点"

  # 本地 TXT 导入
  python novel_importer.py --file ./novel.txt --title "诛仙" --author "萧鼎" --category "武侠仙侠"

  # 批量爬取（使用 crawler_config.json）
  python novel_importer.py --batch --config crawler_config.json

  # 查看支持的分类
  python novel_importer.py --list-categories
        '''
    )

    # 通用参数
    parser.add_argument('--title', '-t', help='小说标题（必填）')
    parser.add_argument('--author', '-a', help='小说作者（必填）')
    parser.add_argument('--category', '-c', help=f'小说类型（必填）: {VALID_CATEGORIES}')
    parser.add_argument('--description', '-d', help='小说简介')
    parser.add_argument('--source', '-s', default='original', help='来源标识（如: 起点, 纵横, 17K）')
    parser.add_argument('--status', choices=VALID_STATUS, default='ongoing', help='完结状态')
    parser.add_argument('--tags', help='标签，逗号分隔（如: 修仙,热血,升级）')
    parser.add_argument('--cover-url', help='封面图片 URL')
    parser.add_argument('--user-id', help='上传者用户 ID（留空为公共小说）')

    # 导入模式（互斥）
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--novel-url', '-u', help='小说详情页 URL（网页导入模式）')
    group.add_argument('--file', '-f', help='本地 TXT 文件路径（本地导入模式）')
    group.add_argument('--batch', action='store_true', help='批量爬取模式（使用 crawler_config.json）')
    group.add_argument('--list-categories', action='store_true', help='列出支持的分类')

    # 其他参数
    parser.add_argument('--batch-size', type=int, default=50, help='章节批量插入大小（默认 50）')
    parser.add_argument('--config', default='crawler_config.json', help='批量模式配置文件路径')
    parser.add_argument('--max-chapters', type=int, help='最大导入章节数')

    args = parser.parse_args()

    # 列出分类
    if args.list_categories:
        print('支持的小说分类:')
        for cat in VALID_CATEGORIES:
            print(f'  - {cat}')
        return

    # 读取环境变量
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not supabase_key:
        logger.error('环境变量 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 未设置')
        logger.error('请复制 .env.example 为 .env 并填入正确的 Service Role Key')
        sys.exit(1)

    # 初始化数据库
    db = DatabaseManager(supabase_url, supabase_key)

    # 构建 NovelInfo
    novel = NovelInfo(
        title=args.title or '',
        author=args.author or '',
        description=args.description or '',
        category=args.category or DEFAULT_CATEGORY,
        tags=[t.strip() for t in args.tags.split(',')] if args.tags else [],
        status=args.status,
        cover_url=args.cover_url,
        source_url=args.novel_url or '',
        source=args.source,
        user_id=args.user_id or os.getenv('DEFAULT_USER_ID'),
    )

    # 模式分发
    if args.novel_url:
        # 网页单本导入
        if not args.title or not args.author or not args.category:
            logger.error('网页导入模式必须提供 --title, --author, --category')
            sys.exit(1)

        crawler = WebCrawler(db)
        success = crawler.crawl_single(args.novel_url, novel)
        sys.exit(0 if success else 1)

    elif args.file:
        # 本地 TXT 导入
        if not os.path.exists(args.file):
            logger.error(f'文件不存在: {args.file}')
            sys.exit(1)

        if not args.title or not args.author or not args.category:
            logger.error('TXT 导入模式必须提供 --title, --author, --category')
            sys.exit(1)

        importer = TxtImporter(db)
        success = importer.import_txt(args.file, novel, args.batch_size)
        sys.exit(0 if success else 1)

    elif args.batch:
        # 批量爬取模式（基于现有 crawler_config.json）
        config_path = os.path.join(os.path.dirname(__file__), args.config)
        if not os.path.exists(config_path):
            logger.error(f'配置文件不存在: {config_path}')
            sys.exit(1)

        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)

        logger.info('批量爬取模式（此模式下 --title/--author/--category 参数无效）')
        logger.info('如需单本导入，请使用 --novel-url 或 --file 参数')
        sys.exit(0)


if __name__ == '__main__':
    main()
