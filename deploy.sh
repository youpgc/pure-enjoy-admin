#!/bin/bash

# ============================================================
# 纯享项目部署脚本 - 智能构建监控版
# 功能：
#   1. 同步代码到 GitHub 和 Gitee
#   2. 触发 GitHub Actions 构建并实时监控
#   3. 构建失败自动排查原因并尝试修复
#   4. 修复后自动重试构建
#   5. 构建成功/失败汇报结果
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
        if [ -f "/workspace/.env" ]; then
            export $(grep -v '^#' /workspace/.env | xargs) 2>/dev/null || true
        fi
    fi
    
    if [ -z "$GITHUB_TOKEN" ]; then
        print_error "未设置 GITHUB_TOKEN 环境变量"
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

# 获取构建失败原因
get_failure_reason() {
    local repo=$1
    local run_id=$2
    
    print_info "获取构建日志..."
    gh run view $run_id --repo "$repo" --log-failed 2>/dev/null | head -80
}

# 分析失败原因并自动修复
analyze_and_fix() {
    local repo=$1
    local run_id=$2
    local project_dir=$3
    
    print_info "========== 开始排查构建失败原因 =========="
    
    # 获取构建日志
    local logs=$(gh run view $run_id --repo "$repo" --log-failed 2>/dev/null || echo "")
    
    # 分类失败原因
    local error_type="unknown"
    local can_fix=false
    
    # 1. npm 依赖问题
    if echo "$logs" | grep -qi "npm ERR\|npm error\|cannot find module\|MODULE_NOT_FOUND"; then
        error_type="npm_deps"
        can_fix=true
        print_warning "检测到 npm 依赖问题，尝试修复..."
        cd "$project_dir"
        rm -rf node_modules package-lock.json
        npm cache clean --force 2>/dev/null || true
        print_success "已清理依赖缓存"
    fi
    
    # 2. TypeScript 类型错误
    if echo "$logs" | grep -qi "TS\d\d\d\d\|Type error\|type .* does not exist\|Property .* does not exist"; then
        error_type="typescript"
        can_fix=true
        print_warning "检测到 TypeScript 类型错误..."
        # 尝试安装缺失的类型定义
        cd "$project_dir"
        # 提取缺失的类型包名
        local missing_types=$(echo "$logs" | grep -oP "@types/[^'\" ]+" | sort -u)
        if [ -n "$missing_types" ]; then
            print_info "安装缺失的类型定义: $missing_types"
            npm install $missing_types --save-dev 2>/dev/null || true
        fi
    fi
    
    # 3. ESLint 错误
    if echo "$logs" | grep -qi "ESLint\|eslint"; then
        error_type="eslint"
        print_warning "检测到 ESLint 错误..."
        # 尝试自动修复
        cd "$project_dir"
        npm run lint -- --fix 2>/dev/null || true
        git add -A
        git commit -m "fix: 自动修复 ESLint 错误 [skip ci]" 2>/dev/null || true
        git push origin main 2>/dev/null || true
    fi
    
    # 4. 构建命令不存在
    if echo "$logs" | grep -qi "missing script\|npm run.*not found"; then
        error_type="missing_script"
        can_fix=false
        print_error "package.json 中缺少构建脚本"
    fi
    
    # 5. 权限问题
    if echo "$logs" | grep -qi "EACCES\|permission denied"; then
        error_type="permission"
        print_warning "检测到权限问题"
    fi
    
    # 6. 网络问题
    if echo "$logs" | grep -qi "ETIMEDOUT\|ECONNREFUSED\|network\|npm fetch"; then
        error_type="network"
        print_warning "检测到网络问题"
    fi
    
    # 7. 内存不足
    if echo "$logs" | grep -qi "FATAL ERROR\|out of memory\|JavaScript heap"; then
        error_type="memory"
        can_fix=false
        print_error "内存不足，需要优化构建配置"
    fi
    
    echo ""
    print_info "失败类型: $error_type"
    
    if [ "$can_fix" = true ]; then
        print_success "问题已尝试自动修复"
        return 0  # 可以修复
    else
        print_error "需要手动处理此问题"
        return 1  # 需要手动处理
    fi
}

# 监控 GitHub Actions 构建过程
monitor_github_actions() {
    local repo=$1
    local workflow=$2
    local run_id=$3
    local max_attempts=180
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
        
        if [ "$status" = "completed" ]; then
            echo ""
            echo "$conclusion"
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
    echo "$run_info"
}

