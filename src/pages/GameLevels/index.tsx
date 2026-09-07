import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table,
  Alert,
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
import { handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { usePermission } from '../../hooks/usePermission'
import { gameService, gameLevelService } from '../../services/gameService'
import { supabase } from '../../utils/supabase'
import { loadTabFilters, usePersistTabFilters } from '../../utils/tabFilterCache'
import { useNavigation } from '../../App'
import type { DbGame, DbGameLevel } from '../../types/database'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

const { Text } = Typography

// ==================== 组件 ====================

const GameLevels: React.FC = () => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  // 页签刷新筛选恢复（tabs 右键刷新=重挂载，模块级快照保持用户当前筛选）
  const restoredFiltersRef = useRef(loadTabFilters('game_levels'))

  const [games, setGames] = useState<DbGame[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>(
    (restoredFiltersRef.current.selectedGameId as string) ?? ''
  )
  const [modes, setModes] = useState<{ id: string; code: string; name: string }[]>([])
  const [selectedModeId, setSelectedModeId] = useState<string>(
    (restoredFiltersRef.current.selectedModeId as string) ?? ''
  )
  // 用 ref 持有最新模式筛选值，避免 loadLevels 因 selectedModeId 变化而重建身份、
  // 进而触发「游戏切换」副作用把模式筛选重置为空。
  const selectedModeIdRef = useRef<string>('')
  const [levels, setLevels] = useState<DbGameLevel[]>([])
  const [loading, setLoading] = useState(false)
  const pager = usePagination()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<DbGameLevel | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  // 模式管理「关卡」按钮深链定位（keepalive 页签带参跳转，按 seq 信号感知）
  const { pageParams } = useNavigation()
  const pendingNavRef = useRef<{ gameId?: string; modeId?: string } | null>(null)
  /// 模式默认选中未落定标记：游戏切换后等 loadModes 返回并选中第一个模式前，
  /// 跳过列表查询（防止「新游戏 + 旧游戏模式过滤」的交互冲突空查询）
  const modePendingRef = useRef(false)

  const loadGames = useCallback(async () => {
    const res = await gameService.findAll((q) => q.eq('enabled', true))
    if (res.success && res.data) {
      if (!mountedRef.current) return
      setGames(res.data)
      // 深链进入时不自动选首游戏（pendingNav 携带的目标游戏优先）
      if (!selectedGameId && res.data.length > 0 && !pendingNavRef.current?.gameId) {
        const firstId = res.data[0]?.id
        if (firstId) setSelectedGameId(firstId)
      }
    }
  }, [mountedRef])

  const loadModes = useCallback(
    async (): Promise<{ id: string; code: string; name: string }[]> => {
      if (!selectedGameId) {
        setModes([])
        return []
      }
      try {
        const { data, error } = await supabase
          .from('game_modes')
          .select('id, code, name')
          .eq('game_id', selectedGameId)
          .order('sort_order', { ascending: true })
        if (error) throw error
        if (!mountedRef.current) return []
        const list = (data as { id: string; code: string; name: string }[]) || []
        setModes(list)
        return list
      } catch (error) {
        handleApiError(error, 'GameLevels-加载模式')
        return []
      }
    },
    [selectedGameId, mountedRef],
  )

  // 依赖 selectedModeId state（而非 ref）：模式筛选/翻页变化都能触发重载
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
        pager.pagination.pageSize,
        selectedModeId || null
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
  }, [selectedGameId, selectedModeId, pager.pagination.current, pager.pagination.pageSize, pager.setTotal])

  useEffect(() => {
    loadGames()
  }, [loadGames])

  // 深链信号消费：gameId 与当前不同 → 仅记录 pendingNav，待下方
  // [selectedGameId] effect 消费（避免同批次状态互踩）；相同 → 直接应用模式过滤并刷新。
  useEffect(() => {
    const sig = pageParams?.['game_levels']
    if (!sig) return
    const data = (sig.data ?? {}) as { gameId?: string; modeId?: string }
    if (!data.gameId) return
    if (data.gameId === selectedGameId) {
      pendingNavRef.current = null
      const want = data.modeId ?? ''
      setSelectedModeId(want)
      selectedModeIdRef.current = want
      pager.resetPage()
      loadLevels()
    } else {
      pendingNavRef.current = data
      setSelectedGameId(data.gameId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageParams])

  // 游戏切换 / 深链进入：加载模式清单后**默认选中第一个模式**（深链指定且存在时
  // 优先深链模式；页签刷新恢复的模式次之），选区落定后再由列表 effect 统一查询——
  // 避免「新游戏 + 旧游戏模式过滤」的交互冲突空查询（2026-09-07 用户拍板交互）。
  useEffect(() => {
    if (!selectedGameId) return
    const nav = pendingNavRef.current
    pendingNavRef.current = null
    // 页签刷新恢复的模式仅首次生效（恢复的游戏+模式是配套快照），用后即清
    const restoredMode = restoredFiltersRef.current.selectedModeId as string | undefined
    if (restoredMode) delete restoredFiltersRef.current.selectedModeId
    const wantMode =
      nav && nav.gameId === selectedGameId
        ? nav.modeId ?? ''
        : (restoredMode ?? '')
    modePendingRef.current = true
    pager.resetPage()
    loadModes().then((list) => {
      if (!mountedRef.current) return
      const nextMode =
        wantMode && list.some((m) => m.id === wantMode)
          ? wantMode
          : (list[0]?.id ?? '')
      selectedModeIdRef.current = nextMode
      setSelectedModeId(nextMode)
      modePendingRef.current = false
    })
  }, [selectedGameId, loadModes])

  // 列表加载：随 游戏 / 模式筛选 / 分页 变化触发；模式默认选中未落定时跳过
  // （防止同批次内用「旧游戏模式过滤」发出空查询）
  useEffect(() => {
    if (!selectedGameId) return
    if (modePendingRef.current) return
    loadLevels()
  }, [selectedGameId, selectedModeId, pager.pagination.current, pager.pagination.pageSize, loadLevels])

  // 页签刷新筛选持久化（卸载时写回快照）
  usePersistTabFilters('game_levels', { selectedGameId, selectedModeId })

  // 弹窗回显走 key 强制重挂载 + initialValues（Modal 惰性挂载前 setFieldsValue 无效；
  // 且表单值无 id，旧写法解构 id 为 undefined 拼出 uuid:"undefined" 触发 22P02）
  const openAdd = () => {
    setEditing(null)
    setModalVisible(true)
  }

  const openEdit = (record: DbGameLevel) => {
    setEditing(record)
    setModalVisible(true)
  }

  const formInitialValues = (): Record<string, any> => {
    if (editing) {
      return {
        ...editing,
        config: JSON.stringify(editing.config ?? {}),
        target: JSON.stringify(editing.target ?? {}),
      }
    }
    return {
      game_id: selectedGameId || undefined,
      enabled: true,
      count_for_daily_clear: false,
      reward_points: 0,
      reward_repeatable: false,
      sort_order: 0,
      config: '{}',
      target: '{}',
    }
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
      // 模式为空（未选 / 清空）时存 NULL，避免写入空串触发 FK 类型问题
      payload.mode_id = values.mode_id || null
      try {
        payload.config = values.config ? JSON.parse(values.config) : {}
        payload.target = values.target ? JSON.parse(values.target) : {}
      } catch {
        message.error('config / target 不是合法 JSON')
        setSaving(false)
        return
      }
      if (editing) {
        const result = await gameLevelService.update(editing.id, payload)
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
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm:ss'),
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
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="关卡配置说明"
        description="关卡按「游戏 → 模式 → 关卡」三级组织；config 键名须与 App 引擎读取键一致（参考各 play_kind 推荐模板）；reward_points 为通关奖励，count_for_daily_clear 决定是否计入每日首通。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Text>选择游戏：</Text>
            <Select
              className={styles.sel240}
              placeholder="请选择游戏"
              value={selectedGameId || undefined}
              onChange={(v) => {
                setSelectedGameId(v)
                pager.resetPage()
              }}
              options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
            />
            <Text>模式：</Text>
            <Select
              className={styles.sel240}
              placeholder="全部模式"
              allowClear
              value={selectedModeId || undefined}
              onChange={(v) => {
                const next = v || ''
                setSelectedModeId(next)
                selectedModeIdRef.current = next
                pager.resetPage()
              }}
              options={modes.map((m) => ({ value: m.id, label: `${m.name}（${m.code}）` }))}
            />
            <Button icon={<ReloadOutlined />} onClick={loadLevels} loading={loading}>
              刷新
            </Button>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canWrite || !selectedGameId}
            onClick={openAdd}
          >
            新增关卡
          </Button>
        </div>
      </Card>

      {selectedGameId ? (
        <>
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
        afterOpenChange={(open) => {
          // 修复编辑/新增弹窗表单串数据：Form.useForm 为单例，initialValues 仅首次挂载消费；
          // Modal 惰性挂载，open 前 setFieldsValue 无效。弹窗真正打开（子组件已挂载）后重置并回显。
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
        <Form
          form={form}
          layout="vertical"
          key={`${editing?.id ?? 'create'}-${selectedGameId}`}
          initialValues={formInitialValues()}
        >
          <Form.Item name="game_id" label="所属游戏" rules={[{ required: true, message: '请选择游戏' }]}>
            <Select
              placeholder="选择游戏"
              options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
            />
          </Form.Item>
          <Form.Item name="mode_id" label="所属模式" tooltip="关卡归属的模式；与上方「模式」筛选联动">
            <Select
              placeholder="选择模式"
              allowClear
              options={modes.map((m) => ({ value: m.id, label: `${m.name}（${m.code}）` }))}
            />
          </Form.Item>
          <Form.Item name="level_no" label="关卡号" rules={[{ required: true, message: '请输入关卡号' }]}>
            <InputNumber className={common.fullWidth} min={1} />
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
            <InputNumber className={common.fullWidth} min={0} />
          </Form.Item>
          <Form.Item name="reward_repeatable" label="可重复通关获取" valuePropName="checked" tooltip="开启后每次通关均可获得（受单日上限约束）；关闭则仅首次通关获得（终身一次）">
            <Switch checkedChildren="可重复" unCheckedChildren="仅一次" />
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

export default GameLevels
