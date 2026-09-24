import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Input, Select, Space, Table, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { PetSceneRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { petSceneService } from '../../services/petService'
import { PET_TABLE_PAGE_SIZE } from '../../constants/pet'
import { buildSceneColumns } from './columns'
import SceneFormModal, { type SceneFormValues } from './SceneFormModal'
import common from '../../styles/common.module.css'

// ==================== 场景管理（pet_scenes：宠物主页背景主题，P2 起售卖） ====================
//
// 口径：本页只维护「有哪些背景」。购买入口走道具统一阶梯——在道具管理新增
// bg_scene_id = 本表 scene_code 的道具并上架（DDL 无外键，靠运营手工对齐）。

const PetScenes: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetSceneRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetSceneRow | null>(null)
  const [keyword, setKeyword] = useState('')
  const [shelfFilter, setShelfFilter] = useState('')

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petSceneService.findAll()
    setLoading(false)
    if (!res.success) return
    setRows(res.data ?? [])
  }, [])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const filtered = rows.filter((r) => {
    const kw = keyword.trim().toLowerCase()
    const hitKeyword = !kw || `${r.scene_code} ${r.name}`.toLowerCase().includes(kw)
    const hitShelf =
      !shelfFilter || (shelfFilter === 'on' ? r.on_shelf : !r.on_shelf)
    return hitKeyword && hitShelf
  })

  const handleSave = async (values: SceneFormValues) => {
    setSaving(true)
    try {
      const raw = values.price_coin
      const payload = {
        scene_code: values.scene_code.trim(),
        name: values.name.trim(),
        asset_ref: values.asset_ref?.trim() || null,
        is_default: !!values.is_default,
        price_coin: raw === null || raw === undefined ? null : Number(raw),
        on_shelf: !!values.on_shelf,
      }
      const res = editing
        ? await petSceneService.update(editing.id, payload as never)
        : await petSceneService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record: PetSceneRow) => {
    const res = await petSceneService.delete(record.id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns = buildSceneColumns({
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
        message="场景说明"
        description="一期背景为 2D 图层，asset_ref 仅作资源标识；is_default = 用户未购买主题时的背景。上架开关需与道具侧配置同时成立，App 才展示购买入口。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Input
              style={{ width: 240 }}
              allowClear
              placeholder="搜索编码 / 名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select
              style={{ width: 140 }}
              value={shelfFilter}
              onChange={setShelfFilter}
              options={[
                { value: '', label: '全部上架状态' },
                { value: 'on', label: '已上架' },
                { value: 'off', label: '未上架' },
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
            新增场景
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
      <SceneFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default PetScenes
