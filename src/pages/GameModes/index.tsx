import React, { useEffect, useMemo, useState } from 'react'
import {
  Table,
  Button,
  message,
  Space,
  Switch,
  Tag,
  Tooltip,
  Select,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Database } from '../../types/database'
import { usePermission } from '../../hooks/usePermission'
import { useGameMeta } from '../../utils/gameMetaCache'
import { useNavigation } from '../../App'
import { gameModeService, gameScoreService } from '../../services/gameService'
import { GAME_SHARED_ICON_BASE } from '../../constants/game'
import ModeFormModal from './ModeFormModal'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

type DbGameMode = Database['public']['Tables']['game_modes']['Row']

/**
 * 游戏模式管理（game_modes）。模式为关卡选关的「一级维度」：
 * 主界面模式网格、选关弹窗按模式过滤均依赖本表；play_kind 是模式 ↔ 引擎行为的唯一链接。
 * - 未选游戏时展示全部模式（分页 10 条/页），选择游戏后按游戏过滤；
 * - 「关卡」按钮深链定位到关卡页的对应游戏 + 模式；
 * - 排序上移/下移仅在被游戏过滤视图内提供（全部视图跨游戏无相邻语义）。
 * 表单弹窗见 ModeFormModal（play_kind 联动过滤 + config 推荐模板）。
 */
