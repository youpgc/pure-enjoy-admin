import React, { useMemo } from 'react'
import { Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PushpinOutlined } from '@ant-design/icons'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { getActionColumn } from '../components/ActionColumn'
import EditRecordModal, { EditFieldConfig } from '../components/EditRecordModal'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { useEditModal } from '../hooks/useEditModal'
import { useDictOptions, useDictColors } from '../hooks/useDictOptions'
import { formatDateTime } from '../utils/format'
import NoPermission from '../components/NoPermission'
import TagsCell from '../components/TagsCell'

// ==================== 常量定义 ====================

const CATEGORY_OPTIONS_FALLBACK = [
  { value: '工作', label: '工作' },
  { value: '生活', label: '生活' },
  { value: '学习', label: '学习' },
  { value: '其他', label: '其他' },
]

// ==================== 编辑字段配置 ====================

const getEditFields = (categoryOptions: { value: string; label: string }[]): EditFieldConfig[] => [
  {
    name: 'title',
    label: '标题',
    type: 'text',
    required: true,
    placeholder: '请输入笔记标题',
  },
  {
    name: 'content',
    label: '内容',
    type: 'textarea',
    required: true,
    placeholder: '请输入笔记内容',
  },
  {
    name: 'category',
    label: '分类',
    type: 'select',
    options: categoryOptions,
  },
  {
    name: 'tags',
    label: '标签',
    type: 'tags',
    placeholder: '输入标签后按回车添加',
  },
  {
    name: 'is_pinned',
    label: '置顶',
    type: 'switch',
  },
]

// ==================== 详情列表列配置 ====================

const getDetailColumns = (
  canDelete: boolean,
  onDelete: (id: string) => void,
  onEdit: (record: RecordItem) => void,
  categoryOptions: { value: string; label: string }[],
  getCategoryColor: (code: string) => string
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
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 100,
    render: (category: string) => {
      const label = categoryOptions.find(opt => opt.value === category)?.label || category
      return category ? <Tag color={getCategoryColor(category) || 'blue'}>{label}</Tag> : '-'
    },
  },
  {
    title: '标签',
    dataIndex: 'tags',
    key: 'tags',
    width: 150,
    render: (tags: string[] | string) => <TagsCell tags={tags} color="cyan" />,
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

const Notes: React.FC = () => {
  const { canReadNotes, canWriteNotes, canDeleteNotes } = usePermission()
  const { editModalOpen, editingRecord, open, close } = useEditModal<RecordItem>()
  const { options: categoryOptions } = useDictOptions('note_category', CATEGORY_OPTIONS_FALLBACK)
  const { getColor: getCategoryColor } = useDictColors('note_category')

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
  const handleEdit = (record: RecordItem) => {
    if (!canWriteNotes) {
      message.warning('您没有编辑笔记的权限')
      return
    }
    open(record)
  }

  // 模块配置
  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'notes',
    title: '笔记管理',
    tableName: 'notes',
    detailTitle: '笔记详情',
    detailColumns: getDetailColumns(canDeleteNotes || false, handleDelete, handleEdit, categoryOptions, getCategoryColor),
  }), [canDeleteNotes, canWriteNotes, categoryOptions, getCategoryColor])

  // 权限检查
  if (!canReadNotes) {
    return <NoPermission module="笔记" />
  }

  return (
    <>
      <UserDimensionList moduleConfig={moduleConfig} />
      <EditRecordModal
        open={editModalOpen}
        record={editingRecord}
        tableName="notes"
        fields={getEditFields(categoryOptions)}
        onClose={close}
        onSuccess={() => {
          window.location.reload()
        }}
      />
    </>
  )
}

export default Notes