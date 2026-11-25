import type { ColumnsType } from 'antd/es/table'
import { Button, Tag, Typography } from 'antd'
import { JOURNEY_AI_TIER_MAP, JOURNEY_BOSS_ABILITY_MAP } from '../../constants/game'
import { bossAbilityParamCount } from '../../constants/journeyBossAbilities'

const { Text } = Typography

/// 总览行：一只妖王一行，聚合怪物主行 + 该能力应配参数行的覆盖状态。
export interface BossAbilityRow {
  monsterId: string
  code: string
  name: string
  aiTier: string
  abilityKey: string
  /// 已配参数行数（该能力应配键中，本怪有显式数值的行）
  configured: number
  /// 应配参数行数（能力映射的键数）
  expected: number
}

/// 覆盖状态：无能力 / 已配齐 / 部分配置 / 全缺省。
/// 留空即回落 App 内置缺省，属合法配置，不按「缺参数行」报错。
export type CoverageKind = 'none' | 'full' | 'partial' | 'default'

export function coverageOf(row: BossAbilityRow): CoverageKind {
  if (!row.abilityKey) return 'none'
  if (row.configured >= row.expected) return 'full'
  if (row.configured > 0) return 'partial'
  return 'default'
}

const COVERAGE_META: Record<CoverageKind, { color: string; label: string }> = {
  none: { color: 'default', label: '无能力' },
  full: { color: 'success', label: '已配齐' },
  partial: { color: 'processing', label: '部分配置' },
  default: { color: 'default', label: '全缺省' },
}

export function buildBossAbilityColumns(
  onEdit: (row: BossAbilityRow) => void,
): ColumnsType<BossAbilityRow> {
  return [
    {
      title: '妖王', dataIndex: 'name', key: 'name', width: 180,
      render: (_: unknown, row: BossAbilityRow) => (
        <span>{row.name}<Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>{row.code}</Text></span>
      ),
    },
    {
      title: 'AI 档', dataIndex: 'aiTier', key: 'aiTier', width: 100,
      render: (v: string) => {
        const info = JOURNEY_AI_TIER_MAP[v] ?? { color: 'default', label: v || '-' }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '能力', dataIndex: 'abilityKey', key: 'abilityKey', width: 230,
      render: (v: string) => {
        if (!v) return <Text type="secondary">—</Text>
        const info = JOURNEY_BOSS_ABILITY_MAP[v] ?? { color: 'default', label: v }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '参数', key: 'params', width: 110,
      render: (_: unknown, row: BossAbilityRow) => {
        if (!row.abilityKey) return '-'
        return `${row.configured} / ${row.expected || bossAbilityParamCount(row.abilityKey)}`
      },
    },
    {
      title: '覆盖', key: 'coverage', width: 110,
      render: (_: unknown, row: BossAbilityRow) => {
        const m = COVERAGE_META[coverageOf(row)]
        return <Tag color={m.color}>{m.label}</Tag>
      },
    },
    {
      title: '操作', key: 'action', width: 90,
      render: (_: unknown, row: BossAbilityRow) => (
        <Button type="link" size="small" onClick={() => onEdit(row)}>编辑</Button>
      ),
    },
  ]
}
