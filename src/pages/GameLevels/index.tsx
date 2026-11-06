import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table,
  Alert,
  Button,
  Space,
  Tag,
  Card,
  message,
  Form,
  Select,
  Switch,
  Typography,
  Empty,
} from 'antd'
import {
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { gameService, gameLevelService, gameModeService, journeyRegionService, journeyDailyMapService } from '../../services/gameService'
import { loadTabFilters, usePersistTabFilters } from '../../utils/tabFilterCache'
import { refreshGameMeta } from '../../utils/gameMetaCache'
import { useNavigation } from '../../contexts/NavigationContext'
import type { DbGame, DbGameLevel, DbJourneyDailyMap } from '../../types/database'
import LevelFormModal, { JOURNEY_LEVEL_CONFIG_KEYS } from './LevelFormModal'
import JourneyLevelConfigDrawer from './JourneyLevelConfigDrawer'
import JourneyEndlessEditor from './JourneyEndlessEditor'
import JourneyDailyMapModal from './JourneyDailyMapModal'
import { JOURNEY_LEVEL_KIND_MAP } from '../../constants/game'
import styles from './index.module.css'
import common from '../../styles/common.module.css'
import { formatDateTime } from '../../utils/format'

const { Text } = Typography

// ==================== 组件 ====================

const GameLevels: React.FC = () => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  // 页签刷新筛选恢复（tabs 右键刷新=重挂载，模块级快照保持用户当前筛选）
  const restoredFiltersRef = useRef(loadTabFilters('game_levels'))

  const [games, setGames] = useState<DbGame[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>(
    (restoredFiltersRef.current.selectedGameId as string) ?? ''
  )
  const [modes, setModes] = useState<{ id: string; code: string; name: string }[]>([])
  const [selectedModeId, setSelectedModeId] = useState<string>(
    (restoredFiltersRef.current.selectedModeId as string) ?? ''
  )
  // 西行分类筛选（仅所属游戏=西行时显示；config jsonb 条件，远端过滤）
  const [regions, setRegions] = useState<{ value: string; label: string }[]>([])
  const [regionFilter, setRegionFilter] = useState<string>('')
  const [kindFilter, setKindFilter] = useState<string>('')
  const selectedGameCode = games.find((g) => g.id === selectedGameId)?.code ?? ''
  const isJourneyGame = selectedGameCode === 'journey'
  // 西行模式分流：无尽妖潮/每日游历模式 → 整页展示对应模式编辑器，
  // 隐藏主线关卡列表（关卡行入口口径：每模式独立配置视图）
  const selectedModeCode =
    modes.find((m) => m.id === selectedModeId)?.code ?? ''
  // 西行模式编辑器视图（无尽妖潮/每日游历）：隐藏主线列表与主线专用控件
  const modeEditorView =
    isJourneyGame &&
    (selectedModeCode === 'endless' || selectedModeCode === 'daily')
  // 用 ref 持有最新模式筛选值，避免 loadLevels 因 selectedModeId 变化而重建身份、
  // 进而触发「游戏切换」副作用把模式筛选重置为空。
  const selectedModeIdRef = useRef<string>('')
  const [levels, setLevels] = useState<DbGameLevel[]>([])
  const [loading, setLoading] = useState(false)
  const pager = usePagination()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<DbGameLevel | null>(null)
  // 西行关卡配置抽屉（波次/热区/参照物）
  const [configLevel, setConfigLevel] = useState<DbGameLevel | null>(null)
  // 每日游历逐图独立表单（模式=每日游历的地图行「配置」入口）
  const [dailyMaps, setDailyMaps] = useState<DbJourneyDailyMap[]>([])
  const [dailyEditRow, setDailyEditRow] = useState<DbJourneyDailyMap | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  // 模式管理「关卡」按钮深链定位（keepalive 页签带参跳转，按 seq 信号感知）
  const { pageParams } = useNavigation()
  const pendingNavRef = useRef<{ gameId?: string; modeId?: string } | null>(null)
  /// 模式默认选中未落定标记：游戏切换后等 loadModes 返回并选中第一个模式前，
  /// 跳过列表查询（防止「新游戏 + 旧游戏模式过滤」的交互冲突空查询）
  const modePendingRef = useRef(false)

  const loadGames = useCallback(async () => {
    const res = await gameService.findAll((q) => q.eq('enabled', true))
    if (res.success && res.data) {
      if (!mountedRef.current) return
      setGames(res.data)
      // 深链进入时不自动选首游戏（pendingNav 携带的目标游戏优先）
      if (!selectedGameId && res.data.length > 0 && !pendingNavRef.current?.gameId) {
        const firstId = res.data[0]?.id
        if (firstId) setSelectedGameId(firstId)
      }
    }
  }, [mountedRef])

  // 西行区域选项（条件表单/分类筛选共用；失败静默留空）
  useEffect(() => {
    journeyRegionService.findAll().then((res) => {
      if (!mountedRef.current || !res.success) return
      setRegions(
        (res.data ?? []).map((r) => ({ value: r.code, label: r.name }))
      )
    }).catch(() => {})
  }, [mountedRef])

  // 西行游历地图行（模式关卡区：逐图独立表单入口；失败静默留空）
  useEffect(() => {
    if (!isJourneyGame) {
      setDailyMaps([])
      return
    }
    journeyDailyMapService.findAll().then((res) => {
      if (!mountedRef.current || !res.success) return
      const rows = [...(res.data ?? [])]
      rows.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      setDailyMaps(rows)
    }).catch(() => {})
  }, [isJourneyGame, mountedRef])

  const loadModes = useCallback(
    async (): Promise<{ id: string; code: string; name: string }[]> => {
      if (!selectedGameId) {
        setModes([])
        return []
      }
      try {
        // 统一走 gameModeService（禁裸 supabase.from），service 已按 sort_order 升序
        const res = await gameModeService.findAllModes(selectedGameId)
        if (!res.success) return []
        if (!mountedRef.current) return []
        const list = (res.data ?? []).map((m) => ({
          id: m.id,
          code: m.code,
          name: m.name,
        }))
        setModes(list)
        return list
      } catch (error) {
        handleApiError(error, 'GameLevels-加载模式')
        return []
      }
    },
    [selectedGameId, mountedRef],
  )

  // 依赖 selectedModeId state（而非 ref）：模式筛选/翻页变化都能触发重载
  const loadLevels = useCallback(async () => {
    if (!selectedGameId) {
      setLevels([])
      return
    }
    setLoading(true)
    try {
      const result = await gameLevelService.paginateByGame(
        selectedGameId,
        pager.pagination.current,
        pager.pagination.pageSize,
        selectedModeId || null,
        // 西行分类筛选走 config jsonb 条件（远端过滤，分页语义不变）
        regionFilter
          ? { key: 'region_code', value: regionFilter }
          : kindFilter
            ? { key: 'level_kind', value: kindFilter }
            : undefined
      )
      if (!result.success) {
        handleApiError(result.errorMessage, 'GameLevels-加载')
        return
      }
      if (!mountedRef.current) return
      setLevels(result.data?.data || [])
      pager.setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'GameLevels-加载')
    } finally {
      setLoading(false)
    }
  }, [selectedGameId, selectedModeId, regionFilter, kindFilter, pager.pagination.current, pager.pagination.pageSize, pager.setTotal])

  useEffect(() => {
    loadGames()
  }, [loadGames])

  // 深链信号消费：gameId 与当前不同 → 仅记录 pendingNav，待下方
  // [selectedGameId] effect 消费（避免同批次状态互踩）；相同 → 直接应用模式过滤并刷新。
  useEffect(() => {
    const sig = pageParams?.['game_levels']
    if (!sig) return
    const data = (sig.data ?? {}) as { gameId?: string; modeId?: string }
    if (!data.gameId) return
    if (data.gameId === selectedGameId) {
      pendingNavRef.current = null
      const want = data.modeId ?? ''
      setSelectedModeId(want)
      selectedModeIdRef.current = want
      pager.resetPage()
      loadLevels()
    } else {
      pendingNavRef.current = data
      setSelectedGameId(data.gameId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageParams])

  // 游戏切换 / 深链进入：加载模式清单后**默认选中第一个模式**（深链指定且存在时
  // 优先深链模式；页签刷新恢复的模式次之），选区落定后再由列表 effect 统一查询——
  // 避免「新游戏 + 旧游戏模式过滤」的交互冲突空查询（2026-09-07 用户拍板交互）。
  useEffect(() => {
    if (!selectedGameId) return
    const nav = pendingNavRef.current
    pendingNavRef.current = null
    // 页签刷新恢复的模式仅首次生效（恢复的游戏+模式是配套快照），用后即清
    const restoredMode = restoredFiltersRef.current.selectedModeId as string | undefined
    if (restoredMode) delete restoredFiltersRef.current.selectedModeId
    const wantMode =
      nav && nav.gameId === selectedGameId
        ? nav.modeId ?? ''
        : (restoredMode ?? '')
    modePendingRef.current = true
    pager.resetPage()
    loadModes().then((list) => {
      if (!mountedRef.current) return
      const nextMode =
        wantMode && list.some((m) => m.id === wantMode)
          ? wantMode
          : (list[0]?.id ?? '')
      selectedModeIdRef.current = nextMode
      setSelectedModeId(nextMode)
      modePendingRef.current = false
    })
  }, [selectedGameId, loadModes])

  // 列表加载：随 游戏 / 模式筛选 / 分页 变化触发；模式默认选中未落定时跳过
  // （防止同批次内用「旧游戏模式过滤」发出空查询）；模式编辑器视图
  // （无尽妖潮/每日游历）不消费关卡表，跳过请求避免无效远端查询
  useEffect(() => {
    if (!selectedGameId) return
    if (modePendingRef.current) return
    if (modeEditorView) return
    loadLevels()
  }, [selectedGameId, selectedModeId, regionFilter, kindFilter, pager.pagination.current, pager.pagination.pageSize, loadLevels, modeEditorView])

  // 页签刷新筛选持久化（卸载时写回快照）
  usePersistTabFilters('game_levels', { selectedGameId, selectedModeId })

  // 弹窗回显走 key 强制重挂载 + initialValues（Modal 惰性挂载前 setFieldsValue 无效；
  // 且表单值无 id，旧写法解构 id 为 undefined 拼出 uuid:"undefined" 触发 22P02）
  const openAdd = () => {
    setEditing(null)
    setModalVisible(true)
  }

  const openEdit = (record: DbGameLevel) => {
    setEditing(record)
    setModalVisible(true)
  }

  const formInitialValues = (): Record<string, any> => {
    if (editing) {
      const cfg = (editing.config && typeof editing.config === 'object'
        ? (editing.config as Record<string, any>)
        : {}) as Record<string, any>
      return {
        ...editing,
        config: JSON.stringify(editing.config ?? {}),
        // 西行条件字段从 config jsonb 解出回显（保存时并回）
        region_code: cfg.region_code,
        level_kind: cfg.level_kind,
        boss_fights: cfg.boss_fights ?? 0,
        first_clear_merit: cfg.first_clear_merit ?? 0,
        duration_target_sec: cfg.duration_target_sec,
        propUnlock:
          editing.config && typeof editing.config === 'object' && (editing.config as Record<string, any>).propUnlock
            ? JSON.stringify((editing.config as Record<string, any>).propUnlock)
            : '',
        target: JSON.stringify(editing.target ?? {}),
      }
    }
    return {
      game_id: selectedGameId || undefined,
      enabled: true,
      count_for_daily_clear: false,
      reward_points: 0,
      reward_repeatable: false,
      sort_order: 0,
      config: '{}',
      target: '{}',
      boss_fights: 0,
      first_clear_merit: 0,
    }
  }

  const handleDelete = async (id: string) => {
    const result = await gameLevelService.delete(id)
    if (!result.success) {
      handleApiError(result.errorMessage, 'GameLevels-删除')
      return
    }
    message.success('删除成功')
    refreshGameMeta().catch(() => {})
    loadLevels()
  }

  const handleSave = async () => {
    if (saving) return
    try {
      setSaving(true)
      const values = await form.validateFields()
      const payload: Record<string, any> = { ...values }
      // 模式为空（未选 / 清空）时存 NULL，避免写入空串触发 FK 类型问题
      payload.mode_id = values.mode_id || null
      // 西行表单隐藏 config/target/propUnlock JSON 输入（属性走结构化字段），
      // 隐藏项不出现在 values 中——统一判存在再解析。
      try {
        payload.config = values.config ? JSON.parse(values.config) : {}
        payload.target = values.target ? JSON.parse(values.target) : {}
        // 道具解锁配置：独立表单项，保存合并回 config.propUnlock（空则删除键）
        if (values.propUnlock && String(values.propUnlock).trim()) {
          const pu = JSON.parse(values.propUnlock)
          if (pu == null || typeof pu !== 'object' || Array.isArray(pu)) throw new Error('propUnlock')
          payload.config.propUnlock = pu
        } else {
          delete payload.config.propUnlock
        }
        // propUnlock 属 config 内嵌键，顶层残留会触发 42703（列不存在）
        delete payload.propUnlock
        // 西行条件字段并入 config jsonb（顶层不落列，防 42703）
        const saveGameCode = games.find((g) => g.id === payload.game_id)?.code
        if (saveGameCode === 'journey') {
          for (const key of JOURNEY_LEVEL_CONFIG_KEYS) {
            if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
              payload.config[key] = values[key]
            }
            delete payload[key]
          }
        } else {
          for (const key of JOURNEY_LEVEL_CONFIG_KEYS) delete payload[key]
        }
      } catch {
        message.error('config / target / propUnlock 不是合法 JSON')
        setSaving(false)
        return
      }
      if (editing) {
        const result = await gameLevelService.update(editing.id, payload)
        if (!result.success) {
          handleApiError(result.errorMessage, 'GameLevels-更新')
          return
        }
        message.success('更新成功')
        } else {
          const result = await gameLevelService.create(payload as any)
          if (!result.success) {
            handleApiError(result.errorMessage, 'GameLevels-创建')
            return
          }
          message.success('创建成功')
        }
      // 关卡变更 → 全局 meta 缓存失效重拉（GameScores 等页同步）
      refreshGameMeta().catch(() => {})
      setModalVisible(false)
      setEditing(null)
      form.resetFields()
      loadLevels()
    } catch (error) {
      handleApiError(error, 'GameLevels-保存')
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnsType<DbGameLevel> = [
    { title: '关卡号', dataIndex: 'level_no', key: 'level_no', width: 90, render: (v: number) => <Text strong>{v}</Text> },
    { title: '名称', dataIndex: 'name', key: 'name' },
    ...(isJourneyGame
      ? [{
          title: '区域',
          key: 'region_code',
          width: 110,
          render: (_: unknown, record: DbGameLevel) => {
            const code = (record.config as Record<string, any> | null)?.region_code as string | undefined
            if (!code) return <Text type="secondary">-</Text>
            return <Tag color="blue">{regions.find((r) => r.value === code)?.label ?? code}</Tag>
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
    ...(!isJourneyGame
      ? [
          {
            title: '计入每日首通',
            dataIndex: 'count_for_daily_clear',
            key: 'count_for_daily_clear',
            width: 130,
            render: (v: boolean, record: DbGameLevel) => (
              <Switch
                checked={v}
                disabled={!canWrite}
                checkedChildren="计入"
                unCheckedChildren="不计"
                onChange={async () => {
                  const r = await gameLevelService.update(record.id, { count_for_daily_clear: !v })
                  if (!r.success) handleApiError(r.errorMessage, 'GameLevels-切换首通')
                  else loadLevels()
                }}
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
      ...(isJourneyGame
        ? [{
            key: 'level_config',
            label: '配置',
            icon: <SettingOutlined />,
            disabled: !canWrite,
            onClick: () => setConfigLevel(record),
          }]
        : []),
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        disabled: !canWrite,
        onClick: () => openEdit(record),
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        disabled: !canDelete,
        confirm: '确认删除',
        onClick: () => handleDelete(record.id),
      },
    ], { width: 150 }),
  ]

  const dailyColumns: ColumnsType<DbJourneyDailyMap> = [
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
          disabled={!canWrite}
          onClick={() => setDailyEditRow(r)}
        >
          配置
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="关卡配置说明"
        description="关卡按「游戏 → 模式 → 关卡」三级组织；config 键名须与 App 引擎读取键一致：types=方块类型数（4..6，关键难度维度）；steps=0 表示不限步数（前置关建议 0，进阶关 30-45）；collect/iceCollect 支持多目标数组 [{type,count}]（type < types）；消消乐全局关序 = 模式序 ×100 + 关内序（成就/奖励区间判定用）。reward_points 为通关首通奖励（与每日首通可叠加），count_for_daily_clear 决定是否计入每日首通。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Text>选择游戏：</Text>
            <Select
              className={styles.sel240}
              placeholder="请选择游戏"
              value={selectedGameId || undefined}
              onChange={(v) => {
                setSelectedGameId(v)
                // 跨游戏切换清残留的西行分类筛选（防「筛选隐藏+列表恒空」）
                setRegionFilter('')
                setKindFilter('')
                pager.resetPage()
              }}
              options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
            />
            <Text>模式：</Text>
            <Select
              className={styles.sel240}
              placeholder="全部模式"
              allowClear
              value={selectedModeId || undefined}
              onChange={(v) => {
                const next = v || ''
                setSelectedModeId(next)
                selectedModeIdRef.current = next
                // 模式切换清残留的西行分类筛选（仅主线消费）
                setRegionFilter('')
                setKindFilter('')
                pager.resetPage()
              }}
              options={modes.map((m) => ({ value: m.id, label: `${m.name}（${m.code}）` }))}
            />
            {!modeEditorView && isJourneyGame && (
              <>
                <Text>区域：</Text>
                <Select
                  className={styles.sel200}
                  placeholder="全部区域"
                  allowClear
                  value={regionFilter || undefined}
                  onChange={(v) => {
                    setRegionFilter(v || '')
                    setKindFilter('')
                    pager.resetPage()
                  }}
                  options={regions}
                />
                <Text>难别：</Text>
                <Select
                  className={styles.sel200}
                  placeholder="全部难别"
                  allowClear
                  value={kindFilter || undefined}
                  onChange={(v) => {
                    setKindFilter(v || '')
                    setRegionFilter('')
                    pager.resetPage()
                  }}
                  options={Object.entries(JOURNEY_LEVEL_KIND_MAP).map(([value, v]) => ({ value, label: v.label }))}
                />
              </>
            )}
            {!modeEditorView && (
              <Button icon={<ReloadOutlined />} onClick={loadLevels} loading={loading}>
                刷新
              </Button>
            )}
          </Space>
          {!modeEditorView && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!canWrite || !selectedGameId}
              onClick={openAdd}
            >
              新增关卡
            </Button>
          )}
        </div>
      </Card>

      {!selectedGameId ? (
        <Empty description="请先创建游戏后再配置关卡" />
      ) : modeEditorView && selectedModeCode === 'endless' ? (
        <JourneyEndlessEditor />
      ) : modeEditorView && selectedModeCode === 'daily' ? (
        <Table
          columns={dailyColumns}
          dataSource={dailyMaps}
          rowKey="id"
          pagination={false}
          size="small"
        />
      ) : (
        <Table
          columns={columns}
          dataSource={levels}
          rowKey="id"
          loading={loading}
          pagination={pager.tablePagination}
          scroll={{ x: 'max-content' }}
        />
      )}

      <LevelFormModal
        open={modalVisible}
        editing={editing}
        saving={saving}
        form={form}
        resolveValues={formInitialValues}
        games={games}
        modes={modes}
        regions={regions}
        formKey={`${editing?.id ?? 'create'}-${selectedGameId}`}
        onSubmit={handleSave}
        onClose={() => {
          setModalVisible(false)
          setEditing(null)
          form.resetFields()
        }}
      />

      <JourneyLevelConfigDrawer
        open={configLevel !== null}
        level={configLevel}
        onClose={() => setConfigLevel(null)}
      />

      <JourneyDailyMapModal
        open={dailyEditRow !== null}
        mapRow={dailyEditRow}
        onClose={() => setDailyEditRow(null)}
        onSaved={() => {
          journeyDailyMapService.findAll().then((res) => {
            if (!mountedRef.current || !res.success) return
            const rows = [...(res.data ?? [])]
            rows.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
            setDailyMaps(rows)
          }).catch(() => {})
        }}
      />
    </div>
  )
}

export default GameLevels
