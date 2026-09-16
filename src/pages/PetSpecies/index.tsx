import React, { useCallback, useEffect, useState } from 'react'
import { Table, Alert, Card, Button, Select, Space, Tag, message, Input } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetSpeciesRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { petSpeciesService, petRarityService } from '../../services/petService'
import { PET_FAMILY_LABELS, PET_FAMILY_OPTIONS } from '../../constants/pet'
import SpeciesFormModal, { type SpeciesFormValues } from './SpeciesFormModal'
import common from '../../styles/common.module.css'

// ==================== 种属/形态管理（pet_species） ====================
// 素材灰度闸门：预埋行 enabled=false，素材到位+配置接线后再启用（App 仅展示启用种属）。

const RARITY_COLORS: Record<string, string> = {
  N: 'default',
  R: 'blue',
  SR: 'purple',
  SSR: 'gold',
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

  // 客户端过滤（配置表量级 ≤ 120 行 + 后续按需扩容）
  const filtered = rows.filter(
    (r) =>
      (!familyFilter || r.family === familyFilter) &&
      (!rarityFilter || r.rarity_code === rarityFilter) &&
      (!codeFilter || r.species_code.toLowerCase().includes(codeFilter.trim().toLowerCase()))
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

  const columns: ColumnsType<PetSpeciesRow> = [
    { title: '编码', dataIndex: 'species_code', width: 140 },
    {
      title: '体系',
      dataIndex: 'family',
      width: 80,
      render: (v: string) => PET_FAMILY_LABELS[v] ?? v,
    },
    { title: '名称', dataIndex: 'name_cn', width: 120 },
    {
      title: '评级',
      dataIndex: 'rarity_code',
      width: 90,
      render: (v: string) => (
        <Tag color={RARITY_COLORS[v] ?? 'default'}>{rarityLabel(v)}</Tag>
      ),
    },
    {
      title: '3D 配置',
      dataIndex: 'render3d',
      width: 110,
      render: (v: Record<string, unknown>) =>
        v && v.code ? <Tag color="geekblue">{String(v.code)}</Tag> : <Tag>未配置</Tag>,
    },
    { title: '素材版本', dataIndex: 'asset_version', width: 90, render: (v: string | null) => v ?? '-' },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>预埋</Tag>),
    },
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    getActionColumn<PetSpeciesRow>((record) => [
      {
        key: 'edit',
        label: '编辑',
        disabled: !canWrite,
        onClick: () => {
          setEditing(record)
          setModalOpen(true)
        },
      },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        disabled: !canDelete,
        confirm: '确认删除该种属？关联资产配置将一并失效',
        onClick: () => handleDelete(record.id),
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
        description="命名即契约：species_code 同时是 App 与素材管线的引用键；预埋行保持「停用」，素材到位后编辑接线 render3d/render2d 并启用（灰度）。"
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
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="middle"
        scroll={{ x: 900 }}
      />
      <SpeciesFormModal
        open={modalOpen}
        editing={editing}
        rarityOptions={rarityOptions}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default PetSpecies
