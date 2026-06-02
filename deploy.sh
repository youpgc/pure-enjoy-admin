#!/bin/bash

# ============================================================
# 纯享项目部署脚本
# 功能：
#   1. 同步代码到 GitHub 和 Gitee
#   2. 构建并部署管理后台
#   3. 构建 App APK（可选）
#   4. 监控 GitHub Actions 构建状态
# 用法：./deploy.sh [admin|app|apk|all|build]
# 环境变量：GITHUB_TOKEN（必需用于触发构建）
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 GitHub Token
check_github_token() {
    if [ -z "$GITHUB_TOKEN" ]; then
        # 尝试从 .env 文件加载
        if [ -f "/workspace/.env" ]; then
            export $(grep -v '^#' /workspace/.env | xargs) 2>/dev/null || true
        fi
    fi
    
    if [ -z "$GITHUB_TOKEN" ]; then
        print_error "未设置 GITHUB_TOKEN 环境变量"
        print_info "请按以下方式之一配置："
        print_info "1. 环境变量: export GITHUB_TOKEN='ghp_xxxxxxxxxxxxxxxxxxxx'"
        print_info "2. .env 文件: echo 'GITHUB_TOKEN=ghp_xxx' > /workspace/.env"
        print_info "3. GitHub CLI: gh auth login"
        return 1
    fi
    
    # 设置 gh CLI 使用 Token
    export GH_TOKEN="$GITHUB_TOKEN"
    return 0
}

# 部署管理后台
deploy_admin() {
    print_info "开始部署管理后台..."
    
    cd /workspace/pure-enjoy-admin
    
    # 检查是否有未提交的更改
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "管理后台有未提交的更改，请先提交"
        git status
        return 1
    fi
    
    # 同步到 GitHub
    print_info "同步到 GitHub..."
    git push origin main
    print_success "GitHub 同步完成"
    
    # 同步到 Gitee
    print_info "同步到 Gitee..."
    git push gitee main
    print_success "Gitee 同步完成"
    
    print_success "管理后台部署完成！GitHub Actions 将自动构建并部署到 GitHub Pages"
    print_info "部署地址：https://youpgc.github.io/pure-enjoy-admin/"
}

# 部署 App（仅同步代码，APK 构建需要手动触发）
deploy_app_code() {
    print_info "开始同步 App 代码..."
    
    cd /workspace/pure-enjoy
    
    # 检查是否有未提交的更改
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "App 有未提交的更改，请先提交"
        git status
        return 1
    fi
    
    # 同步到 GitHub
    print_info "同步到 GitHub..."
    git push origin master
    print_success "GitHub 同步完成"
    
    # 同步到 Gitee
    print_info "同步到 Gitee..."
    git push gitee master
    print_success "Gitee 同步完成"
    
    print_success "App 代码同步完成！"
}

# 构建 App APK（本地构建）
build_app_apk() {
    print_info "开始构建 App APK..."
    
    cd /workspace/pure-enjoy
    
    # 检查 Flutter 环境
    if ! command -v flutter &> /dev/null; then
        print_error "未找到 Flutter，请先安装 Flutter SDK"
        return 1
    fi
    
    # 获取依赖
    print_info "获取 Flutter 依赖..."
    flutter pub get
    
    # 构建 APK
    print_info "构建 Release APK..."
    flutter build apk --release
    
    # 显示构建结果
    APK_PATH="build/app/outputs/flutter-apk/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(ls -lh $APK_PATH | awk '{ print $5 }')
        print_success "APK 构建成功！"
        print_info "路径: $APK_PATH"
        print_info "大小: $APK_SIZE"
        
        # 复制到输出目录
        mkdir -p /workspace/releases
        VERSION=$(grep "version:" pubspec.yaml | head -1 | awk '{print $2}')
        cp $APK_PATH "/workspace/releases/pure-enjoy-$VERSION.apk"
        print_success "APK 已复制到 /workspace/releases/pure-enjoy-$VERSION.apk"
    else
        print_error "APK 构建失败，未找到输出文件"
        return 1
    fi
}

