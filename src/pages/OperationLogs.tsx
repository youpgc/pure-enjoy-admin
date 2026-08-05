import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Card,
  message,
  Select,
  DatePicker,
} from 'antd'
import EllipsisText from '../components/EllipsisText'
import {
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  UserOutlined,
  SettingOutlined,
  BookOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'
import { usePermission } from '../hooks/usePermission'
import { useMounted } from '../hooks/useMounted'
import { getActionColumn } from '../components/ActionColumn'
import { ACTION_MAP, ACTION_OPTIONS, MODULE_OPTIONS, DETAIL_ENUM_MAP, getModuleLabel, getModuleColor } from '../constants'
import { useUsernames } from '../hooks/useUsernames'
import { UserName } from '../components/UserName'

const { RangePicker } = DatePicker

// ==================== 类型定义 ====================

interface OperationLog {
  id: string
  user_id: string
  action: string
  module: string
  target_id?: string
  details?: Record<string, unknown>
  ip?: string
  user_agent?: string
  created_at: string
}

interface LogFilters {
  keyword: string
  action: string | undefined
  module: string | undefined
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
}

// ==================== 模块映射（合并本地图标 + 集中映射兜底） ====================
//
// 本地图标仅覆盖高频模块；未命中时 render 回退到 OP_MODULE_MAP 取 label/color（无图标）。
// 新增表名只需维护 OP_MODULE_MAP，此处无需同步。

const MODULE_ICON_MAP: Record<string, React.ReactNode> = {
  users: <UserOutlined />,
  user: <UserOutlined />,
  system: <SettingOutlined />,
  novels: <BookOutlined />,
  novel: <BookOutlined />,
  content: <FileTextOutlined />,
  files: <FileTextOutlined />,
  roles: <SafetyCertificateOutlined />,
  sensitive_words: <WarningOutlined />,
  user_feedback: <MessageOutlined />,
}

/** 带图标的完整模块信息（本地图标 + 模块中文名/颜色兜底链，审查 P3-2） */
function getModuleInfo(module: string): { color: string; label: string; icon: React.ReactNode } {
  return {
    color: getModuleColor(module),
    label: getModuleLabel(module),
    icon: MODULE_ICON_MAP[module] || null,
  }
}

// ==================== 详情渲染（让「删除了什么」可读） ====================
//
// 删除/更新操作现在会把被改记录的快照写入 details（见 BaseService.delete/batchDelete）。
// 此处把快照翻译为业务可读文本；历史日志（details 为 null）回退显示「—」。

// 详情中需隐藏的系统字段，仅保留业务可读字段
const DETAIL_HIDDEN_FIELDS = new Set(['id', 'created_at', 'updated_at', 'auth_id', 'user_id', 'is_deleted'])

/** 把一条记录快照转成可读文本（隐藏系统字段、跳过空值），并按所属模块翻译枚举值 */
function snapshotToText(rec: Record<string, unknown>, module?: string): string {
  const enumByField = module ? DETAIL_ENUM_MAP[module] : undefined
  const parts: string[] = []
  for (const [k, v] of Object.entries(rec)) {
    if (DETAIL_HIDDEN_FIELDS.has(k)) continue
    if (v === null || v === undefined || v === '') continue
    let display = typeof v === 'object' ? JSON.stringify(v) : String(v)
    // 枚举值翻译：命中「模块 + 字段 + 值」时显示中文，否则保留原始值（不丢信息）
    const fieldMap = enumByField?.[k]
    if (fieldMap) {
      const mapped = fieldMap[display]
      if (mapped !== undefined) display = mapped
    }
    parts.push(`${k}=${display}`)
  }
  return parts.length ? parts.join('，') : '(无其它业务字段)'
}

/** 把 details 渲染为可读摘要：删除/更新快照优先展示业务内容（枚举已翻译），其余原样 JSON */
function formatDetails(details: Record<string, unknown> | undefined, module?: string): string {
  if (!details) return ''
  if (details.deleted !== undefined) {
    const d = details.deleted
    if (Array.isArray(d)) {
      if (d.length === 0) return `共删除 ${details.count ?? 0} 条（快照缺失）`
      return `共删除 ${details.count ?? d.length} 条：${d.map((r) => snapshotToText(r as Record<string, unknown>, module)).join('；')}`
    }
    return snapshotToText(d as Record<string, unknown>, module)
  }
  if (details.changes !== undefined) {
    return `变更：${snapshotToText(details.changes as Record<string, unknown>, module)}`
  }
  return JSON.stringify(details)
}

// ==================== 组件 ====================

const OperationLogs: React.FC = () => {
  const mountedRef = useMounted()

  const [logs, setLogs] = useState<OperationLog[]>([])

  // 批量解析列表中涉及的用户名（用于「用户名」列）
  const userMap = useUsernames(logs.map((l) => l.user_id))
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<LogFilters>({
    keyword: '',
    action: undefined,
    module: undefined,
    dateRange: null,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const { hasPermission } = usePermission()

  const logService = React.useMemo(() => new BaseService<OperationLog>('operation_logs', {
    defaultOrder: { column: 'created_at', ascending: false },
  }), [])

  // 加载日志列表
  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await logService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`action.ilike.%${filters.keyword}%,module.ilike.%${filters.keyword}%,user_id.ilike.%${filters.keyword}%`)
        }
        if (filters.action) {
          query = query.eq('action', filters.action)
        }
        if (filters.module) {
          query = query.eq('module', filters.module)
        }
        if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
          query = query
            .gte('created_at', filters.dateRange[0].format('YYYY-MM-DD'))
            .lte('created_at', filters.dateRange[1].format('YYYY-MM-DD') + 'T23:59:59')
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'OperationLogs-加载日志')
        return
      }

      if (!mountedRef.current) return

      setLogs(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'OperationLogs-加载日志')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // 搜索
  const handleSearch = () => {
    resetPage()
    loadLogs()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      action: undefined,
      module: undefined,
      dateRange: null,
    })
    resetPage()
  }

  // 删除单条
  const handleDelete = async (id: string) => {
    try {
      const result = await logService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'OperationLogs-删除')
        return
      }
      message.success('删除成功')
      loadLogs()
    } catch (error) {
      handleApiError(error, 'OperationLogs-删除')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的日志')
      return
    }
    try {
      const result = await logService.batchDelete(selectedRowKeys as string[])
      if (!result.success) {
        handleApiError(result.errorMessage, 'OperationLogs-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 条日志`)
      setSelectedRowKeys([])
      loadLogs()
    } catch (error) {
      handleApiError(error, 'OperationLogs-批量删除')
    }
  }

  // 表格列定义
  const columns: ColumnsType<OperationLog> = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 200,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '用户名',
      dataIndex: 'user_id',
      key: 'username',
      width: 120,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => {
        const info = ACTION_MAP[action] || { color: 'default', label: action }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (module: string) => {
        const info = getModuleInfo(module)
        return <Tag color={info.color} icon={info.icon}>{info.label}</Tag>
      },
    },
    {
      title: '目标ID',
      dataIndex: 'target_id',
      key: 'target_id',
      width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: '操作内容',
      dataIndex: 'details',
      key: 'details',
      width: 320,
      ellipsis: true,
      render: (v: Record<string, unknown>, record: OperationLog) => {
        const text = formatDetails(v, record.module)
        return text ? (
          <EllipsisText text={text} maxWidth={320} stripHtml={false} />
        ) : (
          <span style={{ color: '#bbb' }}>—</span>
        )
      },
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
      render: (v: string) => v || '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    getActionColumn<OperationLog>(
      (record) => {
        const actions = []
        if (hasPermission('operation_logs:delete')) {
          actions.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDelete(record.id),
          })
        }
        return actions
      },
      { width: 100, maxVisible: 1 }
    ),
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索操作/详情"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="操作类型"
            value={filters.action}
            onChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
            style={{ width: 120 }}
            allowClear
            options={ACTION_OPTIONS}
          />
          <Select
            placeholder="模块"
            value={filters.module}
            onChange={(value) => setFilters(prev => ({ ...prev, module: value }))}
            style={{ width: 120 }}
            allowClear
            options={MODULE_OPTIONS}
          />
          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      {/* 操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          {selectedRowKeys.length > 0 && (
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
              批量删除 ({selectedRowKeys.length})
            </Button>
          )}
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadLogs} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 日志表格 */}
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        pagination={tablePagination}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  )
}

export default OperationLogs
