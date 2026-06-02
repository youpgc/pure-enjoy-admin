# 纯享项目部署指南

> 版本: v1.0
> 日期: 2026-06-01

---

## 一、部署流程概述

每次完成任务后，执行以下步骤：

1. **提交代码** → GitHub & Gitee
2. **构建部署** → 管理后台自动部署到 GitHub Pages
3. **构建 APK** → App 端打包（可选）

---

## 二、环境配置

### GitHub Token 配置（必需）

为了使用 GitHub CLI 自动化触发构建流程，需要配置 GitHub Personal Access Token。

**1. 创建 Token**
- 访问 https://github.com/settings/tokens
- 点击 "Generate new token (classic)"
- 选择权限：`repo`, `workflow`, `read:org`
- 生成并复制 Token

**2. 配置方式（选择一种）**

**方式一：环境变量（推荐）**
```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"

# 立即生效
source ~/.bashrc
```

**方式二：GitHub CLI 登录**
```bash
gh auth login
# 或
gh auth login --with-token < <(echo "ghp_xxxxxxxxxxxxxxxxxxxx")
```

**方式三：.env 文件（项目级）**
```bash
# 在项目根目录创建 .env 文件
echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx" > /workspace/.env
```

---

## 三、快速部署命令

### 使用部署脚本（推荐）

```bash
# 进入工作目录
cd /workspace

# 完整部署（管理后台 + App代码 + 可选APK）
./deploy.sh all

# 仅部署管理后台
./deploy.sh admin

# 仅同步 App 代码
./deploy.sh app

# 仅构建 APK
./deploy.sh apk

# 触发 GitHub Actions 构建并监控
./deploy.sh build
```

### 使用 GitHub CLI 直接触发构建

```bash
# 登录 GitHub
gh auth login

# 触发 App 端构建
gh workflow run build_apk.yml --repo youpgc/pure-enjoy

# 查看构建状态
gh run list --repo youpgc/pure-enjoy --workflow build_apk.yml

# 监控构建进度
gh run watch <run-id> --repo youpgc/pure-enjoy
```

### 手动部署步骤

#### 1. 管理后台部署

```bash
cd /workspace/pure-enjoy-admin

# 提交代码
git add -A
git commit -m "feat: xxx功能"

# 同步到 GitHub（自动触发构建部署）
git push origin main

# 同步到 Gitee
git push gitee main
```

**GitHub Actions 自动构建：**
- 触发条件：`main` 分支推送
- 构建命令：`npm ci && npm run build`
- 部署目标：GitHub Pages
- 部署地址：https://youpgc.github.io/pure-enjoy-admin/

#### 2. App 代码同步

```bash
cd /workspace/pure-enjoy

# 提交代码
git add -A
git commit -m "feat: xxx功能"

# 同步到 GitHub
git push origin master

# 同步到 Gitee
git push gitee master
```

#### App 端自动构建

GitHub Actions 已配置自动构建流程：

**触发条件：**
- 推送到 `main`/`master`/`develop` 分支
- 推送标签 `v*`
- 手动触发（workflow_dispatch）

**构建流程：**
1. 检出代码
2. 设置 Java 17 环境
3. 设置 Flutter 3.24.0 环境
4. 获取依赖
5. 构建 Release APK
6. 上传到 Supabase Storage
7. 创建版本记录到数据库
8. 上传构建产物到 GitHub Artifacts
9. 创建 GitHub Release（标签触发时）

**Secrets 配置：**
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_SERVICE_ROLE_KEY`

**自动构建特点：**
- ✅ 推送代码后自动触发
- ✅ APK 自动上传到 Supabase Storage
- ✅ 版本信息自动写入数据库
- ✅ 支持强制更新/普通更新设置
- ✅ 构建产物保留 30 天

### 手动 APK 构建（备用）

如需本地构建 APK：

```bash
cd /workspace/pure-enjoy

# 获取依赖
flutter pub get

# 构建 Release APK
flutter build apk --release

# 输出路径
# build/app/outputs/flutter-apk/app-release.apk
```

**注意：** 推荐使用 GitHub Actions 自动构建，本地构建仅作为备用方案。

---

## 三、仓库地址

### 管理后台 (pure-enjoy-admin)

| 平台 | 地址 |
|------|------|
| GitHub | https://github.com/youpgc/pure-enjoy-admin |
| Gitee | https://gitee.com/YouPgC/pure-enjoy-admin |
| 部署地址 | https://youpgc.github.io/pure-enjoy-admin/ |

### App 端 (pure-enjoy)

| 平台 | 地址 |
|------|------|
| GitHub | https://github.com/youpgc/pure-enjoy |
| Gitee | https://gitee.com/YouPgC/pure-enjoy |

---

## 四、GitHub Actions 配置

### 管理后台自动部署

文件：`.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 五、版本号管理

### App 版本号规则

文件：`pubspec.yaml`

```yaml
version: 1.9.3+45
# 格式: 主版本.次版本.修订号+构建号
```

- **主版本号**：重大功能更新
- **次版本号**：新功能添加
- **修订号**：Bug 修复
- **构建号**：每次构建递增

### 更新版本号步骤

1. 修改 `pubspec.yaml` 中的版本号
2. 提交代码
3. 构建 APK
4. 上传 APK 到服务器/CDN

---

## 六、APK 发布流程

### 构建发布版本

```bash
cd /workspace/pure-enjoy

# 1. 更新版本号
vim pubspec.yaml  # 修改 version

# 2. 获取依赖
flutter pub get

# 3. 构建 APK
flutter build apk --release

# 4. 复制到发布目录
mkdir -p /workspace/releases
cp build/app/outputs/flutter-apk/app-release.apk \
   /workspace/releases/pure-enjoy-v1.9.3.apk
```

### 上传到版本管理

管理后台 → 版本管理 → 上传新版本 APK

---

## 七、常见问题

### Q1: GitHub Actions 构建失败

检查：
- `package.json` 是否存在
- `vite.config.ts` 配置是否正确
- 依赖是否完整（`npm ci` 能否成功）

### Q2: Gitee 推送失败

检查：
- Gitee 仓库是否存在
- OAuth Token 是否过期
- 网络连接是否正常

### Q3: APK 构建失败

检查：
- Flutter 环境：`flutter doctor`
- Android SDK 配置
- 依赖冲突：`flutter pub deps`

---

## 八、部署检查清单

每次部署前确认：

- [ ] 代码已提交到本地仓库
- [ ] 测试已通过
- [ ] TypeScript 编译无错误
- [ ] 版本号已更新（App 端）
- [ ] 提交信息清晰明确

部署后确认：

- [ ] GitHub Actions 构建成功
- [ ] 管理后台可正常访问
- [ ] Gitee 代码已同步
- [ ] App 功能正常（如更新了 App）

---

## 九、联系方式

如有部署问题，请联系开发团队。

---

*本文档由开发助手自动生成*
