import React, { useCallback, useEffect, useState } from 'react'
import { Button, Card, Empty, Select, Space, Table, Tag, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetEvoStageRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { petEvoStageService, petItemService, petSpeciesService } from '../../services/petService'
import { getActionColumn } from '../../components/common/ActionColumn'
import { PET_PICK_MODE_COLORS, PET_PICK_MODE_LABELS, PET_TABLE_PAGE_SIZE } from '../../constants/pet'
import { asArray } from '../../components/form/pet/editors/shared'
import StageFormModal, { type StageFormValues } from './StageFormModal'
import type { ChainOption } from './ChainsTab'
import common from '../../styles/common.module.css'

// ==================== 进化阶段（pet_evo_stages，Tab 2：按链过滤） ====================

const conditionsSummary = (value: unknown): string => {
  const rows = asArray(value)
  if (rows.length === 0) return '无条件'
  return rows
    .map((r) => {
      const type = String(r.type ?? '?')
      if (type === 'item') return `道具 ${String(r.item ?? r.item_id ?? '?')}×${String(r.cost ?? 1)}`
      return `${type} ≥ ${String(r.value ?? r.target ?? '?')}`
    })
    .join('、')
}

const StagesTab: React.FC<{
  chains: ChainOption[]
  chainId: string
  onChainChange: (chainId: string) => void
}> = ({ chains, chainId, onChainChange }) => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetEvoStageRow[]>([])
  const [species, setSpecies] = useState<Array<{ value: string; label: string }>>([])
  const [items, setItems] = useState<Array<{ item_code: string; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetEvoStageRow | null>(null)

  const loadRows = useCallback(async () => {
    if (!chainId) {
      setRows([])
      return
    }
    setLoading(true)
    const res = await petEvoStageService.findByChain(chainId)
    setLoading(false)
    if (!res.success) return
    setRows(res.data ?? [])
  }, [chainId])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  useEffect(() => {
    petSpeciesService.findAll().then((res) => {
      if (res.success && res.data) {
        setSpecies(
          res.data.map((s) => ({ value: s.id, label: `${s.name_cn}（${s.species_code}）` }))
        )
      }
    })
    petItemService.findAll().then((res) => {
      if (res.success && res.data) {
        setItems(res.data.map((i) => ({ item_code: i.item_code, name: i.name })))
      }
    })
  }, [])

  const speciesLabel = (id: string) =>
    species.find((s) => s.value === id)?.label ?? id.slice(0, 8)

  const handleSave = async (values: StageFormValues) => {
    setSaving(true)
    try {
      const payload = {
        chain_id: values.chain_id,
        stage: Number(values.stage) || 0,
        species_id: values.species_id,
        branch_key: values.branch_key?.trim() || 'main',
        branch_weight: Number(values.branch_weight) || 0,
        pick_mode: values.pick_mode,
        conditions: values.conditions as never,
      }
      const res = editing
        ? await petEvoStageService.update(editing.id, payload as never)
        : await petEvoStageService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record: PetEvoStageRow) => {
    const res = await petEvoStageService.delete(record.id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns: ColumnsType<PetEvoStageRow> = [
    { title: '阶段', dataIndex: 'stage', width: 70 },
    {
      title: '目标形态',
      dataIndex: 'species_id',
      render: (v: string) => speciesLabel(v),
      ellipsis: true,
    },
    { title: '分支', dataIndex: 'branch_key', width: 100 },
    {
      title: '抉择模式',
      dataIndex: 'pick_mode',
      width: 110,
      render: (v: string) => (
        <Tag color={PET_PICK_MODE_COLORS[v] ?? 'default'}>{PET_PICK_MODE_LABELS[v] ?? v}</Tag>
      ),
    },
    { title: '权重', dataIndex: 'branch_weight', width: 70 },
    {
      title: '进化条件',
      dataIndex: 'conditions',
      render: (v: unknown) => conditionsSummary(v),
      ellipsis: true,
    },
    getActionColumn<PetEvoStageRow>((record) => [
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
        confirm: '确认删除该阶段行？删除后该链此阶段不可进化（PET_EVOLVE_AT_END）',
        onClick: () => handleDelete(record),
      },
    ]),
  ]

  return (
    <>
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Select
              className={common.sel300}
              value={chainId || undefined}
              placeholder="选择进化链"
              showSearch
              optionFilterProp="label"
              options={chains.map((c) => ({ value: c.id, label: c.code }))}
              onChange={onChainChange}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadRows}>
              刷新
            </Button>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canWrite || !chainId}
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            新增阶段
          </Button>
        </div>
      </Card>
      {!chainId ? (
        <Empty description="请先选择进化链" />
      ) : (
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: PET_TABLE_PAGE_SIZE, showSizeChanger: false }}
          size="middle"
          scroll={{ x: 1000 }}
        />
      )}
      <StageFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        chainId={chainId}
        chains={chains}
        species={species}
        items={items}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </>
  )
}

export default StagesTab
