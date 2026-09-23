import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PetRandomEventRow } from '../../types/pet'
import { getActionColumn } from '../../components/common/ActionColumn'

// ==================== 随机事件列定义（pet_random_events） ====================

/// content 概要：只读展示选项条数，避免整段 JSON 撑爆列宽
function contentSummary(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '-'
  const obj = value as Record<string, unknown>
  const choices = Array.isArray(obj.choices) ? obj.choices.length : 0
  const text = typeof obj.text === 'string' ? obj.text : ''
  if (!text && choices === 0) return '-'
  return `${text || '（无文案）'} · ${choices} 个选项`
}

export function buildEventColumns(handlers: {
  canWrite: boolean
  canDelete: boolean
  onEdit: (record: PetRandomEventRow) => void
  onDelete: (record: PetRandomEventRow) => void
}): ColumnsType<PetRandomEventRow> {
  const { canWrite, canDelete, onEdit, onDelete } = handlers
  return [
    { title: '编码', dataIndex: 'code', width: 160 },
    { title: '触发上下文', dataIndex: 'context', width: 160 },
    { title: '权重', dataIndex: 'weight', width: 80 },
    {
      title: '内容概要',
      dataIndex: 'content',
      render: (v: unknown) => contentSummary(v),
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    getActionColumn<PetRandomEventRow>((record) => [
      { key: 'edit', label: '编辑', disabled: !canWrite, onClick: () => onEdit(record) },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        disabled: !canDelete,
        confirm: '确认删除该随机事件？',
        onClick: () => onDelete(record),
      },
    ]),
  ]
}
