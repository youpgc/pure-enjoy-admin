import React from 'react'
import {
  UserOutlined,
  SettingOutlined,
  BookOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import { getModuleLabel, getModuleColor } from '../../constants'

// ==================== 模块映射（合并本地图标 + 集中映射兜底） ====================
//
// 本地图标仅覆盖高频模块；未命中时 render 回退到 OP_MODULE_MAP 取 label/color（无图标）。
// 新增表名只需维护 OP_MODULE_MAP，此处无需同步。

export const MODULE_ICON_MAP: Record<string, React.ReactNode> = {
  users: <UserOutlined />,
  user: <UserOutlined />,
  system: <SettingOutlined />,
  novels: <BookOutlined />,
  novel: <BookOutlined />,
  content: <FileTextOutlined />,
  files: <FileTextOutlined />,
  roles: <SafetyCertificateOutlined />,
  sensitive_words: <WarningOutlined />,
  user_feedback: <MessageOutlined />,
}

/** 带图标的完整模块信息（本地图标 + 模块中文名/颜色兜底链，审查 P3-2） */
export function getModuleInfo(module: string): { color: string; label: string; icon: React.ReactNode } {
  return {
    color: getModuleColor(module),
    label: getModuleLabel(module),
    icon: MODULE_ICON_MAP[module] || null,
  }
}
