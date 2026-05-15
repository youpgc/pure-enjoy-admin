#!/bin/bash
cd "$(dirname "$0")"

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 python3，请先安装 Python 3"
    exit 1
fi

# 安装依赖
echo "正在安装依赖..."
pip install -r requirements.txt -q

# 运行爬虫
echo "启动小说爬虫..."
python3 novel_crawler.py "$@"
