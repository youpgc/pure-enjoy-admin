import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Input, Select, Space, Table, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { PetTraitRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { petSpeciesService, petTraitService } from '../../services/petService'
import { PET_FAMILY_LABELS, PET_FAMILY_OPTIONS, PET_TABLE_PAGE_SIZE } from '../../constants/pet'
import { buildTraitColumns } from './columns'
import TraitFormModal, { type TraitFormValues } from './TraitFormModal'
import common from '../../styles/common.module.css'

// ==================== 特性池管理（pet_traits，P2 特性体系） ====================
//
// 掷取发生在服务端 _pet_trait_roll（孵化/繁育时结算，写进 pet_pets.trait_id），
// 概率只在服务端判定；本表 enabled=false 即从池中剔除，不影响存量宠物。

const PetTraits: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetTraitRow[]>([])
  const [speciesOptions, setSpeciesOptions] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetTraitRow | null>(null)
  const [keyword, setKeyword] = useState('')
  const [familyFilter, setFamilyFilter] = useState('')
  const [enabledFilter, setEnabledFilter] = useState('')

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petTraitService.findAll()
    setLoading(false)
    if (!res.success) return
    setRows(res.data ?? [])
  }, [])

  const loadSpecies = useCallback(async () => {
    const res = await petSpeciesService.findAll()
    if (!res.success || !res.data) return
    setSpeciesOptions(
      res.data.map((s) => ({ value: s.species_code, label: `${s.name_cn}（${s.species_code}）` }))
    )
  }, [])

  useEffect(() => {
    loadRows()
    loadSpecies()
  }, [loadRows, loadSpecies])

  const filtered = rows.filter((r) => {
    const kw = keyword.trim().toLowerCase()
    const hitKeyword = !kw || `${r.code} ${r.name}`.toLowerCase().includes(kw)
    const hitFamily =
      !familyFilter ||
      (familyFilter === '__global__' ? !r.family : r.family === familyFilter)
    const hitEnabled =
      !enabledFilter || (enabledFilter === 'on' ? r.enabled : !r.enabled)
    return hitKeyword && hitFamily && hitEnabled
  })

  const handleSave = async (values: TraitFormValues) => {
    setSaving(true)
    try {
      const payload = {
        code: values.code.trim(),
        name: values.name.trim(),
        effect_type: values.effect_type.trim(),
        effect_params: values.effect_params as never,
        weight: Number(values.weight) || 0,
        family: values.family || null,
        species_code: values.species_code?.trim() || null,
        enabled: !!values.enabled,
      }
      const res = editing
        ? await petTraitService.update(editing.id, payload as never)
        : await petTraitService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record: PetTraitRow) => {
    const res = await petTraitService.delete(record.id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns = buildTraitColumns({
    canWrite,
    canDelete,
    onEdit: (record) => {
      setEditing(record)
      setModalOpen(true)
    },
    onDelete: handleDelete,
  })

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="特性池说明"
        description="特性在孵化/繁育时由服务端加权随机掷取（三级池优先级：种属 > 体系 > 全局，未命中任何池则宠物无特性）。权重是池内相对值，不是百分比。effect_type/effect_params 值域待 P2 定版，当前服务端只掷不读。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Input
              style={{ width: 200 }}
              allowClear
              placeholder="搜索编码 / 名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select
              style={{ width: 160 }}
              value={familyFilter}
              onChange={setFamilyFilter}
              options={[
                { value: '', label: '全部归属池' },
                { value: '__global__', label: '仅全局池' },
                ...PET_FAMILY_OPTIONS.map((o) => ({
                  value: o.value,
                  label: `体系：${PET_FAMILY_LABELS[o.value] ?? o.value}`,
                })),
              ]}
            />
            <Select
              style={{ width: 130 }}
              value={enabledFilter}
              onChange={setEnabledFilter}
              options={[
                { value: '', label: '全部状态' },
                { value: 'on', label: '已启用' },
                { value: 'off', label: '已停用' },
              ]}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadRows}>
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
            新增特性
          </Button>
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
      <TraitFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        speciesOptions={speciesOptions}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default PetTraits
