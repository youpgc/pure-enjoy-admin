import React, { useMemo } from 'react'
import { Tag, Button, Space, Popconfirm, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, FireOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

// ==================== 常量定义 ====================

const getFrequencyLabel = (freq: string): string => {
  const labels: Record<string, string> = {
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
    custom: '自定义',
  }
  return labels[freq] || freq || '-'
}

// ==================== 详情列表列配置 ====================

const getDetailColumns = (
  canDelete: boolean,
  onDelete: (id: string) => void,
  onEdit: (record: RecordItem) => void
): ColumnsType<RecordItem> => [
  {
    title: '状态',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 80,
    render: (isActive: boolean) => (
      isActive ? (
        <Tag color="success">进行中</Tag>
      ) : (
        <Tag color="default">已暂停</Tag>
      )
    ),
  },
  {
    title: '习惯名称',
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
    width: 200,
    render: (Name: string) => Name || '-',
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
    width: 200,
    render: (desc: string) => desc || '-',
  },
  {
    title: '频率',
    dataIndex: 'frequency',
    key: 'frequency',
    width: 100,
    render: (freq: string) => (
      <Tag color="blue">{getFrequencyLabel(freq)}</Tag>
    ),
  },
  {
    title: '当前连续',
    dataIndex: 'current_streak',
    key: 'current_streak',
    width: 120,
    sorter: (a, b) => {
      const sA = (a.current_streak as number) || 0
      const sB = (b.current_streak as number) || 0
      return sB - sA
    },
    render: (streak: number) => (
      <Space>
        <FireOutlined style={{ color: streak && streak > 0 ? '#ff4d4f' : '#999' }} />
        <span style={{ color: streak && streak > 0 ? '#ff4d4f' : '#999' }}>
          {typeof streak === 'number' ? streak : 0} 天
        </span>
      </Space>
    ),
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
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

const Habits: React.FC = () => {
  const { canReadHabits, canWriteHabits, canDeleteHabits } = usePermission()

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!canDeleteHabits) {
      message.warning('您没有删除习惯的权限')
      return
    }
    try {
      const { error } = await supabase.from('user_habits').delete().eq('id', id)
      if (error) throw error
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 编辑记录
  const handleEdit = (_record: RecordItem) => {
    if (!canWriteHabits) {
      message.warning('您没有编辑习惯的权限')
      return
    }
    message.info('编辑功能开发中')
  }

  // 模块配置
  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'habits',
    title: '习惯管理',
    tableName: 'user_habits',
    detailTitle: '习惯详情',
    detailColumns: getDetailColumns(canDeleteHabits || false, handleDelete, handleEdit),
  }), [canDeleteHabits, canWriteHabits])

  // 权限检查
  if (!canReadHabits) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Tag color="warning">您没有查看习惯的权限</Tag>
      </div>
    )
  }

  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Habits
