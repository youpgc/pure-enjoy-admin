import React, { useEffect, useMemo, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Card,
  Popconfirm,
  message,
  Space,
  Tag,
  Alert,
  Typography,
} from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { usePermission } from '../../hooks/usePermission'
import { gameAchievementService, gameDimensionService, gameModeService, gameService } from '../../services/gameService'
import { loadTabFilters, usePersistTabFilters } from '../../utils/tabFilterCache'
import type { Database, DbGameDimension, DbGameMode } from '../../types/database'
import common from '../../styles/common.module.css'
import styles from './index.module.css'
import AchievementIcon from './AchievementIcon'
import AchievementFormModal from './AchievementFormModal'
import { condSummary, isV2ConditionOf } from './achievementMeta'

type DbGameAchievement = Database['public']['Tables']['game_achievements']['Row']

const { Text } = Typography

/**
 * 游戏成就配置（game_achievements）。
 *
 * 成就是**独立于「积分奖励配置」的独立体系**：独立建表、独立判定
 * （App 端通关结算时按 condition 评估）、同一成就终身只发一次
 * （user_game_achievements 唯一索引兜底）。v2 徽章化（q-0）后成就 =
 * 纯荣誉徽章，reward_points 全 0 仅解锁不发分；段位（mode_tier）由
 * App 端 GameBadgeService 评估解锁，后台仅维护定义（v2 条件类型只读保护）。
 *
 * 文件结构（游戏组模板）：index.tsx 容器 + AchievementIcon（图标渲染）
 * + AchievementFormModal（编辑弹窗）+ achievementMeta（条件常量/摘要）。
 */
