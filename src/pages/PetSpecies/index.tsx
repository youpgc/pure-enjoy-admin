import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Table, Alert, Card, Button, Select, Space, Tag, message, Input, Tooltip } from 'antd'
import { PlusOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetSpeciesRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { petSpeciesService, petRarityService } from '../../services/petService'
import { PET_FAMILY_LABELS, PET_FAMILY_OPTIONS } from '../../constants/pet'
import SpeciesFormModal, { type SpeciesFormValues } from './SpeciesFormModal'
import SpeciesPreviewModal from './SpeciesPreviewModal'
import common from '../../styles/common.module.css'

// ==================== 种属/形态管理（pet_species，按进化链合并管理） ====================
//
// 2026-09-17 结构调整：同一种属不同阶（species_code 基础形 / _s1 / _s2，
// 同 evolution_chain_id）合并为一条数据管理——列表行 = 进化链（或独立种属），
// 形态列展示链内各阶；操作列新增「预览」：弹窗展示 3 阶段预览图（左右切换，默认基础形）。
// 编辑/删除仍然以行（基础形）为单位操作对应 pet_species 行。
// 启用状态即 App 展示闸门：新形态先完成素材接线（render2d/render3d）再启用。

const RARITY_COLORS: Record<string, string> = {
  N: 'default',
  R: 'blue',
  SR: 'purple',
  SSR: 'gold',
}

const STAGE_LABELS = ['基础形', '一阶', '二阶', '三阶', '四阶']

/** species_code → 阶段号（cat_ssr1 = 0 基础形，cat_ssr1_s1 = 1） */
const stageNum = (code: string): number => {
  const m = /_s(\d+)$/.exec(code)
  return m ? Number(m[1]) : 0
}

interface SpeciesGroup {
  /** 分组键：进化链 id，未挂链的独立种属用 solo:<id> */
  key: string
  /** 代表行（基础形；缺基础形时取排序号最小行） */
  base: PetSpeciesRow
  /** 全阶段行，按 阶段号 → sort_order 升序 */
  stages: PetSpeciesRow[]
}

const buildGroups = (rows: PetSpeciesRow[]): SpeciesGroup[] => {
  const map = new Map<string, PetSpeciesRow[]>()
  for (const r of rows) {
    const key = r.evolution_chain_id || `solo:${r.id}`
    const list = map.get(key) ?? []
    list.push(r)
    map.set(key, list)
  }
  const groups: SpeciesGroup[] = []
  for (const [key, list] of map) {
    const sorted = [...list].sort(
      (a, b) => stageNum(a.species_code) - stageNum(b.species_code) || a.sort_order - b.sort_order
    )
    const base =
      sorted.find((r) => stageNum(r.species_code) === 0) ?? sorted[0]
    if (!base) continue
    groups.push({ key, base, stages: sorted })
  }
  groups.sort((a, b) => a.base.sort_order - b.base.sort_order)
  return groups
}

const PetSpecies: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetSpeciesRow[]>([])
  const [rarities, setRarities] = useState<Array<{ code: string; name_cn: string }>>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetSpeciesRow | null>(null)
  const [previewGroup, setPreviewGroup] = useState<SpeciesGroup | null>(null)
  const [familyFilter, setFamilyFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [codeFilter, setCodeFilter] = useState('')

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petSpeciesService.findAll()
    if (!res.success) return setLoading(false) // service 已统一弹窗记日志
    setRows(res.data ?? [])
    setLoading(false)
  }, [])

  const loadRarities = useCallback(async () => {
    const res = await petRarityService.findAll()
    if (res.success) setRarities(res.data ?? [])
  }, [])

  useEffect(() => {
    loadRows()
    loadRarities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rarityOptions = rarities.map((r) => ({ value: r.code, label: `${r.name_cn}（${r.code}）` }))
  const rarityLabel = (code: string) => rarities.find((r) => r.code === code)?.name_cn ?? code

  // 客户端过滤（配置表量级 ≤ 120 行 + 后续按需扩容）后按链合并
  const groups = useMemo(
    () =>
      buildGroups(
        rows.filter(
          (r) =>
            (!familyFilter || r.family === familyFilter) &&
            (!rarityFilter || r.rarity_code === rarityFilter) &&
            (!codeFilter || r.species_code.toLowerCase().includes(codeFilter.trim().toLowerCase()))
        )
      ),
    [rows, familyFilter, rarityFilter, codeFilter]
  )

  const handleSave = async (values: SpeciesFormValues) => {
    setSaving(true)
    try {
      const payload = {
        species_code: values.species_code,
        family: values.family,
        name_cn: values.name_cn,
        rarity_code: values.rarity_code,
        base_attributes: values.base_attributes as unknown as Record<string, unknown>,
        // 空串归一为 null（uuid 列不留空串脏数据）
        evolution_chain_id: values.evolution_chain_id || null,
        render2d: values.render2d as unknown as Record<string, unknown>,
        render3d: values.render3d as unknown as Record<string, unknown>,
        asset_version: values.asset_version || null,
        enabled: !!values.enabled,
        sort_order: Number(values.sort_order) || 0,
      }
      const res = editing
        ? await petSpeciesService.update(editing.id, payload as never)
        : await petSpeciesService.create(payload as never)
      if (!res.success) return // service 已统一弹窗 + 记日志
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await petSpeciesService.delete(id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns: ColumnsType<SpeciesGroup> = [
    { title: '编码', dataIndex: ['base', 'species_code'], width: 140 },
    {
      title: '体系',
      dataIndex: ['base', 'family'],
      width: 80,
      render: (v: string) => PET_FAMILY_LABELS[v] ?? v,
    },
    {
      title: '名称',
      dataIndex: ['base', 'name_cn'],
      width: 120,
      render: (v: string, record) =>
        record.stages.length > 1 ? `${v}（${record.stages.length} 阶）` : v,
    },
    {
      title: '评级',
      dataIndex: ['base', 'rarity_code'],
      width: 90,
      render: (v: string) => (
        <Tag color={RARITY_COLORS[v] ?? 'default'}>{rarityLabel(v)}</Tag>
      ),
    },
    {
      title: '形态',
      dataIndex: 'stages',
      width: 220,
      render: (_: unknown, record: SpeciesGroup) => (
        <Space size={4} wrap>
          {record.stages.map((s) => (
            <Tooltip key={s.id} title={s.species_code}>
              <Tag color={s.enabled ? 'green' : 'default'}>
                {STAGE_LABELS[stageNum(s.species_code)] ?? s.species_code}
                {!s.enabled ? '·停用' : ''}
              </Tag>
            </Tooltip>
          ))}
          {record.stages.length === 1 ? <Tag>单形态</Tag> : null}
        </Space>
      ),
    },
    {
      title: '3D 配置',
      dataIndex: ['base', 'render3d'],
      width: 110,
      render: (v: Record<string, unknown>) =>
        v && v.code ? <Tag color="geekblue">{String(v.code)}</Tag> : <Tag>2D 展示</Tag>,
    },
    {
      title: '素材版本',
      dataIndex: ['base', 'asset_version'],
      width: 90,
      render: (v: string | null) => v ?? '-',
    },
    {
      title: '状态',
      dataIndex: ['base', 'enabled'],
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '排序', dataIndex: ['base', 'sort_order'], width: 70 },
    getActionColumn<SpeciesGroup>((record) => [
      {
        key: 'preview',
        label: '预览',
        icon: <EyeOutlined />,
        onClick: () => setPreviewGroup(record),
      },
      {
        key: 'edit',
        label: '编辑',
        disabled: !canWrite,
        onClick: () => {
          setEditing(record.base)
          setModalOpen(true)
        },
      },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        disabled: !canDelete,
        confirm: '确认删除该种属？关联资产配置将一并失效',
        onClick: () => handleDelete(record.base.id),
      },
    ]),
  ]

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="种属管理说明"
        description="同一种属不同阶段（基础形/一阶/二阶，同进化链）合并为一条数据管理；「预览」查看该种属各阶段形象（默认基础形，可左右切换）。命名即契约：species_code 同时是 App 与素材管线的引用键；新形态先配置 2D/3D 素材接线，再切换启用状态对 App 生效。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Select
              style={{ width: 140 }}
              value={familyFilter}
              onChange={setFamilyFilter}
              options={[{ value: '', label: '全部体系' }, ...PET_FAMILY_OPTIONS]}
            />
            <Select
              style={{ width: 140 }}
              value={rarityFilter}
              onChange={setRarityFilter}
              options={[{ value: '', label: '全部评级' }, ...rarityOptions]}
            />
            <Input.Search
              placeholder="按编码搜索"
              allowClear
              style={{ width: 200 }}
              onSearch={setCodeFilter}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => loadRows()}>
              刷新
            </Button>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canWrite}
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            新增种属
          </Button>
        </div>
      </Card>
      <Table
        rowKey="key"
        loading={loading}
        columns={columns}
        dataSource={groups}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="middle"
        scroll={{ x: 1100 }}
      />
      <SpeciesFormModal
        open={modalOpen}
        editing={editing}
        rarityOptions={rarityOptions}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
      <SpeciesPreviewModal
        open={previewGroup !== null}
        stages={previewGroup?.stages ?? []}
        onCancel={() => setPreviewGroup(null)}
      />
    </div>
  )
}

export default PetSpecies
