import React, { useMemo } from 'react'
import { Tag, Button, Space, Popconfirm, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, HeartFilled } from '@ant-design/icons'
import dayjs from 'dayjs'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

// ==================== 常量定义 ====================

const MOOD_COLORS: Record<string, string> = {
  '开心': 'gold',
  '愉快': 'lime',
  '平静': 'cyan',
  '一般': 'default',
  '低落': 'orange',
  '难过': 'red',
  '焦虑': 'purple',
  '愤怒': 'red',
}

// ==================== 详情列表列配置 ====================

const getDetailColumns = (
  canDelete: boolean,
  onDelete: (id: string) => void,
  onEdit: (record: RecordItem) => void
): ColumnsType<RecordItem> => [
  {
    title: '心情',
    dataIndex: 'mood',
    key: 'mood',
    width: 100,
    render: (mood: string) => (
      <Tag color={MOOD_COLORS[mood || ''] || 'default'} icon={<HeartFilled />}>
        {mood || '-'}
      </Tag>
    ),
  },
  {
    title: '内容',
    dataIndex: 'content',
    key: 'content',
    ellipsis: true,
    width: 250,
    render: (text: string) => text || '-',
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

const MoodDiaries: React.FC = () => {
  const { canReadMoods, canWriteMoods, canDeleteMoods } = usePermission()

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!canDeleteMoods) {
      message.warning('您没有删除心情日记的权限')
      return
    }
    try {
      const { error } = await supabase.from('mood_diaries').delete().eq('id', id)
      if (error) throw error
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 编辑记录
  const handleEdit = (_record: RecordItem) => {
    if (!canWriteMoods) {
      message.warning('您没有编辑心情日记的权限')
      return
    }
    message.info('编辑功能开发中')
  }

  // 模块配置
  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'mood_diaries',
    title: '心情日记管理',
    tableName: 'mood_diaries',
    detailTitle: '心情日记详情',
    detailColumns: getDetailColumns(canDeleteMoods || false, handleDelete, handleEdit),
  }), [canDeleteMoods, canWriteMoods])

  // 权限检查
  if (!canReadMoods) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Tag color="warning">您没有查看心情日记的权限</Tag>
      </div>
    )
  }

  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default MoodDiaries
