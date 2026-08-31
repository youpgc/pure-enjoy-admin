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
  Alert,
  Typography,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase } from '../utils/supabase'
import type { Database } from '../types/database'
import { usePermission } from '../hooks/usePermission'
import { gameDimensionService } from '../services/gameService'
import type { DbGameDimension } from '../types/database'

type DbGameAchievement = Database['public']['Tables']['game_achievements']['Row']

const { Text } = Typography

// 条件类型（与 App 端 GameRewardService._meetsAchievement 的解析口径一致）
const COND_OPTIONS = [
  { value: 'first_clear', label: '任意通关（通关任意一关即达成）' },
  { value: 'score', label: '维度分数达到（通关时某维度值 ≥ 阈值）' },
  { value: 'level', label: '通关关卡号达到（通关第 N 关及以上）' },
]

// 常用成就图标（material icon 名，App 端按名映射；未知名回退默认）
const ICON_OPTIONS = [
  'emoji_events',
  'military_tech',
  'workspace_premium',
  'star',
  'stars',
  'local_fire_department',
  'speed',
  'diamond',
  'rocket_launch',
  'bolt',
].map((v) => ({ value: v, label: v }))

/// 把 condition JSON 渲染成中文摘要（与 App 端解析口径一致）
function condSummary(cond: Record<string, any>): string {
  const type = cond?.type ?? 'first_clear'
  if (type === 'score') {
    return `${cond?.dimension ?? '?'} ≥ ${cond?.gte ?? '?'}`
  }
  if (type === 'level') {
    return `通关第 ${cond?.min_level_no ?? '?'} 关及以上`
  }
  return '任意通关'
}

/**
 * 游戏成就配置（game_achievements）。
 *
 * 成就是**独立于「积分奖励配置」的独立体系**：独立建表、独立判定
 * （App 端通关结算时按 condition 评估）、同一成就终身只发一次
 * （user_game_achievements 唯一索引兜底）；发放积分走 game_earn 流水，
 * 仍受单日上限（daily_limit）约束。积分奖励配置里的 achievement 枚举
 * 仅保留兼容旧数据，不再新增。
 */
