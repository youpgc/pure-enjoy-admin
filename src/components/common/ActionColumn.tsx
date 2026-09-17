import React from 'react'
import { Button, Space, Dropdown, Popconfirm, Modal } from 'antd'
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
  /** 二次确认文案（如删除）：可见按钮包 Popconfirm，「更多」下拉走 Modal.confirm */
  confirm?: string
}

export interface ActionColumnProps {
  actions: ActionButton[]
  maxVisible?: number // 最多显示几个按钮，默认2个
}

/**
 * 通用表格操作列组件
 * - 固定宽度 240px，固定在右侧
 * - 最多显示2个按钮，多余的放入"更多"下拉
 * - 支持 primary/link/danger 等样式；带 confirm 的动作需二次确认
 */
export const ActionColumn: React.FC<ActionColumnProps> = ({
  actions,
  maxVisible = 2,
}) => {
  const visibleActions = actions.slice(0, maxVisible)
  const moreActions = actions.slice(maxVisible)

  const moreItems: MenuProps['items'] = moreActions.map((action) => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    danger: action.danger,
    disabled: action.disabled,
    onClick: () => {
      if (action.confirm) {
        Modal.confirm({
          title: action.confirm,
          okText: '确认',
          cancelText: '取消',
          onOk: action.onClick,
        })
      } else {
        action.onClick()
      }
    },
  }))

  return (
    <Space size="small">
      {visibleActions.map((action) => {
        // 带 confirm 时按钮不挂 onClick（否则点击即执行、绕过二次确认），
        // 实际执行由 Popconfirm 的 onConfirm 触发
        const btn = (
          <Button
            key={action.key}
            type={action.type || 'link'}
            size="small"
            icon={action.icon}
            danger={action.danger}
            disabled={action.disabled}
            onClick={action.confirm ? undefined : action.onClick}
          >
            {action.label}
          </Button>
        )
        return action.confirm ? (
          <Popconfirm
            key={action.key}
            title={action.confirm}
            okText="确认"
            cancelText="取消"
            disabled={action.disabled}
            onConfirm={action.onClick}
          >
            {btn}
          </Popconfirm>
        ) : (
          btn
        )
      })}
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
 * - 固定宽度 240px，固定在右侧
 * - 最多显示2个按钮，多余的放入"更多"下拉
 * 返回单个列定义（作为 columns 数组的一个元素使用，不加 ...）
 */
export const getActionColumn = <T extends object>(
  renderActions: (record: T) => ActionButton[],
  options?: { width?: number; maxVisible?: number }
): { title: string; key: string; fixed: 'right'; width: number; render: (_: unknown, record: T) => React.ReactNode } => ({
  title: '操作',
  key: 'action',
  fixed: 'right',
  width: options?.width || 240,
  render: (_, record) => (
    <ActionColumn
      actions={renderActions(record)}
      maxVisible={options?.maxVisible || 2}
    />
  ),
})

export default ActionColumn
