import React, { useMemo } from 'react'
import { Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, HeartFilled } from '@ant-design/icons'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { getActionColumn } from '../components/ActionColumn'
import EditRecordModal, { EditFieldConfig } from '../components/EditRecordModal'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { useEditModal } from '../hooks/useEditModal'
import { useDictOptions } from '../hooks/useDictOptions'
import { formatDateTime, formatDate } from '../utils/format'
import NoPermission from '../components/NoPermission'
import TagsCell from '../components/TagsCell'

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

const MOOD_OPTIONS_FALLBACK = [
  { value: '开心', label: '开心' },
  { value: '平静', label: '平静' },
  { value: '一般', label: '一般' },
  { value: '难过', label: '难过' },
  { value: '焦虑', label: '焦虑' },
]

// ==================== 编辑字段配置 ====================

const getEditFields = (moodOptions: { value: string; label: string }[]): EditFieldConfig[] => [
  {
    name: 'mood',
    label: '心情',
    type: 'select',
    required: true,
    options: moodOptions,
  },
  {
    name: 'content',
    label: '内容',
    type: 'textarea',
    required: true,
    placeholder: '请输入日记内容',
  },
  {
    name: 'date',
    label: '日期',
    type: 'date',
    required: true,
  },
]

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
    title: '标签',
    dataIndex: 'tags',
    key: 'tags',
    width: 150,
    render: (tags: string[] | string) => <TagsCell tags={tags} color="purple" />,
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
    render: (date: string) => formatDate(date),
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

const MoodDiaries: React.FC = () => {
  const { canReadMoods, canWriteMoods, canDeleteMoods } = usePermission()
  const { editModalOpen, editingRecord, open, close } = useEditModal<RecordItem>()
  const { options: moodOptions } = useDictOptions('mood_type', MOOD_OPTIONS_FALLBACK)

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
  const handleEdit = (record: RecordItem) => {
    if (!canWriteMoods) {
      message.warning('您没有编辑心情日记的权限')
      return
    }
    open(record)
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
    return <NoPermission module="心情日记" />
  }

  return (
    <>
      <UserDimensionList moduleConfig={moduleConfig} />
      <EditRecordModal
        open={editModalOpen}
        record={editingRecord}
        tableName="mood_diaries"
        fields={getEditFields(moodOptions)}
        onClose={close}
        onSuccess={() => {
          window.location.reload()
        }}
      />
    </>
  )
}

export default MoodDiaries