const GameAchievements: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const [items, setItems] = useState<DbGameAchievement[]>([])
  const [games, setGames] = useState<{ id: string; code: string; name: string }[]>([])
  const [gameNameMap, setGameNameMap] = useState<Record<string, string>>({})
  const [dims, setDims] = useState<DbGameDimension[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DbGameAchievement | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const loadItems = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('game_achievements')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      setItems((data as DbGameAchievement[]) ?? [])
    } catch (e: any) {
      message.error('加载成就失败：' + (e?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('id,code,name')
        .eq('enabled', true)
      if (!error && data) {
        const list = data as { id: string; code: string; name: string }[]
        setGames(list)
        const map: Record<string, string> = {}
        list.forEach((g) => (map[g.id] = `${g.name}（${g.code}）`))
        setGameNameMap(map)
      }
    } catch {
      // 忽略：下拉仅辅助
    }
  }

  const loadDims = async () => {
    const res = await gameDimensionService.findAll()
    if (res.success && res.data) setDims(res.data)
  }

  useEffect(() => {
    loadItems()
    loadGames()
    loadDims()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (record: DbGameAchievement) => {
    setEditing(record)
    setModalOpen(true)
  }

  // condition JSON → 表单三个字段（类型 / 维度 / 阈值）
  const initialCond = useMemo(() => {
    const cond = (editing?.condition ?? {}) as Record<string, any>
    const type = cond?.type ?? 'first_clear'
    return {
      condType: type as string,
      condDimension: type === 'score' ? String(cond?.dimension ?? 'score') : undefined,
      condValue: type === 'score' ? (cond?.gte as number) : type === 'level' ? (cond?.min_level_no as number) : undefined,
    }
  }, [editing])

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      // 按条件类型组装 condition（与 App 端解析口径一致）
      let condition: Record<string, any> = {}
      if (values.condType === 'score') {
        condition = { type: 'score', dimension: values.condDimension, gte: Number(values.condValue) }
      } else if (values.condType === 'level') {
        condition = { type: 'level', min_level_no: Number(values.condValue) }
      } else {
        condition = { type: 'first_clear' }
      }
      const payload = {
        game_id: values.game_id,
        code: values.code,
        name: values.name,
        description: values.description || null,
        icon: values.icon || null,
        condition,
        reward_points: Number(values.reward_points) || 0,
        enabled: !!values.enabled,
        sort_order: Number(values.sort_order) || 0,
      }
      // 写操作 cast any：项目 Database 类型未生成 Relationships 键，
      // supabase-js 会把 insert/update 参数推断为 never（与 utils/supabase.ts 同口径）。
      if (editing) {
        const { error } = await (supabase.from('game_achievements') as any)
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editing.id)
        if (error) throw error
        message.success('已更新')
      } else {
        const { error } = await (supabase.from('game_achievements') as any)
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
      const { error } = await (supabase.from('game_achievements') as any)
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
    () => games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` })),
    [games]
  )

  const columns: ColumnsType<DbGameAchievement> = [
    {
      title: '游戏',
      dataIndex: 'game_id',
      width: 140,
      render: (v: string | null) => (v ? (gameNameMap[v] ?? v) : <Tag>全局</Tag>),
    },
    { title: '编码', dataIndex: 'code', width: 140, render: (v: string) => <Tag>{v}</Tag> },
    { title: '名称', dataIndex: 'name', width: 140 },
    {
      title: '图标',
      dataIndex: 'icon',
      width: 90,
      render: (v: string | null) => v || '-',
    },
    {
      title: '达成条件',
      key: 'condition',
      render: (_: unknown, record: DbGameAchievement) =>
        condSummary((record.condition ?? {}) as Record<string, any>),
    },
    {
      title: '奖励积分',
      dataIndex: 'reward_points',
      width: 90,
      render: (v: number) => (v > 0 ? <Tag color="gold">+{v}分</Tag> : <Text type="secondary">仅解锁</Text>),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: DbGameAchievement) => (
        <Space>
          <Button size="small" disabled={!canWrite} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该成就？"
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
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="游戏成就配置说明"
        description={
          <div style={{ lineHeight: 1.8 }}>
            <p style={{ margin: '4px 0' }}>
              <b>与「积分奖励配置」的关系：</b>成就是独立于积分奖励规则的独立体系——独立建表、独立判定、独立维护。
              App 端通关结算时按下方条件自动评估是否达成；同一成就<b>终身只发一次</b>（用户解锁记录唯一索引兜底）；
              奖励积分走 game_earn 流水，仍受「积分奖励配置」里的<b>单日上限</b>约束。
              积分奖励配置中的「成就达成」枚举仅兼容旧数据，请勿在其中新增。
            </p>
            <p style={{ margin: '4px 0' }}>
              <b>如何配置：</b>选择所属游戏 → 填写成就编码（唯一，如 first_win）与名称 → 选择达成条件类型 →
              填写奖励积分 → 启用即生效，无需重启 App。
              <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
                <li><b>任意通关</b>：通关任意一关即达成；适合「首胜」类成就。</li>
                <li><b>维度分数达到</b>：选择维度（来自「游戏与维度配置」的维度编码，如 score）与阈值，通关时该维度值 ≥ 阈值即达成；适合「单局得分 2048」类成就。</li>
                <li><b>通关关卡号达到</b>：通关的关卡号 ≥ N 即达成；适合「通过第 5 关」类进阶成就。</li>
              </ul>
            </p>
            <p style={{ margin: '4px 0' }}>
              <b>奖励积分：</b>达成时发放的积分；填 0 表示仅解锁成就、不发积分。
            </p>
          </div>
        }
      />
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!canWrite}
          onClick={openCreate}
        >
          新增成就
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editing ? '编辑成就' : '新增成就'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          key={editing?.id ?? 'create'}
          initialValues={
            editing
              ? {
                  game_id: editing.game_id ?? undefined,
                  code: editing.code,
                  name: editing.name,
                  description: editing.description ?? '',
                  icon: editing.icon ?? undefined,
                  reward_points: editing.reward_points,
                  enabled: editing.enabled,
                  sort_order: editing.sort_order,
                  ...initialCond,
                }
              : { condType: 'first_clear', reward_points: 5, enabled: true, sort_order: 0 }
          }
        >
          <Form.Item
            name="game_id"
            label="所属游戏"
            rules={[{ required: true, message: '请选择游戏' }]}
          >
            <Select placeholder="选择游戏" options={gameOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item
            name="code"
            label="成就编码"
            rules={[{ required: true, message: '请输入编码' }]}
            tooltip="唯一标识，如 first_win / score_2048 / level_5；创建后建议不再修改"
          >
            <Input placeholder="如 first_win" />
          </Form.Item>
          <Form.Item name="name" label="成就名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如 首次获胜" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="成就说明，展示给玩家" />
          </Form.Item>
          <Form.Item name="icon" label="成就图标" tooltip="material icon 名；App 端按名映射，未知名回退默认图标">
            <Select
              placeholder="选择图标"
              options={ICON_OPTIONS}
              allowClear
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="condType" label="达成条件类型" rules={[{ required: true, message: '请选择条件类型' }]}>
            <Select options={COND_OPTIONS} />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) =>
              prev.condType !== cur.condType || prev.game_id !== cur.game_id
            }
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('condType')
              if (type === 'score') {
                const gameId = getFieldValue('game_id')
                const dimOptions = dims
                  .filter((d) => !gameId || d.game_id === gameId)
                  .map((d) => ({ value: d.code, label: `${d.name}（${d.code}）` }))
                return (
                  <>
                    <Form.Item
                      name="condDimension"
                      label="达成维度"
                      rules={[{ required: true, message: '请选择维度' }]}
                    >
                      <Select
                        placeholder="选择维度"
                        options={dimOptions.length > 0 ? dimOptions : [{ value: 'score', label: 'score' }]}
                      />
                    </Form.Item>
                    <Form.Item
                      name="condValue"
                      label="达到阈值"
                      rules={[{ required: true, message: '请输入阈值' }]}
                    >
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="如 2048" />
                    </Form.Item>
                  </>
                )
              }
              if (type === 'level') {
                return (
                  <Form.Item
                    name="condValue"
                    label="达到关卡号"
                    rules={[{ required: true, message: '请输入关卡号' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="如 5" />
                  </Form.Item>
                )
              }
              return null
            }}
          </Form.Item>
          <Form.Item
            name="reward_points"
            label="奖励积分"
            tooltip="达成时发放；0 表示仅解锁不发分"
            rules={[{ required: true, message: '请输入奖励积分' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="分" />
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

export default GameAchievements
