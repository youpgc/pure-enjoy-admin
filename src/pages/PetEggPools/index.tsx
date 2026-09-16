import React, { useCallback, useEffect, useState } from 'react'
import { Table, Alert, Card, Button, Space, Tag, message, Modal, Descriptions } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetEggPoolRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { petEggPoolService } from '../../services/petService'
import { stringifyJson } from '../../utils/petJson'
import PoolFormModal, { type PoolFormValues } from './PoolFormModal'
import common from '../../styles/common.module.css'

// ==================== 蛋池与概率管理（pet_egg_pools） ====================
// 铁律：概率服务端判定 + config_version 审计；App 公示与判定同源（同版本）。

const PetEggPools: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetEggPoolRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetEggPoolRow | null>(null)
  const [preview, setPreview] = useState<PetEggPoolRow | null>(null)

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petEggPoolService.findAll()
    if (!res.success) return setLoading(false)
    setRows(res.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (values: PoolFormValues) => {
    setSaving(true)
    try {
      const payload = {
        pool_code: values.pool_code,
        config_version: Number(values.config_version) || 1,
        weights: values.weights as unknown as Record<string, unknown>,
        published: !!values.published,
      }
      const res = editing
        ? await petEggPoolService.update(editing.id, payload as never)
        : await petEggPoolService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await petEggPoolService.delete(id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns: ColumnsType<PetEggPoolRow> = [
    { title: '池编码', dataIndex: 'pool_code', width: 150 },
    { title: '配置版本', dataIndex: 'config_version', width: 100, render: (v: number) => `v${v}` },
    {
      title: '发布状态',
      dataIndex: 'published',
      width: 100,
      render: (v: boolean) => (v ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag>),
    },
    {
      title: '权重概览',
      dataIndex: 'weights',
      render: (v: Record<string, unknown>) =>
        v && Object.keys(v).length > 0 ? (
          <Space wrap size={4}>
            {Object.keys(v).map((k) => (
              <Tag key={k}>{k}</Tag>
            ))}
          </Space>
        ) : (
          <Tag>未配置</Tag>
        ),
    },
    getActionColumn<PetEggPoolRow>((record) => [
      {
        key: 'preview',
        label: '公示预览',
        disabled: !hasPermission('pets:read'),
        onClick: () => setPreview(record),
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
        confirm: '确认删除该蛋池？已发放蛋实例不受影响，但对应公示将缺失',
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
        message="蛋池概率说明"
        description="固定概率原则：概率判定只在服务端 RPC，判定结果写 pet_lottery_records（含 config_version）审计；App 端公示读取「已发布」版本的同一份 weights，公示与判定永远同源。改概率 = 递增 config_version 后再发布。"
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
            新增蛋池
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
      />
      <PoolFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
      <Modal
        title={`公示预览 · ${preview?.pool_code ?? ''} v${preview?.config_version ?? ''}`}
        open={preview !== null}
        footer={null}
        onCancel={() => setPreview(null)}
        width={560}
      >
        {preview && (
          <>
            <Descriptions size="small" column={2} className={common.mb16}>
              <Descriptions.Item label="发布状态">
                {preview.published ? <Tag color="green">已发布（App 可见）</Tag> : <Tag>草稿（App 不可见）</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="版本">v{preview.config_version}</Descriptions.Item>
            </Descriptions>
            <pre className={common.mb16} style={{ maxHeight: 360, overflow: 'auto', fontSize: 12 }}>
              {stringifyJson(preview.weights)}
            </pre>
          </>
        )}
      </Modal>
    </div>
  )
}

export default PetEggPools
