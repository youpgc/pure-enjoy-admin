import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Table, Alert, Card, Button, Select, Space, Tag, message, Input } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetItemRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { petItemService } from '../../services/petService'
import {
  PET_ITEM_CATEGORY_LABELS,
  PET_ITEM_CATEGORY_COLORS,
  PET_ITEM_CATEGORY_OPTIONS,
  PET_ITEM_CHANNEL_LABELS,
  PET_LADDER_KEY_LABELS,
  PET_LADDER_KEY_COLORS,
} from '../../constants/pet'
import ItemFormModal, { type ItemFormValues } from './ItemFormModal'
import common from '../../styles/common.module.css'

// ==================== 道具目录管理（pet_items，三大类 + 扩容阶梯统一编辑） ====================
//
// 筛选交互（2026-09-17 调整）：
// - 移除所有下拉的「全部」选项；「类型」（原分类）默认取第一个值，其余筛选项默认空；
// - 「子类型」与「类型」数据联动：消耗品→食物/清洁/玩具，工具→救援 + 三套扩容阶梯；
// - 图标列：pet_items.icon 形如 icon/<key>，双端资源落位前回退显示键名；
// - 积分购买已下线：移除积分价列，保存时强制 price_points=null / points_purchasable=false。

/** icon 字段值（icon/<key>）→ 资源键；非该格式返回 null */
const iconKey = (icon: string | null): string | null => {
  if (!icon) return null
  return icon.startsWith('icon/') ? icon.slice(5) : icon
}

/** 图标单元格：双端资源（public/pet-icons/<key>.svg）缺失时回退键名 */
const PetItemIcon: React.FC<{ icon: string | null }> = ({ icon }) => {
  const [failed, setFailed] = useState(false)
  const key = iconKey(icon)
  if (!key) return <Tag>无图标</Tag>
  if (failed)
    return (
      <Tag style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {key}
      </Tag>
    )
  return (
    <img
      alt={key}
      src={`/pet-icons/${key}.svg`}
      width={32}
      height={32}
      onError={() => setFailed(true)}
      style={{ display: 'block', borderRadius: 6, background: '#fafafa' }}
    />
  )
}

/** 类型 → 子类型联动选项（value 前缀 ladder: 表示按扩容阶梯匹配） */
const SUB_OPTIONS_BY_CATEGORY: Record<string, Array<{ value: string; label: string }>> = {
  egg: [{ value: 'initial', label: '初始蛋' }],
  consumable: [
    { value: 'food', label: '食物' },
    { value: 'clean', label: '清洁' },
    { value: 'toy', label: '玩具' },
  ],
  tool: [
    { value: 'rescue', label: '救援' },
    ...Object.entries(PET_LADDER_KEY_LABELS).map(([value, label]) => ({
      value: `ladder:${value}`,
      label: `${label}扩容`,
    })),
  ],
  equip: [],
}

