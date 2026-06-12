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
  Typography,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  AlertOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { BaseService, handleApiError } from '../utils/apiClient'

const { Text } = Typography

// ==================== 类型定义 ====================

interface ErrorLog {
  id: string
  level: string
  module: string
  message: string
  detail?: Record<string, any> | null
  user_id?: string | null
  created_at: string
}

interface LogFilters {
  keyword: string
  level: string | undefined
}

// ==================== 组件 ====================

const ErrorLogs: React.FC = () => {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<LogFilters>({
    keyword: '',
    level: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [stats, setStats] = useState({ total: 0, errorCount: 0, warningCount: 0, todayCount: 0 })

  const logService = new BaseService<ErrorLog>('error_logs', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const { count: totalCount } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })

      const { count: errorCount } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'error')

      const { count: warningCount } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'warning')

      const { count: todayCount } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayjs().startOf('day').format('YYYY-MM-DD HH:mm:ss'))

      setStats({
        total: totalCount || 0,
        errorCount: errorCount || 0,
        warningCount: warningCount || 0,
        todayCount: todayCount || 0,
      })
    } catch (error) {
      handleApiError(error, 'ErrorLogs-加载统计')
    }
  }, [])

  // 加载日志列表
  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await logService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`module.ilike.%${filters.keyword}%,message.ilike.%${filters.keyword}%`)
        }
        if (filters.level) {
          query = query.eq('level', filters.level)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'ErrorLogs-加载日志')
        return
      }

      setLogs(result.data?.data || [])
      setPagination(prev => ({ ...prev, total: result.data?.total || 0 }))
    } catch (error) {
      handleApiError(error, 'ErrorLogs-加载日志')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // 搜索
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }))
    loadLogs()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      level: undefined,
    })
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的日志')
      return
    }
    try {
      const { error } = await supabase
        .from('error_logs')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) {
        handleApiError(error, 'ErrorLogs-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 条日志`)
      setSelectedRowKeys([])
      loadLogs()
      loadStats()
    } catch (error) {
      handleApiError(error, 'ErrorLogs-批量删除')
    }
  }

  // level 标签颜色映射
  const getLevelTag = (level: string) => {
    const map: Record<string, { color: string; icon: React.ReactNode }> = {
      error: { color: 'red', icon: <AlertOutlined /> },
      warning: { color: 'orange', icon: <WarningOutlined /> },
      info: { color: 'blue', icon: <InfoCircleOutlined /> },
    }
    const info = map[level] || { color: 'default', icon: null }
    return <Tag color={info.color} icon={info.icon}>{level.toUpperCase()}</Tag>
  }

  // 表格列定义
  const columns: ColumnsType<ErrorLog> = [
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => getLevelTag(level),
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (module: string) => <Tag>{module}</Tag>,
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (msg: string) => <Text style={{ fontSize: 13 }}>{msg}</Text>,
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 200,
      render: (userId: string | null) => userId || '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总日志数"
              value={stats.total}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Error 数"
              value={stats.errorCount}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Warning 数"
              value={stats.warningCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="今日新增"
              value={stats.todayCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索模块/消息"
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
              { label: 'Error', value: 'error' },
              { label: 'Warning', value: 'warning' },
              { label: 'Info', value: 'info' },
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
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 20 }))
          },
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 800 }}
        expandable={{
          expandedRowRender: (record) => {
            if (!record.detail) {
              return <Text type="secondary">无详情数据</Text>
            }
            try {
              return (
                <div style={{ padding: '8px 0' }}>
                  <Text strong>Detail (JSONB):</Text>
                  <pre style={{
                    marginTop: 8,
                    padding: 12,
                    background: '#f5f5f5',
                    borderRadius: 6,
                    fontSize: 12,
                    overflow: 'auto',
                    maxHeight: 300,
                  }}>
                    {JSON.stringify(record.detail, null, 2)}
                  </pre>
                </div>
              )
            } catch {
              return <Text type="secondary">详情数据解析失败</Text>
            }
          },
          rowExpandable: (record) => !!record.detail,
        }}
      />
    </div>
  )
}

export default ErrorLogs
