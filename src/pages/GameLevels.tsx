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
  Empty,
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
import { gameService, gameLevelService } from '../services/gameService'
import type { DbGame, DbGameLevel } from '../types/database'

const { Text } = Typography

// ==================== 组件 ====================

const GameLevels: React.FC = () => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const [games, setGames] = useState<DbGame[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [levels, setLevels] = useState<DbGameLevel[]>([])
  const [loading, setLoading] = useState(false)
  const pager = usePagination()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<DbGameLevel | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const loadGames = useCallback(async () => {
    const res = await gameService.findAll((q) => q.eq('enabled', true))
    if (res.success && res.data) {
      if (!mountedRef.current) return
      setGames(res.data)
      if (!selectedGameId && res.data.length > 0) {
        const firstId = res.data[0]?.id
        if (firstId) setSelectedGameId(firstId)
      }
    }
  }, [mountedRef])

  const loadLevels = useCallback(async () => {
    if (!selectedGameId) {
      setLevels([])
      return
    }
    setLoading(true)
    try {
      const result = await gameLevelService.paginateByGame(
        selectedGameId,
        pager.pagination.current,
        pager.pagination.pageSize
      )
      if (!result.success) {
        handleApiError(result.errorMessage, 'GameLevels-加载')
        return
      }
      if (!mountedRef.current) return
      setLevels(result.data?.data || [])
      pager.setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'GameLevels-加载')
    } finally {
      setLoading(false)
    }
  }, [selectedGameId, pager.pagination.current, pager.pagination.pageSize, pager.setTotal])

  useEffect(() => {
    loadGames()
  }, [loadGames])

  useEffect(() => {
    if (selectedGameId) loadLevels()
  }, [selectedGameId, loadLevels])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      game_id: selectedGameId || undefined,
      enabled: true,
      count_for_daily_clear: false,
      reward_points: 0,
      reward_repeatable: false,
      sort_order: 0,
      config: '{}',
      target: '{}',
    })
    setModalVisible(true)
  }

  const openEdit = (record: DbGameLevel) => {
    setEditing(record)
    form.setFieldsValue({
      ...record,
      config: JSON.stringify(record.config ?? {}),
      target: JSON.stringify(record.target ?? {}),
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    const result = await gameLevelService.delete(id)
    if (!result.success) {
      handleApiError(result.errorMessage, 'GameLevels-删除')
      return
    }
    message.success('删除成功')
    loadLevels()
  }

  const handleSave = async () => {
    if (saving) return
    try {
      setSaving(true)
      const values = await form.validateFields()
      const payload: Record<string, any> = { ...values }
      try {
        payload.config = values.config ? JSON.parse(values.config) : {}
        payload.target = values.target ? JSON.parse(values.target) : {}
      } catch {
        message.error('config / target 不是合法 JSON')
        setSaving(false)
        return
      }
      if (editing) {
        const { id, ...rest } = payload as { id: string } & Record<string, any>
        const result = await gameLevelService.update(id, rest)
        if (!result.success) {
          handleApiError(result.errorMessage, 'GameLevels-更新')
          return
        }
        message.success('更新成功')
        } else {
          const result = await gameLevelService.create(payload as any)
          if (!result.success) {
            handleApiError(result.errorMessage, 'GameLevels-创建')
            return
          }
          message.success('创建成功')
        }
      setModalVisible(false)
      setEditing(null)
      form.resetFields()
      loadLevels()
    } catch (error) {
      handleApiError(error, 'GameLevels-保存')
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnsType<DbGameLevel> = [
    { title: '关卡号', dataIndex: 'level_no', key: 'level_no', width: 90, render: (v: number) => <Text strong>{v}</Text> },
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '计入每日首通',
      dataIndex: 'count_for_daily_clear',
      key: 'count_for_daily_clear',
      width: 130,
      render: (v: boolean, record: DbGameLevel) => (
        <Switch
          checked={v}
          disabled={!canWrite}
          checkedChildren="计入"
          unCheckedChildren="不计"
          onChange={async () => {
            const r = await gameLevelService.update(record.id, { count_for_daily_clear: !v })
            if (!r.success) handleApiError(r.errorMessage, 'GameLevels-切换首通')
            else loadLevels()
          }}
        />
      ),
    },
    {
      title: '通关奖励',
      key: 'reward',
      width: 140,
      render: (_: unknown, record: DbGameLevel) => (
        record.reward_points > 0 ? (
          <Space>
            <Tag color="gold">+{record.reward_points}分</Tag>
            {record.reward_repeatable && <Tag>可重复</Tag>}
          </Space>
        ) : (
          <Text type="secondary">无</Text>
        )
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
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
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text>选择游戏：</Text>
          <Select
            style={{ width: 240 }}
            placeholder="请选择游戏"
            value={selectedGameId || undefined}
            onChange={(v) => {
              setSelectedGameId(v)
              pager.resetPage()
            }}
            options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
          />
          <Button icon={<ReloadOutlined />} onClick={loadLevels} loading={loading}>
            刷新
          </Button>
        </Space>
      </Card>

      {selectedGameId ? (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite} onClick={openAdd}>
              新增关卡
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={levels}
            rowKey="id"
            loading={loading}
            pagination={pager.tablePagination}
            scroll={{ x: 'max-content' }}
          />
        </>
      ) : (
        <Empty description="请先创建游戏后再配置关卡" />
      )}

      <Modal
        title={editing ? '编辑关卡' : '新增关卡'}
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
          <Form.Item name="game_id" label="所属游戏" rules={[{ required: true, message: '请选择游戏' }]}>
            <Select
              placeholder="选择游戏"
              options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
            />
          </Form.Item>
          <Form.Item name="level_no" label="关卡号" rules={[{ required: true, message: '请输入关卡号' }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item name="name" label="关卡名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如 第 1 关 / 第二关" />
          </Form.Item>
          <Form.Item name="config" label="关卡布局(config, JSON)">
            <Input.TextArea rows={3} placeholder='如 {}' />
          </Form.Item>
          <Form.Item name="target" label="通关条件(target, JSON)">
            <Input.TextArea rows={3} placeholder='如 {"level":2}' />
          </Form.Item>
          <Form.Item name="count_for_daily_clear" label="计入每日首次通关奖励" valuePropName="checked" tooltip="仅当开启时，通关该关才会触发每日首通奖励（应对首关过简单场景）">
            <Switch checkedChildren="计入" unCheckedChildren="不计" />
          </Form.Item>
          <Form.Item name="reward_points" label="通关奖励积分" tooltip="通关该关获得的积分；0 表示无通关奖励">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="reward_repeatable" label="可重复通关获取" valuePropName="checked" tooltip="开启后每次通关均可获得（受单日上限约束）；关闭则仅首次通关获得（终身一次）">
            <Switch checkedChildren="可重复" unCheckedChildren="仅一次" />
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

export default GameLevels
