import React, { useMemo } from 'react'
import { Tag, Space, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, StarOutlined, LinkOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { getActionColumn } from '../components/ActionColumn'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

// ==================== 常量定义 ====================

const CATEGORY_COLORS: Record<string, string> = {
  '小说': 'purple',
  '文章': 'blue',
  '视频': 'red',
  '音频': 'cyan',
  '图片': 'green',
  '链接': 'orange',
  '其他': 'default',
}

// ==================== 详情列表列配置 ====================

const getDetailColumns = (
  canDelete: boolean,
  onDelete: (id: string) => void,
  onEdit: (record: RecordItem) => void
): ColumnsType<RecordItem> => [
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
    width: 200,
    render: (title: string) => (
      <Space>
        <StarOutlined style={{ color: '#faad14' }} />
        {title || '-'}
      </Space>
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
    title: '链接',
    dataIndex: 'url',
    key: 'url',
    ellipsis: true,
    width: 200,
    render: (url: string) => url ? (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <LinkOutlined /> 访问链接
      </a>
    ) : '-',
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
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
    sorter: (a, b) => {
      const dateA = (a.created_at as string) || ''
      const dateB = (b.created_at as string) || ''
      return dateA.localeCompare(dateB)
    },
    defaultSortOrder: 'descend',
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

const Favorites: React.FC = () => {
  const { canReadFavorites, canWriteFavorites, canDeleteFavorites } = usePermission()

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!canDeleteFavorites) {
      message.warning('您没有删除收藏的权限')
      return
    }
    try {
      const { error } = await supabase.from('user_favorites').delete().eq('id', id)
      if (error) throw error
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 编辑记录
  const handleEdit = (_record: RecordItem) => {
    if (!canWriteFavorites) {
      message.warning('您没有编辑收藏的权限')
      return
    }
    message.info('编辑功能开发中')
  }

  // 模块配置
  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'favorites',
    title: '收藏管理',
    tableName: 'user_favorites',
    detailTitle: '收藏详情',
    detailColumns: getDetailColumns(canDeleteFavorites || false, handleDelete, handleEdit),
  }), [canDeleteFavorites, canWriteFavorites])

  // 权限检查
  if (!canReadFavorites) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Tag color="warning">您没有查看收藏的权限</Tag>
      </div>
    )
  }

  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Favorites
