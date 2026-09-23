import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PetSceneRow } from '../../types/pet'
import { getActionColumn } from '../../components/common/ActionColumn'

// ==================== 场景列表列定义（pet_scenes） ====================

export function buildSceneColumns(handlers: {
  canWrite: boolean
  canDelete: boolean
  onEdit: (record: PetSceneRow) => void
  onDelete: (record: PetSceneRow) => void
}): ColumnsType<PetSceneRow> {
  const { canWrite, canDelete, onEdit, onDelete } = handlers
  return [
    { title: '场景编码', dataIndex: 'scene_code', width: 200 },
    { title: '名称', dataIndex: 'name', width: 160 },
    {
      title: '素材引用',
      dataIndex: 'asset_ref',
      render: (v: string | null) => v || '-',
      ellipsis: true,
    },
    {
      title: '默认',
      dataIndex: 'is_default',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="blue">默认</Tag> : '-'),
    },
    {
      title: '定价(金币)',
      dataIndex: 'price_coin',
      width: 110,
      render: (v: number | null) => (v === null ? '未定价' : v),
    },
    {
      title: '上架',
      dataIndex: 'on_shelf',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="green">已上架</Tag> : <Tag>未上架</Tag>),
    },
    getActionColumn<PetSceneRow>((record) => [
      { key: 'edit', label: '编辑', disabled: !canWrite, onClick: () => onEdit(record) },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        disabled: !canDelete,
        confirm: '确认删除该场景？已购买用户的持有记录不会回滚，建议先下架',
        onClick: () => onDelete(record),
      },
    ]),
  ]
}
