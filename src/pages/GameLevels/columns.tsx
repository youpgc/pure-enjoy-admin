import { Space, Switch, Tag, Typography } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getActionColumn } from '../../components/common/ActionColumn'
import { JOURNEY_LEVEL_KIND_MAP } from '../../constants/game'
import { formatDateTime } from '../../utils/format'
import type { DbGameLevel, DbJourneyLevel } from '../../types/database'

const { Text } = Typography

/// 西行关卡行：game_levels 主体 + journey_levels 子表属性合并到顶层。
/// 只取六个专属属性列，其余子表审计列与主体同名，不并入行类型避免歧义。
export type JourneyLevelRow = DbGameLevel &
  Partial<Pick<DbJourneyLevel,
    'region_code' | 'level_kind' | 'boss_code' | 'boss_fights' | 'first_clear_merit' | 'duration_target_sec'>>

/// 主线关卡列：西行额外展示区域 / 难别 / 妖王战，非西行展示每日首通与通关奖励。
export interface LevelColumnsOptions {
  isJourneyGame: boolean
  regions: { value: string; label: string }[]
  bosses: { value: string; label: string }[]
  canWrite: boolean
  canDelete: boolean
  onEdit: (record: JourneyLevelRow) => void
  onDelete: (id: string) => void
  onToggleDailyClear: (record: JourneyLevelRow, next: boolean) => void
}

export function buildLevelColumns(o: LevelColumnsOptions): ColumnsType<JourneyLevelRow> {
  return [
    { title: '关卡号', dataIndex: 'level_no', key: 'level_no', width: 90, render: (v: number) => <Text strong>{v}</Text> },
    { title: '名称', dataIndex: 'name', key: 'name' },
    ...(o.isJourneyGame
      ? [{
          title: '区域',
          key: 'region_code',
          width: 110,
          render: (_: unknown, record: JourneyLevelRow) => {
            const code = record.region_code
            if (!code) return <Text type="secondary">-</Text>
            return <Tag color="blue">{o.regions.find((r) => r.value === code)?.label ?? code}</Tag>
          },
        },
        {
          title: '难别',
          key: 'level_kind',
          width: 90,
          render: (_: unknown, record: JourneyLevelRow) => {
            const kind = record.level_kind
            if (!kind) return <Text type="secondary">-</Text>
            const info = JOURNEY_LEVEL_KIND_MAP[kind] ?? { color: 'default', label: kind }
            return <Tag color={info.color}>{info.label}</Tag>
          },
        },
        {
          title: '本关妖王',
          key: 'boss_code',
          width: 120,
          render: (_: unknown, record: JourneyLevelRow) => {
            const code = record.boss_code
            if (!code) return <Text type="secondary">本段</Text>
            const label = o.bosses.find((b) => b.value === code)?.label
            return <Tag color="red">{label ?? code}</Tag>
          },
        },
        {
          title: '妖王战',
          key: 'boss_fights',
          width: 80,
          render: (_: unknown, record: JourneyLevelRow) => {
            const n = record.boss_fights
            return n ? <Tag color="red">{n} 场</Tag> : <Text type="secondary">-</Text>
          },
        }]
      : []),
    // 西行走功德体系（journey_levels.first_clear_merit），积分/每日首通不适用 → 条件隐藏
    ...(!o.isJourneyGame
      ? [
          {
            title: '计入每日首通',
            dataIndex: 'count_for_daily_clear',
            key: 'count_for_daily_clear',
            width: 130,
            render: (v: boolean, record: DbGameLevel) => (
              <Switch
                checked={v}
                disabled={!o.canWrite}
                checkedChildren="计入"
                unCheckedChildren="不计"
                onChange={() => o.onToggleDailyClear(record, !v)}
              />
            ),
          },
          {
            title: '通关奖励',
            key: 'reward',
            width: 140,
            render: (_: unknown, record: DbGameLevel) => (
              record.reward_points > 0 ? (
                <Space>
                  <Tag color="gold">+{record.reward_points}分</Tag>
                  {record.reward_repeatable && <Tag>可重复</Tag>}
                </Space>
              ) : (
                <Text type="secondary">无</Text>
              )
            ),
          },
        ]
      : []),
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (d: string) => formatDateTime(d),
    },
    getActionColumn<JourneyLevelRow>((record) => [
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        disabled: !o.canWrite,
        onClick: () => o.onEdit(record),
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        disabled: !o.canDelete,
        confirm: '确认删除',
        onClick: () => o.onDelete(record.id),
      },
    ], { width: 150 }),
  ]
}
