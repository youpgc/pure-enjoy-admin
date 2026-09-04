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
} from 'antd'
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase } from '../../utils/supabase'
import type { Database } from '../../types/database'
import { usePermission } from '../../hooks/usePermission'
import { useGameMeta } from '../../utils/gameMetaCache'
import { GAME_SHARED_ICON_BASE, GAME_SHARED_ICON_OPTIONS } from '../../constants/game'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

type DbGameMode = Database['public']['Tables']['game_modes']['Row']

const iconOptions = GAME_SHARED_ICON_OPTIONS.map((o) => ({
  value: o.value,
  label: `[${o.group}] ${o.label}`,
}))

// 玩法语义（引擎子类型）：App 端用它决定图标配色与引擎分支。
const playKindOptions = [
  { value: '2048', label: '2048 · 经典/挑战/限时' },
  { value: '2048_timed', label: '2048 · 限时' },
  { value: '2048_challenge', label: '2048 · 挑战' },
  { value: '2048_endless', label: '2048 · 无尽' },
  { value: 'score', label: '消消乐 · 计分' },
  { value: 'clear', label: '消消乐 · 消除' },
  { value: 'collect', label: '消消乐 · 收集' },
  { value: 'obstacle', label: '消消乐 · 破冰' },
  { value: 'timed', label: '消消乐 · 限时' },
  { value: 'boss', label: '消消乐 · Boss' },
  { value: 'merge', label: '羊了个羊 · 合成' },
]

/**
 * 游戏模式管理（game_modes）。模式为关卡选关的「一级维度」：
 * 主界面模式网格、选关弹窗按模式过滤均依赖本表。
 * 图标存 SVG 文件名（与 App 端 assets/games/icons 同名），下拉预览与列表同款渲染。
 */
