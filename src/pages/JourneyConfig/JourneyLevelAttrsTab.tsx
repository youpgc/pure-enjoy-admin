import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import { usePagination } from '../../hooks/usePagination'
import { usePermission } from '../../hooks/usePermission'
import {
  journeyLevelService,
  journeyMonsterService,
  journeyRegionService,
} from '../../services/gameService'
import {
  journeyBattleParamService,
  type DbJourneyBattleParam,
} from '../../services/journeyConfigService'
import { JOURNEY_LEVEL_KIND_MAP } from '../../constants/game'
import type { JourneyLookups } from './journeyTabSchema'
import { useJourneyLevelRules } from './useJourneyLevelRules'
import common from '../../styles/common.module.css'

const { Text } = Typography

/// 妖王配置三态：沿用本段（NULL）/ 本关无妖（空串）/ 指定妖王（具体 code）。
/// 表单用哨兵值表达前两态，避免下拉把空串当作未选中；保存时还原为库值。
const BOSS_INHERIT = '__inherit__'
const BOSS_NONE = '__none__'

/// 关卡属性行：西行子表 journey_levels 以 game_levels.id 为 level_id。
interface LevelAttrRow {
  level_id: string
  levelLabel: string
  region_code: string | null
  level_kind: string | null
  boss_code: string | null
  boss_fights: number
  first_clear_merit: number
  duration_target_sec: number | null
}

const LEVEL_KIND_OPTIONS = Object.entries(JOURNEY_LEVEL_KIND_MAP).map(
  ([value, info]) => ({ value, label: info.label }),
)

