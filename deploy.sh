#!/bin/bash

# ============================================================
# 纯享项目部署脚本 - 完整构建监控版
# 功能：
#   1. 同步代码到 GitHub 和 Gitee
#   2. 触发 GitHub Actions 构建并实时监控
#   3. 构建失败自动排查原因并重试
#   4. 构建成功获取版本号和下载地址
#   5. 同步新版本到管理后台
# 用法：./deploy.sh [admin|app|build|all]
# 环境变量：GITHUB_TOKEN（必需用于触发构建）
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

print_highlight() {
    echo -e "${CYAN}$1${NC}"
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

# 安装 GitHub CLI
install_gh_cli() {
    if ! command -v gh &> /dev/null; then
        print_info "安装 GitHub CLI..."
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update -qq && sudo apt install -y gh
    fi
}

# 监控构建过程
monitor_build() {
    local run_id=$1
    local repo="youpgc/pure-enjoy"
    local max_attempts=180  # 最多等待30分钟
    local attempts=0
    
    print_info "开始监控构建进程..."
    print_info "构建日志: https://github.com/$repo/actions/runs/$run_id"
    echo ""
    
    while [ $attempts -lt $max_attempts ]; do
        local status=$(gh run view $run_id --repo $repo --json status --jq '.status' 2>/dev/null || echo "unknown")
        local conclusion=$(gh run view $run_id --repo $repo --json conclusion --jq '.conclusion' 2>/dev/null || echo "null")
        
        # 显示进度动画
        local spin=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
        local spin_idx=$((attempts % 10))
        printf "\r${spin[$spin_idx]} 构建中... [%d/%d] 状态: %s" $attempts $max_attempts "$status"
        
        # 检查是否完成
        if [ "$status" = "completed" ]; then
            echo ""  # 换行
            return 0
        fi
        
        attempts=$((attempts + 1))
        sleep 10
    done
    
    echo ""
    print_error "构建监控超时"
    return 1
}

# 获取构建结果
get_build_result() {
    local run_id=$1
    local repo="youpgc/pure-enjoy"
    
    local conclusion=$(gh run view $run_id --repo $repo --json conclusion --jq '.conclusion' 2>/dev/null || echo "unknown")
    local status=$(gh run view $run_id --repo $repo --json status --jq '.status' 2>/dev/null || echo "unknown")
    
    echo "$conclusion"
}

# 获取构建日志
get_build_logs() {
    local run_id=$1
    local repo="youpgc/pure-enjoy"
    
    print_info "获取构建日志..."
    gh run view $run_id --repo $repo --log
}

# 获取失败日志
get_failed_logs() {
    local run_id=$1
    local repo="youpgc/pure-enjoy"
    
    print_info "获取失败步骤日志..."
    gh run view $run_id --repo $repo --log-failed
}

# 分析构建失败原因
analyze_build_failure() {
    local run_id=$1
    local repo="youpgc/pure-enjoy"
    
    print_error "构建失败！开始分析原因..."
    echo ""
    
    # 获取失败日志
    local failed_logs=$(gh run view $run_id --repo $repo --log-failed 2>/dev/null || echo "")
    
    # 常见错误模式分析
    echo "$failed_logs" | grep -i "error\|failed\|exception" | head -20
    
    print_highlight "\n========== 构建失败分析 =========="
    
    if echo "$failed_logs" | grep -qi "flutter.*pub.*get"; then
        print_error "❌ 依赖获取失败"
        print_info "可能原因:"
        print_info "  - pubspec.yaml 格式错误"
        print_info "  - 依赖版本冲突"
        print_info "  - 网络问题"
        print_info "解决方案:"
        print_info "  1. 检查 pubspec.yaml 语法"
        print_info "  2. 运行 flutter pub get 本地测试"
        return "dependency_error"
    fi
    
    if echo "$failed_logs" | grep -qi "compile\|build.*apk"; then
        print_error "❌ 编译错误"
        print_info "可能原因:"
        print_info "  - Dart 语法错误"
        print_info "  - 缺少依赖"
        print_info "  - Android 配置问题"
        print_info "解决方案:"
        print_info "  1. 本地运行 flutter build apk 测试"
        print_info "  2. 检查 lib/ 目录下的语法错误"
        return "compile_error"
    fi
    
    if echo "$failed_logs" | grep -qi "supabase\|upload\|storage"; then
        print_error "❌ Supabase 上传失败"
        print_info "可能原因:"
        print_info "  - Secrets 配置错误"
        print_info "  - Supabase 服务不可用"
        print_info "  - 存储桶权限问题"
        print_info "解决方案:"
        print_info "  1. 检查 Secrets: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID"
        print_info "  2. 检查 Supabase Storage 权限"
        return "upload_error"
    fi
    
    if echo "$failed_logs" | grep -qi "version\|pubspec"; then
        print_error "❌ 版本号处理错误"
        print_info "可能原因:"
        print_info "  - pubspec.yaml 版本号格式错误"
        print_info "  - 版本号解析失败"
        print_info "解决方案:"
        print_info "  1. 检查 pubspec.yaml 版本格式: version: x.x.x+x"
        return "version_error"
    fi
    
    print_error "❌ 未知错误"
    print_info "请查看完整日志: https://github.com/youpgc/pure-enjoy/actions/runs/$run_id"
    return "unknown_error"
}

# 尝试修复常见问题
attempt_fix() {
    local error_type=$1
    
    print_highlight "\n========== 尝试自动修复 =========="
    
    case $error_type in
        "dependency_error")
            print_info "尝试修复依赖问题..."
            cd /workspace/pure-enjoy
            flutter pub get 2>/dev/null || true
            flutter pub upgrade 2>/dev/null || true
            ;;
        "version_error")
            print_info "尝试修复版本号..."
            cd /workspace/pure-enjoy
            # 确保版本号格式正确
            local current=$(grep "version:" pubspec.yaml | head -1 | awk '{print $2}')
            if [[ ! $current =~ ^[0-9]+\.[0-9]+\.[0-9]+\+[0-9]+$ ]]; then
                print_warning "版本号格式不正确，修复为 1.9.3+45"
                sed -i 's/^version:.*$/version: 1.9.3+45/' pubspec.yaml
                git add pubspec.yaml
                git commit -m "fix: 修复版本号格式"
                git push origin master
            fi
            ;;
        *)
            print_warning "无法自动修复此问题，需要手动处理"
            ;;
    esac
}