const GameModes: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const meta = useGameMeta()
  const games = useMemo(
    () => (meta?.games ?? []).map((g) => ({ id: g.id, code: g.code, name: g.name })),
    [meta?.games],
  )

  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [modes, setModes] = useState<DbGameMode[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<DbGameMode | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const loadModes = async () => {
    if (!selectedGameId) {
      setModes([])
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('game_modes')
        .select('id,game_id,code,name,icon,description,play_kind,config,sort_order,enabled,created_at,updated_at')
        .eq('game_id', selectedGameId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      setModes((data as DbGameMode[]) ?? [])
    } catch (e: any) {
      message.error(`加载模式失败：${e?.message ?? e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedGameId) loadModes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGameId])

  const formInitialValues = (): Record<string, unknown> => ({
    game_id: selectedGameId || undefined,
    code: '',
    name: '',
    icon: '',
    description: '',
    play_kind: '',
    enabled: true,
    sort_order: 0,
  })

  // 弹窗惰性挂载：open 后再 reset+回显，避免编辑串数据（与游戏模块其它表单一致）
  const afterOpenChange = (open: boolean) => {
    if (open) {
      form.resetFields()
      form.setFieldsValue(editing ? { ...editing } : formInitialValues())
    }
  }

  const openAdd = () => {
    setEditing(null)
    setModalVisible(true)
  }

  const openEdit = (record: DbGameMode) => {
    setEditing(record)
    setModalVisible(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    const payload: Record<string, any> = { ...values }
    setSaving(true)
    try {
      if (editing) {
        // supabase-js 会把 insert/update 参数推断为 never（与 utils/supabase.ts 同口径）。
        const { error } = await (supabase.from('game_modes') as any)
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        message.success('已更新模式')
      } else {
        const { error } = await (supabase.from('game_modes') as any).insert(payload)
        if (error) throw error
        message.success('已新增模式')
      }
      setModalVisible(false)
      setEditing(null)
      loadModes()
    } catch (e: any) {
      message.error(`保存失败：${e?.message ?? e}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record: DbGameMode) => {
    try {
      // 防级联清关：game_levels.mode_id 为 on delete cascade，
      // 直接删模式会静默清空该模式全部关卡；有关卡/成绩时阻止。
      const { count: levelCount, error: lcErr } = await supabase
        .from('game_levels')
        .select('id', { count: 'exact', head: true })
        .eq('mode_id', record.id)
      if (lcErr) throw lcErr
      if ((levelCount ?? 0) > 0) {
        message.error(
          `该模式仍关联 ${levelCount} 个关卡，删除会级联清空关卡数据，已阻止。请先下架/迁移这些关卡。`,
        )
        return
      }
      const { count: scoreCount, error: scErr } = await supabase
        .from('game_scores')
        .select('id', { count: 'exact', head: true })
        .eq('mode_id', record.id)
      if (scErr) throw scErr
      if ((scoreCount ?? 0) > 0) {
        message.error(
          `该模式仍关联 ${scoreCount} 条成绩记录，删除会级联清空成绩，已阻止。`,
        )
        return
      }
      const { error } = await supabase.from('game_modes').delete().eq('id', record.id)
      if (error) throw error
      message.success('已删除模式')
      loadModes()
    } catch (e: any) {
      message.error(`删除失败：${e?.message ?? e}`)
    }
  }

  const columns: ColumnsType<DbGameMode> = [
    {
      title: '模式编码',
      dataIndex: 'code',
      key: 'code',
      width: 130,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '语义',
      dataIndex: 'play_kind',
      key: 'play_kind',
      width: 140,
      render: (v: string | null) => v || '-',
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 80,
      render: (v: string | null) =>
        v ? (
          <img src={`${GAME_SHARED_ICON_BASE}/${v}.svg`} width={24} height={24} alt={v} />
        ) : (
          '-'
        ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (v: string | null) => v || '-',
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (v: boolean) => <Switch checked={v} disabled />,
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: DbGameMode) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            disabled={!canWrite}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm title="确认删除该模式？" onConfirm={() => handleDelete(record)}>
            <Button danger size="small" icon={<DeleteOutlined />} disabled={!canDelete}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={common.toolbar}>
        <Select
          className={common.sel240}
          placeholder="请选择游戏"
          value={selectedGameId || undefined}
          onChange={(v) => setSelectedGameId(v)}
          options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
        />
        <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite || !selectedGameId} onClick={openAdd}>
          新增模式
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadModes} loading={loading}>
          刷新
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={modes}
        pagination={false}
        locale={{ emptyText: selectedGameId ? '暂无模式' : '请先选择游戏' }}
      />

      <Modal
        title={editing ? '编辑模式' : '新增模式'}
        open={modalVisible}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => {
          setModalVisible(false)
          setEditing(null)
        }}
        afterOpenChange={afterOpenChange}
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={formInitialValues()}>
          <Form.Item name="game_id" label="所属游戏" rules={[{ required: true, message: '请选择游戏' }]}>
            <Select
              placeholder="选择游戏"
              disabled={!!editing}
              options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
            />
          </Form.Item>
          <Form.Item name="code" label="模式编码" rules={[{ required: true, message: '请输入编码' }]}>
            <Input placeholder="如 classic / timed / challenge" disabled={!!editing} />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如 经典模式" />
          </Form.Item>
          <Form.Item name="play_kind" label="玩法语义(play_kind)">
            <Select allowClear placeholder="选择引擎子类型语义" options={playKindOptions} />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Select
              allowClear
              placeholder="选择共享图标资产（与 App 端同一套 SVG）"
              showSearch
              optionFilterProp="label"
              options={iconOptions.map((o) => ({
                value: o.value,
                label: (
                  <span key={o.value} className={styles.iconOption}>
                    <img
                      src={`${GAME_SHARED_ICON_BASE}/${o.value}.svg`}
                      width={22}
                      height={22}
                      alt={o.label}
                    />
                    <span>{o.label}</span>
                  </span>
                ),
              }))}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="玩法简介" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序" initialValue={0}>
            <InputNumber className={common.fullWidth} min={0} />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default GameModes
