import React, { useCallback, useEffect, useState } from 'react'
import { Table, Alert, Card, Button, Space, Tag, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetPersonalityRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { petPersonalityService } from '../../services/petService'
import { PET_ATTR_LABELS, PET_TABLE_PAGE_SIZE } from '../../constants/pet'
import PersonalityFormModal, { type PersonalityFormValues } from './PersonalityFormModal'
import common from '../../styles/common.module.css'

// ==================== 性格字典（pet_personalities） ====================
//
// 孵化时按 condition（{attr:阈值} 全维度 ≥ AND）筛候选，weight 加权随机；
// 种子 4 条（lively/calm/brave/timid）默认停用。App 端 summary 以
// personality_code 关联展示性格名。

const PetPersonalities: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetPersonalityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetPersonalityRow | null>(null)

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petPersonalityService.findAll()
    if (!res.success) return setLoading(false)
    setRows(res.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (values: PersonalityFormValues) => {
    setSaving(true)
    try {
      const payload = {
        code: values.code,
        name_cn: values.name_cn,
        description: values.description || null,
        condition: values.condition,
        weight: Number(values.weight) || 100,
        enabled: !!values.enabled,
      }
      const res = editing
        ? await petPersonalityService.update(editing.id, payload as never)
        : await petPersonalityService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await petPersonalityService.delete(id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns: ColumnsType<PetPersonalityRow> = [
    {
      title: '编码',
      dataIndex: 'code',
      width: 110,
      render: (v: string) => <Tag color="geekblue">{v}</Tag>,
    },
    { title: '中文名', dataIndex: 'name_cn', width: 100 },
    { title: '描述', dataIndex: 'description', ellipsis: true, render: (v: string | null) => v ?? '-' },
    {
      title: '属性条件',
      dataIndex: 'condition',
      width: 260,
      render: (v: Record<string, unknown>) => {
        const entries = Object.entries(v ?? {})
        if (entries.length === 0) return <Tag>无条件</Tag>
        return (
          <Space wrap size={4}>
            {entries.map(([k, val]) => (
              <Tag key={k} color="cyan">
                {PET_ATTR_LABELS[k] ?? k} ≥ {String(val)}
              </Tag>
            ))}
          </Space>
        )
      },
    },
    { title: '权重', dataIndex: 'weight', width: 80 },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    getActionColumn<PetPersonalityRow>((record) => [
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
        confirm: '确认删除该性格？已关联宠物的性格名展示将回退编码',
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
        message="性格字典说明"
        description="孵化时按属性条件匹配性格：condition 为 {维度: 阈值}，宠物四维全部 ≥ 阈值（AND）才进入候选，再按权重加权随机定一个。种子 4 条默认停用，属性系统稳定后再逐条放开。编码创建后不可修改。"
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
            新增性格
          </Button>
        </div>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: PET_TABLE_PAGE_SIZE, showSizeChanger: false }}
        size="middle"
        scroll={{ x: 900 }}
      />
      <PersonalityFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default PetPersonalities
