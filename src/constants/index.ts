/**
 * 集中常量定义 - 全项目唯一的枚举/字典/映射源
 *
 * 规则：
 * 1. 所有状态值、类型值、角色值等统一在此定义（按域拆分到子模块，本文件统一 re-export）
 * 2. 页面组件和工具函数从对应子模块或本文件导入，禁止自行硬编码
 * 3. dictService.ts 的 fallback 值也必须与此保持一致
 *
 * 注意：本文件仅做 barrel 重导出，新增枚举请放到对应域子模块（roles/permissions/novel/...），
 * 既有 `import { X } from '../constants'` 无需改动。
 */

export * from './roles'
export * from './errors'
export * from './permissions'
export * from './operationLog'
export * from './novel'
export * from './feedback'
export * from './announcement'
export * from './annotations'
export * from './notification'
export * from './sensitive'
export * from './version'
export * from './life'
export * from './points'
export * from './errorLog'
export * from './game'