const GameModes: React.FC = () => {
  const { hasPermission } = usePermission()
  const { setCurrentPage } = useNavigation()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const meta = useGameMeta()
  const games = useMemo(
    () => (meta?.games ?? []).map((g) => ({ id: g.id, code: g.code, name: g.name })),
    [meta?.games],
  )
  const gameNameById = useMemo(
    () => Object.fromEntries(games.map((g) => [g.id, `${g.name}（${g.code}）`])),
    [games],
  )

  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [modes, setModes] = useState<DbGameMode[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<DbGameMode | null>(null)
  const [saving, setSaving] = useState(false)
  const [levelCounts, setLevelCounts] = useState<Record<string, number>>({})

  const loadModes = async () => {
    setLoading(true)
    try {
      // 未选游戏 → 全部模式；已选 → 按游戏过滤（service 统一响应/错误处理）
      const res = await gameModeService.findAllModes(selectedGameId || undefined)
      if (!res.success) {
        message.error(res.errorMessage ?? '加载模式失败')
        return
      }
      setModes(res.data ?? [])
      // 每模式关卡数（service 内单查聚合 + range 破 1000 行截断）
      const counts = await gameModeService.countLevelsByMode(selectedGameId || undefined)
      setLevelCounts(counts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGameId])

  const openAdd = () => {
    setEditing(null)
    setModalVisible(true)
  }

  const openEdit = (record: DbGameMode) => {
    setEditing(record)
    setModalVisible(true)
  }

  // config 文本框 → JSON 对象（与 game_levels 页同口径）；非法 JSON 拦截保存
  const handleSave = async (values: Record<string, any>) => {
    let config: unknown
    try {
      config = values.config ? JSON.parse(values.config) : {}
    } catch {
      message.error('config 不是合法 JSON，请检查后重试')
      return
    }
    const payload: Record<string, any> = { ...values, config }
    setSaving(true)
    try {
      const res = editing
        ? await gameModeService.update(editing.id, payload as any)
        : await gameModeService.create(payload as any)
      if (!res.success) return // service 已统一弹窗 + 记日志
      message.success(editing ? '已更新模式' : '已新增模式')
      setModalVisible(false)
      setEditing(null)
      loadModes()
    } catch (e: any) {
      // 唯一冲突转译：(game_id, code) 唯一索引 uk_game_modes_game_code
      if (e?.code === '23505' || /duplicate key/i.test(String(e?.message ?? ''))) {
        message.error('保存失败：该游戏下已存在同名模式编码（code 在游戏内唯一），请更换编码')
      } else {
        message.error(`保存失败：${e?.message ?? e}`)
      }
    } finally {
      setSaving(false)
    }
  }

  // 行内启停：App 端配置快照 TTL 30s，停用后至多 30s 同步
  const handleToggleEnabled = async (record: DbGameMode, checked: boolean) => {
    const res = await gameModeService.updateEnabled(record.id, checked)
    if (!res.success) return // service 已统一弹窗 + 记日志
    message.success(checked ? '已启用模式' : '已停用模式（App 端至多 30s 后同步）')
    loadModes()
  }

  // 排序上移/下移：与相邻模式交换 sort_order（仅在按游戏过滤视图内提供，
  // 全部视图跨游戏无相邻语义）。历史脏数据 sort_order 相等时退化为 ±1 平移。
  const handleMove = async (record: DbGameMode, dir: -1 | 1) => {
    if (!selectedGameId) return
    const idx = modes.findIndex((m) => m.id === record.id)
    const neighbor = modes[idx + dir]
    if (!neighbor) return
    const a = record.sort_order ?? 0
    const b = neighbor.sort_order ?? 0
    const patchSelf = a === b ? a + dir : b
    const patchNeighbor = a === b ? b : a
    const res = await gameModeService.swapSortOrder(record.id, patchSelf, neighbor.id, patchNeighbor)
    if (!res.success) return // service 已统一弹窗 + 记日志
    loadModes()
  }

  const handleDelete = async (record: DbGameMode) => {
    // 防级联清关①：关卡数用已聚合的 levelCounts（game_levels.mode_id 为
    // on delete cascade，有关卡时删除会静默清空全部关卡）
    const levelCount = levelCounts[record.id] ?? 0
    if (levelCount > 0) {
      message.error(
        `该模式仍关联 ${levelCount} 个关卡，删除会级联清空关卡数据，已阻止。请先下架/迁移这些关卡。`,
      )
      return
    }
    // 防级联清关②：成绩记录（game_scores.mode_id 为 on delete set null）
    const scoreRes = await gameScoreService.countScoresByMode(record.id)
    const scoreCount = scoreRes.count ?? 0
    if (scoreCount > 0) {
      message.error(`该模式仍关联 ${scoreCount} 条成绩记录，删除会影响成绩归属，已阻止。`)
      return
    }
    const res = await gameModeService.delete(record.id)
    if (!res.success) return // service 已统一弹窗 + 记日志
    message.success('已删除模式')
    loadModes()
  }

  const columns: ColumnsType<DbGameMode> = [
    {
      title: '所属游戏',
      dataIndex: 'game_id',
      key: 'game_id',
      width: 130,
      render: (v: string) => gameNameById[v] ?? v,
    },
    {
      title: '模式编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '语义',
      dataIndex: 'play_kind',
      key: 'play_kind',
      width: 130,
      render: (v: string | null) => v || '-',
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 70,
      render: (v: string | null) =>
        v ? (
          <img src={`${GAME_SHARED_ICON_BASE}/${v}.svg`} width={24} height={24} alt={v} />
        ) : (
          '-'
        ),
    },
    {
      title: '关卡数',
      key: 'levelCount',
      width: 80,
      render: (_: unknown, record: DbGameMode) => {
        const n = levelCounts[record.id] ?? 0
        if (n > 0) return <Tag color="blue">{n}</Tag>
        // 无尽等 App 合成模式无 server 关属正常态
        return (
          <Tooltip title="无服务器关卡（如无尽模式由 App 合成，属正常态）">
            <span style={{ color: '#999' }}>0</span>
          </Tooltip>
        )
      },
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (v: boolean, record: DbGameMode) => (
        <Switch
          checked={v}
          disabled={!canWrite}
          onChange={(checked) => handleToggleEnabled(record, checked)}
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 90,
      render: (v: number, record: DbGameMode) => {
        if (!selectedGameId || !canWrite) return v
        const idx = modes.findIndex((m) => m.id === record.id)
        return (
          <Space size={2}>
            <span>{v}</span>
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined />}
              disabled={idx <= 0}
              onClick={() => handleMove(record, -1)}
            />
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined />}
              disabled={idx < 0 || idx >= modes.length - 1}
              onClick={() => handleMove(record, 1)}
            />
          </Space>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 190,
      render: (_: unknown, record: DbGameMode) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            disabled={!canWrite}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Button
            size="small"
            icon={<AppstoreOutlined />}
            // 深链：关卡页直接定位到该游戏 + 该模式（keepalive 页签带参跳转）
            onClick={() =>
              setCurrentPage('game_levels', { gameId: record.game_id, modeId: record.id })
            }
          >
            关卡
          </Button>
          <Popconfirm title="确认删除该模式？" onConfirm={() => handleDelete(record)}>
            <Button danger size="small" icon={<DeleteOutlined />} disabled={!canDelete}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={common.toolbar}>
        <Select
          className={common.sel240}
          placeholder="全部游戏（可筛选）"
          allowClear
          value={selectedGameId || undefined}
          onChange={(v) => setSelectedGameId(v ?? '')}
          options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
        />
        <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite} onClick={openAdd}>
          新增模式
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadModes} loading={loading}>
          刷新
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={modes}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`,
        }}
        locale={{ emptyText: '暂无模式' }}
      />

      <ModeFormModal
        open={modalVisible}
        editing={editing}
        selectedGameId={selectedGameId}
        games={games}
        saving={saving}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

export default GameModes