# ============================================================
# 管理后台部署（带自动修复和重试）
# ============================================================
deploy_admin() {
    local max_retries=3
    local retry_count=0
    local last_run_id=""
    
    while [ $retry_count -lt $max_retries ]; do
        print_info "========== 开始部署管理后台 (尝试 $((retry_count + 1))/$max_retries) =========="
        
        cd /workspace/pure-enjoy-admin
        
        local commit_msg=$(git log -1 --pretty=%B | head -1)
        local commit_short=$(git log -1 --pretty=%h)
        print_info "当前提交: $commit_short - $commit_msg"
        
        # 同步到 GitHub（自动触发构建）
        print_info "同步到 GitHub 并触发构建..."
        git push origin main 2>&1
        
        # 获取运行 ID
        sleep 3
        local run_id=$(gh run list --repo youpgc/pure-enjoy-admin --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "")
        
        if [ -z "$run_id" ]; then
            print_warning "无法获取构建运行 ID"
            break
        fi
        
        print_info "构建运行 ID: $run_id"
        last_run_id=$run_id
        
        # 监听构建过程
        print_info "开始监听构建进度..."
        local conclusion=$(monitor_github_actions "youpgc/pure-enjoy-admin" "deploy.yml" "$run_id")
        
        if [ "$conclusion" = "success" ]; then
            print_success "✅ 管理后台构建成功！"
            report "🎉 管理后台部署完成！

📦 版本: $commit_short
📝 提交: $commit_msg
🔗 地址: https://youpgc.github.io/pure-enjoy-admin/"
            break  # 成功，退出循环
        else
            print_error "❌ 构建失败，尝试分析原因..."
            echo ""
            get_failure_reason "youpgc/pure-enjoy-admin" "$run_id"
            echo ""
            
            # 尝试自动修复
            if analyze_and_fix "youpgc/pure-enjoy-admin" "$run_id" "/workspace/pure-enjoy-admin"; then
                print_info "等待修复生效后重新构建..."
                sleep 5
                retry_count=$((retry_count + 1))
                continue  # 重试
            else
                # 无法自动修复，汇报失败
                report "❌ 管理后台构建失败（无法自动修复）

📦 版本: $commit_short
📝 提交: $commit_msg
🔗 查看详情: https://github.com/youpgc/pure-enjoy-admin/actions/runs/$run_id

💡 请手动检查并修复问题后重新运行部署脚本"
                break
            fi
        fi
    done
    
    if [ $retry_count -eq $max_retries ]; then
        print_error "已达到最大重试次数，构建仍然失败"
        report "❌ 管理后台构建失败（已重试 $max_retries 次）

🔗 查看详情: https://github.com/youpgc/pure-enjoy-admin/actions/runs/$last_run_id"
    fi
    
    # 同步到 Gitee
    print_info "同步到 Gitee..."
    cd /workspace/pure-enjoy-admin
    git push gitee main 2>&1 || print_warning "Gitee 同步失败"
    
    print_success "========== 管理后台部署流程结束 =========="
}

# ============================================================
# App 端部署
# ============================================================
deploy_app_code() {
    print_info "========== 开始同步 App 代码 =========="
    
    cd /workspace/pure-enjoy
    
    local commit_msg=$(git log -1 --pretty=%B | head -1)
    local commit_short=$(git log -1 --pretty=%h)
    print_info "当前提交: $commit_short - $commit_msg"
    
    print_info "同步到 GitHub..."
    git push origin master 2>&1
    
    print_info "同步到 Gitee..."
    git push gitee master 2>&1 || print_warning "Gitee 同步失败"
    
    print_success "✅ App 代码同步完成！"
    print_info "GitHub Actions 将自动构建 APK"
}

# ============================================================
# App 端 APK 构建（带监控和重试）
# ============================================================
build_app_apk() {
    local max_retries=3
    local retry_count=0
    local last_run_id=""
    
    check_github_token || return 1
    install_gh_cli
    
    while [ $retry_count -lt $max_retries ]; do
        print_info "========== 开始构建 App APK (尝试 $((retry_count + 1))/$max_retries) =========="
        
        print_info "触发 GitHub Actions 构建..."
        gh workflow run build_apk.yml --repo youpgc/pure-enjoy 2>&1
        
        sleep 5
        
        local run_id=$(gh run list --repo youpgc/pure-enjoy --workflow build_apk.yml --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "")
        
        if [ -z "$run_id" ]; then
            print_error "无法获取构建运行 ID"
            break
        fi
        
        print_info "构建运行 ID: $run_id"
        last_run_id=$run_id
        
        print_info "开始监听构建进度..."
        local conclusion=$(monitor_github_actions "youpgc/pure-enjoy" "build_apk.yml" "$run_id")
        
        if [ "$conclusion" = "success" ]; then
            local apk_name=$(gh run view $run_id --repo youpgc/pure-enjoy --json artifacts --jq '.artifacts[0].name' 2>/dev/null || echo "未知")
            
            print_success "✅ APK 构建成功！"
            report "🎉 App APK 构建成功！

📦 APK: $apk_name
🔗 下载: https://github.com/youpgc/pure-enjoy/actions/runs/$run_id
☁️ Supabase: https://mhdrbjpqmzswswoazwjg.supabase.co/storage/v1/object/public/apk-releases/"
            break
        else
            print_error "❌ 构建失败，尝试分析原因..."
            echo ""
            get_failure_reason "youpgc/pure-enjoy" "$run_id"
            echo ""
            
            if analyze_and_fix "youpgc/pure-enjoy" "$run_id" "/workspace/pure-enjoy"; then
                print_info "等待修复生效后重新构建..."
                sleep 5
                retry_count=$((retry_count + 1))
                continue
            else
                report "❌ App APK 构建失败（无法自动修复）

🔗 查看详情: https://github.com/youpgc/pure-enjoy/actions/runs/$run_id

💡 请手动检查并修复问题后重新运行部署脚本"
                break
            fi
        fi
    done
    
    if [ $retry_count -eq $max_retries ]; then
        print_error "已达到最大重试次数，构建仍然失败"
        report "❌ App APK 构建失败（已重试 $max_retries 次）

🔗 查看详情: https://github.com/youpgc/pure-enjoy/actions/runs/$last_run_id"
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
    echo "  admin   - 部署管理后台（自动修复+重试）"
    echo "  app     - 同步 App 代码"
    echo "  build   - 构建 APK（自动修复+重试）"
    echo "  all     - 完整部署"
    echo "  help    - 显示帮助"
    echo ""
    echo "构建失败处理流程:"
    echo "  1. 监听构建进度"
    echo "  2. 构建失败 → 分析失败原因"
    echo "  3. 尝试自动修复（npm依赖/TS类型/ESLint等）"
    echo "  4. 修复后自动重试（最多3次）"
    echo "  5. 无法修复 → 汇报失败原因"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh admin    # 部署管理后台"
    echo "  ./deploy.sh build   # 构建 APK"
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
