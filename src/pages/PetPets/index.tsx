import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Space, Table, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetPetRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { petPetAdminService, petPersonalityService } from '../../services/petService'
import { userService } from '../../services/userService'
import type { PetPersonalityRow } from '../../types/pet'
import { PET_TABLE_PAGE_SIZE } from '../../constants/pet'
import { useUsernames } from '../../hooks/useUsernames'
import { UserName } from '../../components/common/UserName'
import common from '../../styles/common.module.css'

// ==================== 宠物个体查询（pet_pets，只读） ====================
//
// 2026-10-08 复审 B4：客服排查用（昵称/等级/状态/四维/健康/性格，按用户搜索）。
// 无写操作——昵称/状态等变更仍走各自业务通道，避免客服侧出现第二写入路径。

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  rearing: { text: '养育中', color: 'green' },
  adventuring: { text: '历险中', color: 'blue' },
  breeding: { text: '繁育中', color: 'purple' },
  released: { text: '已放生', color: 'default' },
  fostered: { text: '寄养', color: 'orange' },
}

const RARITY_COLORS: Record<string, string> = {
  N: 'default',
  R: 'blue',
  SR: 'purple',
  SSR: 'gold',
}

/** base||bonus 合并当前值（与 App/summary 同口径） */
function mergedAttrs(row: PetPetRow): Record<string, number> {
  const out: Record<string, number> = {}
  for (const src of [row.base_attributes, row.bonus_attributes]) {
    if (src && typeof src === 'object' && !Array.isArray(src)) {
      for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
        if (typeof v === 'number') out[k] = (out[k] ?? 0) + v
      }
    }
  }
  return out
}

const PetPets: React.FC = () => {
  const { hasPermission } = usePermission()
  const canRead = hasPermission('pets:read')

  const [rows, setRows] = useState<PetPetRow[]>([])
  const [personalities, setPersonalities] = useState<PetPersonalityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  const loadRows = useCallback(async () => {
    setLoading(true)
    const [petsRes, perRes] = await Promise.all([
      petPetAdminService.listPets(),
      petPersonalityService.findAll(),
    ])
    setLoading(false)
    if (!petsRes.success) return
    setRows(petsRes.data ?? [])
    if (perRes.success) setPersonalities(perRes.data ?? [])
  }, [])

  useEffect(() => {
    if (canRead) loadRows()
  }, [canRead, loadRows])

  const keywordTrim = keyword.trim().toLowerCase()
  // 用户关键字 → 用户 ID 集（异步解析；空关键字为 null = 不过滤用户维度）
  const [resolvedIds, setResolvedIds] = useState<string[] | null>(null)
  useEffect(() => {
    let alive = true
    if (!keywordTrim) {
      setResolvedIds(null)
      return
    }
    userService.findUserIdsByKeyword(keywordTrim).then((res) => {
      if (alive) setResolvedIds(res.success ? res.data ?? [] : [])
    })
    return () => {
      alive = false
    }
  }, [keywordTrim])

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const hitUser =
          resolvedIds === null || (resolvedIds.length > 0 && resolvedIds.includes(r.user_id))
        const hitText =
          !keywordTrim ||
          `${r.show_no} ${r.nickname ?? ''} ${r.species?.name_cn ?? ''}`
            .toLowerCase()
            .includes(keywordTrim)
        // 关键字只在"用户命中 或 文本命中"时任一满足即可
        return (resolvedIds !== null && hitUser) || hitText
      }),
    [rows, keywordTrim, resolvedIds]
  )

  const ids = filtered.slice(0, 50).map((r) => r.user_id)
  const userMap = useUsernames(ids)
  const perMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of personalities) m.set(p.code, p.name_cn)
    return m
  }, [personalities])

  const columns: ColumnsType<PetPetRow> = [
    {
      title: '用户',
      dataIndex: 'user_id',
      width: 160,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    { title: '编号', dataIndex: 'show_no', width: 100 },
    {
      title: '昵称',
      key: 'name',
      width: 130,
      ellipsis: true,
      render: (_, r) => r.nickname || r.species?.name_cn || '-',
    },
    {
      title: '种属',
      key: 'species',
      width: 140,
      render: (_, r) =>
        r.species ? (
          <Space size={4}>
            <span>{r.species.name_cn}</span>
            <Tag color={RARITY_COLORS[r.species.rarity_code] ?? 'default'}>
              {r.species.rarity_code}
            </Tag>
          </Space>
        ) : (
          '-'
        ),
    },
    { title: '等级', dataIndex: 'level', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const s = STATUS_LABELS[v]
        return s ? <Tag color={s.color}>{s.text}</Tag> : v
      },
    },
    {
      title: '四维（智/体/力/敏）',
      key: 'attrs',
      width: 150,
      render: (_, r) => {
        const a = mergedAttrs(r)
        return `${a.intellect ?? 0}/${a.stamina ?? 0}/${a.strength ?? 0}/${a.agility ?? 0}`
      },
    },
    {
      title: '健康',
      dataIndex: 'health',
      width: 70,
      render: (v: number) => <span style={{ color: v <= 30 ? '#cf1322' : undefined }}>{v}</span>,
    },
    {
      title: '亲密',
      dataIndex: 'intimacy',
      width: 70,
    },
    {
      title: '性格',
      dataIndex: 'personality_code',
      width: 110,
      render: (v: string | null) => (v ? perMap.get(v) ?? v : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN', { hour12: false }),
    },
  ]

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="宠物个体（只读查询）"
        description="客诉排查用：昵称/等级/状态/四维/健康/性格。支持按用户（昵称/邮箱关键字）、宠物编号、昵称、种属名过滤。本页无写操作；四维为 base+bonus 合并值。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Input
              style={{ width: 260 }}
              allowClear
              placeholder="搜索用户 / 编号 / 昵称 / 种属"
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

export default PetPets
