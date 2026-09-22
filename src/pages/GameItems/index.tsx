import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Table,
  Alert,
  Button,
  Form,
  Card,
  Select,
  message,
  Space,
  Tag,
  Tooltip,
} from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DbGameItem } from '../../types/database'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { gameItemService } from '../../services/gameService'
import { useGameMeta } from '../../utils/gameMetaCache'
import {
  GAME_SHARED_ICON_BASE,
  MATCH3_MODE_MAP,
  MATCH3_MODE_OPTIONS_WITH_ANY,
} from '../../constants/game'
import { loadTabFilters, usePersistTabFilters } from '../../utils/tabFilterCache'
import { ITEM_TYPE_LABEL } from './constants'
import ItemFormModal from './ItemFormModal'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

// 道具类型字典与新增/编辑弹窗已抽离（审查 P1 单文件超 500 行）：
// ./constants.ts / ./ItemFormModal.tsx

/**
 * 游戏道具目录管理（game_items）。
 * 配置：适用游戏 / 模式 / 道具类型 / 名称 / 积分成本 / 单局使用上限 / 启停。
 * 与 App 端枚举（remove/undo/shuffle/add_time）一致；mode 留空表示适用于该游戏全部模式。
 */
const GameItems: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const [items, setItems] = useState<DbGameItem[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DbGameItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  // 全局游戏元数据（games 一次拉取、跨页复用），用于「游戏」列转译与下拉。
  const meta = useGameMeta()

  // 筛选：游戏 + 模式，**必选**（无「全部」项，用户拍板 2026-09-09）：
  // 游戏默认第一个，模式默认「通用」；随页签刷新持久化（恢复值含已废弃的
  // 'all' 或不存在于目录时回退默认）。
  const restored = loadTabFilters('game_items')
  const restoredGame = restored.gameFilter as string
  const restoredMode = restored.modeFilter as string
  const [gameFilter, setGameFilter] = useState<string>(
    restoredGame && restoredGame !== 'all' ? restoredGame : ''
  )
  const [modeFilter, setModeFilter] = useState<string>(
    restoredMode && restoredMode !== 'all' ? restoredMode : ''
  )
  usePersistTabFilters('game_items', { gameFilter, modeFilter })

  // games 异步就绪后：当前游戏为空/失效（含首次进入）→ 默认第一个游戏
  const gameCodes = useMemo(() => (meta?.games ?? []).map((g) => g.code), [meta])
  useEffect(() => {
    if (gameCodes.length === 0) return
    if (!gameCodes.includes(gameFilter)) setGameFilter(gameCodes[0] ?? '')
  }, [gameCodes, gameFilter])

  // 表单模式选项与 game_code 联动（新增/编辑一致）：
  // match3 用定版六模式映射；其余游戏（如 2048 的 timed/challenge）按
  // game_modes 实配动态生成，mode 留空 = 通用（该游戏全部模式）
  const formGameCode = Form.useWatch('game_code', form)
  const formModeOptions = useMemo(() => {
    if (!formGameCode || formGameCode === 'match3') {
      return MATCH3_MODE_OPTIONS_WITH_ANY
    }
    const gameId = meta?.gameMapByCode[formGameCode]?.id
    const modes = (gameId ? meta?.modesByGameId[gameId] : undefined) ?? []
    return [
      { value: '', label: '通用（该游戏全部模式）' },
      ...modes.map((m) => ({ value: m.code, label: m.name })),
    ]
  }, [formGameCode, meta])

  // 模式编码 → 模式名（全游戏统一映射；match3 定版映射兜底配色/文案）
  const modeNameByCode = useMemo(() => {
    const map: Record<string, string> = {}
    ;(meta?.modes ?? []).forEach((m) => {
      map[m.code] = m.name
    })
    return map
  }, [meta])

  // 筛选区模式选项：跟随当前所选游戏的 game_modes 实配
  const filterModeOptions = useMemo(() => {
    const gameId = meta?.gameMapByCode[gameFilter]?.id
    const modes = (gameId ? meta?.modesByGameId[gameId] : undefined) ?? []
    return [
      { value: '', label: '全部模式' },
      ...modes.map((m) => ({ value: m.code, label: m.name })),
    ]
  }, [meta, gameFilter])

  // 请求乱序守卫：快速切换筛选时只采纳最后一次的结果
  const reqSeq = useRef(0)

  // 按当前筛选服务端过滤请求；筛选未就绪（gameFilter 为空，games 未加载）
  // 时不发请求——初始化顺序：先赋值筛选项，再发起请求
  const loadItems = useCallback(async () => {
    if (!gameFilter) return
    const seq = ++reqSeq.current
    setLoading(true)
    try {
      // 列清单在 gameItemService 构造器统一维护（feature_game_items_tables.sql DDL + free_per_game）
      const res = await gameItemService.findAll((q) => {
        let qq = (q as any).eq('game_code', gameFilter)
        // 模式选「全部模式」（''）= 不限模式（含模式专属道具，如限时加时卡）；
        // 选具体模式才精确匹配
        if (modeFilter) qq = qq.eq('mode', modeFilter)
        return qq
      })
      if (seq !== reqSeq.current) return // 已有更新的请求，丢弃过期结果
      if (!res.success) {
        message.error('加载道具失败：' + (res.errorMessage ?? '未知错误'))
        return
      }
      setItems(res.data ?? [])
    } catch (e: any) {
      if (seq !== reqSeq.current) return
      message.error('加载道具失败：' + (e?.message ?? e))
    } finally {
      if (seq === reqSeq.current) setLoading(false)
    }
  }, [gameFilter, modeFilter])

  // 筛选值变化（含 meta 就绪后赋默认值）自动重新请求
  useEffect(() => {
    loadItems()
  }, [loadItems])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (record: DbGameItem) => {
    setEditing(record)
    setModalOpen(true)
  }

  // 表单初始值（弹窗真正打开后由 afterOpenChange 回显，避免 Modal 惰性挂载导致 setFieldsValue 无效）
  const formInitialValues = (): Record<string, any> => {
    if (editing) {
      return {
        game_code: editing.game_code,
        mode: editing.mode,
        item_type: editing.item_type,
        name: editing.name,
        description: editing.description ?? '',
        icon: editing.icon ?? undefined,
        point_cost: editing.point_cost,
        per_game_limit: editing.per_game_limit,
        free_per_game: editing.free_per_game,
        enabled: editing.enabled,
        sort_order: editing.sort_order,
      }
    }
    return { enabled: true, point_cost: 20, per_game_limit: 1, free_per_game: 0, mode: '', sort_order: 0 }
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        game_code: values.game_code,
        mode: values.mode ?? '',
        item_type: values.item_type,
        name: values.name,
        description: values.description || null,
        icon: values.icon || null,
        point_cost: Number(values.point_cost) || 0,
        per_game_limit: Number(values.per_game_limit) || 1,
        free_per_game: Number(values.free_per_game) || 0,
        enabled: !!values.enabled,
        sort_order: Number(values.sort_order) || 0,
      }
      // 写操作经 BaseService（统一审计/错误处理）；payload cast any（与 utils/supabase.ts 同口径）。
      const res = editing
        ? await gameItemService.update(editing.id, { ...payload, updated_at: new Date().toISOString() } as any)
        : await gameItemService.create({ ...payload, updated_at: new Date().toISOString() } as any)
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
    const res = await gameItemService.delete(id)
    if (!res.success) return // service 已统一弹窗 + 记日志
    message.success('已删除')
    await loadItems()
  }

  const gameOptions = useMemo(
    () => (meta?.games ?? []).map((g) => ({ value: g.code, label: `${g.name}（${g.code}）` })),
    [meta]
  )

  const columns: ColumnsType<DbGameItem> = [
    {
      title: '游戏',
      dataIndex: 'game_code',
      width: 100,
      // 由 game_code 转译游戏名称（meta 未就绪时回退显示原始编码）
      render: (v: string) => meta?.gameMapByCode[v]?.name ?? v,
    },
    {
      title: '模式',
      dataIndex: 'mode',
      width: 90,
      render: (v: string) =>
        v ? (
          <Tag color={MATCH3_MODE_MAP[v]?.color}>
            {modeNameByCode[v] ?? MATCH3_MODE_MAP[v]?.label ?? v}
          </Tag>
        ) : (
          <Tag color="default">通用</Tag>
        ),
    },
    {
      title: '类型',
      dataIndex: 'item_type',
      width: 110,
      render: (v: string) => ITEM_TYPE_LABEL[v] ?? v,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      width: 130,
      render: (v: string | null) =>
        v ? (
          // 与游戏/成就图标列同口径：仅图标预览，文件名放 hover 提示
          <Tooltip title={v}>
            <img
              src={`${GAME_SHARED_ICON_BASE}/${v}.svg`}
              alt={v}
              width={30}
              height={30}
              style={{ display: 'block', cursor: 'default' }}
            />
          </Tooltip>
        ) : (
          <Tag>内置</Tag>
        ),
    },
    { title: '名称', dataIndex: 'name', width: 120 },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    {
      title: '积分成本',
      dataIndex: 'point_cost',
      width: 90,
      render: (v: number) => `${v} 分`,
    },
    {
      title: '单局上限',
      dataIndex: 'per_game_limit',
      width: 90,
      render: (v: number) => `${v} 次`,
    },
    {
      title: '免费次数',
      dataIndex: 'free_per_game',
      width: 90,
      render: (v: number) => `${v} 次`,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    getActionColumn<DbGameItem>((record) => [
      {
        key: 'edit',
        label: '编辑',
        disabled: !canWrite,
        onClick: () => openEdit(record),
      },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        disabled: !canDelete,
        confirm: '确认删除该道具？',
        onClick: () => handleDelete(record.id),
      },
    ], { width: 140 }),
  ]

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="道具管理说明"
        description="道具按游戏与模式配置：free_per_game 为每局免费次数（0 = 纯积分购买制，如消消乐加时卡），per_game_limit 为购买库存上限；App 端对局内按此渲染与扣减。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <span>游戏：</span>
            <Select
              className={styles.sel240}
              value={gameFilter || undefined}
              placeholder="选择游戏"
              onChange={(v) => {
                setGameFilter(v)
                // 联动：切换游戏后模式重置为「通用」（默认第一项）
                setModeFilter('')
              }}
              options={(meta?.games ?? []).map((g) => ({
                value: g.code,
                label: g.name,
              }))}
              showSearch
              optionFilterProp="label"
            />
            <span>模式：</span>
            <Select
              className={styles.sel240}
              value={modeFilter || undefined}
              placeholder="选择模式"
              onChange={(v) => setModeFilter(v)}
              options={filterModeOptions}
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
            新增道具
          </Button>
        </div>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={false}
        size="middle"
      />

      <ItemFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        form={form}
        restoreValues={formInitialValues}
        initialValues={
          editing
            ? {
                game_code: editing.game_code,
                mode: editing.mode,
                item_type: editing.item_type,
                name: editing.name,
                description: editing.description ?? '',
                point_cost: editing.point_cost,
                per_game_limit: editing.per_game_limit,
                free_per_game: editing.free_per_game,
                enabled: editing.enabled,
                sort_order: editing.sort_order,
              }
            : { enabled: true, point_cost: 20, per_game_limit: 1, free_per_game: 0, mode: '', sort_order: 0 }
        }
        gameOptions={gameOptions}
        modeOptions={formModeOptions}
        onSubmit={handleSave}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}

export default GameItems
