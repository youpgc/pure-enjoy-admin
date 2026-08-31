import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  InputNumber,
  Space,
  Tag,
  Card,
  message,
  Modal,
  Form,
  Select,
  Popconfirm,
  Switch,
  Typography,
  Alert,
} from 'antd'
import {
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'
import { useMounted } from '../hooks/useMounted'
import { usePermission } from '../hooks/usePermission'
import {
  GAME_REWARD_RULE_TYPE_MAP,
  GAME_REWARD_RULE_TYPE_OPTIONS,
} from '../constants'
import { gameService, gameRewardRuleService } from '../services/gameService'
import type { DbGame, DbGameRewardRule } from '../types/database'

const { Text } = Typography

// 全局规则标记（game_id 为 null）
const GLOBAL_GAME = '__global__'

const GameRewardRules: React.FC = () => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const [games, setGames] = useState<DbGame[]>([])
  const [gameNameMap, setGameNameMap] = useState<Record<string, string>>({})
  const [gameFilter, setGameFilter] = useState<string>('all')
  const [rules, setRules] = useState<DbGameRewardRule[]>([])
  const [loading, setLoading] = useState(false)
  const pager = usePagination()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<DbGameRewardRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const loadGames = useCallback(async () => {
    const res = await gameService.findAll((q) => q.eq('enabled', true))
    if (res.success && res.data) {
      if (!mountedRef.current) return
      setGames(res.data)
      const map: Record<string, string> = {}
      res.data.forEach((g) => (map[g.id] = `${g.name}（${g.code}）`))
      setGameNameMap(map)
    }
  }, [mountedRef])

  const loadRules = useCallback(async () => {
    setLoading(true)
    try {
      const result = await gameRewardRuleService.paginate(
        pager.pagination.current,
        pager.pagination.pageSize,
        (q) => {
          if (gameFilter === 'global') return q.is('game_id', null)
          if (gameFilter !== 'all') return q.eq('game_id', gameFilter)
          return q
        }
      )
      if (!result.success) {
        handleApiError(result.errorMessage, 'GameRewardRules-加载')
        return
      }
      if (!mountedRef.current) return
      setRules(result.data?.data || [])
      pager.setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'GameRewardRules-加载')
    } finally {
      setLoading(false)
    }
  }, [gameFilter, pager.pagination.current, pager.pagination.pageSize, pager.setTotal])

  useEffect(() => {
    loadGames()
  }, [loadGames])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      game_id: GLOBAL_GAME,
      rule_type: 'daily_limit',
      points: 0,
      enabled: true,
      sort_order: 0,
      condition: '{}',
    })
    setModalVisible(true)
  }

  const openEdit = (record: DbGameRewardRule) => {
    setEditing(record)
    form.setFieldsValue({
      ...record,
      game_id: record.game_id || GLOBAL_GAME,
      condition: JSON.stringify(record.condition ?? {}),
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    const result = await gameRewardRuleService.delete(id)
    if (!result.success) {
      handleApiError(result.errorMessage, 'GameRewardRules-删除')
      return
    }
    message.success('删除成功')
    loadRules()
  }

  const handleSave = async () => {
    if (saving) return
    try {
      setSaving(true)
      const values = await form.validateFields()
      const payload: Record<string, any> = { ...values }
      // game_id === '__global__' 表示全局规则（null）
      payload.game_id = values.game_id === GLOBAL_GAME ? null : values.game_id
      try {
        payload.condition = values.condition ? JSON.parse(values.condition) : {}
      } catch {
        message.error('condition 不是合法 JSON')
        setSaving(false)
        return
      }
      if (editing) {
        const result = await gameRewardRuleService.update(editing.id, payload)
        if (!result.success) {
          handleApiError(result.errorMessage, 'GameRewardRules-更新')
          return
        }
        message.success('更新成功')
        } else {
          const result = await gameRewardRuleService.create(payload as any)
          if (!result.success) {
            handleApiError(result.errorMessage, 'GameRewardRules-创建')
            return
          }
          message.success('创建成功')
        }
      setModalVisible(false)
      setEditing(null)
      form.resetFields()
      loadRules()
    } catch (error) {
      handleApiError(error, 'GameRewardRules-保存')
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnsType<DbGameRewardRule> = [
    {
      title: '类型',
      dataIndex: 'rule_type',
      key: 'rule_type',
      width: 130,
      render: (v: string) => {
        const info = GAME_REWARD_RULE_TYPE_MAP[v] || { color: 'default', label: v }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string | null) => v || '-' },
    {
      title: '适用游戏',
      dataIndex: 'game_id',
      key: 'game_id',
      width: 160,
      render: (v: string | null) => (v ? (gameNameMap[v] ?? v) : <Tag color="purple">全局</Tag>),
    },
    { title: '积分', dataIndex: 'points', key: 'points', width: 80, render: (v: number) => <Text strong>{v}</Text> },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90,
      render: (v: boolean, record: DbGameRewardRule) => (
        <Switch
          checked={v}
          disabled={!canWrite}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={async () => {
            const r = await gameRewardRuleService.update(record.id, { enabled: !v })
            if (!r.success) handleApiError(r.errorMessage, 'GameRewardRules-切换状态')
            else loadRules()
          }}
        />
      ),
    },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" icon={<EditOutlined />} disabled={!canWrite} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除" onConfirm={() => handleDelete(record.id)} okText="确认" cancelText="取消">
            <Button danger size="small" icon={<DeleteOutlined />} disabled={!canDelete}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="积分奖励规则配置说明"
        description={
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li>规则类型（rule_type）：daily_limit 控制单日游戏奖励积分上限；daily_first_clear 为每日首次通关奖励（每日可叠加）；score_range / achievement 为指定分数段或成就奖励。</li>
            <li>适用游戏：选「全局规则」则该规则对所有游戏生效；选具体游戏仅对该游戏生效。同一类规则可同时存在全局与单游戏两条，单游戏优先。</li>
            <li>积分（points）：通关成功时发放的积分数，0 表示不发放奖励。游戏过关本身还可在「关卡配置」里单独设置每关奖励（reward_points / reward_repeatable）。</li>
            <li>condition：按规则类型的 JSON 条件，如分数段 {"{ \"min\": 100 }"}；一般留空 {} 即可。</li>
            <li>单日上限默认 10 分，若需要「可重复通关获取奖励」真正有意义，请在此调高 daily_limit 的 points 上限。</li>
          </ol>
        }
      />
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text>适用游戏：</Text>
          <Select
            style={{ width: 240 }}
            value={gameFilter}
            onChange={(v) => {
              setGameFilter(v)
              pager.resetPage()
            }}
            options={[
              { value: 'all', label: '全部' },
              { value: 'global', label: '全局规则' },
              ...games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` })),
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={loadRules} loading={loading}>
            刷新
          </Button>
        </Space>
      </Card>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite} onClick={openAdd}>
          新增规则
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={rules}
        rowKey="id"
        loading={loading}
        pagination={pager.tablePagination}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editing ? '编辑奖励规则' : '新增奖励规则'}
        open={modalVisible}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => {
          setModalVisible(false)
          setEditing(null)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="rule_type" label="规则类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select options={GAME_REWARD_RULE_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="game_id" label="适用游戏" rules={[{ required: true, message: '请选择适用游戏' }]}>
            <Select
              placeholder="选择游戏，或选「全局规则」"
              options={[
                { value: GLOBAL_GAME, label: '全局规则（不限游戏）' },
                ...games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` })),
              ]}
            />
          </Form.Item>
          <Form.Item name="name" label="名称">
            <Input placeholder="如 每日首次通关奖励" />
          </Form.Item>
          <Form.Item name="points" label="积分" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="condition" label="条件(condition, JSON)">
            <Input.TextArea rows={3} placeholder='如 {}' />
          </Form.Item>
          <Form.Item name="sort_order" label="排序" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="enabled" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default GameRewardRules
