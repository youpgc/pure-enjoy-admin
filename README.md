# Pure Enjoy Admin

纯享管理后台 — 基于 React 18 + TypeScript + Vite + Ant Design 的管理后台系统，部署于 GitHub Pages。

## 技术栈

- React 18.3 + TypeScript 5.6
- Vite 6.0（构建工具）
- Ant Design 5.24（UI 组件库）
- React Router 6（路由）
- Recharts（数据可视化）
- Supabase JS Client（后端服务：认证 + 数据库 + 存储）
- dayjs（日期处理）
- lunar-ts（农历支持）

## 功能模块

| 模块 | 页面 |
|------|------|
| 数据概览 | Dashboard、数据分析、系统监控 |
| 用户运营 | 用户管理、用户反馈、积分管理、消息推送、活动管理 |
| 生活记录 | 消费记录、心情日记、体重记录、笔记本、收藏夹、习惯打卡、提醒事项、纪念日 |
| 小说管理 | 小说管理、书架管理、章节编辑、评论管理、定价管理 |
| 系统配置 | 字典管理、敏感词管理、API 管理、App 配置、版本管理、公告管理 |
| 权限安全 | 角色权限、操作日志、错误日志 |
| 文件管理 | 文件管理、数据同步 |

> 共 **30+** 管理页面，支持权限控制（超级管理员 / 管理员）。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npx tsc -b --noEmit && npm run build
```

## 许可证

MIT License
