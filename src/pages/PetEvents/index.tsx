import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Input, Select, Space, Table, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { PetRandomEventRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { petRandomEventService } from '../../services/petService'
import { buildEventColumns } from './columns'
import EventFormModal, { type EventFormValues } from './EventFormModal'
import common from '../../styles/common.module.css'

// ==================== 随机事件管理（pet_random_events，P2 随机事件配置） ====================
//
// 单表模型：选项与奖惩包内嵌在 content（无 pet_events / pet_event_choices 两表）。
// 触发与结算 RPC 属 P2 未启动项，本页先行铺数据。

const PetEvents: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetRandomEventRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetRandomEventRow | null>(null)
  const [keyword, setKeyword] = useState('')
  const [enabledFilter, setEnabledFilter] = useState('')

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petRandomEventService.findAll()
    setLoading(false)
    if (!res.success) return
    setRows(res.data ?? [])
  }, [])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const filtered = rows.filter((r) => {
    const kw = keyword.trim().toLowerCase()
    const hitKeyword = !kw || `${r.code} ${r.context}`.toLowerCase().includes(kw)
    const hitEnabled = !enabledFilter || (enabledFilter === 'on' ? r.enabled : !r.enabled)
    return hitKeyword && hitEnabled
  })

  const handleSave = async (values: EventFormValues) => {
    setSaving(true)
    try {
      const payload = {
        code: values.code.trim(),
        context: values.context.trim(),
        weight: Number(values.weight) || 0,
        content: values.content as never,
        enabled: !!values.enabled,
      }
      const res = editing
        ? await petRandomEventService.update(editing.id, payload as never)
        : await petRandomEventService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record: PetRandomEventRow) => {
    const res = await petRandomEventService.delete(record.id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns = buildEventColumns({
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
        message="随机事件说明"
        description="事件为单表模型：文案、2~3 个选项与各选项奖惩包都存在「事件内容」JSON 里（无选项子表）。触发上下文的取值范围与内容结构尚未定版，且服务端结算 RPC 尚未实装——本页配置属于「先铺数据」，启用开关不代表 App 已会弹出事件。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Input
              style={{ width: 220 }}
              allowClear
              placeholder="搜索编码 / 上下文"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
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
            新增事件
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
      <EventFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default PetEvents
