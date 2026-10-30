import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Table, Alert, Card, Button, Space, Select, Tag, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetEggPoolRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { petEggPoolService, petSpeciesService } from '../../services/petService'
import { PET_EGG_MODE_LABELS, PET_FAMILY_LABELS, PET_TABLE_PAGE_SIZE } from '../../constants/pet'
import { loadTabFilters, usePersistTabFilters } from '../../utils/tabFilterCache'
import PoolFormModal, { type PoolFormValues } from './PoolFormModal'
import OddsPreviewModal from './OddsPreviewModal'
import common from '../../styles/common.module.css'

// ==================== 蛋池与概率管理（pet_egg_pools） ====================
// 铁律：概率服务端判定 + config_version 审计；App 公示与判定同源（同版本）。

// weights 键结构与 PoolFormModal / rpc_pet_hatch_instant 消费同源
const FAMILY_LABELS = PET_FAMILY_LABELS

/** 权重概览 → 可读文本（替代纯键名 Tag）；speciesName 把种属码译为中文名 */
function weightsSummaryText(
  v: Record<string, unknown>,
  speciesName: (code: string) => string,
): string {
  const parts: string[] = []
  if (typeof v.fixed_species === 'string')
    parts.push(`固定产出 ${speciesName(v.fixed_species)}`)
  if (typeof v.mode === 'string') parts.push(`方式 ${PET_EGG_MODE_LABELS[v.mode] ?? v.mode}`)
  const rarity = v.rarity
  if (rarity && typeof rarity === 'object') {
    const entries = Object.entries(rarity as Record<string, unknown>)
    const first = entries[0]
    if (first && entries.length === 1) {
      parts.push(`锁定 ${first[0]}`)
    } else if (entries.length > 1) {
      const total = entries.reduce((acc, [, w]) => acc + Number(w), 0)
      const text = entries
        .map(([k, w]) => {
          const n = Number(w)
          const shown = total > 0 ? `${Math.round((n / total) * 100)}%` : String(w)
          return `${k}${shown}`
        })
        .join('/')
      parts.push(text)
    }
  }
  const families = v.families
  if (families && typeof families === 'object') {
    const famText = Object.entries(families as Record<string, unknown>)
      .map(([k, w]) => `${FAMILY_LABELS[k] ?? k}${String(w)}`)
      .join('/')
    if (famText) parts.push(famText)
  }
  const gender = v.gender
  if (gender && typeof gender === 'object') {
    const male = (gender as Record<string, unknown>).male
    if (typeof male === 'number') parts.push(`公${Math.round(male * 100)}%`)
  }
  if (typeof v.note === 'string' && v.note) parts.push(v.note)
  return parts.join(' · ')
}

