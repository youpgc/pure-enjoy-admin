import React, { useMemo } from 'react'
import { Tag, Button, Space, Popconfirm, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PushpinOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

// ==================== 常量定义 ====================

// ==================== 详情列表列配置 ====================

const getDetailColumns = (
  canDelete: boolean,
  onDelete: (id: string) => void,
  onEdit: (record: RecordItem) => void
): ColumnsType<RecordItem> => [
  {
    title: '置顶',
    dataIndex: 'is_pinned',
    key: 'is_pinned',
    width: 80,
    render: (isPinned: boolean) => (
      isPinned ? <PushpinOutlined style={{ color: '#faad14' }} /> : null
    ),
  },
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
    width: 200,
    render: (title: string) => title || '-',
  },
  {
    title: '内容预览',
    dataIndex: 'content',
    key: 'content',
    ellipsis: true,
    width: 300,
    render: (text: string) => text ? text.substring(0, 100) + (text.length > 100 ? '...' : '') : '-',
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
    sorter: (a, b) => {
      const dateA = (a.created_at as string) || ''
      const dateB = (b.created_at as string) || ''
      return dateB.localeCompare(dateA)
    },
    defaultSortOrder: 'descend',
    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
  },
  {
    title: '操作',
    key: 'action',
    fixed: 'right',
    width: 120,
    render: (_, record) => (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => onEdit(record)}
        >
          编辑
        </Button>
        {canDelete && (
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否继续？"
            onConfirm={() => onDelete(record.id as string)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        )}
      </Space>
    ),
  },
]

// ==================== 主组件 ====================

const Notes: React.FC = () => {
  const { canReadNotes, canWriteNotes, canDeleteNotes } = usePermission()

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!canDeleteNotes) {
      message.warning('您没有删除笔记的权限')
      return
    }
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw error
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 编辑记录
  const handleEdit = (_record: RecordItem) => {
    if (!canWriteNotes) {
      message.warning('您没有编辑笔记的权限')
      return
    }
    message.info('编辑功能开发中')
  }

  // 模块配置
  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'notes',
    title: '笔记管理',
    tableName: 'notes',
    detailTitle: '笔记详情',
    detailColumns: getDetailColumns(canDeleteNotes || false, handleDelete, handleEdit),
  }), [canDeleteNotes, canWriteNotes])

  // 权限检查
  if (!canReadNotes) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Tag color="warning">您没有查看笔记的权限</Tag>
      </div>
    )
  }

  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Notes
