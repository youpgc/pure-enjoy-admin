import React, { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input, Select, Space, Table, message } from 'antd'
import { PartitionOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetEvoChainRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { petEvoChainService } from '../../services/petService'
import { getActionColumn } from '../../components/common/ActionColumn'
import { PET_FAMILY_LABELS, PET_FAMILY_OPTIONS } from '../../constants/pet'
import ChainFormModal, { type ChainFormValues } from './ChainFormModal'
import common from '../../styles/common.module.css'

// ==================== 进化链主表（pet_evo_chains，Tab 1） ====================

export interface ChainOption {
  id: string
  code: string
  family: string
}

const ChainsTab: React.FC<{
  onRowsChange: (rows: ChainOption[]) => void
  onConfigureStages: (chainId: string) => void
}> = ({ onRowsChange, onConfigureStages }) => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetEvoChainRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetEvoChainRow | null>(null)
  const [keyword, setKeyword] = useState('')
  const [familyFilter, setFamilyFilter] = useState('')

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petEvoChainService.findAll()
    setLoading(false)
    if (!res.success) return
    const data = res.data ?? []
    setRows(data)
    onRowsChange(data.map((r) => ({ id: r.id, code: r.code, family: r.family })))
  }, [onRowsChange])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const filtered = rows.filter((r) => {
    const kw = keyword.trim().toLowerCase()
    const hitKeyword = !kw || r.code.toLowerCase().includes(kw)
    return hitKeyword && (!familyFilter || r.family === familyFilter)
  })

  const handleSave = async (values: ChainFormValues) => {
    setSaving(true)
    try {
      const payload = {
        code: values.code.trim(),
        family: values.family,
        max_stage: Number(values.max_stage) || 0,
      }
      const res = editing
        ? await petEvoChainService.update(editing.id, payload as never)
        : await petEvoChainService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record: PetEvoChainRow) => {
    const res = await petEvoChainService.delete(record.id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns: ColumnsType<PetEvoChainRow> = [
    { title: '链编码', dataIndex: 'code', width: 220 },
    {
      title: '体系',
      dataIndex: 'family',
      width: 100,
      render: (v: string) => PET_FAMILY_LABELS[v] ?? v,
    },
    { title: '最高阶段', dataIndex: 'max_stage', width: 110 },
    getActionColumn<PetEvoChainRow>((record) => [
      {
        key: 'stages',
        label: '配置阶段',
        icon: <PartitionOutlined />,
        onClick: () => onConfigureStages(record.id),
      },
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
        confirm: '确认删除该链？被种属挂载或仍有阶段行时外键会拦截，请先解绑/删阶段',
        onClick: () => handleDelete(record),
      },
    ]),
  ]

  return (
    <>
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Input
              style={{ width: 220 }}
              allowClear
              placeholder="搜索链编码"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select
              style={{ width: 130 }}
              value={familyFilter}
              onChange={setFamilyFilter}
              options={[{ value: '', label: '全部体系' }, ...PET_FAMILY_OPTIONS]}
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
            新增进化链
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
      />
      <ChainFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </>
  )
}

export default ChainsTab
