import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, Space, Input, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { petLotteryDrawService, petSpeciesService, petPersonalityService, petTraitService } from '../../services/petService'
import type { PetLotteryRecordRow, PetSpeciesRow, PetPersonalityRow, PetTraitRow } from '../../types/pet'
import { PET_GENDER_LABELS, PET_RARITY_CODE_OPTIONS, PET_RARITY_TAG_COLORS, PET_TABLE_PAGE_SIZE } from '../../constants/pet'
import { useUsernames } from '../../hooks/useUsernames'
import { UserName } from '../../components/common/UserName'
import { formatDateTime } from '../../utils/format'
import common from '../../styles/common.module.css'

// ==================== 幸运蛋礼盒 · 抽取记录（pet_lottery_records biz='egg_hatch'） ====================
// 数据链：rpc_pet_lottery_draw 建礼盒蛋（lottery_s1 / lottery_s1_pity）→ rpc_pet_hatch_instant
// 全链孵化并写审计行；保底触发抽的 pool_code = lottery_s1_pity。

const RARITY_LABELS: Record<string, string> = Object.fromEntries(
  PET_RARITY_CODE_OPTIONS.map((o) => [o.value, o.label]),
)

const LotteryRecords: React.FC = () => {
  const [rows, setRows] = useState<PetLotteryRecordRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [species, setSpecies] = useState<PetSpeciesRow[]>([])
  const [personalities, setPersonalities] = useState<PetPersonalityRow[]>([])
  const [traits, setTraits] = useState<PetTraitRow[]>([])

  const loadRows = useCallback(async (p: number, kw: string) => {
    setLoading(true)
    try {
      const res = await petLotteryDrawService.pageDraws(p, PET_TABLE_PAGE_SIZE)
      if (!res.success || !res.data) {
        setRows([])
        setTotal(0)
        return
      }
      // 关键词过滤下推不了 jsonb 字段，仅对本页行做用户/形态名包含匹配（配合分页使用）
      let data = res.data.data
      if (kw.trim()) {
        const k = kw.trim().toLowerCase()
        data = data.filter(
          (r) =>
            r.user_id.toLowerCase().includes(k) ||
            String((r.result as Record<string, unknown>)?.species_code ?? '')
              .toLowerCase()
              .includes(k),
        )
      }
      setRows(data)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRows(page, search)
  }, [page, search, loadRows])

  // 名称映射目录：种属/性格/特性均小表，一次拉全建 code→中文 映射
  useEffect(() => {
    void (async () => {
      const [sp, ps, tr] = await Promise.all([
        petSpeciesService.findAll(),
        petPersonalityService.findAll(),
        petTraitService.findAll(),
      ])
      if (sp.success && sp.data) setSpecies(sp.data)
      if (ps.success && ps.data) setPersonalities(ps.data)
      if (tr.success && tr.data) setTraits(tr.data)
    })()
  }, [])

  const speciesMap = useMemo(
    () => new Map(species.map((s) => [s.species_code, s])),
    [species],
  )
  const personalityMap = useMemo(
    () => new Map(personalities.map((p) => [p.code, p.name_cn])),
    [personalities],
  )
  const traitMap = useMemo(() => new Map(traits.map((t) => [t.code, t.name])), [traits])

  const userIds = useMemo(() => rows.map((r) => r.user_id), [rows])
  const userMap = useUsernames(userIds)

  const columns: ColumnsType<PetLotteryRecordRow> = [
    {
      title: '用户',
      dataIndex: 'user_id',
      width: 180,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    { title: '时间', dataIndex: 'created_at', width: 170, render: (v: string) => formatDateTime(v) },
    {
      title: '结果',
      key: 'result',
      width: 220,
      render: (_, r) => {
        const obj = (r.result ?? {}) as Record<string, unknown>
        const code = typeof obj.species_code === 'string' ? obj.species_code : ''
        const sp = speciesMap.get(code)
        const rarity = sp?.rarity_code ?? ''
        const label = RARITY_LABELS[rarity] ?? rarity
        return (
          <Space size={4} wrap>
            {rarity ? (
              <Tag color={PET_RARITY_TAG_COLORS[rarity] ?? 'default'} style={{ marginInlineEnd: 0 }}>
                {label}
              </Tag>
            ) : null}
            <Typography.Text style={{ fontSize: 13 }}>{sp?.name_cn ?? code ?? '-'}</Typography.Text>
          </Space>
        )
      },
    },
    {
      title: '性别',
      key: 'gender',
      width: 60,
      render: (_, r) => {
        const g = (r.result as Record<string, unknown>)?.gender
        return typeof g === 'string' ? (PET_GENDER_LABELS[g] ?? g) : '-'
      },
    },
    {
      title: '性格',
      key: 'personality',
      width: 110,
      render: (_, r) => {
        const p = (r.result as Record<string, unknown>)?.personality
        if (typeof p !== 'string' || !p) return '-'
        return personalityMap.get(p) ?? p
      },
    },
    {
      title: '潜力',
      key: 'potential',
      width: 70,
      render: (_, r) => {
        const v = (r.result as Record<string, unknown>)?.potential
        return typeof v === 'number' ? v : '-'
      },
    },
    {
      title: '特性',
      key: 'trait',
      width: 130,
      render: (_, r) => {
        const t = (r.result as Record<string, unknown>)?.trait
        if (typeof t !== 'string' || !t) return '-'
        return traitMap.get(t) ?? t
      },
    },
    {
      title: '保底',
      key: 'pity',
      width: 90,
      render: (_, r) => {
        // 20261030 起：孵化审计 result.force_rarity 留底（fix_pet_lottery_force_rarity_audit_20261030.sql）；
        // pool_code==='lottery_s1_pity' 仅兼容旧池历史值（该池 v3 后已删）
        const forced = (r.result as Record<string, unknown>)?.force_rarity === 'SSR'
        if (forced || r.pool_code === 'lottery_s1_pity') {
          return <Tag color="orange" style={{ marginInlineEnd: 0 }}>保底触发</Tag>
        }
        return '-'
      },
    },
    { title: '配置版本', dataIndex: 'config_version', width: 80, render: (v: number | null) => v ?? '-' },
  ]

  return (
    <Card className={common.mb16}>
      <div className={common.toolbar}>
        <Space wrap>
          <Input.Search
            placeholder="搜索用户或形态编码"
            allowClear
            onSearch={(v) => {
              setPage(1)
              setSearch(v)
            }}
            style={{ width: 260 }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            概率配置与 SSR 保底在「全局参数 → 幸运蛋礼盒」维护；概率表在「蛋池与概率」页签的礼盒池
          </Typography.Text>
        </Space>
      </div>
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={rows}
        loading={loading}
        tableLayout="fixed"
        pagination={{
          current: page,
          pageSize: PET_TABLE_PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
          showTotal: (t) => `共 ${t} 条`,
        }}
      />
    </Card>
  )
}

export default LotteryRecords
