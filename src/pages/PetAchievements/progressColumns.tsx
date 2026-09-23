import { Space, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PetAchievementProgressRow } from '../../types/pet'
import type { UserInfo } from '../../hooks/useUsernames'
import { UserName } from '../../components/common/UserName'
import { asObject, numOf } from '../../components/form/pet/editors/shared'
import { PET_ACH_TIER_COLORS, PET_ACH_TIER_LABELS } from '../../constants/pet'
import { formatDateTime } from '../../utils/format'
import common from '../../styles/common.module.css'

// ==================== 用户成就进度列定义（pet_achievement_progress） ====================
//
// 只读列表：进度由服务端 rpc_pet_achievement_check 幂等重算（只增不减），
// 本页不提供改写入口——手工改写会与下一次重算结果打架。

/// 目标值：与服务端 _pet_ach_target 同优先级 value → target → 1
export function targetOf(row: PetAchievementProgressRow): number {
  const obj = asObject(row.pet_achievements?.condition_value)
  return numOf(obj.value, numOf(obj.target, 1)) ?? 1
}

const StatusTag = ({ row }: { row: PetAchievementProgressRow }) => {
  if (row.claimed_at) return <Tag color="green">已领取</Tag>
  if (row.completed_at) return <Tag color="gold">达标待领</Tag>
  if (row.progress >= targetOf(row)) return <Tag color="blue">达标未刷新</Tag>
  return <Tag>进行中</Tag>
}

export function buildProgressColumns(
  userMap: Map<string, UserInfo>
): ColumnsType<PetAchievementProgressRow> {
  return [
    {
      title: '用户',
      dataIndex: 'user_id',
      width: 180,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    {
      title: '成就',
      key: 'achievement',
      render: (_, r) => {
        const a = r.pet_achievements
        if (!a) return r.achievement_id
        return (
          <Space size={4}>
            <span>{a.title}</span>
            <span className={common.smallText} style={{ color: '#999' }}>
              {a.code}
            </span>
            <Tag color={PET_ACH_TIER_COLORS[a.tier] ?? 'default'}>
              {PET_ACH_TIER_LABELS[a.tier] ?? a.tier}
            </Tag>
          </Space>
        )
      },
      ellipsis: true,
    },
    {
      title: '进度',
      key: 'progress',
      width: 120,
      render: (_, r) => `${r.progress} / ${targetOf(r)}`,
    },
    { title: '状态', key: 'status', width: 110, render: (_, r) => <StatusTag row={r} /> },
    {
      title: '达标时间',
      dataIndex: 'completed_at',
      width: 170,
      render: (v: string | null) => (v ? formatDateTime(v) : '-'),
    },
    {
      title: '领取时间',
      dataIndex: 'claimed_at',
      width: 170,
      render: (v: string | null) => (v ? formatDateTime(v) : '-'),
    },
  ]
}
