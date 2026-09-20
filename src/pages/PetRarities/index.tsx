import React, { useCallback, useEffect, useState } from 'react'
import { Table, Alert, Card, Button, Space, Tag, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetRarityRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { petRarityService } from '../../services/petService'
import RarityFormModal, { type RarityFormValues } from './RarityFormModal'
import common from '../../styles/common.module.css'

// ==================== 评级字典（pet_rarities） ====================
//
// N/R/SR/SSR 四行种子；growth_factor 成长系数 + refine_base 洗练点评级基准
// （2026-09-17 属性系统新增列）。code 为字典键，编辑态锁定。

const PetRarities: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')

  const [rows, setRows] = useState<PetRarityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetRarityRow | null>(null)

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petRarityService.findAll()
    if (!res.success) return setLoading(false)
    setRows(res.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (values: RarityFormValues) => {
    setSaving(true)
    try {
      const payload = {
        code: values.code,
        name_cn: values.name_cn,
        growth_factor: Number(values.growth_factor) || 0,
        refine_base: Number(values.refine_base) || 0,
        potential_min: values.potential_min ?? null,
        potential_max: values.potential_max ?? null,
        sort_order: Number(values.sort_order) || 0,
      }
      const res = editing
        ? await petRarityService.updateByCode(editing.code, payload as never)
        : await petRarityService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnsType<PetRarityRow> = [
    {
      title: '编码',
      dataIndex: 'code',
      width: 100,
      render: (v: string) => <Tag color="geekblue">{v}</Tag>,
    },
    { title: '中文名', dataIndex: 'name_cn', width: 120 },
    { title: '成长系数', dataIndex: 'growth_factor', width: 110 },
    {
      title: '每级洗练点基准',
      dataIndex: 'refine_base',
      width: 150,
      render: (v: number) => (v > 0 ? <Tag color="gold">{v} 点/级</Tag> : <Tag>0</Tag>),
    },
    {
      title: '潜力区间覆盖',
      dataIndex: 'potential_min',
      width: 130,
      render: (_: unknown, record: PetRarityRow) =>
        record.potential_min == null && record.potential_max == null ? (
          <Tag>种属默认</Tag>
        ) : (
          <Tag color="purple">
            {record.potential_min ?? '…'}–{record.potential_max ?? '…'}
          </Tag>
        ),
    },
    { title: '排序', dataIndex: 'sort_order', width: 80 },
    getActionColumn<PetRarityRow>((record) => [
      {
        key: 'edit',
        label: '编辑',
        disabled: !canWrite,
        onClick: () => {
          setEditing(record)
          setModalOpen(true)
        },
      },
    ]),
  ]

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="评级字典说明"
        description="评级为宠物稀有度字典：growth_factor 参与属性成长计算；refine_base 为升级洗练点发放的评级基准（洗练点 = 种属 base + 评级 refine_base + 潜力加成档，三因子在种属管理页配置）；potential_min/max 可选覆盖孵化潜力区间（留空用种属 hatch_config 配置）。code 为字典键，创建后不可修改。"
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
            新增评级
          </Button>
        </div>
      </Card>
      <Table
        rowKey="code"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        size="middle"
        scroll={{ x: 700 }}
      />
      <RarityFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default PetRarities
