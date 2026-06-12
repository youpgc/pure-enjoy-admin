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
  Tooltip,
  Typography,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'
import { getActionColumn } from '../components/ActionColumn'

const { Text } = Typography

// ==================== 类型定义 ====================

interface ErrorLog {
  id: string
  level: string
  module: string
  message: string
  detail?: Record<string, unknown>
  user_id?: string
  created_at: string
}

interface ErrorLogFilters {
  keyword: string
  level: string | undefined
}

// ==================== 级别映射 ====================

const LEVEL_MAP: Record<string, { color: string; label: string }> = {
  error: { color: 'red', label: 'ERROR' },
  warning: { color: 'orange', label: 'WARNING' },
  info: { color: 'blue', label: 'INFO' },
}

// ==================== 组件 ====================

const ErrorLogs: React.FC = () => {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<ErrorLogFilters>({
    keyword: '',
    level: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()

  const errorLogService = new BaseService<ErrorLog>('error_logs', {
    defaultOrder: { column: 'created_at', ascending: false },
  })

  // 加载错误日志列表
  const loadErrorLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await errorLogService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`message.ilike.%${filters.keyword}%,module.ilike.%${filters.keyword}%`)
        }
        if (filters.level) {
          query = query.eq('level', filters.level)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'ErrorLogs-加载错误日志')
        return
      }

      setErrorLogs(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'ErrorLogs-加载错误日志')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadErrorLogs()
  }, [loadErrorLogs])

  // 搜索
  const handleSearch = () => {
    resetPage()
    loadErrorLogs()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      level: undefined,
    })
    resetPage()
  }

  // 删除单条
  const handleDelete = async (id: string) => {
    try {
      const result = await errorLogService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'ErrorLogs-删除')
        return
      }
      message.success('删除成功')
      loadErrorLogs()
    } catch (error) {
      handleApiError(error, 'ErrorLogs-删除')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的错误日志')
      return
    }
    try {
      const result = await errorLogService.batchDelete(selectedRowKeys as string[])
      if (!result.success) {
        handleApiError(result.errorMessage, 'ErrorLogs-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 条错误日志`)
      setSelectedRowKeys([])
      loadErrorLogs()
    } catch (error) {
      handleApiError(error, 'ErrorLogs-批量删除')
    }
  }

  // 表格列定义
  const columns: ColumnsType<ErrorLog> = [
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (v: string) => {
        const info = LEVEL_MAP[v] || { color: 'default', label: v?.toUpperCase() }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (v: string) => (
        <Tooltip title={v}>
          <Text ellipsis>{v}</Text>
        </Tooltip>
      ),
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
      render: (v: Record<string, unknown>) => {
        if (!v) return '-'
        try {
          return <Tooltip title={JSON.stringify(v)}><Text ellipsis>{JSON.stringify(v)}</Text></Tooltip>
        } catch {
          return String(v)
        }
      },
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 200,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    getActionColumn<ErrorLog>(
      (record) => [
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        },
      ],
      { width: 100, maxVisible: 1 }
    ),
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索消息/模块"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="日志级别"
            value={filters.level}
            onChange={(value) => setFilters(prev => ({ ...prev, level: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: 'ERROR', value: 'error' },
              { label: 'WARNING', value: 'warning' },
              { label: 'INFO', value: 'info' },
            ]}
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
        <Button icon={<ReloadOutlined />} onClick={loadErrorLogs} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 错误日志表格 */}
      <Table
        columns={columns}
        dataSource={errorLogs}
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

export default ErrorLogs
