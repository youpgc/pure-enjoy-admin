import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Alert,
  Table,
  Card,
  Space,
  Button,
  Select,
  Segmented,
  Avatar,
  Typography,
  Spin,
} from 'antd'
import { ReloadOutlined, UserOutlined } from '@ant-design/icons'
import { handleApiError } from '../../utils/apiClient'
import { formatDateTime } from '../../utils/format'
import { useGameMeta } from '../../utils/gameMetaCache'
import { useMounted } from '../../hooks/useMounted'
import { getGameLeaderboard } from '../../services/gameService'
import type { GameLeaderboardRow } from '../../services/gameService'
import type { DbGameMode, DbGameDimension } from '../../types/database'
import common from '../../styles/common.module.css'

const { Text } = Typography

/**
 * 游戏排行榜：
 * 数据走 get_game_leaderboard RPC（总榜 / 周榜北京自然周），运营只读查看；
 * 排行维度 = 该游戏 is_primary 维度（sheep=level，g2048/match3/tetris=score），
 * 仅展示昵称/头像/聚合成绩，无敏感字段（与 App 端同源同口径）。
 */
const GameLeaderboard: React.FC = () => {
  const mountedRef = useMounted()
  const meta = useGameMeta()
  const games = meta?.games ?? []

  const [gameId, setGameId] = useState<string>('')
  const [modeId, setModeId] = useState<string>('')
  const [scope, setScope] = useState<'all' | 'week'>('all')
  const [rows, setRows] = useState<GameLeaderboardRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadedOnce, setLoadedOnce] = useState(false)

  // 默认选中首个游戏；meta 未就绪时空串
  useEffect(() => {
    const first = games[0]
    if (!gameId && first) setGameId(first.id)
  }, [games, gameId])

  // 该游戏启用维度中的主维度（is_primary，每游戏恰一个）
  const primaryDim = useMemo<DbGameDimension | null>(() => {
    if (!meta || !gameId) return null
    const dims = meta.dimensions.filter((d) => d.game_id === gameId && d.enabled)
    return dims.find((d) => d.is_primary) ?? dims[0] ?? null
  }, [meta, gameId])

  // 模式清单（含自由模式；游戏切换时重置为全部）
  const modes = useMemo<DbGameMode[]>(
    () => (meta?.modesByGameId?.[gameId] ?? []) as DbGameMode[],
    [meta, gameId]
  )
  useEffect(() => {
    setModeId('')
  }, [gameId])

  const load = useCallback(async () => {
    if (!gameId || !primaryDim) return
    setLoading(true)
    try {
      const data = await getGameLeaderboard(
        gameId,
        primaryDim.code,
        scope,
        modeId || null,
        50
      )
      if (mountedRef.current) setRows(data)
    } catch (e) {
      handleApiError(e, '加载排行榜失败')
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        setLoadedOnce(true)
      }
    }
  }, [gameId, primaryDim, scope, modeId, mountedRef])

  useEffect(() => {
    load()
  }, [load])

  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 90,
      render: (v: number) => `#${v}`,
    },
    {
      title: '玩家',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (v: string | null, r: GameLeaderboardRow) => (
        <Space>
          <Avatar
            size={28}
            src={r.avatar_url || undefined}
            icon={<UserOutlined />}
          />
          <Text strong={r.is_me}>
            {v || '玩家'}
            {r.is_me ? '（当前登录用户）' : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: '最佳成绩',
      dataIndex: 'best_value',
      key: 'best_value',
      width: 130,
      sorter: (a: GameLeaderboardRow, b: GameLeaderboardRow) =>
        Number(a.best_value) - Number(b.best_value),
      render: (v: number) => Number(v).toLocaleString(),
    },
    {
      title: '游玩次数',
      dataIndex: 'play_count',
      key: 'play_count',
      width: 110,
    },
    {
      title: '最近游玩',
      dataIndex: 'last_played_at',
      key: 'last_played_at',
      width: 180,
      render: (v: string | null) => (v ? formatDateTime(v) : '-'),
    },
  ]

  return (
    <div>
      <Alert
        message="游戏排行榜"
        description="基于 get_game_leaderboard RPC 聚合（仅 status='cleared' 对局计入）：总榜 / 周榜（北京自然周，周一 0 点重置），排行维度为该游戏主维度（is_primary）。仅展示昵称/头像与聚合成绩，供运营只读查看，与 App 端游戏详情页排行榜同源同口径。"
        type="info"
        showIcon
        className={common.mb16}
      />

      {!meta ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : (
        <>
          <Card className={common.mb16}>
            <Space wrap>
              <Select
                style={{ width: 180 }}
                value={gameId || undefined}
                onChange={(v) => setGameId(v)}
                placeholder="选择游戏"
                options={games.map((g) => ({ value: g.id, label: g.name }))}
              />
              <Select
                style={{ width: 160 }}
                value={modeId || 'all'}
                onChange={(v) => setModeId(v === 'all' ? '' : v)}
                placeholder="全部模式"
                options={[
                  { value: 'all', label: '全部模式' },
                  ...modes.map((m) => ({ value: m.id, label: m.name })),
                ]}
              />
              <Segmented
                value={scope}
                onChange={(v) => setScope(v as 'all' | 'week')}
                options={[
                  { value: 'all', label: '总榜' },
                  { value: 'week', label: '周榜' },
                ]}
              />
              <Button icon={<ReloadOutlined />} onClick={load}>
                刷新
              </Button>
              {primaryDim && (
                <Text type="secondary">
                  排行维度：{primaryDim.name}（{primaryDim.code}）
                </Text>
              )}
            </Space>
          </Card>

          <Card>
            <Table
              rowKey="user_id"
              columns={columns}
              dataSource={rows}
              loading={loading}
              pagination={false}
              size="middle"
              rowClassName={(r: GameLeaderboardRow) =>
                r.is_me ? 'ant-table-row-selected' : ''
              }
              locale={{
                emptyText: loadedOnce
                  ? '暂无上榜记录'
                  : '选择游戏后加载排行榜',
              }}
            />
          </Card>
        </>
      )}
    </div>
  )
}

export default GameLeaderboard
