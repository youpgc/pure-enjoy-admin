import { Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { getActionColumn } from '../../components/common/ActionColumn'
import type { Database } from '../../types/database'
import AchievementIcon from './AchievementIcon'
import { condSummary, groupLabel } from './achievementMeta'

// 成就列表列定义（从 GameAchievements/index.tsx 抽离，审查 P1 单文件超 500 行）
// 纯代码搬迁，渲染逻辑与文案零变更。

export type DbGameAchievement = Database['public']['Tables']['game_achievements']['Row']

const { Text } = Typography

interface AchievementColumnsParams {
  gameNameMap: Record<string, string>
  canWrite: boolean
  canDelete: boolean
  onEdit: (record: DbGameAchievement) => void
  onDelete: (id: string) => void
}

export function buildAchievementColumns(
  params: AchievementColumnsParams
): ColumnsType<DbGameAchievement> {
  const { gameNameMap, canWrite, canDelete, onEdit, onDelete } = params
  return [
    {
      title: '游戏',
      dataIndex: 'game_id',
      width: 140,
      render: (v: string | null) => (v ? (gameNameMap[v] ?? v) : <Tag>全局</Tag>),
    },
    { title: '编码', dataIndex: 'code', width: 140, render: (v: string) => <Tag>{v}</Tag> },
    { title: '名称', dataIndex: 'name', width: 220, ellipsis: true },
    {
      title: '图标',
      dataIndex: 'icon',
      width: 90,
      // 图标按 game_achievements.icon 令牌渲染（元素模板 + 进阶等级上色），与 App 端一致。
      render: (_: unknown, record: DbGameAchievement) =>
        record.icon ? (
          <AchievementIcon icon={record.icon} size={30} />
        ) : (
          '-'
        ),
    },
    {
      title: '达成条件',
      key: 'condition',
      render: (_: unknown, record: DbGameAchievement) =>
        condSummary((record.condition ?? {}) as Record<string, any>),
    },
    {
      title: '成就族',
      dataIndex: 'group_key',
      width: 160,
      ellipsis: true,
      // 分组键是内部编码（score:match3:max_combo），列表转中文展示；
      // 原始 key 放 tooltip，便于对数据时溯源（不再满屏英文码）。
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v}>
            <Tag color="blue">{groupLabel(v)}</Tag>
          </Tooltip>
        ) : (
          <Tag color="orange">未分组</Tag>
        ),
    },
    {
      title: '奖励积分',
      dataIndex: 'reward_points',
      width: 90,
      render: (v: number) => (v > 0 ? <Tag color="gold">+{v}分</Tag> : <Text type="secondary">仅解锁</Text>),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    getActionColumn<DbGameAchievement>(
      (record) => [
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          disabled: !canWrite,
          onClick: () => onEdit(record),
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          disabled: !canDelete,
          confirm: '确认删除该成就？',
          onClick: () => onDelete(record.id),
        },
      ],
      { width: 150 }
    ),
  ]
}
