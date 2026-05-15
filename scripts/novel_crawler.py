#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小说爬虫脚本
爬取免费网络小说，存储到 Supabase 数据库
"""

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
from supabase import create_client, Client

# ============================================================
# 日志配置
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'crawler.log'), encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


# ============================================================
# 数据模型
# ============================================================

@dataclass
class NovelInfo:
    """小说信息"""
    title: str
    author: str
    description: str
    category: str
    tags: List[str] = field(default_factory=list)
    word_count: int = 0
    status: str = 'ongoing'  # ongoing, completed
    cover_url: Optional[str] = None
    source_url: str = ''
    source: str = ''
    is_free: bool = True


@dataclass
class ChapterInfo:
    """章节信息"""
    chapter_num: int
    title: str
    content: str
    word_count: int = 0
    is_free: bool = True
    source_url: str = ''


# ============================================================
# 配置管理
# ============================================================

class Config:
    """配置管理类"""
    
    def __init__(self, config_path: str):
        with open(config_path, 'r', encoding='utf-8') as f:
            self._config = json.load(f)
    
    @property
    def supabase_url(self) -> str:
        return self._config['supabase']['url']
    
    @property
    def supabase_key(self) -> str:
        return self._config['supabase']['anon_key']
    
    @property
    def sources(self) -> List[Dict]:
        return self._config['sources']
    
    @property
    def settings(self) -> Dict:
        return self._config['settings']
    
    @property
    def categories(self) -> Dict[str, List[str]]:
        return self._config['categories']
    
    @property
    def user_agent(self) -> str:
        return self._config.get('user_agent', 
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    def get_source_by_name(self, name: str) -> Optional[Dict]:
        for source in self.sources:
            if source['name'] == name:
                return source
        return None


# ============================================================
# HTTP 请求管理
# ============================================================

class RequestManager:
    """HTTP 请求管理器"""
    
    def __init__(self, config: Config):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': config.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        })
    
    def get(self, url: str, **kwargs) -> Optional[requests.Response]:
        """发送 GET 请求"""
        timeout = kwargs.pop('timeout', self.config.settings['timeout'])
        retries = kwargs.pop('retries', self.config.settings.get('max_retries', 3))
        
        for attempt in range(retries):
            try:
                response = self.session.get(url, timeout=timeout, **kwargs)
                response.raise_for_status()
                
                # 请求延迟
                delay = self.config.settings['request_delay']
                time.sleep(delay + random.uniform(0, 0.5))
                
                return response
            except requests.RequestException as e:
                logger.warning(f"请求失败 (尝试 {attempt + 1}/{retries}): {url}, 错误: {e}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)  # 指数退避
        
        logger.error(f"请求最终失败: {url}")
        return None
    
    def close(self):
        self.session.close()


# ============================================================
# 小说解析器基类
# ============================================================

class BaseParser:
    """小说解析器基类"""
    
    def __init__(self, config: Config, request_manager: RequestManager):
        self.config = config
        self.request_manager = request_manager
    
    def parse_novel_list(self, url: str) -> List[str]:
        """解析小说列表页，返回小说详情页 URL 列表"""
        raise NotImplementedError
    
    def parse_novel_info(self, url: str) -> Optional[NovelInfo]:
        """解析小说详情页，返回小说信息"""
        raise NotImplementedError
    
    def parse_chapter_list(self, url: str) -> List[str]:
        """解析章节列表页，返回章节 URL 列表"""
        raise NotImplementedError
    
    def parse_chapter(self, url: str, chapter_num: int) -> Optional[ChapterInfo]:
        """解析章节内容"""
        raise NotImplementedError
    
    def map_category(self, raw_category: str) -> str:
        """将原始分类映射到标准分类"""
        raw_category = raw_category.strip()
        for standard_cat, keywords in self.config.categories.items():
            for keyword in keywords:
                if keyword in raw_category or raw_category in keyword:
                    return standard_cat
        return '玄幻奇幻'  # 默认分类


# ============================================================
# 起点中文网解析器
# ============================================================

class QidianParser(BaseParser):
    """起点中文网解析器"""
    
    def parse_novel_list(self, url: str) -> List[str]:
        """解析起点免费小说列表"""
        novel_urls = []
        response = self.request_manager.get(url)
        if not response:
            return novel_urls
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # 起点免费区的小说链接
        links = soup.select('a[href*="//book.qidian.com/info/"]')
        for link in links:
            href = link.get('href', '')
            if 'info' in href:
                full_url = urljoin(url, href)
                if full_url not in novel_urls:
                    novel_urls.append(full_url)
        
        logger.info(f"从 {url} 解析到 {len(novel_urls)} 本小说")
        return novel_urls
    
    def parse_novel_info(self, url: str) -> Optional[NovelInfo]:
        """解析起点小说详情"""
        response = self.request_manager.get(url)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        try:
            # 书名
            title_elem = soup.select_one('h1.book-name')
            title = title_elem.text.strip() if title_elem else ''
            
            # 作者
            author_elem = soup.select_one('a.writer')
            author = author_elem.text.strip() if author_elem else '未知'
            
            # 简介
            desc_elem = soup.select_one('div.book-intro p')
            description = desc_elem.text.strip() if desc_elem else ''
            
            # 分类
            category_elem = soup.select_one('a.tag')
            raw_category = category_elem.text.strip() if category_elem else '玄幻'
            category = self.map_category(raw_category)
            
            # 字数
            word_count = 0
            word_elem = soup.select_one('p.count em')
            if word_elem:
                word_text = word_elem.text
                if '万' in word_text:
                    word_count = int(float(word_text.replace('万', '')) * 10000)
                elif '字' in word_text:
                    word_count = int(re.sub(r'[^\d]', '', word_text))
            
            # 状态
            status = 'completed'
            status_elem = soup.select_one('span.tag')
            if status_elem and '连载' in status_elem.text:
                status = 'ongoing'
            
            # 封面
            cover_elem = soup.select_one('div.book-img img')
            cover_url = cover_elem.get('src', '') if cover_elem else None
            if cover_url and not cover_url.startswith('http'):
                cover_url = urljoin(url, cover_url)
            
            # 标签
            tags = []
            tag_elems = soup.select('a.tag-red')
            for tag_elem in tag_elems:
                tag_text = tag_elem.text.strip()
                if tag_text:
                    tags.append(tag_text)
            
            return NovelInfo(
                title=title,
                author=author,
                description=description,
                category=category,
                tags=tags,
                word_count=word_count,
                status=status,
                cover_url=cover_url,
                source_url=url,
                source='起点中文网',
                is_free=True
            )
        except Exception as e:
            logger.error(f"解析小说信息失败: {url}, 错误: {e}")
            return None
    
    def parse_chapter_list(self, url: str) -> List[str]:
        """解析起点章节列表"""
        chapter_urls = []
        
        # 起点的章节列表通常在单独的页面
        # 格式: https://book.qidian.com/info/xxx#Catalog
        catalog_url = url.rstrip('/') + '#Catalog'
        
        response = self.request_manager.get(url)
        if not response:
            return chapter_urls
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # 查找章节链接
        chapter_links = soup.select('a[href*="/chapter/"]')
        for link in chapter_links:
            href = link.get('href', '')
            if href:
                full_url = urljoin(url, href)
                chapter_urls.append(full_url)
        
        logger.info(f"解析到 {len(chapter_urls)} 个章节")
        return chapter_urls
    
    def parse_chapter(self, url: str, chapter_num: int) -> Optional[ChapterInfo]:
        """解析起点章节内容"""
        response = self.request_manager.get(url)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        try:
            # 章节标题
            title_elem = soup.select_one('h1.chapter-name')
            title = title_elem.text.strip() if title_elem else f'第{chapter_num}章'
            
            # 章节内容
            content_elem = soup.select_one('div.chapter-content')
            if not content_elem:
                content_elem = soup.select_one('div.read-content')
            
            if content_elem:
                # 清理内容
                for tag in content_elem.find_all(['script', 'style', 'div']):
                    tag.decompose()
                
                content = content_elem.get_text('\n', strip=True)
                content = re.sub(r'\n{3,}', '\n\n', content)
            else:
                content = ''
            
            word_count = len(content.replace('\n', '').replace(' ', ''))
            
            return ChapterInfo(
                chapter_num=chapter_num,
                title=title,
                content=content,
                word_count=word_count,
                is_free=True,
                source_url=url
            )
        except Exception as e:
            logger.error(f"解析章节失败: {url}, 错误: {e}")
            return None


# ============================================================
# 纵横中文网解析器
# ============================================================

class ZonghengParser(BaseParser):
    """纵横中文网解析器"""
    
    def parse_novel_list(self, url: str) -> List[str]:
        """解析纵横免费小说列表"""
        novel_urls = []
        response = self.request_manager.get(url)
        if not response:
            return novel_urls
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # 纵横小说链接
        links = soup.select('a[href*="/book/"]')
        for link in links:
            href = link.get('href', '')
            if '/book/' in href and href.count('/') >= 3:
                full_url = urljoin(url, href)
                if full_url not in novel_urls:
                    novel_urls.append(full_url)
        
        logger.info(f"从 {url} 解析到 {len(novel_urls)} 本小说")
        return novel_urls
    
    def parse_novel_info(self, url: str) -> Optional[NovelInfo]:
        """解析纵横小说详情"""
        response = self.request_manager.get(url)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        try:
            # 书名
            title_elem = soup.select_one('div.book-name')
            title = title_elem.text.strip() if title_elem else ''
            
            # 作者
            author_elem = soup.select_one('div.au-name a')
            author = author_elem.text.strip() if author_elem else '未知'
            
            # 简介
            desc_elem = soup.select_one('div.book-dec')
            description = desc_elem.text.strip() if desc_elem else ''
            
            # 分类
            category_elem = soup.select_one('div.book-label a')
            raw_category = category_elem.text.strip() if category_elem else '玄幻'
            category = self.map_category(raw_category)
            
            # 字数
            word_count = 0
            word_elem = soup.select_one('span.total')
            if word_elem:
                word_text = word_elem.text
                if '万' in word_text:
                    word_count = int(float(re.sub(r'[^\d.]', '', word_text)) * 10000)
            
            # 状态
            status = 'ongoing'
            status_elem = soup.select_one('span.state')
            if status_elem and '完结' in status_elem.text:
                status = 'completed'
            
            # 封面
            cover_elem = soup.select_one('div.book-img img')
            cover_url = cover_elem.get('src', '') if cover_elem else None
            
            return NovelInfo(
                title=title,
                author=author,
                description=description,
                category=category,
                tags=[],
                word_count=word_count,
                status=status,
                cover_url=cover_url,
                source_url=url,
                source='纵横中文网',
                is_free=True
            )
        except Exception as e:
            logger.error(f"解析小说信息失败: {url}, 错误: {e}")
            return None
    
    def parse_chapter_list(self, url: str) -> List[str]:
        """解析纵横章节列表"""
        chapter_urls = []
        response = self.request_manager.get(url)
        if not response:
            return chapter_urls
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        chapter_links = soup.select('a[href*="/chapter/"]')
        for link in chapter_links:
            href = link.get('href', '')
            if href:
                full_url = urljoin(url, href)
                chapter_urls.append(full_url)
        
        logger.info(f"解析到 {len(chapter_urls)} 个章节")
        return chapter_urls
    
    def parse_chapter(self, url: str, chapter_num: int) -> Optional[ChapterInfo]:
        """解析纵横章节内容"""
        response = self.request_manager.get(url)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        try:
            # 章节标题
            title_elem = soup.select_one('h1.title')
            title = title_elem.text.strip() if title_elem else f'第{chapter_num}章'
            
            # 章节内容
            content_elem = soup.select_one('div.content')
            if not content_elem:
                content_elem = soup.select_one('div.chapter-content')
            
            if content_elem:
                for tag in content_elem.find_all(['script', 'style']):
                    tag.decompose()
                content = content_elem.get_text('\n', strip=True)
            else:
                content = ''
            
            word_count = len(content.replace('\n', '').replace(' ', ''))
            
            return ChapterInfo(
                chapter_num=chapter_num,
                title=title,
                content=content,
                word_count=word_count,
                is_free=True,
                source_url=url
            )
        except Exception as e:
            logger.error(f"解析章节失败: {url}, 错误: {e}")
            return None


# ============================================================
# 17K 小说网解析器
# ============================================================

class SeventeenKParser(BaseParser):
    """17K 小说网解析器"""
    
    def parse_novel_list(self, url: str) -> List[str]:
        """解析 17K 免费小说列表"""
        novel_urls = []
        response = self.request_manager.get(url)
        if not response:
            return novel_urls
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        links = soup.select('a[href*="/book/"]')
        for link in links:
            href = link.get('href', '')
            if href and '/book/' in href:
                full_url = urljoin(url, href)
                if full_url not in novel_urls:
                    novel_urls.append(full_url)
        
        logger.info(f"从 {url} 解析到 {len(novel_urls)} 本小说")
        return novel_urls
    
    def parse_novel_info(self, url: str) -> Optional[NovelInfo]:
        """解析 17K 小说详情"""
        response = self.request_manager.get(url)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        try:
            # 书名
            title_elem = soup.select_one('h1.book-title')
            title = title_elem.text.strip() if title_elem else ''
            
            # 作者
            author_elem = soup.select_one('a.author-name')
            author = author_elem.text.strip() if author_elem else '未知'
            
            # 简介
            desc_elem = soup.select_one('div.book-intro')
            description = desc_elem.text.strip() if desc_elem else ''
            
            # 分类
            category_elem = soup.select_one('span.category')
            raw_category = category_elem.text.strip() if category_elem else '玄幻'
            category = self.map_category(raw_category)
            
            # 字数
            word_count = 0
            word_elem = soup.select_one('span.word-count')
            if word_elem:
                word_text = word_elem.text
                if '万' in word_text:
                    word_count = int(float(re.sub(r'[^\d.]', '', word_text)) * 10000)
            
            # 状态
            status = 'ongoing'
            status_elem = soup.select_one('span.status')
            if status_elem and '完结' in status_elem.text:
                status = 'completed'
            
            # 封面
            cover_elem = soup.select_one('img.cover')
            cover_url = cover_elem.get('src', '') if cover_elem else None
            
            return NovelInfo(
                title=title,
                author=author,
                description=description,
                category=category,
                tags=[],
                word_count=word_count,
                status=status,
                cover_url=cover_url,
                source_url=url,
                source='17K小说',
                is_free=True
            )
        except Exception as e:
            logger.error(f"解析小说信息失败: {url}, 错误: {e}")
            return None
    
    def parse_chapter_list(self, url: str) -> List[str]:
        """解析 17K 章节列表"""
        chapter_urls = []
        response = self.request_manager.get(url)
        if not response:
            return chapter_urls
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        chapter_links = soup.select('a[href*="/chapter/"]')
        for link in chapter_links:
            href = link.get('href', '')
            if href:
                full_url = urljoin(url, href)
                chapter_urls.append(full_url)
        
        logger.info(f"解析到 {len(chapter_urls)} 个章节")
        return chapter_urls
    
    def parse_chapter(self, url: str, chapter_num: int) -> Optional[ChapterInfo]:
        """解析 17K 章节内容"""
        response = self.request_manager.get(url)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        try:
            # 章节标题
            title_elem = soup.select_one('h1.chapter-title')
            title = title_elem.text.strip() if title_elem else f'第{chapter_num}章'
            
            # 章节内容
            content_elem = soup.select_one('div.chapter-content')
            if content_elem:
                for tag in content_elem.find_all(['script', 'style']):
                    tag.decompose()
                content = content_elem.get_text('\n', strip=True)
            else:
                content = ''
            
            word_count = len(content.replace('\n', '').replace(' ', ''))
            
            return ChapterInfo(
                chapter_num=chapter_num,
                title=title,
                content=content,
                word_count=word_count,
                is_free=True,
                source_url=url
            )
        except Exception as e:
            logger.error(f"解析章节失败: {url}, 错误: {e}")
            return None


# ============================================================
# 数据库管理
# ============================================================

class DatabaseManager:
    """Supabase 数据库管理器"""
    
    def __init__(self, config: Config):
        self.config = config
        self.client: Client = create_client(config.supabase_url, config.supabase_key)
    
    def novel_exists(self, source_url: str) -> Optional[str]:
        """检查小说是否已存在，返回小说 ID"""
        try:
            result = self.client.table('novels').select('id').eq('source_url', source_url).execute()
            if result.data:
                return result.data[0]['id']
            return None
        except Exception as e:
            logger.error(f"检查小说存在失败: {e}")
            return None
    
    def insert_novel(self, novel: NovelInfo) -> Optional[str]:
        """插入小说，返回小说 ID"""
        try:
            data = {
                'title': novel.title,
                'author': novel.author,
                'description': novel.description,
                'category': novel.category,
                'tags': novel.tags,
                'word_count': novel.word_count,
                'status': novel.status,
                'cover_url': novel.cover_url,
                'source_url': novel.source_url,
                'source': novel.source,
                'is_free': novel.is_free,
                'user_id': None  # 公共小说
            }
            
            result = self.client.table('novels').insert(data).execute()
            if result.data:
                novel_id = result.data[0]['id']
                logger.info(f"插入小说成功: {novel.title} (ID: {novel_id})")
                return novel_id
            return None
        except Exception as e:
            logger.error(f"插入小说失败: {novel.title}, 错误: {e}")
            return None
    
    def update_novel(self, novel_id: str, novel: NovelInfo) -> bool:
        """更新小说信息"""
        try:
            data = {
                'title': novel.title,
                'author': novel.author,
                'description': novel.description,
                'category': novel.category,
                'tags': novel.tags,
                'word_count': novel.word_count,
                'status': novel.status,
                'cover_url': novel.cover_url,
            }
            
            self.client.table('novels').update(data).eq('id', novel_id).execute()
            logger.info(f"更新小说成功: {novel.title}")
            return True
        except Exception as e:
            logger.error(f"更新小说失败: {novel.title}, 错误: {e}")
            return False
    
    def get_max_chapter_num(self, novel_id: str) -> int:
        """获取小说的最大章节号"""
        try:
            result = self.client.table('novel_chapters').select('chapter_num').eq('novel_id', novel_id).order('chapter_num', desc=True).limit(1).execute()
            if result.data:
                return result.data[0]['chapter_num']
            return 0
        except Exception as e:
            logger.error(f"获取最大章节号失败: {e}")
            return 0
    
    def chapter_exists(self, novel_id: str, chapter_num: int) -> bool:
        """检查章节是否已存在"""
        try:
            result = self.client.table('novel_chapters').select('id').eq('novel_id', novel_id).eq('chapter_num', chapter_num).execute()
            return len(result.data) > 0
        except Exception as e:
            logger.error(f"检查章节存在失败: {e}")
            return False
    
    def insert_chapter(self, novel_id: str, chapter: ChapterInfo) -> bool:
        """插入章节"""
        try:
            data = {
                'novel_id': novel_id,
                'chapter_num': chapter.chapter_num,
                'title': chapter.title,
                'content': chapter.content,
                'word_count': chapter.word_count,
                'is_free': chapter.is_free,
            }
            
            self.client.table('novel_chapters').insert(data).execute()
            return True
        except Exception as e:
            logger.error(f"插入章节失败: {chapter.title}, 错误: {e}")
            return False
    
    def batch_insert_chapters(self, novel_id: str, chapters: List[ChapterInfo]) -> int:
        """批量插入章节"""
        success_count = 0
        batch_size = self.config.settings.get('batch_size', 10)
        
        for i in range(0, len(chapters), batch_size):
            batch = chapters[i:i + batch_size]
            data_list = []
            
            for chapter in batch:
                data_list.append({
                    'novel_id': novel_id,
                    'chapter_num': chapter.chapter_num,
                    'title': chapter.title,
                    'content': chapter.content,
                    'word_count': chapter.word_count,
                    'is_free': chapter.is_free,
                })
            
            try:
                self.client.table('novel_chapters').insert(data_list).execute()
                success_count += len(batch)
            except Exception as e:
                logger.error(f"批量插入章节失败: {e}")
                # 回退到单条插入
                for chapter in batch:
                    if self.insert_chapter(novel_id, chapter):
                        success_count += 1
        
        return success_count


# ============================================================
# 爬虫主类
# ============================================================

class NovelCrawler:
    """小说爬虫主类"""
    
    PARSER_MAP = {
        'qidian': QidianParser,
        'zongheng': ZonghengParser,
        'seventeenk': SeventeenKParser,
    }
    
    def __init__(self, config_path: str):
        self.config = Config(config_path)
        self.request_manager = RequestManager(self.config)
        self.db_manager = DatabaseManager(self.config)
        self.progress_file = os.path.join(os.path.dirname(__file__), 'crawler_progress.json')
        self.progress = self._load_progress()
    
    def _load_progress(self) -> Dict:
        """加载爬取进度"""
        if os.path.exists(self.progress_file):
            try:
                with open(self.progress_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        return {}
    
    def _save_progress(self):
        """保存爬取进度"""
        with open(self.progress_file, 'w', encoding='utf-8') as f:
            json.dump(self.progress, f, ensure_ascii=False, indent=2)
    
    def get_parser(self, parser_name: str) -> BaseParser:
        """获取解析器"""
        parser_class = self.PARSER_MAP.get(parser_name, QidianParser)
        return parser_class(self.config, self.request_manager)
    
    def crawl_novel(self, novel_url: str, parser: BaseParser, source_name: str) -> bool:
        """爬取单本小说"""
        # 检查是否已存在
        existing_id = self.db_manager.novel_exists(novel_url)
        
        # 解析小说信息
        novel_info = parser.parse_novel_info(novel_url)
        if not novel_info:
            logger.error(f"解析小说信息失败: {novel_url}")
            return False
        
        if existing_id:
            # 更新已有小说
            novel_id = existing_id
            self.db_manager.update_novel(novel_id, novel_info)
            logger.info(f"小说已存在，更新: {novel_info.title}")
        else:
            # 插入新小说
            novel_id = self.db_manager.insert_novel(novel_info)
            if not novel_id:
                return False
        
        # 获取已爬取的最大章节号
        max_chapter = self.db_manager.get_max_chapter_num(novel_id)
        
        # 解析章节列表
        chapter_urls = parser.parse_chapter_list(novel_url)
        if not chapter_urls:
            logger.warning(f"未找到章节列表: {novel_info.title}")
            return True
        
        # 限制章节数量
        max_chapters = self.config.settings['max_chapters_per_novel']
        if len(chapter_urls) > max_chapters:
            chapter_urls = chapter_urls[:max_chapters]
        
        # 过滤已爬取的章节
        if max_chapter > 0:
            chapter_urls = chapter_urls[max_chapter:]
            logger.info(f"跳过已爬取的 {max_chapter} 章")
        
        if not chapter_urls:
            logger.info(f"小说无需更新: {novel_info.title}")
            return True
        
        logger.info(f"开始爬取 {len(chapter_urls)} 章: {novel_info.title}")
        
        # 爬取章节内容
        chapters = []
        for idx, chapter_url in enumerate(chapter_urls):
            chapter_num = max_chapter + idx + 1
            chapter = parser.parse_chapter(chapter_url, chapter_num)
            if chapter:
                chapters.append(chapter)
                logger.info(f"解析章节 [{chapter_num}/{max_chapter + len(chapter_urls)}]: {chapter.title}")
        
        # 批量插入章节
        if chapters:
            success_count = self.db_manager.batch_insert_chapters(novel_id, chapters)
            logger.info(f"插入章节: {success_count}/{len(chapters)}")
        
        return True
    
    def crawl_source(self, source: Dict):
        """爬取单个来源"""
        if not source.get('enabled', False):
            logger.info(f"来源已禁用: {source['name']}")
            return
        
        logger.info(f"开始爬取来源: {source['name']}")
        
        parser = self.get_parser(source.get('parser', 'qidian'))
        
        # 获取小说列表
        novel_urls = parser.parse_novel_list(source['base_url'])
        
        # 限制小说数量
        max_novels = self.config.settings['max_novels']
        if len(novel_urls) > max_novels:
            novel_urls = novel_urls[:max_novels]
        
        logger.info(f"准备爬取 {len(novel_urls)} 本小说")
        
        # 多线程爬取
        max_workers = self.config.settings['max_workers']
        success_count = 0
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self.crawl_novel, url, parser, source['name']): url
                for url in novel_urls
            }
            
            for future in as_completed(futures):
                url = futures[future]
                try:
                    if future.result():
                        success_count += 1
                except Exception as e:
                    logger.error(f"爬取小说失败: {url}, 错误: {e}")
        
        logger.info(f"来源 {source['name']} 爬取完成: 成功 {success_count}/{len(novel_urls)}")
    
    def run(self, source_names: List[str] = None):
        """运行爬虫"""
        logger.info("=" * 50)
        logger.info("小说爬虫启动")
        logger.info(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 50)
        
        start_time = time.time()
        
        # 确定要爬取的来源
        sources = self.config.sources
        if source_names:
            sources = [s for s in sources if s['name'] in source_names]
        
        if not sources:
            logger.warning("没有可用的爬取来源")
            return
        
        # 依次爬取各来源
        for source in sources:
            try:
                self.crawl_source(source)
            except Exception as e:
                logger.error(f"爬取来源失败: {source['name']}, 错误: {e}")
        
        # 保存进度
        self._save_progress()
        
        elapsed = time.time() - start_time
        logger.info("=" * 50)
        logger.info(f"爬虫完成，耗时: {elapsed:.2f} 秒")
        logger.info("=" * 50)
    
    def close(self):
        """关闭资源"""
        self.request_manager.close()


# ============================================================
# 主函数
# ============================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='小说爬虫')
    parser.add_argument('--source', '-s', nargs='*', help='指定爬取来源（不指定则爬取所有启用的来源）')
    parser.add_argument('--config', '-c', default='crawler_config.json', help='配置文件路径')
    parser.add_argument('--max-novels', '-n', type=int, help='最大小说数量')
    parser.add_argument('--max-chapters', type=int, help='每本小说最大章节数')
    
    args = parser.parse_args()
    
    # 配置文件路径
    config_path = os.path.join(os.path.dirname(__file__), args.config)
    
    # 创建爬虫
    crawler = NovelCrawler(config_path)
    
    # 覆盖配置
    if args.max_novels:
        crawler.config._config['settings']['max_novels'] = args.max_novels
    if args.max_chapters:
        crawler.config._config['settings']['max_chapters_per_novel'] = args.max_chapters
    
    try:
        crawler.run(args.source)
    except KeyboardInterrupt:
        logger.info("用户中断爬虫")
        crawler._save_progress()
    finally:
        crawler.close()


if __name__ == '__main__':
    main()
