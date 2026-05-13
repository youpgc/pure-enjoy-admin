# 纯享管理后台 (Pure Enjoy Admin)

纯享App的管理后台系统，基于 React + TypeScript + Ant Design + Vite 构建。

## 功能特性

- **用户认证**：支持多角色登录（超级管理员、管理员、查看者）
- **权限管理**：基于角色的权限控制，不同角色拥有不同的操作权限
- **数据概览**：可视化展示用户、消费、心情、体重、笔记、小说等数据统计
- **用户管理**：查看和管理注册用户
- **消费记录**：管理用户的消费数据
- **心情日记**：查看用户的心情记录
- **体重记录**：管理用户的体重数据
- **笔记本**：查看用户的笔记内容
- **小说书架**：管理用户的小说阅读记录
- **版本管理**：App版本发布、撤回、回滚，支持二维码下载

## 技术栈

- **前端框架**：React 18
- **开发语言**：TypeScript
- **UI组件库**：Ant Design 5
- **图表库**：Recharts
- **构建工具**：Vite 5
- **路由**：React Router 6
- **后端服务**：Supabase

## 项目结构

```
pure-enjoy-admin/
├── src/
│   ├── components/          # 通用组件
│   │   ├── DataTable.tsx    # 数据表格组件
│   │   └── AuthGuard.tsx    # 路由守卫组件
│   ├── pages/               # 页面组件
│   │   ├── Login.tsx        # 登录页面
│   │   ├── Dashboard.tsx    # 数据概览
│   │   ├── Users.tsx        # 用户管理
│   │   ├── Expenses.tsx     # 消费记录
│   │   ├── MoodDiaries.tsx  # 心情日记
│   │   ├── WeightRecords.tsx# 体重记录
│   │   ├── Notes.tsx        # 笔记本
│   │   ├── Novels.tsx       # 小说书架
│   │   └── VersionManagement.tsx # 版本管理
│   ├── hooks/               # 自定义Hooks
│   │   └── usePermission.ts # 权限检查Hook
│   ├── utils/               # 工具函数
│   │   └── supabase.ts      # Supabase客户端
│   ├── types/               # 类型定义
│   │   └── auth.ts          # 认证相关类型
│   ├── context/             # React Context
│   │   └── auth.tsx         # 认证状态管理
│   ├── App.tsx              # 主应用组件
│   ├── main.tsx             # 应用入口
│   └── index.css            # 全局样式
├── index.html               # HTML模板
├── package.json             # 依赖配置
├── tsconfig.json            # TypeScript配置
├── vite.config.ts           # Vite配置
└── README.md                # 项目说明
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 登录账号

系统预设了三个测试账号，对应不同的角色权限：

| 角色 | 邮箱 | 密码 | 权限说明 |
|------|------|------|----------|
| 超级管理员 | admin@pureenjoy.com | admin123 | 所有权限，包括用户管理 |
| 管理员 | manager@pureenjoy.com | manager123 | 除用户管理外的所有权限 |
| 查看者 | viewer@pureenjoy.com | viewer123 | 仅查看权限，无删除/管理权限 |

## 权限说明

### 超级管理员 (super_admin)
- 查看所有数据
- 删除数据
- 版本管理（发布、撤回、回滚）
- 用户管理
- 系统设置

### 管理员 (admin)
- 查看所有数据
- 删除数据
- 版本管理（发布、撤回、回滚）
- 不可管理用户

### 查看者 (viewer)
- 仅查看所有数据
- 不可删除数据
- 不可管理版本
- 不可管理用户

## 部署

### Gitee Pages 部署

1. 构建项目：
```bash
npm run build
```

2. 将 `dist` 目录内容部署到 Gitee Pages

### 环境变量

如需配置 Supabase 连接信息，可创建 `.env` 文件：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 开发说明

### 添加新页面

1. 在 `src/pages/` 目录下创建页面组件
2. 在 `src/App.tsx` 中添加菜单项和路由
3. 在 `src/types/auth.ts` 中添加对应的权限配置

### 权限控制

在组件中使用 `usePermission` Hook 进行权限检查：

```tsx
import { usePermission } from '../hooks/usePermission'

const MyComponent = () => {
  const { canDelete, canManageVersions } = usePermission()
  
  return (
    <div>
      {canDelete && <Button>删除</Button>}
      {canManageVersions && <Button>发布版本</Button>}
    </div>
  )
}
```

## 许可证

MIT License
