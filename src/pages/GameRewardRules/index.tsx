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
import { handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { usePermission } from '../../hooks/usePermission'
import {
  GAME_REWARD_RULE_TYPE_MAP,
  GAME_REWARD_RULE_TYPE_OPTIONS,
} from '../../constants'
import { gameService, gameRewardRuleService } from '../../services/gameService'
import type { DbGame, DbGameRewardRule } from '../../types/database'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

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

  // 表单初始值（弹窗真正打开后由 afterOpenChange 回显，避免 Modal 惰性挂载导致 setFieldsValue 无效）
  const formInitialValues = (): Record<string, any> => {
    if (editing) {
      return {
        ...editing,
        game_id: editing.game_id || GLOBAL_GAME,
        condition: JSON.stringify(editing.condition ?? {}),
      }
    }
    return {
      game_id: GLOBAL_GAME,
      rule_type: 'daily_limit',
      points: 0,
      enabled: true,
      sort_order: 0,
      condition: '{}',
    }
  }

  const openAdd = () => {
    setEditing(null)
    setModalVisible(true)
  }

  const openEdit = (record: DbGameRewardRule) => {
    setEditing(record)
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
    <div className={common.p24}>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="积分奖励配置说明"
        description={
          <div className={styles.desc}>
            <p className={styles.para}>
              <b>如何配置：</b>新增一条规则 → 选择「规则类型」与「适用游戏」→ 填写发放积分（points）→
              按类型填写 condition（JSON）；启用后 App 端通关结算时自动评估发放。规则与「关卡配置」里的每关奖励
              （reward_points / 可重复）相互独立、可叠加。
            </p>
            <div className={styles.para}>
              <b>规则类型（rule_type）：</b>
              <ul className={styles.list}>
                <li><b>每日首次通关 daily_first_clear</b>：每个自然日（北京时间）第一次通关「计入每日首通」的关卡时发放，跨游戏共享、单日一次；condition 留空 {'{}'}。</li>
                <li><b>成绩区间 score_range</b>：通关时某维度值落入配置区间即发放，同一档位终身一次；condition 形如 {'{ "dimension": "score", "gte": 100, "lte": 999 }'}（dimension 填维度编码，见「游戏与维度配置」）。</li>
                <li><b>单日上限 daily_limit</b>：控制当日全部游戏奖励积分总和的上限，达到后当日不再发任何游戏奖励；全局唯一一条，points 填每日上限值。建议按运营需要设置（偏低会让「可重复通关获取奖励」很快触顶）。</li>
                <li><b>成就达成 achievement</b>：已拆分至「游戏成就配置」页独立维护、独立判断（成就走 game_achievements 表，终身只发一次），此处类型仅保留兼容旧数据，请勿新增。</li>
              </ul>
            </div>
            <p className={styles.para}>
              <b>适用游戏：</b>选「全局规则」对所有游戏生效；选具体游戏仅对该游戏生效，同类规则单游戏优先。
            </p>
          </div>
        }
      />
      <Card className={common.mb16}>
        <Space wrap>
          <Text>适用游戏：</Text>
          <Select
            className={styles.sel240}
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

      <div className={styles.toolbar}>
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
        afterOpenChange={(open) => {
          // 修复编辑/新增弹窗表单串数据：Form.useForm 为单例，Modal 惰性挂载使 open 前
          // setFieldsValue 无效；弹窗真正打开（子组件已挂载）后重置并回显最新值。
          if (open) {
            form.resetFields()
            form.setFieldsValue(formInitialValues())
          }
        }}
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
            <InputNumber className={common.fullWidth} min={0} />
          </Form.Item>
          <Form.Item name="condition" label="条件(condition, JSON)">
            <Input.TextArea rows={3} placeholder='如 {}' />
          </Form.Item>
          <Form.Item name="sort_order" label="排序" initialValue={0}>
            <InputNumber className={common.fullWidth} min={0} />
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
