import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Space, Table, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetTimelineLogRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { useUsernames } from '../../hooks/useUsernames'
import { petTimelineLogService } from '../../services/petService'
import { UserName } from '../../components/common/UserName'
import {
  PET_ADVENTURE_RESULT_LABELS,
  PET_ADVENTURE_TIER_LABELS,
  PET_ATTR_LABELS,
  PET_TABLE_PAGE_SIZE,
  PET_TIMELINE_EVENT_META,
} from '../../constants/pet'
import { formatDateTimeMinute } from '../../utils/format'
import common from '../../styles/common.module.css'

// ==================== 宠物时间线查询（pet_timeline_logs，只读审计） ====================
//
// 2026-10-09 立项池清账：§3.3 成长编年史的服务端流水（升级/进化/改名/送别等）
// 供客诉排查。只读；RLS is_admin 全量可读（与 choice_logs 同批策略）。
// 事件类型/内容翻译与 App 成长回忆卡（pet_timeline_screen._decor）口径一致。

function tierLabel(v: unknown): string {
  return PET_ADVENTURE_TIER_LABELS[String(v)] ?? String(v ?? '?')
}

function spotLabel(v: unknown): string {
  return v ? String(v) : '?'
}

/** 历险结算来源（rpc_pet_hatch…/rpc_pet_obtain 的 source 值） */
function obtainSourceLabel(v: unknown): string {
  switch (v) {
    case 'initial':
      return '初始赠送'
    case 'shop':
      return '商店兑换'
    case 'hatch':
      return '孵化'
    case 'breed':
      return '繁育'
    default:
      return v ? String(v) : '?'
  }
}

function payloadSummary(type: string, payload: unknown): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '-'
  const p = payload as Record<string, unknown>
  switch (type) {
    case 'levelup':
      return `升至 Lv.${p['level'] ?? '?'}`
    case 'evolve':
      return `进化（形态 ${p['to_stage'] ?? p['stage'] ?? '?'}）`
    case 'rename':
      return `${p['from'] ?? '?'} → ${p['to'] ?? '?'}`
    case 'release':
      return `送别（Lv.${p['level'] ?? '?'}，补偿 ${p['gold_comp'] ?? 0} 金）`
    case 'obtain':
      return `破壳获得（${obtainSourceLabel(p['source'])}${p['pool'] ? ` · 蛋池 ${p['pool']}` : ''}）`
    case 'refine_reassigned': {
      // after 为重掷后的四维分配（总值守恒），refine_points_left 为剩余洗练点
      const after = p['after'] as Record<string, unknown> | undefined
      const attrs = after
        ? Object.entries(PET_ATTR_LABELS)
            .map(([key, label]) => `${label} ${after[key] ?? 0}`)
            .join(' / ')
        : '?'
      return `天赋重掷（${attrs} · 剩余洗练点 ${p['refine_points_left'] ?? '?'}）`
    }
    case 'trait_wash':
      return '特性洗练，天赋特性焕然一新'
    case 'adventure_memory':
      // 求援被救回的变体只有 rescued_by；正常结算带收益四元组
      if (p['rescued_by']) {
        return `历险中被${p['rescued_by'] === 'npc' ? 'NPC' : p['rescued_by']}救回`
      }
      return `完成冒险（${tierLabel(p['tier'])} · ${spotLabel(p['spot'])}）：经验 +${p['exp'] ?? 0} · 金币 +${p['gold'] ?? 0} · 结果：${
        PET_ADVENTURE_RESULT_LABELS[String(p['result'])] ?? String(p['result'] ?? '?')
      }`
    case 'adventure_failed':
      return `历险遇险（${tierLabel(p['tier'])} · ${spotLabel(p['spot'])}），所幸平安归来`
    case 'adventure_recalled':
      return `旅程未完被召回（${tierLabel(p['tier'])} · ${spotLabel(p['spot'])}）`
    default:
      return JSON.stringify(payload)
  }
}

const PetTimelineLogs: React.FC = () => {
  const { hasPermission } = usePermission()
  const canRead = hasPermission('admin:pet:list')

  const [rows, setRows] = useState<PetTimelineLogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

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
      render: (v: string) => formatDateTimeMinute(v),
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
      width: 96,
      render: (v: string) => {
        const m = PET_TIMELINE_EVENT_META[v]
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
      render: (_, r) => payloadSummary(r.event_type, r.payload),
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
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadRows}>
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
        pagination={{ pageSize: PET_TABLE_PAGE_SIZE, showSizeChanger: false }}
        size="middle"
      />
    </div>
  )
}

export default PetTimelineLogs