/// 西行关卡属性：本关妖王三态覆盖本段妖王；关卡主体仍在关卡配置页。
const JourneyLevelAttrsTab: React.FC<{ lookups: JourneyLookups }> = ({ lookups }) => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const pager = usePagination()
  const [form] = Form.useForm()
  const [rows, setRows] = useState<LevelAttrRow[]>([])
  const [regions, setRegions] = useState<{ value: string; label: string }[]>([])
  /// 区域编码→本段妖王编码：关卡未指定时 App 实际生效的妖王
  const [regionBossByCode, setRegionBossByCode] = useState<Map<string, string>>(new Map())
  const [bosses, setBosses] = useState<{ value: string; label: string }[]>([])
  /// 玩家移动参数：西行里程目标由基础移速与每里世界单位实时换算。
  const [playerParams, setPlayerParams] = useState<DbJourneyBattleParam[]>([])
  const [loading, setLoading] = useState(false)
  const [regionFilter, setRegionFilter] = useState('')
  const [levelKindFilter, setLevelKindFilter] = useState('')
  const [editing, setEditing] = useState<LevelAttrRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  /// 区域与难别筛选作用于已加载的属性行，不改变子表查询。
  const filteredRows = useMemo(
    () => rows.filter((row) =>
      (!regionFilter || row.region_code === regionFilter)
      && (!levelKindFilter || row.level_kind === levelKindFilter)),
    [rows, regionFilter, levelKindFilter],
  )

  useEffect(() => { pager.setTotal(filteredRows.length) }, [filteredRows.length, pager.setTotal])

  const { resolveBoss, travelTargetLi } = useJourneyLevelRules(regionBossByCode, playerParams)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [attrsRes, regionsRes, monstersRes, paramsRes] = await Promise.all([
        journeyLevelService.findAll(),
        journeyRegionService.findAll(),
        journeyMonsterService.findAll(),
        journeyBattleParamService.findAll((q) => q.eq('group_code', 'player')),
      ])
      if (!attrsRes.success || !regionsRes.success || !monstersRes.success) {
        handleApiError(
          attrsRes.errorMessage ?? regionsRes.errorMessage ?? monstersRes.errorMessage ?? '加载失败',
          'JourneyLevelAttrs-加载',
        )
        return
      }
      if (!mountedRef.current) return
      // 移动参数缺失不影响属性行加载，只让里程目标回落内置基准值
      if (paramsRes.success) setPlayerParams(paramsRes.data ?? [])
      else handleApiError(paramsRes.errorMessage, 'JourneyLevelAttrs-移动参数')
      const regionRows = regionsRes.data ?? []
      setRegions(regionRows.map((r) => ({ value: r.code, label: r.name })))
      setRegionBossByCode(new Map(
        regionRows
          .filter((r) => !!r.boss_code)
          .map((r) => [r.code, r.boss_code as string]),
      ))
      setBosses(
        (monstersRes.data ?? [])
          .filter((m) => m.ai_tier === 'boss')
          .map((m) => ({ value: m.code, label: `${m.name}（${m.code}）` })),
      )
      const attrMap = new Map((attrsRes.data ?? []).map((a) => [a.level_id, a]))
      setRows(
        lookups.levels.map((level) => {
          const attr = attrMap.get(level.value)
          return {
            level_id: level.value,
            levelLabel: level.label,
            region_code: attr?.region_code ?? null,
            level_kind: attr?.level_kind ?? null,
            boss_code: attr?.boss_code ?? null,
            boss_fights: attr?.boss_fights ?? 1,
            first_clear_merit: attr?.first_clear_merit ?? 0,
            duration_target_sec: attr?.duration_target_sec ?? null,
          }
        }),
      )
    } catch (error) {
      handleApiError(error, 'JourneyLevelAttrs-加载')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookups.levels, mountedRef])

  useEffect(() => { load() }, [load])

  const columns = useMemo<ColumnsType<LevelAttrRow>>(() => [
    { title: '关卡', dataIndex: 'levelLabel', key: 'levelLabel', width: 180 },
    {
      title: '区域',
      dataIndex: 'region_code',
      key: 'region_code',
      width: 110,
      render: (v: string | null) => {
        if (!v) return <Text type="secondary">未配置</Text>
        return <Tag color="blue">{regions.find((r) => r.value === v)?.label ?? v}</Tag>
      },
    },
    {
      title: '难别',
      dataIndex: 'level_kind',
      key: 'level_kind',
      width: 100,
      render: (v: string | null) => {
        if (!v) return <Text type="secondary">未配置</Text>
        const info = JOURNEY_LEVEL_KIND_MAP[v] ?? { color: 'default', label: v }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      // 通关口径为派生视图：与 App 的通关条件一一对应。
      // 每日游历/无尽妖潮为虚拟关，不落 journey_levels，本表不展示。
      title: '通关口径',
      key: 'clearMode',
      width: 190,
      render: (_: unknown, record: LevelAttrRow) => {
        const resolved = resolveBoss(record)
        if (resolved.kind === 'level') return <Tag color="red">妖王战 · 本关</Tag>
        if (resolved.kind === 'region') return <Tag color="orange">妖王战 · 本段</Tag>
        return <Tag color="green">西行里程 · {travelTargetLi(record)} 里</Tag>
      },
    },
    {
      // 列表展示实际生效妖王：本关覆盖优先，空串=本关显式无妖，NULL 沿用本段。
      title: '生效妖王',
      key: 'boss_code',
      width: 170,
      render: (_: unknown, record: LevelAttrRow) => {
        const labelOf = (code: string) => bosses.find((b) => b.value === code)?.label ?? code
        const resolved = resolveBoss(record)
        if (resolved.kind === 'level' && resolved.code) {
          return (
            <Space size={4}>
              <Tag color="red">{labelOf(resolved.code)}</Tag>
              <Text type="secondary">本关</Text>
            </Space>
          )
        }
        if (resolved.kind === 'region' && resolved.code) {
          return (
            <Space size={4}>
              <Tag color="blue">{labelOf(resolved.code)}</Tag>
              <Text type="secondary">本段</Text>
            </Space>
          )
        }
        return (
          <Text type="secondary">
            {resolved.explicit ? '本关无妖王战' : '本段无妖王战'}
          </Text>
        )
      },
    },
    {
      title: '妖王战',
      dataIndex: 'boss_fights',
      key: 'boss_fights',
      width: 80,
      // App 侧 0/1 都当单场，统一显示 1。
      render: (v: number | null) => (v && v > 0 ? v : 1),
    },
    { title: '首通功德', dataIndex: 'first_clear_merit', key: 'first_clear_merit', width: 100 },
    {
      title: (
        <Tooltip title="仅无妖王战的主线关消费：作为西行里程目标的换算锚点（基础移速×锚点÷每里世界单位），不是倒计时。留空=App 内置 600 秒；显式 0=引擎兜底 300 秒。妖王战与每日游历不消费。">
          里程锚点(秒)
        </Tooltip>
      ),
      dataIndex: 'duration_target_sec',
      key: 'duration_target_sec',
      width: 160,
      render: (v: number | null, record: LevelAttrRow) => {
        if (resolveBoss(record).kind !== 'none') {
          return <Text type="secondary">不适用（妖王战）</Text>
        }
        return (
          <Space size={4}>
            <span>{v === null ? '默认 600s' : `${v}s`}</span>
            <Text type="secondary">→ {travelTargetLi(record)} 里</Text>
          </Space>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: LevelAttrRow) => (
        <Button size="small" disabled={!canWrite} onClick={() => openEdit(record)}>
          编辑
        </Button>
      ),
    },
  ], [bosses, canWrite, regions, resolveBoss, travelTargetLi])

  /// 编辑态提示当前会继承的本段妖王，避免「留空」看起来像没配。
  const inheritedBossCode = editing?.region_code
    ? regionBossByCode.get(editing.region_code)
    : undefined
  const inheritedBossLabel = inheritedBossCode
    ? bosses.find((b) => b.value === inheritedBossCode)?.label ?? inheritedBossCode
    : null

  const openEdit = (row: LevelAttrRow) => {
    setEditing(row)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!editing || saving) return
    let values: Record<string, any>
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setSaving(true)
    try {
      // 三态保存：沿用本段=NULL，本关无妖=空串（不能被截断为 NULL），指定妖王=code。
      const rawBoss = values.boss_code as string | undefined
      const bossCode = rawBoss === BOSS_INHERIT || rawBoss === undefined
        ? null
        : rawBoss === BOSS_NONE ? '' : rawBoss
      const res = await journeyLevelService.saveByLevel(editing.level_id, {
        region_code: values.region_code,
        level_kind: values.level_kind,
        boss_code: bossCode,
        boss_fights: values.boss_fights ?? 1,
        first_clear_merit: values.first_clear_merit ?? 0,
        duration_target_sec: values.duration_target_sec ?? null,
      })
      if (!res.success) {
        handleApiError(res.errorMessage, 'JourneyLevelAttrs-保存')
        return
      }
      message.success('关卡属性已保存')
      setModalOpen(false)
      setEditing(null)
      form.resetFields()
      load()
    } catch (error) {
      handleApiError(error, 'JourneyLevelAttrs-保存')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="关卡主体仍在「关卡配置」页；这里只管西行关卡子表属性"
        description="「通关口径」按 App 优先级派生：本关妖王或区域本段妖王=妖王战；显式无妖=西行里程（目标里数由「玩家移动」参数实时换算）。每日游历与无尽妖潮是虚拟关，不落本表；车迟国三关在此分别指定虎力/鹿力/羊力。波次、热区、参照物在「关卡细节」按关卡编辑。历史关卡若区域留空，App 会按关卡号走内置妖王兜底，而本表按无妖里程展示，此处以 App 实机为准。"
      />
      <Card>
        <div className={common.toolbar}>
          <Space wrap>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="按区域筛选"
              style={{ width: 150 }}
              value={regionFilter || undefined}
              options={regions}
              onChange={(value) => {
                setRegionFilter(value ?? '')
                pager.resetPage()
              }}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="按难别筛选"
              style={{ width: 130 }}
              value={levelKindFilter || undefined}
              options={LEVEL_KIND_OPTIONS}
              onChange={(value) => {
                setLevelKindFilter(value ?? '')
                pager.resetPage()
              }}
            />
            <Button onClick={load} loading={loading}>刷新</Button>
            <Text type="secondary">共 {filteredRows.length} 关</Text>
          </Space>
        </div>
        <Table
          rowKey="level_id"
          columns={columns}
          dataSource={filteredRows}
          loading={loading}
          pagination={{ ...pager.tablePagination, showSizeChanger: false, pageSize: 10 }}
          scroll={{ x: 1000 }}
          size="small"
          onRow={(record) => ({ onDoubleClick: () => openEdit(record) })}
        />
      </Card>
      <Modal
        title={editing ? `关卡属性 · ${editing.levelLabel}` : '关卡属性'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        okButtonProps={{ disabled: !canWrite }}
        afterOpenChange={(open) => {
          if (!open || !editing) return
          form.resetFields()
          form.setFieldsValue({
            region_code: editing.region_code ?? undefined,
            level_kind: editing.level_kind ?? undefined,
            boss_code: editing.boss_code === null || editing.boss_code === undefined
              ? BOSS_INHERIT
              : editing.boss_code === '' ? BOSS_NONE : editing.boss_code,
            boss_fights: editing.boss_fights > 0 ? editing.boss_fights : 1,
            first_clear_merit: editing.first_clear_merit ?? 0,
            duration_target_sec: editing.duration_target_sec ?? undefined,
          })
        }}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
          form.resetFields()
        }}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="region_code" label="所属区域" rules={[{ required: true, message: '请选择区域' }]}>
            <Select showSearch optionFilterProp="label" options={regions} placeholder="选择区域" />
          </Form.Item>
          <Form.Item name="level_kind" label="难别" rules={[{ required: true, message: '请选择难别' }]}>
            <Select showSearch optionFilterProp="label" options={LEVEL_KIND_OPTIONS} placeholder="选择难别" />
          </Form.Item>
          <Form.Item
            name="boss_code"
            label="本关妖王"
            tooltip={inheritedBossLabel
              ? `沿用本段=区域本段妖王（${inheritedBossLabel}）；本关无妖=走西行里程口径；指定妖王=覆盖本段`
              : '沿用本段=区域本段妖王；本关无妖=走西行里程口径；指定妖王=覆盖本段'}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={[
                { value: BOSS_INHERIT, label: '沿用本段妖王（默认）' },
                { value: BOSS_NONE, label: '本关无妖王战（走西行里程）' },
                ...bosses,
              ]}
            />
          </Form.Item>
          <Form.Item
            name="boss_fights"
            label="妖王战数"
            tooltip="1=单场；多场战填大于 1"
          >
            <InputNumber className={common.fullWidth} min={1} max={9} />
          </Form.Item>
          <Form.Item name="first_clear_merit" label="首通功德">
            <InputNumber className={common.fullWidth} min={0} />
          </Form.Item>
          <Form.Item
            name="duration_target_sec"
            label="西行里程锚点(秒)"
            tooltip="无妖主线章回按此秒数换算西行里程目标（基础移速×锚点÷每里世界单位），不是通关倒计时；留空=内置 600 秒锚点，0=兜底 300 秒。妖王战与每日游历不消费。"
          >
            <InputNumber className={common.fullWidth} min={0} placeholder="默认 600" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default JourneyLevelAttrsTab