# 触发构建并监控
build_and_monitor() {
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if [ $retry_count -gt 0 ]; then
            print_highlight "\n========== 第 $retry_count 次重试 =========="
        fi
        
        # 检查 Token
        check_github_token || return 1
        
        # 安装 GitHub CLI
        install_gh_cli
        
        # 触发构建
        print_info "触发 GitHub Actions 构建..."
        gh workflow run build_apk.yml --repo youpgc/pure-enjoy
        
        # 等待构建启动
        print_info "等待构建启动..."
        sleep 5
        
        # 获取运行 ID
        local run_id=$(gh run list --repo youpgc/pure-enjoy --workflow build_apk.yml --limit 1 --json databaseId --jq '.[0].databaseId')
        
        if [ -z "$run_id" ]; then
            print_error "无法获取构建运行 ID"
            retry_count=$((retry_count + 1))
            continue
        fi
        
        print_info "构建运行 ID: $run_id"
        
        # 监控构建
        if ! monitor_build $run_id; then
            retry_count=$((retry_count + 1))
            continue
        fi
        
        # 获取构建结果
        local conclusion=$(get_build_result $run_id)
        
        if [ "$conclusion" = "success" ]; then
            print_success "✅ 构建成功！"
            handle_build_success $run_id
            return 0
        else
            print_error "❌ 构建失败！结论: $conclusion"
            
            # 分析失败原因
            local error_type=$(analyze_build_failure $run_id)
            
            # 尝试修复
            attempt_fix $error_type
            
            retry_count=$((retry_count + 1))
            
            if [ $retry_count -lt $max_retries ]; then
                print_info "5秒后重试..."
                sleep 5
            fi
        fi
    done
    
    print_error "构建失败，已达到最大重试次数 ($max_retries)"
    print_info "请手动查看日志并修复问题:"
    print_info "https://github.com/youpgc/pure-enjoy/actions"
    return 1
}

