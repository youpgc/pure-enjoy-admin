import React, { useCallback, useEffect, useState } from 'react'
import { Table, Alert, Card, Button, Space, Tag, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetAdventureSpotRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { petAdventureSpotService } from '../../services/petService'
import { PET_ADVENTURE_RESULT_LABELS } from '../../constants/pet'
import SpotFormModal, { type SpotFormValues } from './SpotFormModal'
import common from '../../styles/common.module.css'

// ==================== 历险地管理（pet_adventure_spots） ====================

const PetAdventureSpots: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetAdventureSpotRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetAdventureSpotRow | null>(null)

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petAdventureSpotService.findAll()
    if (!res.success) return setLoading(false)
    setRows(res.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (values: SpotFormValues) => {
    setSaving(true)
    try {
      const payload = {
        code: values.code,
        name: values.name,
        unlock_conditions: values.unlock_conditions as unknown as unknown[],
        result_weights: values.result_weights as unknown as Record<string, unknown>,
        drop_table: values.drop_table as unknown as Record<string, unknown>,
        rescue_params: values.rescue_params as unknown as Record<string, unknown>,
        enabled: !!values.enabled,
        sort_order: Number(values.sort_order) || 0,
      }
      const res = editing
        ? await petAdventureSpotService.update(editing.id, payload as never)
        : await petAdventureSpotService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await petAdventureSpotService.delete(id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns: ColumnsType<PetAdventureSpotRow> = [
    { title: '编码', dataIndex: 'code', width: 150 },
    { title: '名称', dataIndex: 'name', width: 140 },
    {
      title: '解锁条件',
      dataIndex: 'unlock_conditions',
      render: (v: unknown[]) =>
        Array.isArray(v) && v.length > 0 ? JSON.stringify(v) : <Tag>无条件</Tag>,
      ellipsis: true,
    },
    {
      title: '结果权重',
      dataIndex: 'result_weights',
      width: 260,
      render: (v: Record<string, number>) =>
        v && Object.keys(v).length > 0 ? (
          <Space wrap size={4}>
            {Object.entries(v).map(([k, w]) => (
              <Tag key={k}>
                {PET_ADVENTURE_RESULT_LABELS[k] ?? k} {w}
              </Tag>
            ))}
          </Space>
        ) : (
          <Tag>空</Tag>
        ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    getActionColumn<PetAdventureSpotRow>((record) => [
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
        confirm: '确认删除该历险地？进行中的历险实例不受影响',
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
        message="历险地说明"
        description="历险三档时长（短途/中途/长途）在「全局参数」页配置；本页配置各地点的解锁条件、四类结果权重（play/danger/help/memory）、掉落包与救助参数。遇险后先自救，超窗 NPC 兜底（rescue_params）。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
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
            新增历险地
          </Button>
        </div>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        size="middle"
        scroll={{ x: 1000 }}
      />
      <SpotFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default PetAdventureSpots
