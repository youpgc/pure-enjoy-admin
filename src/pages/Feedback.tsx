import React, { useMemo } from 'react'
import { Space, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, CheckCircleOutlined } from '@ant-design/icons'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { getActionColumn } from '../components/ActionColumn'
import EditRecordModal, { EditFieldConfig } from '../components/EditRecordModal'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { useEditModal } from '../hooks/useEditModal'
import { formatDateTime } from '../utils/format'
import NoPermission from '../components/NoPermission'

// ==================== 常量定义 ====================

const STATUS_OPTIONS = [
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '已确认' },
  { value: 'in_progress', label: '进行中' },
  { value: 'resolved', label: '已完结' },
]

const CATEGORY_OPTIONS = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: '功能建议' },
  { value: 'improvement', label: '体验优化' },
  { value: 'other', label: '其他' },
]

// 状态标签颜色映射
const STATUS_TAG_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待确认' },
  confirmed: { color: 'processing', label: '已确认' },
  in_progress: { color: 'warning', label: '进行中' },
  resolved: { color: 'success', label: '已完结' },
}

// 分类标签颜色映射
const CATEGORY_TAG_MAP: Record<string, { color: string; label: string }> = {
  bug: { color: 'error', label: 'Bug' },
  feature: { color: 'processing', label: '功能建议' },
  improvement: { color: 'warning', label: '体验优化' },
  other: { color: 'default', label: '其他' },
}

// ==================== 编辑字段配置 ====================

const EDIT_FIELDS: EditFieldConfig[] = [
  {
    name: 'status',
    label: '状态',
    type: 'select',
    required: true,
    options: STATUS_OPTIONS,
    placeholder: '请选择状态',
  },
  {
    name: 'admin_reply',
    label: '答复备注',
    type: 'textarea',
    placeholder: '请输入管理员答复',
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
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (status: string) => {
      const config = STATUS_TAG_MAP[status] || { color: 'default', label: status }
      return <Tag color={config.color}>{config.label}</Tag>
    },
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
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 100,
    render: (category: string) => {
      const config = CATEGORY_TAG_MAP[category] || { color: 'default', label: category }
      return <Tag color={config.color}>{config.label}</Tag>
    },
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
    width: 250,
    render: (description: string) => description || '-',
  },
  {
    title: '管理员答复',
    dataIndex: 'admin_reply',
    key: 'admin_reply',
    ellipsis: true,
    width: 200,
    render: (adminReply: string) => (
      <Space>
        {adminReply ? (
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
        ) : null}
        <span>{adminReply || '-'}</span>
      </Space>
    ),
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
    render: (date: string) => formatDateTime(date),
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
          icon: <EditOutlined />,
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

const Feedback: React.FC = () => {
  const { canReadFeedback, canWriteFeedback, canDeleteFeedback } = usePermission()
  const { editModalOpen, editingRecord, open, close } = useEditModal<RecordItem>()

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!canDeleteFeedback) {
      message.warning('您没有删除反馈的权限')
      return
    }
    try {
      const { error } = await supabase.from('user_feedback').delete().eq('id', id)
      if (error) throw error
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 编辑记录
  const handleEdit = (record: RecordItem) => {
    if (!canWriteFeedback) {
      message.warning('您没有编辑反馈的权限')
      return
    }
    open(record)
  }

  // 模块配置
  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'feedback',
    title: '问题反馈',
    tableName: 'user_feedback',
    detailTitle: '反馈详情',
    detailColumns: getDetailColumns(canDeleteFeedback || false, handleDelete, handleEdit),
  }), [canDeleteFeedback, canWriteFeedback])

  // 权限检查
  if (!canReadFeedback) {
    return <NoPermission module="反馈" />
  }

  return (
    <>
      <UserDimensionList moduleConfig={moduleConfig} />
      <EditRecordModal
        open={editModalOpen}
        record={editingRecord}
        tableName="user_feedback"
        fields={EDIT_FIELDS}
        onClose={close}
        onSuccess={() => {
          window.location.reload()
        }}
      />
    </>
  )
}

export default Feedback
