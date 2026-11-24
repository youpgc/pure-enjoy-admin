import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Table, Empty, message, Form } from 'antd'
import { handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { usePermission } from '../../hooks/usePermission'
import { gameService, gameLevelService, gameModeService, journeyRegionService, journeyDailyMapService, journeyLevelService } from '../../services/gameService'
import { journeyMonsterService } from '../../services/journeyConfigService'
import { loadTabFilters, usePersistTabFilters } from '../../utils/tabFilterCache'
import { refreshGameMeta, refreshGameBaseLevels } from '../../utils/gameMetaCache'
import { useNavigation } from '../../contexts/NavigationContext'
import type { DbGame, DbGameLevel, DbJourneyDailyMap } from '../../types/database'
import JourneyEndlessEditor from './JourneyEndlessEditor'
import { buildLevelColumns, buildDailyColumns, type JourneyLevelRow } from './columns'
import { levelFormInitialValues, buildLevelSavePayload } from './levelFormValues'
import GameLevelsToolbar from './GameLevelsToolbar'
import GameLevelsDialogs from './GameLevelsDialogs'

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
  // 西行分类筛选（仅所属游戏=西行时显示；journey_levels 子表属性过滤）
  const [regions, setRegions] = useState<{ value: string; label: string }[]>([])
  // 西行妖王选项（本关妖王下拉；code 为值，避免 uuid 随环境漂移）
  const [bosses, setBosses] = useState<{ value: string; label: string }[]>([])
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
  const [levels, setLevels] = useState<JourneyLevelRow[]>([])
  const [loading, setLoading] = useState(false)
  const pager = usePagination()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<JourneyLevelRow | null>(null)
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

  // 西行妖王选项（本关妖王下拉用；只列 boss 档，失败静默留空）
  useEffect(() => {
    journeyMonsterService.findAll().then((res) => {
      if (!mountedRef.current || !res.success) return
      setBosses(
        (res.data ?? [])
          .filter((m) => m.ai_tier === 'boss')
          .map((m) => ({ value: m.code, label: `${m.name}（${m.code}）` }))
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
      // 西行分类筛选：属性在 journey_levels 子表，先取匹配 level_id 白名单
      let idSet: string[] | undefined
      if (isJourneyGame && (regionFilter || kindFilter)) {
        const filter = regionFilter
          ? { key: 'region_code' as const, value: regionFilter }
          : { key: 'level_kind' as const, value: kindFilter }
        const idRes = await journeyLevelService.filterLevelIds(filter)
        if (!idRes.success) {
          handleApiError(idRes.errorMessage, 'GameLevels-西行分类筛选')
          return
        }
        idSet = idRes.data ?? []
      }
      const result = await gameLevelService.paginateByGame(
        selectedGameId,
        pager.pagination.current,
        pager.pagination.pageSize,
        selectedModeId || null,
        idSet
      )
      if (!result.success) {
        handleApiError(result.errorMessage, 'GameLevels-加载')
        return
      }
      if (!mountedRef.current) return
      const pageRows = result.data?.data || []
      // 西行：批量取子表属性合并到行顶层（区域/难别/妖王战/首通功德/时长）
      let rows: JourneyLevelRow[] = pageRows
      if (isJourneyGame && pageRows.length > 0) {
        const attrMap = await journeyLevelService.findMapByLevels(pageRows.map((r) => r.id))
        rows = pageRows.map((row) => ({ ...row, ...(attrMap.get(row.id) ?? {}) }))
      }
      if (!mountedRef.current) return
      setLevels(rows)
      pager.setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'GameLevels-加载')
    } finally {
      setLoading(false)
    }
  }, [selectedGameId, selectedModeId, regionFilter, kindFilter, isJourneyGame, pager.pagination.current, pager.pagination.pageSize, pager.setTotal])

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
  // 避免「新游戏 + 旧游戏模式过滤」的交互冲突空查询。
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

  const openEdit = (record: JourneyLevelRow) => {
    setEditing(record)
    setModalVisible(true)
  }

  const formInitialValues = () => levelFormInitialValues(editing, selectedGameId)

  const handleDelete = async (id: string) => {
    const result = await gameLevelService.delete(id)
    if (!result.success) {
      handleApiError(result.errorMessage, 'GameLevels-删除')
      return
    }
    message.success('删除成功')
    refreshGameMeta().catch(() => {})
    // 模式首关缓存独立于共享 meta，需单独失效以刷新成绩看板兜底条件
    refreshGameBaseLevels().catch(() => {})
    loadLevels()
  }

  const handleToggleDailyClear = async (record: DbGameLevel, next: boolean) => {
    const r = await gameLevelService.update(record.id, { count_for_daily_clear: next })
    if (!r.success) {
      handleApiError(r.errorMessage, 'GameLevels-切换首通')
      return
    }
    loadLevels()
  }

  const handleSave = async () => {
    if (saving) return
    try {
      setSaving(true)
      const values = await form.validateFields()
      const saveGameCode = games.find((g) => g.id === values.game_id)?.code
      let levelPayload: Record<string, any>
      let journeyAttrs: Record<string, any> | null
      try {
        const built = buildLevelSavePayload(values, saveGameCode)
        levelPayload = built.levelPayload
        journeyAttrs = built.journeyAttrs
      } catch {
        message.error('config / target / propUnlock 不是合法 JSON')
        setSaving(false)
        return
      }
      let savedLevelId: string
      // 本次新建的主表 id：子表写失败时回滚主表，避免重试产生重复关卡
      let createdLevelId: string | null = null
      if (editing) {
        const result = await gameLevelService.update(editing.id, levelPayload)
        if (!result.success) {
          handleApiError(result.errorMessage, 'GameLevels-更新')
          return
        }
        savedLevelId = editing.id
      } else {
        const result = await gameLevelService.create(levelPayload as any)
        if (!result.success) {
          handleApiError(result.errorMessage, 'GameLevels-创建')
          return
        }
        savedLevelId = result.data?.id ?? ''
        createdLevelId = savedLevelId || null
      }
      // 西行属性写 journey_levels 子表（关卡主体 id 已就绪）
      if (journeyAttrs && savedLevelId) {
        const attrRes = await journeyLevelService.saveByLevel(savedLevelId, journeyAttrs)
        if (!attrRes.success) {
          handleApiError(attrRes.errorMessage, 'GameLevels-西行属性保存')
          // 新建关卡子表写失败：删除刚创建的主表行，保证重试干净重建
          if (createdLevelId) {
            const rollback = await gameLevelService.delete(createdLevelId)
            if (rollback.success) {
              message.warning('西行属性保存失败，已回滚新建的关卡，请修正后重试')
            } else {
              message.error('西行属性保存失败且回滚失败，请手动删除刚创建的关卡后重试')
            }
            loadLevels()
          }
          return
        }
      }
      // 关卡变更 → 全局 meta 缓存失效重拉（GameScores 等页同步）
      refreshGameMeta().catch(() => {})
      // 模式首关缓存需单独失效重拉（成绩看板兜底条件依赖）
      refreshGameBaseLevels().catch(() => {})
      message.success(editing ? '更新成功' : '创建成功')
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

  const columns = buildLevelColumns({
    isJourneyGame,
    regions,
    bosses,
    canWrite,
    canDelete,
    onOpenConfig: (record) => setConfigLevel(record),
    onEdit: openEdit,
    onDelete: handleDelete,
    onToggleDailyClear: handleToggleDailyClear,
  })

  const dailyColumns = buildDailyColumns({
    canWrite,
    onConfigure: (row) => setDailyEditRow(row),
  })

  return (
    <div>
      <GameLevelsToolbar
        filters={{
          games,
          modes,
          regions,
          selectedGameId,
          selectedModeId,
          regionFilter,
          kindFilter,
          isJourneyGame,
          modeEditorView,
          loading,
          canWrite,
        }}
        actions={{
          onGameChange: (v) => {
            setSelectedGameId(v)
            // 跨游戏切换清残留的西行分类筛选（防「筛选隐藏+列表恒空」）
            setRegionFilter('')
            setKindFilter('')
            pager.resetPage()
          },
          onModeChange: (v) => {
            const next = v || ''
            setSelectedModeId(next)
            selectedModeIdRef.current = next
            // 模式切换清残留的西行分类筛选（仅主线消费）
            setRegionFilter('')
            setKindFilter('')
            pager.resetPage()
          },
          onRegionChange: (v) => {
            setRegionFilter(v || '')
            setKindFilter('')
            pager.resetPage()
          },
          onKindChange: (v) => {
            setKindFilter(v || '')
            setRegionFilter('')
            pager.resetPage()
          },
          onReload: loadLevels,
          onAdd: openAdd,
        }}
      />

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

      <GameLevelsDialogs
        lookups={{ games, modes, regions, bosses }}
        formState={{
          instance: form,
          formKey: `${editing?.id ?? 'create'}-${selectedGameId}`,
          resolveValues: formInitialValues,
          saving,
        }}
        state={{ modalVisible, editing, configLevel, dailyEditRow }}
        actions={{
          onSubmit: handleSave,
          onCloseModal: () => {
            setModalVisible(false)
            setEditing(null)
            form.resetFields()
          },
          onCloseConfig: () => setConfigLevel(null),
          onCloseDaily: () => setDailyEditRow(null),
          onDailySaved: () => {
            journeyDailyMapService.findAll().then((res) => {
              if (!mountedRef.current || !res.success) return
              const rows = [...(res.data ?? [])]
              rows.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
              setDailyMaps(rows)
            }).catch(() => {})
          },
        }}
      />
    </div>
  )
}

export default GameLevels