const GameAchievements: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const [items, setItems] = useState<DbGameAchievement[]>([])
  const [games, setGames] = useState<{ id: string; code: string; name: string }[]>([])
  const [gameNameMap, setGameNameMap] = useState<Record<string, string>>({})
  const [dims, setDims] = useState<DbGameDimension[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DbGameAchievement | null>(null)
  const [saving, setSaving] = useState(false)

  // 列表筛选与分页（页签刷新时恢复上次筛选）
  const restoredFilters = loadTabFilters('game_achievements')
  const [nameFilter, setNameFilter] = useState((restoredFilters.nameFilter as string) ?? '')
  const [gameFilter, setGameFilter] = useState<string | undefined>(
    restoredFilters.gameFilter as string | undefined
  )
  // 分组键筛选：'none' = 独立成就（无 group_key），其余为具体键值
  const [groupKeyFilter, setGroupKeyFilter] = useState<string | undefined>(
    restoredFilters.groupKeyFilter as string | undefined
  )
  // 模式筛选（联动游戏筛选：选中游戏后仅列出该游戏模式；condition.mode 匹配）
  const [modeFilter, setModeFilter] = useState<string | undefined>(
    restoredFilters.modeFilter as string | undefined
  )
  const [modes, setModes] = useState<DbGameMode[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 页签刷新筛选持久化（卸载时写回快照）
  usePersistTabFilters('game_achievements', {
    nameFilter,
    gameFilter,
    groupKeyFilter,
    modeFilter,
  })

  const loadItems = async () => {
    setLoading(true)
    try {
      // 经 BaseService（列清单在 service 构造器统一维护）
      const res = await gameAchievementService.findAll()
      if (!res.success) {
        message.error('加载成就失败：' + (res.errorMessage ?? '未知错误'))
        return
      }
      setItems(res.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  const loadGames = async () => {
    const res = await gameService.findAll((q) => q.eq('enabled', true))
    if (res.success && res.data) {
      const list = res.data.map((g) => ({ id: g.id, code: g.code, name: g.name }))
      setGames(list)
      const map: Record<string, string> = {}
      list.forEach((g) => (map[g.id] = `${g.name}（${g.code}）`))
      setGameNameMap(map)
    }
  }

  const loadDims = async () => {
    const res = await gameDimensionService.findAll()
    if (res.success && res.data) setDims(res.data)
  }

  const loadModes = async () => {
    const res = await gameModeService.findAll()
    if (res.success && res.data) setModes(res.data)
  }

  useEffect(() => {
    loadItems()
    loadGames()
    loadDims()
    loadModes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (record: DbGameAchievement) => {
    setEditing(record)
    setModalOpen(true)
  }

  // 按条件类型组装 condition（与 App 端解析口径一致）；
  // v2 徽章条件（mode_tier 等）暂不支持编辑，原样保留防破坏。
  const handleSave = async (values: Record<string, any>) => {
    setSaving(true)
    try {
      let condition: Record<string, any> = {}
      if (isV2ConditionOf(editing?.condition) && editing) {
        condition = (editing.condition as Record<string, any>) ?? {}
      } else if (values.condType === 'score') {
        condition = { type: 'score', dimension: values.condDimension, gte: Number(values.condValue) }
      } else if (values.condType === 'level') {
        condition = { type: 'level', min_level_no: Number(values.condValue) }
      } else {
        condition = { type: 'first_clear' }
      }
      const payload = {
        // 「全局」为表单哨兵值 → 落库 NULL（全局成就无所属游戏）
        game_id: values.game_id === 'global' ? null : values.game_id,
        code: values.code,
        name: values.name,
        description: values.description || null,
        icon: values.icon || null,
        condition,
        reward_points: Number(values.reward_points) || 0,
        // 分组键：空 = 独立成就框；同键成就 App 合并展示（网格仅显最高档）
        group_key: values.group_key || null,
        enabled: !!values.enabled,
        sort_order: Number(values.sort_order) || 0,
      }
      // 写操作经 BaseService（统一审计/错误处理）；
      // Database 类型未生成 Relationships 键，payload cast any（与 utils/supabase.ts 同口径）。
      const res = editing
        ? await gameAchievementService.update(editing.id, {
            ...payload,
            updated_at: new Date().toISOString(),
          } as any)
        : await gameAchievementService.create({
            ...payload,
            updated_at: new Date().toISOString(),
          } as any)
      if (!res.success) return // service 已统一弹窗 + 记日志
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadItems()
    } catch (e: any) {
      message.error('保存失败：' + (e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await gameAchievementService.delete(id)
    if (!res.success) return // service 已统一弹窗 + 记日志
    message.success('已删除')
    await loadItems()
  }

  const gameOptions = useMemo(
    () => games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` })),
    [games]
  )

  // 编辑表单游戏选项：全局成就（game_id 为 NULL）需可选「全局」，否则编辑
  // 全局成就时下拉无法回显、也看不出该成就跨游戏（2026-09-11 用户反馈）
  const formGameOptions = useMemo(
    () => [{ value: 'global', label: '全局（无所属游戏）' }, ...gameOptions],
    [gameOptions]
  )

  // 模式筛选选项（强联动游戏筛选）：必须先选游戏才能选模式；
  // value 用 mode.id（uuid 全局唯一）——code 跨游戏重复（sheep/g2048 均有
  // timed）会触发 React 同 key 警告；匹配时再由 id 反查 code
  const modeOptions = useMemo(
    () =>
      !gameFilter || gameFilter === 'global'
        ? []
        : modes
            .filter((m) => m.game_id === gameFilter)
            .map((m) => ({ value: m.id, label: m.name })),
    [modes, gameFilter]
  )
  const modeSelectDisabled = !gameFilter || gameFilter === 'global' || modeOptions.length === 0

  // 游戏筛选变化：自动带出该游戏第一个模式（清空/全局则清空模式筛选）；
  // 分组键失效重置（键首段=游戏编码，切游戏后旧键不再属于新游戏）
  const handleGameFilterChange = (v: string | undefined) => {
    setGameFilter(v)
    const first = v && v !== 'global' ? modes.find((m) => m.game_id === v) : undefined
    setModeFilter(first?.id)
    if (groupKeyFilter) {
      const gameCode = v && v !== 'global' ? games.find((g) => g.id === v)?.code : undefined
      if (!gameCode || !groupKeyFilter.startsWith(`${gameCode}:`)) setGroupKeyFilter(undefined)
    }
    setPage(1)
  }

  // 分组键选项：从数据动态提取去重排序（键体系随配置迭代增长，不硬编码）。
  // 无「独立」专项筛选——分组键没有独立的说法，全部成就都应归属分组键
  //（2026-09-11 用户拍板；group_key 为空的存量行由补键 SQL 修正）。
  // 三级关联：键首段=游戏编码（如 match3:jelly_clear）→ 选游戏后仅列该游戏
  // 的键；不选游戏全量可独立筛选。键为「游戏:语义族」结构、与模式无可靠
  // 映射（如 g2048:score_break 跨模式），故模式不再向下联动分组键——
  // 游戏+模式+分组键三者 AND 叠加即可表达任意组合。
  const gameCodeOfFilter =
    gameFilter && gameFilter !== 'global'
      ? games.find((g) => g.id === gameFilter)?.code
      : undefined
  const groupKeyOptions = useMemo(() => {
    const keys = Array.from(
      new Set(items.map((it) => it.group_key ?? '').filter((k) => k !== ''))
    ).sort()
    const narrowed = gameCodeOfFilter
      ? keys.filter((k) => k.startsWith(`${gameCodeOfFilter}:`))
      : keys
    return narrowed.map((k) => ({ value: k, label: k }))
  }, [items, gameCodeOfFilter])

  // 客户端筛选：名称模糊匹配 + 游戏（含「全局」）+ 分组键
  const filteredItems = useMemo(() => {
    const kw = nameFilter.trim().toLowerCase()
    return items.filter((it) => {
      if (kw && !(it.name ?? '').toLowerCase().includes(kw)) return false
      if (gameFilter === 'global') {
        if (it.game_id) return false
      } else if (gameFilter) {
        if (it.game_id !== gameFilter) return false
      }
      if (groupKeyFilter) {
        if ((it.group_key ?? '') !== groupKeyFilter) return false
      }
      // 模式筛选：modeFilter 存 mode.id → 反查 code 匹配 condition.mode
      //（mode_tier / mode_score / all_modes_tier 类成就）；id 失效（模式被删）时忽略
      const filteredModeCode = modeFilter
        ? modes.find((m) => m.id === modeFilter)?.code
        : undefined
      if (modeFilter && filteredModeCode) {
        if (((it.condition as Record<string, any> | null)?.mode ?? '') !== filteredModeCode) {
          return false
        }
      }
      return true
    })
  }, [items, nameFilter, gameFilter, groupKeyFilter, modeFilter, modes])

  const columns: ColumnsType<DbGameAchievement> = [
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
      title: '分组键',
      dataIndex: 'group_key',
      width: 160,
      ellipsis: true,
      render: (v: string | null) =>
        v ? <Tag color="blue">{v}</Tag> : <Tag color="orange">未分组</Tag>,
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
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: DbGameAchievement) => (
        <Space>
          <Button size="small" disabled={!canWrite} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该成就？"
            onConfirm={() => handleDelete(record.id)}
            disabled={!canDelete}
          >
            <Button size="small" danger disabled={!canDelete}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="游戏成就配置说明"
        description={
          <div className={styles.alertDesc}>
            <p className={styles.para}>
              <b>与「积分奖励配置」的关系：</b>成就是独立于积分奖励规则的独立体系——独立建表、独立判定、独立维护。
              App 端通关结算时按下方条件自动评估是否达成；同一成就<b>终身只发一次</b>（用户解锁记录唯一索引兜底）。
            </p>
            <div className={styles.para}>
              <b>如何配置：</b>选择所属游戏 → 填写成就编码（唯一）与名称 → 选择达成条件类型 →
              填写奖励积分 → 启用即生效，无需重启 App。当前 171 条 = 段位 84（12 模式×7 档，T1=3..T7=40 分）+ 关卡进阶 53 + 单局得分 30 + 首胜 4，条件均按最新难度曲线校准。
              <ul className={styles.bulletList}>
                <li><b>任意通关 first_clear</b>：通关任意一关即达成；适合「首胜」类成就。</li>
                <li><b>维度分数达到 score</b>：维度值 ≥ gte（或 ≤ lte）即达成，如「单局得分 ≥12000」「100 步内通关」；阈值须按当前难度曲线设置（计分单步约 400-1200 分）。</li>
                <li><b>通关关卡号达到 level</b>：全局关序 ≥ min_level_no 即达成（消消乐关序 = 模式序 ×100 + 关内序，如 310 = 破冰第 10 关）。</li>
                <li><b>段位 mode_tier</b>：单局得分/关序达到 threshold 档位即解锁并发段位积分；该类型后台暂不支持编辑（保存时原样保留，防误改写）。</li>
              </ul>
            </div>
            <p className={styles.para}>
              <b>奖励积分：</b>达成时发放的积分；填 0 表示仅解锁成就、不发积分。
            </p>
          </div>
        }
      />
      <Card className={common.mb16}>
        <div
          className={common.toolbar}
        >
          <Space wrap>
            <Input.Search
              placeholder="模糊搜索成就名称"
              allowClear
              value={nameFilter}
              onChange={(e) => {
                setNameFilter(e.target.value)
                setPage(1)
              }}
              className={styles.searchInput}
            />
            <Select
              placeholder="按游戏筛选"
              allowClear
              value={gameFilter}
              onChange={handleGameFilterChange}
              options={[{ value: 'global', label: '全局（无所属游戏）' }, ...gameOptions]}
              className={styles.gameSelect}
              showSearch
              optionFilterProp="label"
            />
            <Select
              placeholder={modeSelectDisabled ? '请先选择游戏' : '按模式筛选'}
              allowClear
              disabled={modeSelectDisabled}
              value={modeFilter}
              onChange={(v) => {
                setModeFilter(v)
                setPage(1)
              }}
              options={modeOptions}
              className={styles.groupKeySelect}
              showSearch
              optionFilterProp="label"
            />
            <Select
              placeholder="按分组键筛选"
              allowClear
              value={groupKeyFilter}
              onChange={(v) => {
                setGroupKeyFilter(v)
                setPage(1)
              }}
              options={groupKeyOptions}
              className={styles.groupKeySelect}
              showSearch
              optionFilterProp="label"
            />
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => loadItems()}
            >
              刷新
            </Button>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canWrite}
            onClick={openCreate}
          >
            新增成就
          </Button>
        </div>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filteredItems}
        pagination={{
          current: page,
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p: number, ps: number) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
        size="middle"
        scroll={{ x: 'max-content' }}
      />

      <AchievementFormModal
        open={modalOpen}
        editing={editing}
        gameOptions={formGameOptions}
        dims={dims}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default GameAchievements