const PetEggPools: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<PetEggPoolRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetEggPoolRow | null>(null)
  const [preview, setPreview] = useState<PetEggPoolRow | null>(null)
  // 种属码 → 中文名（权重概览 fixed_species 转译）
  const [speciesNames, setSpeciesNames] = useState<Record<string, string>>({})

  const speciesName = useCallback(
    (code: string) => speciesNames[code] ?? code,
    [speciesNames],
  )

  // 发布状态筛选（页签刷新经 tabFilterCache 恢复；默认仅看已发布版本——历史版本行混显是运维干扰源）
  const restoredFilters = loadTabFilters('pet_egg_pools')
  const [publishedFilter, setPublishedFilter] = useState<string>(
    (restoredFilters.publishedFilter as string) ?? 'published',
  )
  usePersistTabFilters('pet_egg_pools', { publishedFilter })

  const filteredRows = useMemo(
    () =>
      publishedFilter === 'all'
        ? rows
        : rows.filter((r) => (publishedFilter === 'published' ? r.published : !r.published)),
    [rows, publishedFilter],
  )

  // 历史版本行守卫：已下架且非该池最高版本 = 历史快照，禁止编辑（版本史审计链保护）
  const isHistoricalRow = useCallback(
    (r: PetEggPoolRow) =>
      !r.published &&
      rows.some((x) => x.pool_code === r.pool_code && x.config_version > r.config_version),
    [rows],
  )

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petEggPoolService.findAll()
    if (!res.success) return setLoading(false)
    setRows(res.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRows()
    petSpeciesService.findAll().then((res) => {
      if (res.success && res.data) {
        setSpeciesNames(
          Object.fromEntries(res.data.map((s) => [s.species_code, s.name_cn])),
        )
      }
    })
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
      // ★ 审计链版本化（审查报告 宠物 P2-5）：权重变更 = 插入新 config_version
      // 行并下架旧行，绝不 update 历史版本行——pet_lottery_records.config_version
      // 需可回溯当时概率内容（与 p2_seed「新增版本行」纪律对齐）。
      // 权重未变（版本号不变）时仍走原行更新（如仅切换发布状态）。
      const versionBumped = editing && Number(values.config_version) > editing.config_version
      const res = editing
        ? await (async () => {
            if (versionBumped) {
              const created = await petEggPoolService.create({
                ...payload,
                pool_code: editing.pool_code,
                config_version: Number(values.config_version),
                published: !!values.published,
              } as never)
              if (!created.success) return created
              const retired = await petEggPoolService.update(editing.id, {
                published: false,
              } as never)
              if (!retired.success) {
                // 两步写无事务包裹（审计批 20261012）：新版本行已落库、旧版本
                // 下架失败时若不显式警告，用户盲目重试会在同一
                // (pool_code, config_version) 再插一行或撞唯一约束
                message.error(
                  `新版本 v${values.config_version} 行已创建，但旧版本下架失败（${retired.errorMessage ?? '未知错误'}）。请勿重复提交：刷新后请手动下架旧版本。`,
                  6,
                )
                return { success: false, errorMessage: retired.errorMessage } as never
              }
              return created
            }
            return petEggPoolService.update(editing.id, payload as never)
          })()
        : await petEggPoolService.create(payload as never)
      if (!res.success) return
      message.success(
        versionBumped
          ? `已发布新版本 v${values.config_version}（旧版本已保留并下架）`
          : editing
            ? '已更新'
            : '已新增',
      )
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
      render: (v: boolean) => (v ? <Tag color="green">已发布</Tag> : <Tag>未发布</Tag>),
    },
    {
      title: '权重概览',
      dataIndex: 'weights',
      render: (v: Record<string, unknown>) =>
        v && Object.keys(v).length > 0 ? (
          <Typography.Text style={{ fontSize: 13 }} ellipsis>
            {weightsSummaryText(v, speciesName)}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">空</Typography.Text>
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
          if (isHistoricalRow(record)) {
            message.warning('历史版本行已锁定，仅该池最新发布版本可编辑（版本史审计保护），如需调整请递增版本号发布新行')
            return
          }
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
        description="固定概率原则：概率判定只在服务端进行且记录可追溯；App 公示读取「已发布」版本的同一份权重，公示与判定永远同源。修改概率保存时会自动生成新版本行，发布后生效。列表默认仅显示已发布版本，历史版本行只读保护。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Select
              className={common.sel240}
              value={publishedFilter}
              onChange={(v) => { setPublishedFilter(v); setPage(1) }}
              options={[
                { value: 'published', label: '已发布（App 可见）' },
                { value: 'unpublished', label: '未发布（历史/草稿）' },
                { value: 'all', label: '全部版本' },
              ]}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => { setPage(1); void loadRows() }}>
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
        dataSource={filteredRows}
        pagination={{ current: page, pageSize: PET_TABLE_PAGE_SIZE, onChange: (p) => setPage(p), showSizeChanger: false }}
        size="middle"
        locale={{ emptyText: publishedFilter === 'published' ? '暂无已发布蛋池' : '暂无数据' }}
      />
      <PoolFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
      <OddsPreviewModal row={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

export default PetEggPools
