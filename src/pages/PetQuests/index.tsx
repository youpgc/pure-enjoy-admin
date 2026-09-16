import React, { useCallback, useEffect, useState } from 'react'
import { Table, Alert, Card, Button, Select, Space, Tag, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetQuestRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { petQuestService } from '../../services/petService'
import { PET_QUEST_TYPE_LABELS, PET_QUEST_DIFFICULTY_LABELS, PET_QUEST_DIFFICULTY_COLORS, PET_QUEST_TYPE_OPTIONS, PET_QUEST_DIFFICULTY_OPTIONS } from '../../constants/pet'
import QuestFormModal, { type QuestFormValues } from './QuestFormModal'
import common from '../../styles/common.module.css'

// ==================== 任务池管理（pet_quests：每日/每周任务配置） ====================

const PetQuests: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetQuestRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetQuestRow | null>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petQuestService.findAll()
    if (!res.success) return setLoading(false)
    setRows(res.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = rows.filter(
    (r) =>
      (!typeFilter || r.type === typeFilter) &&
      (!difficultyFilter || r.difficulty === difficultyFilter)
  )

  const handleSave = async (values: QuestFormValues) => {
    setSaving(true)
    try {
      const payload = {
        code: values.code,
        type: values.type,
        difficulty: values.difficulty,
        condition: values.condition as unknown as Record<string, unknown>,
        rewards: values.rewards as unknown as Record<string, unknown>,
        enabled: !!values.enabled,
        sort_order: Number(values.sort_order) || 0,
      }
      const res = editing
        ? await petQuestService.update(editing.id, payload as never)
        : await petQuestService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await petQuestService.delete(id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns: ColumnsType<PetQuestRow> = [
    { title: '编码', dataIndex: 'code', width: 160 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (v: string) => PET_QUEST_TYPE_LABELS[v] ?? v,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      width: 90,
      render: (v: string) => (
        <Tag color={PET_QUEST_DIFFICULTY_COLORS[v] ?? 'default'}>
          {PET_QUEST_DIFFICULTY_LABELS[v] ?? v}
        </Tag>
      ),
    },
    {
      title: '条件',
      dataIndex: 'condition',
      render: (v: Record<string, unknown>) =>
        v && v.type ? `${String(v.type)} · ${String(v.value ?? '-')}` : '-',
      ellipsis: true,
    },
    {
      title: '奖励',
      dataIndex: 'rewards',
      render: (v: Record<string, unknown>) =>
        v && Object.keys(v).length > 0 ? JSON.stringify(v) : '-',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    getActionColumn<PetQuestRow>((record) => [
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
        confirm: '确认删除该任务？已发放到用户侧的当日实例不受影响',
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
        message="任务池说明"
        description="每日任务由 App 端当日首次打开时按 pet_config.daily_task_draw_count 惰性抽取（启用中的任务池内随机）；周任务 P2 启用。奖励包 schema 与成就共用。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Select
              style={{ width: 120 }}
              value={typeFilter}
              onChange={setTypeFilter}
              options={[{ value: '', label: '全部类型' }, ...PET_QUEST_TYPE_OPTIONS]}
            />
            <Select
              style={{ width: 120 }}
              value={difficultyFilter}
              onChange={setDifficultyFilter}
              options={[{ value: '', label: '全部难度' }, ...PET_QUEST_DIFFICULTY_OPTIONS]}
            />
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
            新增任务
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
      <QuestFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default PetQuests
