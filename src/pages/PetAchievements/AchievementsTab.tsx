import React, { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input, Select, Space, Table, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { PetAchievementRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { petAchievementService, petItemService } from '../../services/petService'
import { PET_ACH_TIER_OPTIONS, PET_TABLE_PAGE_SIZE } from '../../constants/pet'
import { buildAchievementColumns } from './columns'
import AchievementFormModal, { type AchievementFormValues } from './AchievementFormModal'
import common from '../../styles/common.module.css'

// ==================== 成就配置（Tab 1，pet_achievements CRUD） ====================

export interface AchievementOption {
  id: string
  code: string
  title: string
}

const PAGE_SIZE = PET_TABLE_PAGE_SIZE

const AchievementsTab: React.FC<{ onRowsChange: (rows: AchievementOption[]) => void }> = ({
  onRowsChange,
}) => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetAchievementRow[]>([])
  const [items, setItems] = useState<Array<{ item_code: string; name: string; category: string }>>(
    []
  )
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetAchievementRow | null>(null)
  const [keyword, setKeyword] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [enabledFilter, setEnabledFilter] = useState('')

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petAchievementService.findAll()
    setLoading(false)
    if (!res.success) return
    const data = res.data ?? []
    setRows(data)
    onRowsChange(data.map((r) => ({ id: r.id, code: r.code, title: r.title })))
  }, [onRowsChange])

  const loadItems = useCallback(async () => {
    const res = await petItemService.findAll()
    if (!res.success || !res.data) return
    setItems(res.data.map((i) => ({ item_code: i.item_code, name: i.name, category: i.category })))
  }, [])

  useEffect(() => {
    loadRows()
    loadItems()
  }, [loadRows, loadItems])

  const filtered = rows.filter((r) => {
    const kw = keyword.trim().toLowerCase()
    const hitKeyword = !kw || `${r.code} ${r.title}`.toLowerCase().includes(kw)
    const hitTier = !tierFilter || r.tier === tierFilter
    const hitEnabled = !enabledFilter || (enabledFilter === 'on' ? r.enabled : !r.enabled)
    return hitKeyword && hitTier && hitEnabled
  })

  const handleSave = async (values: AchievementFormValues) => {
    setSaving(true)
    try {
      const payload = {
        code: values.code.trim(),
        title: values.title.trim(),
        icon: values.icon?.trim() || null,
        condition_type: values.condition_type,
        condition_value: values.condition_value as never,
        reward_package: values.reward_package as never,
        tier: values.tier,
        sort_order: Number(values.sort_order) || 0,
        enabled: !!values.enabled,
      }
      const res = editing
        ? await petAchievementService.update(editing.id, payload as never)
        : await petAchievementService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record: PetAchievementRow) => {
    const res = await petAchievementService.delete(record.id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns = buildAchievementColumns({
    canWrite,
    canDelete,
    onEdit: (record) => {
      setEditing(record)
      setModalOpen(true)
    },
    onDelete: handleDelete,
  })

  return (
    <>
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
              style={{ width: 130 }}
              value={tierFilter}
              onChange={setTierFilter}
              options={[{ value: '', label: '全部档位' }, ...PET_ACH_TIER_OPTIONS]}
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
            新增成就
          </Button>
        </div>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: PAGE_SIZE, showSizeChanger: false }}
        size="middle"
        scroll={{ x: 1100 }}
      />
      <AchievementFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        items={items}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </>
  )
}

export default AchievementsTab
