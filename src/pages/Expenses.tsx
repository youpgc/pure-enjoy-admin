import React, { useMemo } from 'react'
import { Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { getActionColumn } from '../components/ActionColumn'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

// ==================== 常量定义 ====================

const CATEGORY_COLORS: Record<string, string> = {
  '餐饮': 'red',
  '交通': 'blue',
  '购物': 'green',
  '娱乐': 'purple',
  '其他': 'orange',
}

// ==================== 详情列表列配置 ====================

const getDetailColumns = (
  canDelete: boolean,
  onDelete: (id: string) => void,
  onEdit: (record: RecordItem) => void
): ColumnsType<RecordItem> => [
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    render: (amount: number) => (
      <Tag color="red">¥{typeof amount === 'number' ? amount.toFixed(2) : amount}</Tag>
    ),
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 100,
    render: (category: string) => (
      <Tag color={CATEGORY_COLORS[category || ''] || 'default'}>{category || '-'}</Tag>
    ),
  },
  {
    title: '备注',
    dataIndex: 'note',
    key: 'note',
    ellipsis: true,
    width: 200,
    render: (note: string) => note || '-',
  },
  {
    title: '日期',
    dataIndex: 'date',
    key: 'date',
    width: 120,
    sorter: (a, b) => {
      const dateA = (a.date as string) || ''
      const dateB = (b.date as string) || ''
      return dateA.localeCompare(dateB)
    },
    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
  },
    getActionColumn<any>(
      (record) => {
        const actions: import('../components/ActionColumn').ActionButton[] = [
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => onEdit(record),
          },
        ]
        if (canDelete) {
          actions.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => onDelete(record.id as string),
          })
        }
        return actions
      },
      { width: 240, maxVisible: 2 }
    ),
]

// ==================== 主组件 ====================

const Expenses: React.FC = () => {
  const { canReadExpenses, canWriteExpenses, canDeleteExpenses } = usePermission()

  // ==================== 操作处理 ====================

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!canDeleteExpenses) {
      message.warning('您没有删除消费记录的权限')
      return
    }
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 编辑记录
  const handleEdit = (_record: RecordItem) => {
    if (!canWriteExpenses) {
      message.warning('您没有编辑消费记录的权限')
      return
    }
    // TODO: 打开编辑弹窗
    message.info('编辑功能开发中')
  }

  // 模块配置
  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'expenses',
    title: '消费记录管理',
    tableName: 'expenses',
    detailTitle: '消费记录详情',
    detailColumns: getDetailColumns(canDeleteExpenses || false, handleDelete, handleEdit),
  }), [canDeleteExpenses, canWriteExpenses])

  // 权限检查
  if (!canReadExpenses) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Tag color="warning">您没有查看消费记录的权限</Tag>
      </div>
    )
  }

  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Expenses
