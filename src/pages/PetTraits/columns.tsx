import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PetTraitRow } from '../../types/pet'
import { PET_FAMILY_LABELS, PET_TRAIT_EFFECT_TYPE_LABELS, PET_ATTR_LABELS } from '../../constants/pet'
import { asObject } from '../../components/form/pet/editors/shared'
import { getActionColumn } from '../../components/common/ActionColumn'

// ==================== 特性池列定义（pet_traits） ====================

export function buildTraitColumns(handlers: {
  canWrite: boolean
  canDelete: boolean
  speciesLabel: (code: string) => string
  onEdit: (record: PetTraitRow) => void
  onDelete: (record: PetTraitRow) => void
}): ColumnsType<PetTraitRow> {
  const { canWrite, canDelete, speciesLabel, onEdit, onDelete } = handlers
  return [
    { title: '编码', dataIndex: 'code', width: 160 },
    { title: '名称', dataIndex: 'name', width: 140 },
    {
      title: '效果类型',
      dataIndex: 'effect_type',
      width: 140,
      render: (v: string) => <Tag>{PET_TRAIT_EFFECT_TYPE_LABELS[v] ?? v}</Tag>,
    },
    {
      title: '效果参数',
      dataIndex: 'effect_params',
      render: (v: unknown) => {
        const obj = asObject(v)
        const keys = Object.keys(obj)
        if (keys.length === 0) return '-'
        // attr 键译为属性中文名，其余键值原样（数值/比率类参数）
        return keys
          .map((k) =>
            k === 'attr'
              ? PET_ATTR_LABELS[String(obj.attr)] ?? String(obj.attr)
              : `${k} ${String(obj[k])}`,
          )
          .join(' · ')
      },
      ellipsis: true,
    },
    { title: '权重', dataIndex: 'weight', width: 80 },
    {
      title: '归属池',
      key: 'pool',
      width: 180,
      render: (_, r) => {
        if (r.species_code)
          return <Tag color="geekblue">种属 {speciesLabel(r.species_code)}</Tag>
        if (r.family) return <Tag color="cyan">体系 {PET_FAMILY_LABELS[r.family] ?? r.family}</Tag>
        return <Tag>全局</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    getActionColumn<PetTraitRow>((record) => [
      { key: 'edit', label: '编辑', disabled: !canWrite, onClick: () => onEdit(record) },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        disabled: !canDelete,
        confirm: '确认删除该特性？已被宠物持有的特性受外键保护删不掉，请改为停用',
        onClick: () => onDelete(record),
      },
    ]),
  ]
}