# 触发 GitHub Actions 构建并监控
trigger_and_monitor_build() {
    print_info "触发 GitHub Actions 构建..."
    
    # 检查 Token
    check_github_token || return 1
    
    # 确保 gh CLI 已安装
    if ! command -v gh &> /dev/null; then
        print_info "安装 GitHub CLI..."
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update -qq && sudo apt install -y gh
    fi
    
    # 触发构建
    print_info "触发 build_apk.yml 工作流..."
    gh workflow run build_apk.yml --repo youpgc/pure-enjoy
    
    # 等待构建启动
    print_info "等待构建启动..."
    sleep 5
    
    # 获取最新的运行 ID
    RUN_ID=$(gh run list --repo youpgc/pure-enjoy --workflow build_apk.yml --limit 1 --json databaseId --jq '.[0].databaseId')
    
    if [ -z "$RUN_ID" ]; then
        print_error "无法获取构建运行 ID"
        return 1
    fi
    
    print_info "构建运行 ID: $RUN_ID"
    print_info "监控构建进度..."
    print_info "构建日志: https://github.com/youpgc/pure-enjoy/actions/runs/$RUN_ID"
    echo ""
    
    # 监控构建状态
    local attempts=0
    local max_attempts=180  # 最多等待30分钟
    
    while [ $attempts -lt $max_attempts ]; do
        local status=$(gh run view $RUN_ID --repo youpgc/pure-enjoy --json status --jq '.status' 2>/dev/null || echo "unknown")
        local conclusion=$(gh run view $RUN_ID --repo youpgc/pure-enjoy --json conclusion --jq '.conclusion' 2>/dev/null || echo "null")
        
        # 显示进度
        local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
        local spin_idx=$((attempts % 10))
        printf "\r${spin:$spin_idx:1} 构建中... (尝试 $attempts/$max_attempts) - 状态: $status"
        
        # 检查是否完成
        if [ "$status" = "completed" ]; then
            echo ""  # 换行
            if [ "$conclusion" = "success" ]; then
                print_success "构建成功！"
                
                # 获取构建详情
                local run_info=$(gh run view $RUN_ID --repo youpgc/pure-enjoy --json headCommit,displayTitle --jq '.')
                local commit_msg=$(echo "$run_info" | grep -o '"displayTitle":"[^"]*"' | cut -d'"' -f4)
                
                print_info "提交信息: $commit_msg"
                print_info "构建详情: https://github.com/youpgc/pure-enjoy/actions/runs/$RUN_ID"
                
                # 检查版本同步
                check_version_sync
                return 0
            else
                print_error "构建失败！结论: $conclusion"
                print_info "查看日志: https://github.com/youpgc/pure-enjoy/actions/runs/$RUN_ID"
                
                # 询问是否排查问题
                read -p "是否查看失败日志并排查问题? (y/n): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    troubleshoot_build $RUN_ID
                fi
                return 1
            fi
        fi
        
        attempts=$((attempts + 1))
        sleep 10  # 每10秒检查一次
    done
    
    echo ""
    print_error "构建监控超时"
    return 1
}

# 排查构建问题
troubleshoot_build() {
    local run_id=$1
    print_info "获取构建日志..."
    
    # 显示失败日志
    gh run view $run_id --repo youpgc/pure-enjoy --log-failed
    
    print_info "常见问题和解决方案："
    print_info "1. Flutter 依赖问题: flutter pub get"
    print_info "2. 编译错误: 检查代码语法"
    print_info "3. Secrets 缺失: 检查 SUPABASE_ACCESS_TOKEN 等配置"
    print_info "4. 版本冲突: 检查 pubspec.yaml"
}

# 检查版本同步
check_version_sync() {
    print_info "检查版本同步状态..."
    print_info "版本信息应已自动同步到管理后台"
    print_info "请访问: https://youpgc.github.io/pure-enjoy-admin/#/version-management"
}

# 完整部署
full_deploy() {
    deploy_admin
    deploy_app_code
    
    print_info ""
    print_info "App 端已配置 GitHub Actions 自动构建"
    print_info "推送代码后将自动触发 APK 构建并上传到 Supabase"
    print_info ""
    print_info "如需立即触发构建并监控，请运行: ./deploy.sh build"
}

# 显示帮助
show_help() {
    echo "用法: $0 [admin|app|apk|build|all]"
    echo ""
    echo "选项:"
    echo "  admin   - 仅部署管理后台"
    echo "  app     - 仅同步 App 代码"
    echo "  apk     - 仅本地构建 App APK"
    echo "  build   - 触发 GitHub Actions 构建并监控"
    echo "  all     - 完整部署（默认）"
    echo ""
    echo "环境变量:"
    echo "  GITHUB_TOKEN - GitHub Personal Access Token"
    echo ""
    echo "示例:"
    echo "  export GITHUB_TOKEN='ghp_xxxxxxxxxxxxxxxxxxxx'"
    echo "  ./deploy.sh build"
}

# 主函数
main() {
    case "${1:-all}" in
        admin)
            deploy_admin
            ;;
        app)
            deploy_app_code
            ;;
        apk)
            build_app_apk
            ;;
        build)
            trigger_and_monitor_build
            ;;
        all)
            full_deploy
            ;;
        help|-h|--help)
            show_help
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

main "$@"
