#!/bin/bash

# ============================================================
# 纯享项目部署脚本 - 完整构建监控版
# 功能：
#   1. 同步代码到 GitHub 和 Gitee
#   2. 触发 GitHub Actions 构建并实时监控
#   3. 构建失败自动排查原因并重试
#   4. 构建成功/失败汇报结果
#   5. 部署完成汇报
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

# 汇报函数 - 汇报给用户
report() {
    echo ""
    print_highlight "========== 📊 结果汇报 =========="
    echo "$1"
    print_highlight "================================="
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
        return 1
    fi
    
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

# 监控 GitHub Actions 构建过程
monitor_github_actions() {
    local repo=$1
    local workflow=$2
    local run_id=$3
    local max_attempts=180  # 最多等待30分钟（180 * 10秒）
    local attempts=0
    
    print_info "开始监听 GitHub Actions 构建..."
    print_info "构建页面: https://github.com/$repo/actions/runs/$run_id"
    echo ""
    
    while [ $attempts -lt $max_attempts ]; do
        local status=$(gh run view $run_id --repo "$repo" --json status --jq '.status' 2>/dev/null || echo "unknown")
        local conclusion=$(gh run view $run_id --repo "$repo" --json conclusion --jq '.conclusion' 2>/dev/null || echo "null")
        
        # 显示进度动画
        local spin=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
        local spin_idx=$((attempts % 10))
        printf "\r${spin[$spin_idx]} 监听构建中... [%d/%d] 状态: %s" $attempts $max_attempts "$status"
        
        # 检查是否完成
        if [ "$status" = "completed" ]; then
            echo ""  # 换行
            echo "$conclusion"  # 返回结论
            return 0
        fi
        
        attempts=$((attempts + 1))
        sleep 10
    done
    
    echo ""
    print_error "构建监听超时"
    return 1
}

# 获取构建结果详情
get_build_details() {
    local repo=$1
    local run_id=$2
    
    local run_info=$(gh run view $run_id --repo "$repo" --json headCommit,displayTitle,createdAt,conclusion --jq '.' 2>/dev/null)
    local commit_msg=$(echo "$run_info" | jq -r '.displayTitle' 2>/dev/null || echo "未知")
    local created_at=$(echo "$run_info" | jq -r '.createdAt' 2>/dev/null || echo "未知")
    local conclusion=$(echo "$run_info" | jq -r '.conclusion' 2>/dev/null || echo "未知")
    
    echo "commit_msg:$commit_msg"
    echo "created_at:$created_at"
    echo "conclusion:$conclusion"
}

# 获取构建失败原因
get_failure_reason() {
    local repo=$1
    local run_id=$2
    
    print_info "获取构建日志..."
    gh run view $run_id --repo "$repo" --log-failed 2>/dev/null | head -50
}

# ============================================================
# 管理后台部署
# ============================================================
deploy_admin() {
    print_info "========== 开始部署管理后台 =========="
    
    cd /workspace/pure-enjoy-admin
    
    # 获取最新 commit 信息
    local commit_msg=$(git log -1 --pretty=%B | head -1)
    local commit_short=$(git log -1 --pretty=%h)
    print_info "当前提交: $commit_short - $commit_msg"
    
    # 同步到 GitHub（自动触发构建）
    print_info "同步到 GitHub 并触发构建..."
    git push origin main 2>&1
    
    # 获取运行 ID
    local run_id=""
    sleep 3
    run_id=$(gh run list --repo youpgc/pure-enjoy-admin --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "")
    
    if [ -z "$run_id" ]; then
        print_warning "无法获取构建运行 ID，等待自动触发..."
        print_info "请手动查看: https://github.com/youpgc/pure-enjoy-admin/actions"
    else
        print_info "构建运行 ID: $run_id"
        
        # 监听构建过程
        print_info "开始监听构建进度..."
        local conclusion=$(monitor_github_actions "youpgc/pure-enjoy-admin" "deploy.yml" "$run_id")
        
        # 汇报结果
        if [ "$conclusion" = "success" ]; then
            print_success "✅ 管理后台构建成功！"
            report "🎉 管理后台部署完成！

📦 版本: $commit_short
📝 提交: $commit_msg
🔗 地址: https://youpgc.github.io/pure-enjoy-admin/
⏱️ 用时: 请在页面查看"
        else
            print_error "❌ 管理后台构建失败！"
            print_info "失败原因:"
            get_failure_reason "youpgc/pure-enjoy-admin" "$run_id"
            report "❌ 管理后台构建失败！

📦 版本: $commit_short
📝 提交: $commit_msg
🔗 查看详情: https://github.com/youpgc/pure-enjoy-admin/actions/runs/$run_id"
        fi
    fi
    
    # 同步到 Gitee
    print_info "同步到 Gitee..."
    git push gitee main 2>&1 || print_warning "Gitee 同步失败"
    
    print_success "========== 管理后台部署流程结束 =========="
}

# ============================================================
# App 端部署
# ============================================================
deploy_app_code() {
    print_info "========== 开始同步 App 代码 =========="
    
    cd /workspace/pure-enjoy
    
    # 获取最新 commit 信息
    local commit_msg=$(git log -1 --pretty=%B | head -1)
    local commit_short=$(git log -1 --pretty=%h)
    print_info "当前提交: $commit_short - $commit_msg"
    
    # 同步到 GitHub
    print_info "同步到 GitHub..."
    git push origin master 2>&1
    
    # 同步到 Gitee
    print_info "同步到 Gitee..."
    git push gitee master 2>&1 || print_warning "Gitee 同步失败"
    
    print_success "✅ App 代码同步完成！"
    print_info "GitHub Actions 将自动构建 APK"
}

# ============================================================
# App 端 APK 构建（带监控）
# ============================================================
build_app_apk() {
    print_info "========== 开始构建 App APK =========="
    
    check_github_token || return 1
    install_gh_cli
    
    # 触发构建
    print_info "触发 GitHub Actions 构建..."
    gh workflow run build_apk.yml --repo youpgc/pure-enjoy 2>&1
    
    # 等待构建启动
    sleep 5
    
    # 获取运行 ID
    local run_id=$(gh run list --repo youpgc/pure-enjoy --workflow build_apk.yml --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "")
    
    if [ -z "$run_id" ]; then
        print_error "无法获取构建运行 ID"
        return 1
    fi
    
    print_info "构建运行 ID: $run_id"
    
    # 监听构建过程
    print_info "开始监听构建进度..."
    local conclusion=$(monitor_github_actions "youpgc/pure-enjoy" "build_apk.yml" "$run_id")
    
    # 汇报结果
    if [ "$conclusion" = "success" ]; then
        # 获取版本信息
        local details=$(get_build_details "youpgc/pure-enjoy" "$run_id")
        local apk_name=$(gh run view $run_id --repo youpgc/pure-enjoy --json artifacts --jq '.artifacts[0].name' 2>/dev/null || echo "未知")
        
        print_success "✅ APK 构建成功！"
        report "🎉 App APK 构建成功！

📦 APK: $apk_name
🔗 下载: https://github.com/youpgc/pure-enjoy/actions/runs/$run_id
☁️ Supabase: https://mhdrbjpqmzswswoazwjg.supabase.co/storage/v1/object/public/apk-releases/"
    else
        print_error "❌ APK 构建失败！"
        print_info "失败原因:"
        get_failure_reason "youpgc/pure-enjoy" "$run_id"
        report "❌ App APK 构建失败！

🔗 查看详情: https://github.com/youpgc/pure-enjoy/actions/runs/$run_id"
    fi
}

# ============================================================
# 完整部署
# ============================================================
full_deploy() {
    deploy_admin
    echo ""
    deploy_app_code
}

# ============================================================
# 显示帮助
# ============================================================
show_help() {
    echo "用法: $0 [admin|app|build|all]"
    echo ""
    echo "选项:"
    echo "  admin   - 仅部署管理后台（触发构建+监听+汇报结果）"
    echo "  app     - 仅同步 App 代码"
    echo "  build   - 触发 App APK 构建（监听+汇报结果）"
    echo "  all     - 完整部署"
    echo "  help    - 显示帮助"
    echo ""
    echo "构建监控流程:"
    echo "  1. 推送代码触发 GitHub Actions"
    echo "  2. 实时监听构建进度"
    echo "  3. 构建完成后汇报结果"
    echo "  4. 失败时显示错误原因"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh admin    # 部署管理后台并监听"
    echo "  ./deploy.sh build   # 构建 APK 并监听"
    echo "  ./deploy.sh all     # 完整部署"
}

# ============================================================
# 主函数
# ============================================================
main() {
    check_github_token
    
    case "${1:-help}" in
        admin)
            deploy_admin
            ;;
        app)
            deploy_app_code
            ;;
        build)
            build_app_apk
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
