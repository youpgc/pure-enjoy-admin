import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PetAchievementRow } from '../../types/pet'
import { PET_ACH_CONDITION_TYPE_LABELS, PET_ACH_TIER_COLORS, PET_ACH_TIER_LABELS } from '../../constants/pet'
import { asObject, asArray, numOf } from '../../components/form/pet/editors/shared'
import { getActionColumn } from '../../components/common/ActionColumn'

// ==================== 成就列定义（pet_achievements） ====================

/// 达成条件概要：条件中文名 + 目标值（服务端 _pet_ach_target 同优先级 value→target→1）
function conditionSummary(row: PetAchievementRow): string {
  const label = PET_ACH_CONDITION_TYPE_LABELS[row.condition_type] ?? row.condition_type
  const obj = asObject(row.condition_value)
  const target = numOf(obj.value, numOf(obj.target, 1))
  const rarity = typeof obj.rarity === 'string' ? obj.rarity : ''
  return `${label} · 目标 ${target}${rarity ? ` · 评级 ${rarity}` : ''}`
}

/// 奖励包概要（与任务 rewards 同 schema：gold / points / items[]）
function rewardSummary(value: unknown): string {
  const obj = asObject(value)
  const parts: string[] = []
  const gold = numOf(obj.gold)
  const points = numOf(obj.points)
  if (gold) parts.push(`金币 ${gold}`)
  if (points) parts.push(`积分 ${points}`)
  const items = asArray(obj.items)
  if (items.length > 0) {
    parts.push(
      items
        .map((i) => `${String(i.code ?? '?')}×${String(i.count ?? 1)}`)
        .join('、')
    )
  }
  return parts.length > 0 ? parts.join(' / ') : '-'
}

export function buildAchievementColumns(handlers: {
  canWrite: boolean
  canDelete: boolean
  onEdit: (record: PetAchievementRow) => void
  onDelete: (record: PetAchievementRow) => void
}): ColumnsType<PetAchievementRow> {
  const { canWrite, canDelete, onEdit, onDelete } = handlers
  return [
    { title: '编码', dataIndex: 'code', width: 170 },
    { title: '名称', dataIndex: 'title', width: 150 },
    {
      title: '档位',
      dataIndex: 'tier',
      width: 90,
      render: (v: string) => (
        <Tag color={PET_ACH_TIER_COLORS[v] ?? 'default'}>{PET_ACH_TIER_LABELS[v] ?? v}</Tag>
      ),
    },
    {
      title: '达成条件',
      key: 'condition',
      render: (_, r) => conditionSummary(r),
      ellipsis: true,
    },
    {
      title: '奖励包',
      dataIndex: 'reward_package',
      render: (v: unknown) => rewardSummary(v),
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    getActionColumn<PetAchievementRow>((record) => [
      { key: 'edit', label: '编辑', disabled: !canWrite, onClick: () => onEdit(record) },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        disabled: !canDelete,
        confirm: '确认删除该成就？已有用户进度行受外键保护删不掉，请改为停用',
        onClick: () => onDelete(record),
      },
    ]),
  ]
}
