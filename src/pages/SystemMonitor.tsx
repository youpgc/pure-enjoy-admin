import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Typography,
} from 'antd'
import {
  DatabaseOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { supabase } from '../utils/supabase'
import { handleApiError } from '../utils/apiClient'

const { Text } = Typography

// ==================== 类型定义 ====================

interface TableInfo {
  name: string
  row_count: number
}

// ==================== 已知表名列表 ====================

const KNOWN_TABLES = [
  'users', 'admin_users', 'app_versions', 'app_configs', 'novels', 'novel_chapters', 'user_novels',
  'mood_diaries', 'expenses', 'weight_records', 'notes', 'reminders', 'habits', 'user_favorites',
  'user_anniversaries', 'user_feedback', 'feedback_flow_records', 'notifications', 'operation_logs',
  'error_logs', 'point_records', 'sensitive_words', 'sensitive_word_logs', 'dict_items', 'dict_types',
  'system_configs', 'announcements',
]

// ==================== 主组件 ====================

const SystemMonitor: React.FC = () => {
  const [tableStatsLoading, setTableStatsLoading] = useState(false)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [dbConnected, setDbConnected] = useState(false)

  // 通过 REST API 并行查询所有表的行数
  const fetchTableStats = useCallback(async () => {
    setTableStatsLoading(true)
    try {
      const results = await Promise.all(
        KNOWN_TABLES.map(async (tableName): Promise<TableInfo> => {
          try {
            const { count, error } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true })
            if (error) {
              console.warn(`[SystemMonitor] 查询表 ${tableName} 行数失败:`, error.message)
              return { name: tableName, row_count: 0 }
            }
            return { name: tableName, row_count: count ?? 0 }
          } catch {
            return { name: tableName, row_count: 0 }
          }
        })
      )
      setTables(results)
    } catch (error) {
      handleApiError(error, 'SystemMonitor-表统计')
    } finally {
      setTableStatsLoading(false)
    }
  }, [])

  // 获取数据库健康状态
  const fetchDatabaseStatus = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
      setDbConnected(!error)
    } catch (error) {
      handleApiError(error, 'SystemMonitor-健康检查')
      setDbConnected(false)
    }
  }, [])

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    await Promise.all([
      fetchTableStats(),
      fetchDatabaseStatus(),
    ])
  }, [fetchTableStats, fetchDatabaseStatus])

  // 初始加载
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // 表格列定义
  const tableColumns = [
    {
      title: '表名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '行数',
      dataIndex: 'row_count',
      key: 'row_count',
      sorter: (a: TableInfo, b: TableInfo) => a.row_count - b.row_count,
      defaultSortOrder: 'descend' as const,
      render: (count: number) => count?.toLocaleString() ?? '0',
    },
  ]

  const totalRows = tables.reduce((sum, t) => sum + t.row_count, 0)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>数据库统计</h2>
        <Button icon={<ReloadOutlined />} onClick={loadAllData} loading={tableStatsLoading}>
          刷新
        </Button>
      </div>

      {/* 状态概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="数据库状态"
              value={dbConnected ? '已连接' : '未连接'}
              prefix={dbConnected ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: dbConnected ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总表数"
              value={tables.length}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总数据行数"
              value={totalRows.toLocaleString()}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="非空表数"
              value={tables.filter(t => t.row_count > 0).length}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 表统计 */}
      <Card title="各表数据行数统计">
        <Table
          dataSource={tables}
          columns={tableColumns}
          rowKey="name"
          loading={tableStatsLoading}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </Card>
    </div>
  )
}

export default SystemMonitor
