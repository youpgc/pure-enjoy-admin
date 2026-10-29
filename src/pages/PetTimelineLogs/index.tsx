import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Space, Table, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetTimelineLogRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { useUsernames } from '../../hooks/useUsernames'
import { petTimelineLogService, petAdventureSpotService } from '../../services/petService'
import { UserName } from '../../components/common/UserName'
import { PET_TABLE_PAGE_SIZE, PET_TIMELINE_EVENT_META, PET_ADVENTURE_RESULT_LABELS, PET_QUEST_TIER_LABELS } from '../../constants/pet'
import common from '../../styles/common.module.css'

// ==================== 宠物时间线查询（pet_timeline_logs，只读审计） ====================
//
// 2026-10-09 立项池清账：§3.3 成长编年史的服务端流水（升级/进化/改名/送别等）
// 供客诉排查。只读；RLS is_admin 全量可读（与 choice_logs 同批策略）。

// 事件类型中文标签统一取 constants（PET_TIMELINE_EVENT_META），未登记码回退原样
const TYPE_META = PET_TIMELINE_EVENT_META

/// 游历档位码 → 中文（adventure_tiers 固定三档）
const TIER_LABELS = PET_QUEST_TIER_LABELS

function payloadSummary(
  type: string,
  payload: unknown,
  spotNames: Record<string, string>,
): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '-'
  const p = payload as Record<string, unknown>
  const s = (k: string) => String(p[k] ?? '?')
  const spotName = (code: string) => spotNames[code] ?? code
  switch (type) {
    case 'levelup':
      return `升至 Lv.${s('level')}`
    case 'evolve':
      return `进化（形态 ${s('to_stage') === '?' ? s('stage') : s('to_stage')}）`
    case 'rename':
      return `${s('from')} → ${s('to')}`
    case 'release':
      return `送别（Lv.${s('level')}，补偿 ${p['gold_comp'] ?? 0} 金）`
    case 'obtain':
      return `孵化入列（蛋源 ${s('source')}${p['pool'] ? `，蛋池 ${s('pool')}` : ''}）`
    case 'breed':
      return `结配产蛋（蛋池 ${s('pool')}）`
    case 'trait_wash':
      return `特性重掷（${s('from')} → ${s('to')}）`
    case 'refine_reassigned':
      return '属性加点重掷（明细见洗练记录）'
    case 'spot_hidden_unlock':
      return `解锁秘境 ${spotName(s('code'))}`
    case 'adventure_memory': {
      if (p['rescued_by'] != null) return `遇险获救（渠道 ${s('rescued_by')}）`
      const tier = TIER_LABELS[s('tier')] ?? s('tier')
      const result = PET_ADVENTURE_RESULT_LABELS[s('result')] ?? s('result')
      const gold = p['gold'] != null ? `，金 ${p['gold']}` : ''
      const exp = p['exp'] != null ? `，经验 ${p['exp']}` : ''
      return `${spotName(s('spot'))} · ${tier} · ${result}${gold}${exp}`
    }
    case 'adventure_failed':
      return `${spotName(s('spot'))} · ${TIER_LABELS[s('tier')] ?? s('tier')} · 结算失败（惩罚已执行）`
    case 'adventure_recalled':
      return '提前召回（无奖励）'
    default:
      return JSON.stringify(payload)
  }
}

const PetTimelineLogs: React.FC = () => {
  const { hasPermission } = usePermission()
  const canRead = hasPermission('pets:read')

  const [rows, setRows] = useState<PetTimelineLogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  // 游历地码 → 中文名（游历归来/失败概要转译）
  const [spotNames, setSpotNames] = useState<Record<string, string>>({})

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petTimelineLogService.listLogs()
    setLoading(false)
    if (!res.success) return
    setRows(res.data ?? [])
  }, [])

  useEffect(() => {
    if (canRead) loadRows()
  }, [canRead, loadRows])

  useEffect(() => {
    petAdventureSpotService.findAll().then((res) => {
      if (res.success && res.data) {
        setSpotNames(Object.fromEntries(res.data.map((sp) => [sp.code, sp.name])))
      }
    })
  }, [])

  const kw = keyword.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (!kw) return true
        const petName =
          r.pet && typeof r.pet === 'object'
            ? `${(r.pet as Record<string, unknown>).show_no ?? ''} ${(r.pet as Record<string, unknown>).nickname ?? ''}`
            : ''
        return `${r.user_id} ${r.event_type} ${petName}`.toLowerCase().includes(kw)
      }),
    [rows, kw]
  )

  const ids = filtered.slice(0, 50).map((r) => r.user_id)
  const userMap = useUsernames(ids)

  const columns: ColumnsType<PetTimelineLogRow> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN', { hour12: false }),
    },
    {
      title: '用户',
      dataIndex: 'user_id',
      width: 160,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    {
      title: '事件',
      dataIndex: 'event_type',
      width: 90,
      render: (v: string) => {
        const m = TYPE_META[v]
        return m ? <Tag color={m.color}>{m.label}</Tag> : <Tag>{v}</Tag>
      },
    },
    {
      title: '宠物',
      key: 'pet',
      width: 150,
      ellipsis: true,
      render: (_, r) =>
        r.pet && typeof r.pet === 'object'
          ? `${(r.pet as Record<string, unknown>).show_no ?? ''} ${(r.pet as Record<string, unknown>).nickname ?? ''}`
          : r.pet_id,
    },
    {
      title: '内容',
      key: 'payload',
      render: (_, r) => payloadSummary(r.event_type, r.payload, spotNames),
    },
  ]

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="宠物时间线（只读审计）"
        description="成长编年史流水：升级/进化/改名/送别等事件由系统自动写入（用户不可编辑）。支持按用户 / 事件类型 / 宠物编号过滤。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Input
              style={{ width: 260 }}
              allowClear
              placeholder="搜索用户 / 事件类型 / 宠物"
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => { setPage(1); void loadRows() }}>
              刷新
            </Button>
          </Space>
        </div>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ current: page, pageSize: PET_TABLE_PAGE_SIZE, onChange: (p) => setPage(p), showSizeChanger: false }}
        size="middle"
      />
    </div>
  )
}

export default PetTimelineLogs
