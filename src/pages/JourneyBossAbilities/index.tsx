import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Space, Spin, Statistic, Table } from 'antd'
import { handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import { journeyMonsterService, journeyMonsterParamService } from '../../services/gameService'
import { JOURNEY_BOSS_ABILITY_MAP } from '../../constants/game'
import { JOURNEY_BOSS_ABILITY_PARAMS } from '../../constants/journeyBossAbilities'
import type { DbJourneyMonster, DbJourneyMonsterParam } from '../../types/database'
import { buildBossAbilityColumns, coverageOf, type BossAbilityRow } from './columns'
import AbilityParamDrawer from './AbilityParamDrawer'
import common from '../../styles/common.module.css'

/// 妖王能力总览：聚合怪物主行（能力编码）与逐怪参数行（数值），
/// 让运营一眼看到「哪只妖王→什么能力→参数覆盖情况」，并可整包编辑该能力参数。
const TABLE_PAGE_SIZE = 10

const JourneyBossAbilities: React.FC = () => {
  const mountedRef = useMounted()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [monsters, setMonsters] = useState<DbJourneyMonster[]>([])
  const [paramRows, setParamRows] = useState<DbJourneyMonsterParam[]>([])
  const [keyword, setKeyword] = useState('')
  const [drawerRow, setDrawerRow] = useState<BossAbilityRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [monsterRes, paramRes] = await Promise.all([
        journeyMonsterService.findAll(),
        journeyMonsterParamService.findAll(),
      ])
      if (!monsterRes.success || !paramRes.success) {
        const msg = handleApiError(
          monsterRes.errorMessage ?? paramRes.errorMessage ?? '加载失败',
          '妖王能力-加载',
        )
        if (mountedRef.current) setError(msg)
        return
      }
      if (!mountedRef.current) return
      setMonsters(monsterRes.data ?? [])
      setParamRows(paramRes.data ?? [])
    } catch (e) {
      const msg = handleApiError(e, '妖王能力-加载')
      if (mountedRef.current) setError(msg)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [mountedRef])

  useEffect(() => { load() }, [load])

  /// 总览行：只列妖王档（boss）怪物，普通/精英的逐怪参数请到「怪物参数」页。
  const rows = useMemo<BossAbilityRow[]>(() => {
    const byMonster = new Map<string, DbJourneyMonsterParam[]>()
    for (const p of paramRows) {
      const list = byMonster.get(p.monster_id) ?? []
      list.push(p)
      byMonster.set(p.monster_id, list)
    }
    return monsters.filter((m) => m.ai_tier === 'boss').map((m) => {
      const abilityKey = m.ability_key ?? ''
      const mappingKeys = abilityKey
        ? new Set(JOURNEY_BOSS_ABILITY_PARAMS[abilityKey]?.keys ?? [])
        : new Set<string>()
      const own = byMonster.get(m.id) ?? []
      const relevant = own.filter((p) => mappingKeys.has(p.code))
      return {
        monsterId: m.id,
        code: m.code,
        name: m.name,
        aiTier: m.ai_tier,
        abilityKey,
        configured: relevant.filter((p) => p.value_num !== null).length,
        expected: mappingKeys.size,
      }
    })
  }, [monsters, paramRows])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return rows
    return rows.filter((r) =>
      `${r.name} ${r.code} ${r.abilityKey} ${JOURNEY_BOSS_ABILITY_MAP[r.abilityKey]?.label ?? ''}`
        .toLowerCase().includes(kw))
  }, [rows, keyword])

  const stats = useMemo(() => {
    const withAbility = rows.filter((r) => !!r.abilityKey)
    const full = rows.filter((r) => coverageOf(r) === 'full')
    const incomplete = rows.filter((r) => coverageOf(r) === 'partial' || coverageOf(r) === 'default')
    return { bosses: rows.length, withAbility: withAbility.length, full: full.length, incomplete: incomplete.length }
  }, [rows])

  const columns = useMemo(
    () => buildBossAbilityColumns((row) => { setDrawerRow(row); setDrawerOpen(true) }),
    [],
  )

  const drawerParams = useMemo(
    () => drawerRow ? paramRows.filter((p) => p.monster_id === drawerRow.monsterId) : [],
    [drawerRow, paramRows],
  )

  if (loading) {
    return <div className={common.flexCenter} style={{ padding: '80px 0' }}><Spin tip="加载妖王能力总览…" /></div>
  }

  return (
    <div>
      <Alert
        type="info"
        showIcon
        message="按妖王查看能力，按能力整包编辑参数"
        description="参数键与缺省值取自 App 引擎实际读取口径；点「编辑」可一次查看并修改该妖王当前能力的全部数值，留空即删行、回落 App 内置缺省值（合法的待补状态）。覆盖列区分「已配齐 / 部分配置 / 全缺省」，数值改动写入「西行管理 › 数值与平衡 › 怪物参数」表。"
        className={common.mb16}
      />
      {error && <Alert type="error" showIcon message={error} className={common.mb16} />}
      <Card className={common.mb16}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <Statistic title="妖王档怪物" value={stats.bosses} />
          <Statistic title="已配能力" value={stats.withAbility} />
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
            <Button onClick={load}>刷新</Button>
          </Space>
        </div>
        <Table
          rowKey="monsterId"
          columns={columns}
          dataSource={filtered}
          loading={loading}
          pagination={{ pageSize: TABLE_PAGE_SIZE, showSizeChanger: false, showTotal: (t) => `共 ${t} 只` }}
          scroll={{ x: 900 }}
        />
      </Card>
      <AbilityParamDrawer
        open={drawerOpen}
        row={drawerRow}
        paramRows={drawerParams}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
      />
    </div>
  )
}

export default JourneyBossAbilities
