import React, { useMemo } from 'react'
import { Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { getActionColumn } from '../components/ActionColumn'
import EditRecordModal, { EditFieldConfig } from '../components/EditRecordModal'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { useEditModal } from '../hooks/useEditModal'
import { formatDateTime } from '../utils/format'
import NoPermission from '../components/NoPermission'

// ==================== 常量定义 ====================

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'birthday', label: '生日' },
  { value: 'anniversary', label: '纪念日' },
]

const REMIND_DAYS_OPTIONS: { value: string; label: string }[] = [
  { value: '0', label: '当天' },
  { value: '1', label: '提前1天' },
  { value: '3', label: '提前3天' },
  { value: '7', label: '提前7天' },
  { value: '14', label: '提前14天' },
  { value: '30', label: '提前30天' },
]

const getTypeTag = (type: string) => {
  switch (type) {
    case 'birthday':
      return <Tag color="blue">🎂 生日</Tag>
    case 'anniversary':
      return <Tag color="purple">🎉 纪念日</Tag>
    default:
      return <Tag>{type || '-'}</Tag>
  }
}

// ==================== 编辑字段配置 ====================

const getEditFields = (): EditFieldConfig[] => [
  {
    name: 'title',
    label: '名称',
    type: 'text',
    required: true,
    placeholder: '请输入名称',
  },
  {
    name: 'type',
    label: '类型',
    type: 'select',
    options: TYPE_OPTIONS,
  },
  {
    name: 'date',
    label: '日期',
    type: 'date',
  },
  {
    name: 'description',
    label: '描述',
    type: 'textarea',
    placeholder: '请输入描述',
  },
  {
    name: 'repeat_yearly',
    label: '每年重复',
    type: 'switch',
  },
  {
    name: 'remind_enabled',
    label: '开启提醒',
    type: 'switch',
  },
  {
    name: 'remind_days_before',
    label: '提前提醒天数',
    type: 'select',
    options: REMIND_DAYS_OPTIONS,
  },
]

// ==================== 详情列表列配置 ====================

const getDetailColumns = (
  canDelete: boolean,
  onDelete: (id: string) => void,
  onEdit: (record: RecordItem) => void,
): ColumnsType<RecordItem> => [
  {
    title: '名称',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
    width: 180,
    render: (title: string) => title || '-',
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 120,
    render: (type: string) => getTypeTag(type),
  },
  {
    title: '日期',
    dataIndex: 'date',
    key: 'date',
    width: 120,
    render: (date: string) => date || '-',
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
    title: '每年重复',
    dataIndex: 'repeat_yearly',
    key: 'repeat_yearly',
    width: 100,
    render: (repeat: boolean) => (
      repeat ? (
        <Tag color="success">是</Tag>
      ) : (
        <Tag color="default">否</Tag>
      )
    ),
  },
  {
    title: '提醒',
    key: 'remind',
    width: 120,
    render: (_: unknown, record: RecordItem) => {
      const enabled = record.remind_enabled as boolean
      const daysBefore = record.remind_days_before as number
      if (!enabled) {
        return <Tag color="default">未开启</Tag>
      }
      return <Tag color="warning">提前{daysBefore || 0}天</Tag>
    },
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
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
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => onDelete(record.id as string),
        })
      }
      return actions
    },
    { width: 160, maxVisible: 2 }
  ),
]

// ==================== 主组件 ====================

const Anniversaries: React.FC = () => {
  // 临时使用 feedback 权限作为替代，后续可替换为 anniversaries 专属权限
  const { canReadFeedback, canWriteFeedback, canDeleteFeedback } = usePermission()
  const { editModalOpen, editingRecord, open, close } = useEditModal<RecordItem>()

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!canDeleteFeedback) {
      message.warning('您没有删除纪念日的权限')
      return
    }
    try {
      const { error } = await supabase.from('user_anniversaries').delete().eq('id', id)
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
      message.warning('您没有编辑纪念日的权限')
      return
    }
    open(record)
  }

  // 模块配置
  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'anniversaries',
    title: '纪念日/生日管理',
    tableName: 'user_anniversaries',
    detailTitle: '纪念日详情',
    detailColumns: getDetailColumns(
      canDeleteFeedback || false,
      handleDelete,
      handleEdit,
    ),
  }), [canDeleteFeedback, canWriteFeedback])

  // 权限检查
  if (!canReadFeedback) {
    return <NoPermission module="纪念日/生日" />
  }

  return (
    <>
      <UserDimensionList moduleConfig={moduleConfig} />
      <EditRecordModal
        open={editModalOpen}
        record={editingRecord}
        tableName="user_anniversaries"
        fields={getEditFields()}
        onClose={close}
        onSuccess={() => {
          window.location.reload()
        }}
      />
    </>
  )
}

export default Anniversaries
