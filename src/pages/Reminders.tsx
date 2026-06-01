import React, { useMemo, useState } from 'react'
import { Tag, Space, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, BellOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { getActionColumn } from '../components/ActionColumn'
import EditRecordModal, { EditFieldConfig } from '../components/EditRecordModal'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

// ==================== 常量定义 ====================

const PRIORITY_OPTIONS = [
  { value: '高', label: '高' },
  { value: '中', label: '中' },
  { value: '低', label: '低' },
]

// ==================== 编辑字段配置 ====================

const EDIT_FIELDS: EditFieldConfig[] = [
  {
    name: 'title',
    label: '标题',
    type: 'text',
    required: true,
    placeholder: '请输入提醒标题',
  },
  {
    name: 'description',
    label: '描述',
    type: 'textarea',
    placeholder: '请输入描述信息',
  },
  {
    name: 'remind_at',
    label: '提醒时间',
    type: 'datetime',
    required: true,
    showTime: true,
  },
  {
    name: 'is_completed',
    label: '已完成',
    type: 'switch',
  },
  {
    name: 'priority',
    label: '优先级',
    type: 'select',
    options: PRIORITY_OPTIONS,
  },
]

// ==================== 详情列表列配置 ====================

const getDetailColumns = (
  canDelete: boolean,
  onDelete: (id: string) => void,
  onEdit: (record: RecordItem) => void
): ColumnsType<RecordItem> => [
  {
    title: '状态',
    dataIndex: 'is_completed',
    key: 'is_completed',
    width: 80,
    render: (isCompleted: boolean) => (
      isCompleted ? (
        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
      ) : (
        <BellOutlined style={{ color: '#faad14', fontSize: 18 }} />
      )
    ),
  },
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
    width: 200,
    render: (title: string, record: RecordItem) => (
      <Space>
        {record.is_completed ? (
          <span style={{ textDecoration: 'line-through', color: '#999' }}>{title}</span>
        ) : (
          title || '-'
        )}
      </Space>
    ),
  },
  {
    title: '提醒时间',
    dataIndex: 'remind_at',
    key: 'remind_at',
    width: 160,
    sorter: (a, b) => {
      const dateA = (a.remind_at as string) || ''
      const dateB = (b.remind_at as string) || ''
      return dateA.localeCompare(dateB)
    },
    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
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

const Reminders: React.FC = () => {
  const { canReadReminders, canWriteReminders, canDeleteReminders } = usePermission()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null)

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!canDeleteReminders) {
      message.warning('您没有删除提醒的权限')
      return
    }
    try {
      const { error } = await supabase.from('user_reminders').delete().eq('id', id)
      if (error) throw error
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 编辑记录
  const handleEdit = (record: RecordItem) => {
    if (!canWriteReminders) {
      message.warning('您没有编辑提醒的权限')
      return
    }
    setEditingRecord(record)
    setEditModalOpen(true)
  }

  // 模块配置
  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'reminders',
    title: '提醒管理',
    tableName: 'user_reminders',
    detailTitle: '提醒详情',
    detailColumns: getDetailColumns(canDeleteReminders || false, handleDelete, handleEdit),
  }), [canDeleteReminders, canWriteReminders])

  // 权限检查
  if (!canReadReminders) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Tag color="warning">您没有查看提醒的权限</Tag>
      </div>
    )
  }

  return (
    <>
      <UserDimensionList moduleConfig={moduleConfig} />
      <EditRecordModal
        open={editModalOpen}
        record={editingRecord}
        tableName="user_reminders"
        fields={EDIT_FIELDS}
        onClose={() => {
          setEditModalOpen(false)
          setEditingRecord(null)
        }}
        onSuccess={() => {
          window.location.reload()
        }}
      />
    </>
  )
}

export default Reminders