const PetItems: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetItemRow | null>(null)
  // 类型默认第一个值；其余筛选默认空（下拉均无「全部」选项，allowClear 清除）
  const [categoryFilter, setCategoryFilter] = useState<string>(PET_ITEM_CATEGORY_OPTIONS[0]?.value ?? '')
  const [subFilter, setSubFilter] = useState<string | undefined>(undefined)
  const [shelfFilter, setShelfFilter] = useState<string | undefined>(undefined)
  const [keyword, setKeyword] = useState('')

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petItemService.findAll()
    if (!res.success) return setLoading(false)
    setRows(res.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 类型切换 → 子类型联动重置（避免残留不属于新类型的子筛选）
  const handleCategoryChange = (v: string) => {
    setCategoryFilter(v)
    setSubFilter(undefined)
  }

  const matchSub = (r: PetItemRow, v: string) => {
    if (v.startsWith('ladder:')) return r.ladder_key === v.slice(7)
    return (r.sub_type ?? '') === v
  }

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!!categoryFilter && r.category === categoryFilter) &&
          (!subFilter || matchSub(r, subFilter)) &&
          (shelfFilter === undefined || String(r.on_shelf) === shelfFilter) &&
          (!keyword ||
            r.item_code.toLowerCase().includes(keyword.trim().toLowerCase()) ||
            r.name.toLowerCase().includes(keyword.trim().toLowerCase()))
      ),
    [rows, categoryFilter, subFilter, shelfFilter, keyword]
  )

  const subOptions = SUB_OPTIONS_BY_CATEGORY[categoryFilter] ?? []

  const handleSave = async (values: ItemFormValues) => {
    setSaving(true)
    try {
      const payload = {
        item_code: values.item_code,
        name: values.name,
        description: values.description || null,
        icon: values.icon || null,
        category: values.category,
        sub_type: values.sub_type || null,
        effect: values.effect as unknown as Record<string, unknown>,
        stack_limit: Number(values.stack_limit) || 99,
        price_coin: Number(values.price_coin) || 0,
        // 积分购买已下线：目录层强制关闭（保留 DB 列，历史数据归零）
        price_points: null,
        points_purchasable: false,
        channels: values.channels,
        ladder_key: values.ladder_key || null,
        ladder_step: values.ladder_step ?? null,
        add_capacity: values.add_capacity ?? null,
        purchase_limit: values.purchase_limit ?? null,
        on_shelf: !!values.on_shelf,
        sort_order: Number(values.sort_order) || 0,
      }
      const res = editing
        ? await petItemService.update(editing.id, payload as never)
        : await petItemService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await petItemService.delete(id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns: ColumnsType<PetItemRow> = [
    {
      title: '图标',
      dataIndex: 'icon',
      width: 80,
      render: (v: string | null) => <PetItemIcon icon={v} />,
    },
    { title: '编码', dataIndex: 'item_code', width: 170 },
    { title: '名称', dataIndex: 'name', width: 130 },
    {
      title: '类型',
      dataIndex: 'category',
      width: 100,
      render: (v: string) => (
        <Tag color={PET_ITEM_CATEGORY_COLORS[v] ?? 'default'}>
          {PET_ITEM_CATEGORY_LABELS[v] ?? v}
        </Tag>
      ),
    },
    {
      title: '阶梯',
      dataIndex: 'ladder_key',
      width: 110,
      render: (v: string | null, record) =>
        v ? (
          <Tag color={PET_LADDER_KEY_COLORS[v] ?? 'default'}>
            {PET_LADDER_KEY_LABELS[v] ?? v} · 第{record.ladder_step ?? '-'}档
          </Tag>
        ) : (
          <Tag>普通</Tag>
        ),
    },
    { title: '金币价', dataIndex: 'price_coin', width: 90, render: (v: number) => `${v}` },
    { title: '堆叠', dataIndex: 'stack_limit', width: 70 },
    {
      title: '限购',
      dataIndex: 'purchase_limit',
      width: 70,
      render: (v: number | null) => (v == null ? '不限' : `${v} 次`),
    },
    {
      title: '渠道',
      dataIndex: 'channels',
      width: 100,
      render: (v: string) => PET_ITEM_CHANNEL_LABELS[v] ?? v,
    },
    {
      title: '上架',
      dataIndex: 'on_shelf',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">上架</Tag> : <Tag>下架</Tag>),
    },
    getActionColumn<PetItemRow>((record) => [
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
        confirm: '确认删除该道具？用户背包中已持有的存量不受影响',
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
        message="道具目录说明"
        description="三大类道具（蛋/消耗品/工具/装备）与三套扩容阶梯（背包/养育格/寄养格）统一在本页配置；扩容阶梯道具每档限购 1 次，App 商城按 ladder_step 有序展示，达上限后不再展示。道具仅支持金币购买，积分购买通道已下线。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Select
              style={{ width: 140 }}
              value={categoryFilter}
              onChange={handleCategoryChange}
              options={PET_ITEM_CATEGORY_OPTIONS}
              placeholder="类型"
            />
            <Select
              style={{ width: 160 }}
              value={subFilter}
              onChange={setSubFilter}
              options={subOptions}
              placeholder={subOptions.length ? '子类型' : '该类型无子类型'}
              allowClear
              disabled={!subOptions.length}
            />
            <Select
              style={{ width: 110 }}
              value={shelfFilter}
              onChange={setShelfFilter}
              options={[
                { value: 'true', label: '已上架' },
                { value: 'false', label: '已下架' },
              ]}
              placeholder="上架态"
              allowClear
            />
            <Input.Search
              placeholder="编码/名称搜索"
              allowClear
              style={{ width: 200 }}
              onSearch={setKeyword}
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
            新增道具
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
        scroll={{ x: 1100 }}
      />
      <ItemFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default PetItems
