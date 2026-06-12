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
  Typography,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  HistoryOutlined,
  UserOutlined,
  SettingOutlined,
  BookOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'

const { Text } = Typography
const { RangePicker } = DatePicker

// ==================== 类型定义 ====================

interface OperationLog {
  id: string
  user_id: string
  action: string
  module: string
  details?: Record<string, any>
  ip?: string
  target_id?: string
  user_agent?: string
  created_at: string
}

interface LogFilters {
  keyword: string
  action: string | undefined
  module: string | undefined
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
}

// ==================== 组件 ====================

const OperationLogs: React.FC = () => {
  const [logs, setLogs] = useState<OperationLog[]>([])
  const [loading, setLoading] = useState(false)
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [filters, setFilters] = useState<LogFilters>({
    keyword: '',
    action: undefined,
    module: undefined,
    dateRange: null,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const { isAdmin: _isAdmin } = usePermission()

  const logService = new BaseService<OperationLog>('operation_logs', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载日志列表
  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await logService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`action.ilike.%${filters.keyword}%,module.ilike.%${filters.keyword}%`)
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

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的日志')
      return
    }
    try {
      const { error } = await supabase
        .from('operation_logs')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) {
        handleApiError(error, 'OperationLogs-批量删除')
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
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => <Tag color="blue">{action}</Tag>,
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (module: string) => {
        const moduleMap: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
          user: { color: 'blue', label: '用户', icon: <UserOutlined /> },
          system: { color: 'purple', label: '系统', icon: <SettingOutlined /> },
          novel: { color: 'green', label: '小说', icon: <BookOutlined /> },
          content: { color: 'orange', label: '内容', icon: <FileTextOutlined /> },
        }
        const info = moduleMap[module] || { color: 'default', label: module, icon: null }
        return <Tag color={info.color} icon={info.icon}>{info.label}</Tag>
      },
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
      render: (details: Record<string, any>) => {
        if (!details) return '-'
        try {
          return <Text style={{ fontSize: 12 }}>{JSON.stringify(details)}</Text>
        } catch {
          return String(details)
        }
      },
    },
    {
      title: '目标ID',
      dataIndex: 'target_id',
      key: 'target_id',
      width: 120,
      render: (targetId: string) => targetId || '-',
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
      render: (ip: string) => ip || '-',
    },
    {
      title: 'User Agent',
      dataIndex: 'user_agent',
      key: 'user_agent',
      width: 150,
      ellipsis: true,
      render: (ua: string) => ua || '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总日志数"
              value={pagination.total}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="今日操作"
              value={logs.filter(l => dayjs(l.created_at).isSame(dayjs(), 'day')).length}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="用户模块"
              value={logs.filter(l => l.module === 'user').length}
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索操作/模块"
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
            options={[
              { label: '创建', value: 'create' },
              { label: '更新', value: 'update' },
              { label: '删除', value: 'delete' },
              { label: '查询', value: 'read' },
            ]}
          />
          <Select
            placeholder="模块"
            value={filters.module}
            onChange={(value) => setFilters(prev => ({ ...prev, module: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '用户', value: 'user' },
              { label: '系统', value: 'system' },
              { label: '小说', value: 'novel' },
              { label: '内容', value: 'content' },
            ]}
          />
          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates as any }))}
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
        scroll={{ x: 1000 }}
      />
    </div>
  )
}

export default OperationLogs
