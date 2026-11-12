import { Space, Switch, Tag, Typography, Button } from 'antd'
import { EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getActionColumn } from '../../components/common/ActionColumn'
import { JOURNEY_LEVEL_KIND_MAP } from '../../constants/game'
import { formatDateTime } from '../../utils/format'
import type { DbGameLevel, DbJourneyDailyMap } from '../../types/database'

const { Text } = Typography

/// 主线关卡列：西行额外展示区域 / 难别 / 妖王战，非西行展示每日首通与通关奖励。
export interface LevelColumnsOptions {
  isJourneyGame: boolean
  regions: { value: string; label: string }[]
  canWrite: boolean
  canDelete: boolean
  onOpenConfig: (record: DbGameLevel) => void
  onEdit: (record: DbGameLevel) => void
  onDelete: (id: string) => void
  onToggleDailyClear: (record: DbGameLevel, next: boolean) => void
}

export function buildLevelColumns(o: LevelColumnsOptions): ColumnsType<DbGameLevel> {
  return [
    { title: '关卡号', dataIndex: 'level_no', key: 'level_no', width: 90, render: (v: number) => <Text strong>{v}</Text> },
    { title: '名称', dataIndex: 'name', key: 'name' },
    ...(o.isJourneyGame
      ? [{
          title: '区域',
          key: 'region_code',
          width: 110,
          render: (_: unknown, record: DbGameLevel) => {
            const code = (record.config as Record<string, any> | null)?.region_code as string | undefined
            if (!code) return <Text type="secondary">-</Text>
            return <Tag color="blue">{o.regions.find((r) => r.value === code)?.label ?? code}</Tag>
          },
        },
        {
          title: '难别',
          key: 'level_kind',
          width: 90,
          render: (_: unknown, record: DbGameLevel) => {
            const kind = (record.config as Record<string, any> | null)?.level_kind as string | undefined
            if (!kind) return <Text type="secondary">-</Text>
            const info = JOURNEY_LEVEL_KIND_MAP[kind] ?? { color: 'default', label: kind }
            return <Tag color={info.color}>{info.label}</Tag>
          },
        },
        {
          title: '妖王战',
          key: 'boss_fights',
          width: 80,
          render: (_: unknown, record: DbGameLevel) => {
            const n = (record.config as Record<string, any> | null)?.boss_fights as number | undefined
            return n ? <Tag color="red">{n} 场</Tag> : <Text type="secondary">-</Text>
          },
        }]
      : []),
    // 西行走功德体系（config.first_clear_merit），积分/每日首通不适用 → 条件隐藏
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
    getActionColumn<DbGameLevel>((record) => [
      ...(o.isJourneyGame
        ? [{
            key: 'level_config',
            label: '配置',
            icon: <SettingOutlined />,
            disabled: !o.canWrite,
            onClick: () => o.onOpenConfig(record),
          }]
        : []),
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

/// 每日游历地图列：怪物池只展示种数，配置入口回传整行。
export interface DailyColumnsOptions {
  canWrite: boolean
  onConfigure: (row: DbJourneyDailyMap) => void
}

export function buildDailyColumns(o: DailyColumnsOptions): ColumnsType<DbJourneyDailyMap> {
  return [
    { title: '地图', key: 'name', render: (_: unknown, r) => (
        <Space>
          <Tag color="cyan">游历</Tag>
          {r.name}
          <Text type="secondary">（{r.code}）</Text>
        </Space>
      ) },
    { title: '主题色', dataIndex: 'theme_color', key: 'theme_color', width: 100 },
    { title: '功成时长(秒)', dataIndex: 'duration_target_sec', key: 'duration_target_sec', width: 120 },
    {
      title: '怪物池',
      key: 'monster_pool',
      width: 140,
      render: (_: unknown, r) => {
        const n = (r.monster_pool ?? '').split(',').map((s) => s.trim()).filter(Boolean).length
        return n > 0 ? <Tag color="blue">{n} 种</Tag> : <Text type="secondary">全怪池</Text>
      },
    },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90,
      render: (v: boolean | null) => (v !== false ? <Tag color="green">开放</Tag> : <Tag>禁用</Tag>),
    },
    {
      title: '操作',
      key: 'act',
      width: 110,
      render: (_: unknown, r) => (
        <Button
          size="small"
          icon={<SettingOutlined />}
          disabled={!o.canWrite}
          onClick={() => o.onConfigure(r)}
        >
          配置
        </Button>
      ),
    },
  ]
}
