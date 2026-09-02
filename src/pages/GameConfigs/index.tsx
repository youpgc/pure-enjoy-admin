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
  Tabs,
  Empty,
} from 'antd'
import {
  SearchOutlined,
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
  GAME_ENGINE_MAP,
  GAME_ENGINE_OPTIONS,
  GAME_DIMENSION_VALUE_TYPE_MAP,
  GAME_DIMENSION_VALUE_TYPE_OPTIONS,
  GAME_DIMENSION_AGGREGATE_MAP,
  GAME_DIMENSION_AGGREGATE_OPTIONS,
  GAME_SHARED_ICON_OPTIONS,
  GAME_SHARED_ICON_BASE,
} from '../../constants'
import {
  gameService,
  gameDimensionService,
} from '../../services/gameService'
import type { DbGame, DbGameDimension } from '../../types/database'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

const { Text } = Typography

// ==================== 组件 ====================

const GameConfigs: React.FC = () => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const [activeTab, setActiveTab] = useState<'games' | 'dimensions'>('games')

  // ---- 游戏（Tab1） ----
  const [games, setGames] = useState<DbGame[]>([])
  const [gameSearch, setGameSearch] = useState('')
  const gamePager = usePagination()

  // ---- 维度（Tab2） ----
  const [dimensions, setDimensions] = useState<DbGameDimension[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const dimPager = usePagination()

  // ---- 公共 ----
  const [loading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<DbGame | DbGameDimension | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  // ========== 加载游戏列表（Tab1 + Tab2 选择器公共数据） ==========
  const loadGames = useCallback(async () => {
    try {
      const result = await gameService.paginate(gamePager.pagination.current, gamePager.pagination.pageSize, (q) => {
        if (gameSearch) {
          return q.or(`code.ilike.%${gameSearch}%,name.ilike.%${gameSearch}%`)
        }
        return q
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'GameConfigs-加载游戏')
        return
      }
      if (!mountedRef.current) return
      setGames(result.data?.data || [])
      gamePager.setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'GameConfigs-加载游戏')
    }
  }, [gameSearch, gamePager.pagination.current, gamePager.pagination.pageSize, gamePager.setTotal])

  // ========== 加载维度列表（Tab2，按所选游戏） ==========
  const loadDimensions = useCallback(async () => {
    if (!selectedGameId) {
      setDimensions([])
      return
    }
    try {
      const result = await gameDimensionService.paginateByGame(
        selectedGameId,
        dimPager.pagination.current,
        dimPager.pagination.pageSize
      )
      if (!result.success) {
        handleApiError(result.errorMessage, 'GameConfigs-加载维度')
        return
      }
      if (!mountedRef.current) return
      setDimensions(result.data?.data || [])
      dimPager.setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'GameConfigs-加载维度')
    }
  }, [selectedGameId, dimPager.pagination.current, dimPager.pagination.pageSize, dimPager.setTotal])

  // Tab1 数据随搜索/分页刷新
  useEffect(() => {
    if (activeTab === 'games') {
      loadGames()
    }
  }, [activeTab, loadGames])

  // 进入 Tab2 或切换游戏时刷新维度
  useEffect(() => {
    if (activeTab === 'dimensions') {
      loadDimensions()
    }
  }, [activeTab, loadDimensions])

  // 首次进入即拉一份游戏清单（供 Tab2 选择器），不覆盖 Tab1 分页
  useEffect(() => {
    let cancelled = false
    gameService.findAll((q) => q.eq('enabled', true)).then((res) => {
      if (!cancelled && res.success && res.data && res.data.length > 0 && !selectedGameId) {
        const firstId = res.data[0]?.id
        if (firstId) setSelectedGameId(firstId)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const refreshCurrent = () => {
    if (activeTab === 'games') loadGames()
    else loadDimensions()
  }

  // ========== 弹窗 ==========
  // 表单回显走 key 强制重挂载 + initialValues：Modal 惰性挂载前 setFieldsValue 无效，
  // 会导致编辑不回显；且 payload 里无 id 字段，旧写法 const { id } = payload 解构出
  // undefined 再 update 拼出 uuid:"undefined" 触发 22P02。
  const openAdd = () => {
    setEditing(null)
    setModalVisible(true)
  }

  const openEdit = (record: DbGame | DbGameDimension) => {
    setEditing(record)
    setModalVisible(true)
  }

  // 表单初始值（Form 重挂载时生效）
  const formInitialValues = (): Record<string, any> => {
    if (activeTab === 'games') {
      if (editing) {
        const g = editing as DbGame
        return { ...g, config: JSON.stringify(g.config ?? {}) }
      }
      return { engine: 'widget', enabled: true, sort_order: 0, version: 1, level_selectable: false, config: '{}' }
    }
    if (editing) return { ...(editing as DbGameDimension) }
    return {
      game_id: selectedGameId || undefined,
      value_type: 'int',
      aggregate: 'max',
      is_primary: false,
      enabled: true,
      sort_order: 0,
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const service = activeTab === 'games' ? gameService : gameDimensionService
      const result = await service.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'GameConfigs-删除')
        return
      }
      message.success('删除成功')
      refreshCurrent()
    } catch (error) {
      handleApiError(error, 'GameConfigs-删除')
    }
  }

  const handleSave = async () => {
    if (saving) return
    try {
      setSaving(true)
      const values = await form.validateFields()
      if (activeTab === 'games') {
        const payload: Record<string, any> = { ...values }
        // config 为 jsonb：把文本框 JSON 字符串解析为对象
        try {
          payload.config = values.config ? JSON.parse(values.config) : {}
        } catch {
          message.error('配置(config)不是合法 JSON')
          setSaving(false)
          return
        }
        if (editing) {
          const result = await gameService.update(editing.id, payload)
          if (!result.success) {
            handleApiError(result.errorMessage, 'GameConfigs-更新游戏')
            return
          }
          message.success('更新成功')
        } else {
          const result = await gameService.create(payload as any)
          if (!result.success) {
            handleApiError(result.errorMessage, 'GameConfigs-创建游戏')
            return
          }
          message.success('创建成功')
        }
      } else {
        if (editing) {
          const result = await gameDimensionService.update(editing.id, values)
          if (!result.success) {
            handleApiError(result.errorMessage, 'GameConfigs-更新维度')
            return
          }
          message.success('更新成功')
        } else {
          const result = await gameDimensionService.create(values as any)
          if (!result.success) {
            handleApiError(result.errorMessage, 'GameConfigs-创建维度')
            return
          }
          message.success('创建成功')
        }
      }
      setModalVisible(false)
      setEditing(null)
      form.resetFields()
      refreshCurrent()
    } catch (error) {
      handleApiError(error, 'GameConfigs-保存')
    } finally {
      setSaving(false)
    }
  }

  // ========== 列定义 ==========
  const gameColumns: ColumnsType<DbGame> = [
    { title: '编码', dataIndex: 'code', key: 'code', render: (v: string) => <Text strong>{v}</Text> },
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      render: (v: string | null) => v || '-',
    },
    {
      title: '引擎',
      dataIndex: 'engine',
      key: 'engine',
      width: 110,
      render: (v: string) => {
        const info = GAME_ENGINE_MAP[v] || { color: 'default', label: v }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    {
      title: '选关',
      dataIndex: 'level_selectable',
      key: 'level_selectable',
      width: 90,
      render: (v: boolean) =>
        v ? <Tag color="green">可</Tag> : <Tag>不可</Tag>,
    },
    {
      title: '选关模式',
      dataIndex: 'level_select_mode',
      key: 'level_select_mode',
      width: 120,
      render: (v: string, record: DbGame) =>
        record.level_selectable
          ? v === 'free'
            ? <Tag color="blue">直接选关</Tag>
            : <Tag color="gold">需通关</Tag>
          : <Tag>—</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record: DbGame) => (
        <Switch
          checked={enabled}
          disabled={!canWrite}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={async () => {
            const r = await gameService.update(record.id, { enabled: !enabled })
            if (!r.success) handleApiError(r.errorMessage, 'GameConfigs-切换状态')
            else refreshCurrent()
          }}
        />
      ),
    },
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

  const dimColumns: ColumnsType<DbGameDimension> = [
    { title: '编码', dataIndex: 'code', key: 'code', render: (v: string) => <Text strong>{v}</Text> },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '单位', dataIndex: 'unit', key: 'unit', render: (v: string | null) => v || '-' },
    {
      title: '值类型',
      dataIndex: 'value_type',
      key: 'value_type',
      width: 100,
      render: (v: string) => {
        const info = GAME_DIMENSION_VALUE_TYPE_MAP[v] || { color: 'default', label: v }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '聚合',
      dataIndex: 'aggregate',
      key: 'aggregate',
      width: 110,
      render: (v: string) => {
        const info = GAME_DIMENSION_AGGREGATE_MAP[v] || { color: 'default', label: v }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '主维度',
      dataIndex: 'is_primary',
      key: 'is_primary',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="green">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
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
      <Card className={common.mb16}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'games' | 'dimensions')}
          items={[
            { key: 'games', label: '游戏配置' },
            { key: 'dimensions', label: '成绩维度配置' },
          ]}
        />
      </Card>

      {activeTab === 'games' ? (
        <>
          <Card className={common.mb16}>
            <Space wrap>
              <Input
                placeholder="搜索编码/名称"
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                onPressEnter={() => {
                  gamePager.resetPage()
                  loadGames()
                }}
                prefix={<SearchOutlined />}
                className={styles.sel300}
                allowClear
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={() => { gamePager.resetPage(); loadGames() }}>
                搜索
              </Button>
            </Space>
          </Card>
          <div className={styles.toolbar}>
            <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite} onClick={openAdd}>
              新增游戏
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadGames} loading={loading}>
              刷新
            </Button>
          </div>
          <Table
            columns={gameColumns}
            dataSource={games}
            rowKey="id"
            loading={loading}
            pagination={gamePager.tablePagination}
            scroll={{ x: 'max-content' }}
          />
        </>
      ) : (
        <>
          <Card className={common.mb16}>
            <Space wrap>
              <Text>选择游戏：</Text>
              <Select
                className={styles.sel240}
                placeholder="请选择游戏"
                value={selectedGameId || undefined}
                onChange={(v) => {
                  setSelectedGameId(v)
                  dimPager.resetPage()
                  loadDimensions()
                }}
                options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
              />
            </Space>
          </Card>
          {selectedGameId ? (
            <>
            <div className={styles.toolbar}>
              <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite} onClick={openAdd}>
                新增维度
                </Button>
                <Button icon={<ReloadOutlined />} onClick={loadDimensions} loading={loading}>
                  刷新
                </Button>
              </div>
              <Table
                columns={dimColumns}
                dataSource={dimensions}
                rowKey="id"
                loading={loading}
                pagination={dimPager.tablePagination}
                scroll={{ x: 'max-content' }}
              />
            </>
          ) : (
            <Empty description="请先创建游戏后再配置维度" />
          )}
        </>
      )}

      {/* 表单弹窗 */}
      <Modal
        title={editing ? '编辑' : '新增'}
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
        <Form
          form={form}
          layout="vertical"
          key={`${activeTab}-${editing?.id ?? 'create'}`}
          initialValues={formInitialValues()}
        >
          {activeTab === 'games' ? (
            <>
              <Form.Item name="code" label="游戏编码" rules={[{ required: true, message: '请输入编码' }]}>
                <Input placeholder="如 sheep / g2048 / match3" disabled={!!editing} />
              </Form.Item>
              <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="如 羊了个羊" />
              </Form.Item>
              <Form.Item name="icon" label="图标">
                <Select
                  allowClear
                  placeholder="选择共享图标资产（与 App 端同一套 SVG）"
                  showSearch
                  optionFilterProp="label"
                  options={GAME_SHARED_ICON_OPTIONS.map((o) => ({
                    value: o.value,
                    label: (
                      <span key={o.value} className={styles.iconOption}>
                        <img
                          src={`${GAME_SHARED_ICON_BASE}/${o.value}.svg`}
                          width={22}
                          height={22}
                          alt={o.label}
                        />
                        <span>[{o.group}] {o.label}</span>
                      </span>
                    ),
                  }))}
                />
              </Form.Item>
              <Form.Item name="description" label="描述">
                <Input.TextArea rows={2} placeholder="玩法简介" />
              </Form.Item>
              <Form.Item name="engine" label="渲染引擎" rules={[{ required: true }]} tooltip="引擎为初始化默认选项，禁止编辑">
                <Select options={GAME_ENGINE_OPTIONS} disabled={!!editing} />
              </Form.Item>
              <Form.Item name="config" label="玩法参数(config, JSON)">
                <Input.TextArea rows={3} placeholder='如 {"size":4,"target":2048}' />
              </Form.Item>
              <Form.Item name="sort_order" label="排序" initialValue={0}>
                <InputNumber className={common.fullWidth} min={0} />
              </Form.Item>
              <Form.Item name="version" label="配置版本" initialValue={1}>
                <InputNumber className={common.fullWidth} min={1} />
              </Form.Item>
              <Form.Item name="level_selectable" label="允许选关" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prev, cur) => prev.level_selectable !== cur.level_selectable}
              >
                {({ getFieldValue }) =>
                  getFieldValue('level_selectable') ? (
                    <Form.Item name="level_select_mode" label="选关模式" initialValue="gated">
                      <Select
                        options={[
                          { value: 'gated', label: '需通关后选关（前置未通关则上锁，已通关可重挑战）' },
                          { value: 'free', label: '直接选关挑战（无视前置关卡是否通关）' },
                        ]}
                      />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="game_id" label="所属游戏" rules={[{ required: true, message: '请选择游戏' }]}>
                <Select
                  placeholder="选择游戏"
                  options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
                />
              </Form.Item>
              <Form.Item name="code" label="维度编码" rules={[{ required: true, message: '请输入编码' }]}>
                <Input placeholder="如 score / duration_ms / level" />
              </Form.Item>
              <Form.Item name="name" label="维度名称" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="如 最高分 / 用时 / 关卡" />
              </Form.Item>
              <Form.Item name="unit" label="单位">
                <Input placeholder="如 分 / ms / 关" />
              </Form.Item>
              <Form.Item name="value_type" label="值类型" rules={[{ required: true }]}>
                <Select options={GAME_DIMENSION_VALUE_TYPE_OPTIONS} />
              </Form.Item>
              <Form.Item name="aggregate" label="最佳成绩聚合" rules={[{ required: true }]}>
                <Select options={GAME_DIMENSION_AGGREGATE_OPTIONS} />
              </Form.Item>
              <Form.Item name="is_primary" label="是否主维度" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
              <Form.Item name="sort_order" label="排序" initialValue={0}>
                <InputNumber className={common.fullWidth} min={0} />
              </Form.Item>
            </>
          )}
          <Form.Item name="enabled" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default GameConfigs
