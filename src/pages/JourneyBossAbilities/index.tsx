import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, Card, Input, Modal, Select, Space, Spin, Statistic, Table, Typography, message,
} from 'antd'
import { handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import {
  journeyMonsterService,
  journeyMonsterParamService,
  journeyMonsterAbilityService,
  journeyMonsterAbilityParamService,
  MAX_JOURNEY_MONSTER_ABILITIES,
} from '../../services/gameService'
import { JOURNEY_BOSS_ABILITY_MAP } from '../../constants/game'
import { JOURNEY_BOSS_ABILITY_PARAMS } from '../../constants/journeyBossAbilities'
import type {
  DbJourneyMonster,
  DbJourneyMonsterParam,
  DbJourneyMonsterAbility,
  DbJourneyMonsterAbilityParam,
} from '../../types/database'
import { buildBossAbilityColumns, coverageOf, type BossAbilityRow } from './columns'
import AbilityParamDrawer from './AbilityParamDrawer'
import common from '../../styles/common.module.css'

const { Text } = Typography

/// 妖王能力总览：一行一「妖王×能力」。
/// 能力承载表有行的走能力专属参数；无行的妖王沿用主表单能力（兼容旧配置）。
const TABLE_PAGE_SIZE = 10

const JourneyBossAbilities: React.FC = () => {
  const mountedRef = useMounted()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [monsters, setMonsters] = useState<DbJourneyMonster[]>([])
  const [paramRows, setParamRows] = useState<DbJourneyMonsterParam[]>([])
  const [abilityRows, setAbilityRows] = useState<DbJourneyMonsterAbility[]>([])
  const [abilityParamRows, setAbilityParamRows] = useState<DbJourneyMonsterAbilityParam[]>([])
  const [keyword, setKeyword] = useState('')
  const [drawerRow, setDrawerRow] = useState<BossAbilityRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addMonster, setAddMonster] = useState<string | null>(null)
  const [addAbility, setAddAbility] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [monsterRes, paramRes, abilityRes, abilityParamRes] = await Promise.all([
        journeyMonsterService.findAll(),
        journeyMonsterParamService.findAll(),
        journeyMonsterAbilityService.findAll(),
        journeyMonsterAbilityParamService.findAll(),
      ])
      if (!monsterRes.success || !paramRes.success || !abilityRes.success || !abilityParamRes.success) {
        const msg = handleApiError(
          monsterRes.errorMessage ?? paramRes.errorMessage ?? abilityRes.errorMessage ?? abilityParamRes.errorMessage ?? '加载失败',
          '妖王能力-加载',
        )
        if (mountedRef.current) setError(msg)
        return
      }
      if (!mountedRef.current) return
      setMonsters(monsterRes.data ?? [])
      setParamRows(paramRes.data ?? [])
      setAbilityRows(abilityRes.data ?? [])
      setAbilityParamRows(abilityParamRes.data ?? [])
    } catch (e) {
      const msg = handleApiError(e, '妖王能力-加载')
      if (mountedRef.current) setError(msg)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [mountedRef])

  useEffect(() => { load() }, [load])

  /// 一行一「妖王×能力」：能力承载行优先；无承载行的妖王回落到主表单能力，
  /// 保证老配置在后台仍可查看与编辑。
  const rows = useMemo<BossAbilityRow[]>(() => {
    const bosses = monsters.filter((m) => m.ai_tier === 'boss')
    const byId = new Map<string, DbJourneyMonster>(bosses.map((m) => [m.id, m]))
    const monsterParams = new Map<string, DbJourneyMonsterParam[]>()
    for (const p of paramRows) {
      const list = monsterParams.get(p.monster_id) ?? []
      list.push(p)
      monsterParams.set(p.monster_id, list)
    }
    const abilityParams = new Map<string, DbJourneyMonsterAbilityParam[]>()
    for (const p of abilityParamRows) {
      const list = abilityParams.get(p.ability_id) ?? []
      list.push(p)
      abilityParams.set(p.ability_id, list)
    }

    const result: BossAbilityRow[] = []
    const covered = new Set<string>()
    for (const a of [...abilityRows].sort((x, y) => x.slot - y.slot)) {
      const m = byId.get(a.monster_id)
      if (!m) continue
      covered.add(a.monster_id)
      const mappingKeys = new Set(JOURNEY_BOSS_ABILITY_PARAMS[a.ability_key]?.keys ?? [])
      const relevant = (abilityParams.get(a.id) ?? []).filter((p) => mappingKeys.has(p.code))
      result.push({
        monsterId: m.id,
        code: m.code,
        name: m.name,
        aiTier: m.ai_tier,
        abilityKey: a.ability_key,
        abilityId: a.id,
        slot: a.slot,
        enabled: a.enabled,
        configured: relevant.filter((p) => p.value_num !== null).length,
        expected: mappingKeys.size,
      })
    }
    // 无承载行的妖王按主表单能力补一行（兼容迁移前的配置）
    for (const m of bosses) {
      if (covered.has(m.id)) continue
      const abilityKey = m.ability_key ?? ''
      const mappingKeys = abilityKey
        ? new Set(JOURNEY_BOSS_ABILITY_PARAMS[abilityKey]?.keys ?? [])
        : new Set<string>()
      const relevant = (monsterParams.get(m.id) ?? []).filter((p) => mappingKeys.has(p.code))
      result.push({
        monsterId: m.id,
        code: m.code,
        name: m.name,
        aiTier: m.ai_tier,
        abilityKey,
        configured: relevant.filter((p) => p.value_num !== null).length,
        expected: mappingKeys.size,
      })
    }
    return result
  }, [monsters, paramRows, abilityRows, abilityParamRows])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return rows
    return rows.filter((r) =>
      `${r.name} ${r.code} ${r.abilityKey} ${JOURNEY_BOSS_ABILITY_MAP[r.abilityKey]?.label ?? ''}`
        .toLowerCase().includes(kw))
  }, [rows, keyword])

  const stats = useMemo(() => {
    const full = rows.filter((r) => coverageOf(r) === 'full')
    const incomplete = rows.filter((r) => coverageOf(r) === 'partial' || coverageOf(r) === 'default')
    return {
      abilities: rows.length,
      carriers: abilityRows.length,
      full: full.length,
      incomplete: incomplete.length,
    }
  }, [rows, abilityRows])

  const columns = useMemo(
    () => buildBossAbilityColumns(
      (row) => { setDrawerRow(row); setDrawerOpen(true) },
      async (row) => {
        if (!row.abilityId) return
        const res = await journeyMonsterAbilityService.delete(row.abilityId)
        if (!res.success) { handleApiError(res.errorMessage, '妖王能力-移除'); return }
        message.success('能力已移除，其专属参数一并清除')
        load()
      },
      async (row, enabled) => {
        if (!row.abilityId) return
        const res = await journeyMonsterAbilityService.update(row.abilityId, { enabled } as any)
        if (!res.success) { handleApiError(res.errorMessage, '妖王能力-启用切换'); return }
        message.success(enabled ? '能力已启用' : '能力已停用，该妖王不再释放此能力')
        load()
      },
    ),
    [load],
  )

  /// 抽屉参数：承载行取能力专属参数，单值兼容行取逐怪参数；
  /// 统一映射成抽屉所需的 { id, code, value_num } 形态。
  const drawerParams = useMemo<DbJourneyMonsterParam[]>(() => {
    if (!drawerRow) return []
    if (drawerRow.abilityId) {
      return abilityParamRows
        .filter((p) => p.ability_id === drawerRow.abilityId)
        .map((p) => ({ id: p.id, monster_id: drawerRow.monsterId, code: p.code, value_num: p.value_num }))
    }
    return paramRows.filter((p) => p.monster_id === drawerRow.monsterId)
  }, [drawerRow, paramRows, abilityParamRows])

  /// 槽位 0~15 共 16 项，分配时取第一个空槽，避免删中间槽后新增撞上限。
  const nextSlotOf = (monsterId: string): number | null => {
    const used = new Set(abilityRows
      .filter((a) => a.monster_id === monsterId)
      .map((a) => a.slot))
    for (let slot = 0; slot < MAX_JOURNEY_MONSTER_ABILITIES; slot++) {
      if (!used.has(slot)) return slot
    }
    return null
  }

  const handleAdd = async () => {
    if (!addMonster || !addAbility) { message.warning('请选择妖王与能力'); return }
    const slot = nextSlotOf(addMonster)
    if (slot === null) {
      message.warning(`每只妖王最多 ${MAX_JOURNEY_MONSTER_ABILITIES} 项能力，请先移除已有能力`)
      return
    }
    const res = await journeyMonsterAbilityService.create({
      monster_id: addMonster,
      slot,
      ability_key: addAbility,
      enabled: true,
    } as any)
    if (!res.success) { handleApiError(res.errorMessage, '妖王能力-新增'); return }
    message.success('能力已添加，可在参数抽屉配置专属数值')
    setAddOpen(false)
    setAddMonster(null)
    setAddAbility(null)
    load()
  }

  if (loading) {
    return <div className={common.flexCenter} style={{ padding: '80px 0' }}><Spin tip="加载妖王能力总览…" /></div>
  }

  const bossOptions = monsters
    .filter((m) => m.ai_tier === 'boss')
    .map((m) => ({ value: m.id, label: `${m.name}（${m.code}）` }))
  const abilityOptions = Object.entries(JOURNEY_BOSS_ABILITY_MAP).map(([value, v]) => ({ value, label: v.label }))

  return (
    <div>
      <Alert
        type="info"
        showIcon
        message={`一行一「妖王 × 能力」，每妖最多 ${MAX_JOURNEY_MONSTER_ABILITIES} 项能力`}
        description={`能力承载行可配能力专属参数（优先级高于逐怪参数）；未添加承载行的妖王沿用「基础数据 › 怪物」的单能力字段与逐怪参数。槽位 0~${MAX_JOURNEY_MONSTER_ABILITIES - 1}，停用的能力仍占槽位。停用开关会让该妖王不再释放此能力（全部停用时不再回落单值字段）。留空参数即回落 App 内置缺省值。移除能力会连带清除其专属参数。`}
        className={common.mb16}
      />
      {error && <Alert type="error" showIcon message={error} className={common.mb16} />}
      <Card className={common.mb16}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <Statistic title="能力行数" value={stats.abilities} />
          <Statistic title="承载表能力" value={stats.carriers} />
          <Statistic title="参数完整" value={stats.full} valueStyle={{ color: '#52c41a' }} />
          <Statistic title="参数待补" value={stats.incomplete} valueStyle={{ color: '#faad14' }} />
        </div>
      </Card>
      <Card>
        <div className={common.toolbar}>
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="搜索妖王 / 编码 / 能力"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 280 }}
            />
            <Button type="primary" onClick={() => setAddOpen(true)}>添加能力</Button>
            <Button onClick={load}>刷新</Button>
          </Space>
        </div>
        <Table
          rowKey={(r) => r.abilityId ?? `${r.monsterId}|${r.abilityKey}`}
          columns={columns}
          dataSource={filtered}
          loading={loading}
          pagination={{ pageSize: TABLE_PAGE_SIZE, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
          scroll={{ x: 1060 }}
        />
      </Card>
      <AbilityParamDrawer
        open={drawerOpen}
        row={drawerRow}
        paramRows={drawerParams}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
      />
      <Modal
        title="为妖王添加能力"
        open={addOpen}
        onOk={handleAdd}
        onCancel={() => setAddOpen(false)}
        okText="添加"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ display: 'grid', gap: 16, padding: '12px 0' }}>
          <div>
            <Text type="secondary">妖王</Text>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              value={addMonster}
              onChange={setAddMonster}
              options={bossOptions}
              placeholder="选择妖王"
            />
          </div>
          <div>
            <Text type="secondary">能力</Text>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              value={addAbility}
              onChange={setAddAbility}
              options={abilityOptions}
              placeholder="选择能力"
            />
          </div>
          <Text type="secondary">同一妖王最多 {MAX_JOURNEY_MONSTER_ABILITIES} 项能力，从空槽位起分配；各能力参数独立存储，停用仍占槽。</Text>
        </div>
      </Modal>
    </div>
  )
}

export default JourneyBossAbilities
