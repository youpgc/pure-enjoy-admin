import React, { useEffect, useMemo, useState } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Popconfirm,
  message,
  Space,
  Tag,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase } from '../utils/supabase'
import type { Database } from '../types/database'
import { usePermission } from '../hooks/usePermission'

type DbGameItem = Database['public']['Tables']['game_items']['Row']

const ITEM_TYPE_LABEL: Record<string, string> = {
  remove: '移出',
  undo: '撤回',
  shuffle: '洗牌',
  add_time: '加时',
}

const ITEM_TYPE_OPTIONS = [
  { value: 'remove', label: '移出（羊了个羊）' },
  { value: 'undo', label: '撤回（羊了个羊）' },
  { value: 'shuffle', label: '洗牌（羊了个羊）' },
  { value: 'add_time', label: '加时（消消乐·限时）' },
]

/**
 * 游戏道具目录管理（game_items）。
 * 配置：适用游戏 / 模式 / 道具类型 / 名称 / 积分成本 / 单局使用上限 / 启停。
 * 与 App 端枚举（remove/undo/shuffle/add_time）一致；mode 留空表示适用于该游戏全部模式。
 */
const GameItems: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const [items, setItems] = useState<DbGameItem[]>([])
  const [games, setGames] = useState<{ code: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DbGameItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const loadItems = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('game_items')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      setItems((data as DbGameItem[]) ?? [])
    } catch (e: any) {
      message.error('加载道具失败：' + (e?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('code,name')
        .eq('enabled', true)
      if (!error && data) {
        setGames(
          (data as { code: string; name: string }[]).map((g) => ({
            code: g.code,
            name: g.name,
          }))
        )
      }
    } catch {
      // 忽略：下拉仅辅助
    }
  }

  useEffect(() => {
    loadItems()
    loadGames()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (record: DbGameItem) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        game_code: values.game_code,
        mode: values.mode ?? '',
        item_type: values.item_type,
        name: values.name,
        description: values.description || null,
        point_cost: Number(values.point_cost) || 0,
        per_game_limit: Number(values.per_game_limit) || 1,
        free_per_game: Number(values.free_per_game) || 0,
        enabled: !!values.enabled,
        sort_order: Number(values.sort_order) || 0,
      }
      // 写操作 cast any：项目 Database 类型未生成 Relationships 键，
      // supabase-js 会把 insert/update 参数推断为 never（与 utils/supabase.ts 同口径）。
      if (editing) {
        const { error } = await (supabase.from('game_items') as any)
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editing.id)
        if (error) throw error
        message.success('已更新')
      } else {
        const { error } = await (supabase.from('game_items') as any)
          .insert({ ...payload, updated_at: new Date().toISOString() })
        if (error) throw error
        message.success('已新增')
      }
      setModalOpen(false)
      await loadItems()
    } catch (e: any) {
      message.error('保存失败：' + (e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase.from('game_items') as any)
        .delete()
        .eq('id', id)
      if (error) throw error
      message.success('已删除')
      await loadItems()
    } catch (e: any) {
      message.error('删除失败：' + (e?.message ?? e))
    }
  }

  const gameOptions = useMemo(
    () => games.map((g) => ({ value: g.code, label: `${g.name}（${g.code}）` })),
    [games]
  )

  const columns: ColumnsType<DbGameItem> = [
    { title: '游戏', dataIndex: 'game_code', width: 100 },
    {
      title: '模式',
      dataIndex: 'mode',
      width: 90,
      render: (v: string) => (v ? <Tag>{v}</Tag> : <Tag color="default">通用</Tag>),
    },
    {
      title: '类型',
      dataIndex: 'item_type',
      width: 110,
      render: (v: string) => ITEM_TYPE_LABEL[v] ?? v,
    },
    { title: '名称', dataIndex: 'name', width: 120 },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    {
      title: '积分成本',
      dataIndex: 'point_cost',
      width: 90,
      render: (v: number) => `${v} 分`,
    },
    {
      title: '单局上限',
      dataIndex: 'per_game_limit',
      width: 90,
      render: (v: number) => `${v} 次`,
    },
    {
      title: '免费次数',
      dataIndex: 'free_per_game',
      width: 90,
      render: (v: number) => `${v} 次`,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: DbGameItem) => (
        <Space>
          <Button size="small" disabled={!canWrite} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该道具？"
            onConfirm={() => handleDelete(record.id)}
            disabled={!canDelete}
          >
            <Button size="small" danger disabled={!canDelete}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!canWrite}
          onClick={openCreate}
        >
          新增道具
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={false}
        size="middle"
      />

      <Modal
        title={editing ? '编辑道具' : '新增道具'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          key={editing?.id ?? 'create'}
          initialValues={
            editing
              ? {
                  game_code: editing.game_code,
                  mode: editing.mode,
                  item_type: editing.item_type,
                  name: editing.name,
                  description: editing.description ?? '',
                  point_cost: editing.point_cost,
                  per_game_limit: editing.per_game_limit,
                  free_per_game: editing.free_per_game,
                  enabled: editing.enabled,
                  sort_order: editing.sort_order,
                }
              : { enabled: true, point_cost: 20, per_game_limit: 1, free_per_game: 0, mode: '', sort_order: 0 }
          }
        >
          <Form.Item
            name="game_code"
            label="适用游戏"
            rules={[{ required: true, message: '请选择游戏' }]}
          >
            <Select
              placeholder="选择游戏"
              options={gameOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="mode" label="模式" tooltip="留空表示适用于该游戏全部模式；如 timed（消消乐限时）">
            <Input placeholder="通用（留空）" />
          </Form.Item>
          <Form.Item
            name="item_type"
            label="道具类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select placeholder="选择类型" options={ITEM_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如 移出卡" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} placeholder="道具效果说明" />
          </Form.Item>
          <Form.Item
            name="point_cost"
            label="积分成本"
            rules={[{ required: true, message: '请输入积分成本' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="分" />
          </Form.Item>
          <Form.Item
            name="per_game_limit"
            label="单局使用上限"
            rules={[{ required: true, message: '请输入上限' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} addonAfter="次" />
          </Form.Item>
          <Form.Item
            name="free_per_game"
            label="每局免费次数"
            tooltip="单局内免费使用次数，不消耗购买库存；超出部分才消耗库存。全游戏可配。"
            rules={[{ required: true, message: '请输入免费次数' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="次" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序号">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default GameItems
