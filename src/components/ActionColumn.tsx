import React from 'react'
import { Button, Space, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { MoreOutlined } from '@ant-design/icons'

export interface ActionButton {
  key: string
  label: string
  icon?: React.ReactNode
  type?: 'primary' | 'default' | 'link' | 'text'
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}

export interface ActionColumnProps {
  actions: ActionButton[]
  maxVisible?: number // 最多显示几个按钮，默认3个
  width?: number // 列宽度，默认180
}

/**
 * 通用表格操作列组件
 * - 固定宽度，固定在右侧
 * - 最多显示3个按钮，多余的放入"更多"下拉
 * - 支持 primary/link/danger 等样式
 */
export const ActionColumn: React.FC<ActionColumnProps> = ({
  actions,
  maxVisible = 3,
}) => {
  const visibleActions = actions.slice(0, maxVisible)
  const moreActions = actions.slice(maxVisible)

  const moreItems: MenuProps['items'] = moreActions.map((action) => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    danger: action.danger,
    disabled: action.disabled,
    onClick: action.onClick,
  }))

  return (
    <Space size="small">
      {visibleActions.map((action) => (
        <Button
          key={action.key}
          type={action.type || 'link'}
          size="small"
          icon={action.icon}
          danger={action.danger}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ))}
      {moreActions.length > 0 && (
        <Dropdown menu={{ items: moreItems }} placement="bottomRight">
          <Button type="link" size="small" icon={<MoreOutlined />}>
            更多
          </Button>
        </Dropdown>
      )}
    </Space>
  )
}

/**
 * 获取表格操作列配置
 * 用于 Ant Design Table 的 columns 配置
 */
export const getActionColumn = <T extends object>(
  renderActions: (record: T) => ActionButton[],
  options?: { width?: number; maxVisible?: number }
): { title: string; key: string; fixed: 'right'; width: number; render: (_: unknown, record: T) => React.ReactNode } => ({
  title: '操作',
  key: 'action',
  fixed: 'right',
  width: options?.width || 180,
  render: (_, record) => (
    <ActionColumn
      actions={renderActions(record)}
      maxVisible={options?.maxVisible || 3}
    />
  ),
})

export default ActionColumn