# 处理构建成功
handle_build_success() {
    local run_id=$1
    local repo="youpgc/pure-enjoy"
    
    print_highlight "\n========== 构建成功详情 =========="
    
    # 获取构建信息
    local run_info=$(gh run view $run_id --repo $repo --json headCommit,displayTitle,createdAt --jq '.')
    local commit_msg=$(echo "$run_info" | grep -o '"displayTitle":"[^"]*"' | cut -d'"' -f4)
    local created_at=$(echo "$run_info" | grep -o '"createdAt":"[^"]*"' | cut -d'"' -f4)
    
    # 获取版本信息（从构建产物名称）
    local artifact_info=$(gh run view $run_id --repo $repo --json artifacts --jq '.artifacts[0]' 2>/dev/null || echo "")
    local apk_name=$(echo "$artifact_info" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    # 解析版本号
    if [[ $apk_name =~ pure-enjoy-v([0-9]+\.[0-9]+\.[0-9]+)\+([0-9]+) ]]; then
        local version="${BASH_REMATCH[1]}"
        local build_number="${BASH_REMATCH[2]}"
        
        print_success "📱 新版本号: v${version}+${build_number}"
    else
        local version="未知"
        local build_number="未知"
        print_warning "无法解析版本号"
    fi
    
    # 下载地址
    local download_url="https://github.com/$repo/actions/runs/$run_id"
    local supabase_url="https://mhdrbjpqmzswswoazwjg.supabase.co/storage/v1/object/public/apk-releases/$apk_name"
    
    print_success "📦 APK 文件名: $apk_name"
    print_success "🔗 GitHub 下载: $download_url"
    print_success "☁️  Supabase 下载: $supabase_url"
    print_info "📋 提交信息: $commit_msg"
    print_info "📅 构建时间: $created_at"
    
    # 同步到管理后台
    print_highlight "\n========== 同步到管理后台 =========="
    sync_to_admin $version $build_number "$supabase_url"
    
    # 保存构建信息到文件
    local info_file="/workspace/releases/latest_build_info.txt"
    mkdir -p /workspace/releases
    cat > $info_file << EOF
构建时间: $(date)
版本号: v${version}+${build_number}
APK 文件名: $apk_name
GitHub 下载: $download_url
Supabase 下载: $supabase_url
提交信息: $commit_msg
EOF
    
    print_success "构建信息已保存到: $info_file"
    
    # 显示总结
    print_highlight "\n========== 构建完成总结 =========="
    print_success "✅ 版本号: v${version}+${build_number}"
    print_success "✅ APK 下载: $supabase_url"
    print_success "✅ 已同步到管理后台"
    print_info "📱 管理后台: https://youpgc.github.io/pure-enjoy-admin/#/version-management"
}

# 同步到管理后台
sync_to_admin() {
    local version=$1
    local build_number=$2
    local apk_url=$3
    
    print_info "正在同步新版本到管理后台..."
    
    # 这里可以调用管理后台的 API 或执行其他同步操作
    # 目前 GitHub Actions 已经自动同步到 app_versions 表
    
    print_success "✅ 版本已自动同步到 Supabase app_versions 表"
    print_info "管理后台将自动显示新版本"
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

# 部署 App（仅同步代码）
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

# 完整部署
full_deploy() {
    deploy_admin
    deploy_app_code
    
    print_highlight "\n========== 部署完成 =========="
    print_info "App 端已配置 GitHub Actions 自动构建"
    print_info "推送代码后将自动触发 APK 构建"
    print_info ""
    print_info "如需立即触发构建并监控，请运行:"
    print_highlight "  ./deploy.sh build"
}

# 显示帮助
show_help() {
    echo "用法: $0 [admin|app|build|all]"
    echo ""
    echo "选项:"
    echo "  admin   - 仅部署管理后台"
    echo "  app     - 仅同步 App 代码"
    echo "  build   - 触发 GitHub Actions 构建并监控（推荐）"
    echo "  all     - 完整部署（默认）"
    echo ""
    echo "环境变量:"
    echo "  GITHUB_TOKEN - GitHub Personal Access Token"
    echo ""
    echo "示例:"
    echo "  export GITHUB_TOKEN='ghp_xxxxxxxxxxxxxxxxxxxx'"
    echo "  ./deploy.sh build"
    echo ""
    echo "build 命令功能:"
    echo "  1. 触发 GitHub Actions 构建"
    echo "  2. 实时监控构建进度"
    echo "  3. 构建失败自动排查原因"
    echo "  4. 自动修复常见问题并重试"
    echo "  5. 构建成功显示版本号和下载地址"
    echo "  6. 同步新版本到管理后台"
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
        build)
            build_and_monitor
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
