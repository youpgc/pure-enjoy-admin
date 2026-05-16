import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, Table, Input, Select, DatePicker, Button, Tag, Space, Spin, Empty, Tooltip, message } from 'antd'
import { SearchOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { usePermission } from '../hooks/usePermission'
import type { OperationLogItem } from '../utils/mockData'
import { exportToCSV } from '../utils/export'
import { supabase } from '../utils/supabase'

const { RangePicker } = DatePicker

const MODULE_OPTIONS = [
  { label: '用户管理', value: '用户管理' },
  { label: '消费记录', value: '消费记录' },
  { label: '心情日记', value: '心情日记' },
  { label: '体重记录', value: '体重记录' },
  { label: '笔记', value: '笔记' },
  { label: '小说', value: '小说' },
  { label: '版本管理', value: '版本管理' },
  { label: '系统', value: '系统' },
]

const ACTION_OPTIONS = [
  { label: '创建', value: '创建' },
  { label: '更新', value: '更新' },
  { label: '删除', value: '删除' },
  { label: '查看', value: '查看' },
  { label: '导出', value: '导出' },
  { label: '登录', value: '登录' },
  { label: '登出', value: '登出' },
  { label: '修改密码', value: '修改密码' },
  { label: '修改状态', value: '修改状态' },
  { label: '上传', value: '上传' },
]

const MODULE_COLOR_MAP: Record<string, string> = {
  '用户管理': 'blue',
  '消费记录': 'orange',
  '心情日记': 'green',
  '体重记录': 'cyan',
  '笔记': 'purple',
  '小说': 'geekblue',
  '版本管理': 'magenta',
  '系统': 'default',
}

const ACTION_COLOR_MAP: Record<string, string> = {
  '创建': 'green',
  '更新': 'blue',
  '删除': 'red',
  '查看': 'default',
  '导出': 'purple',
  '登录': 'cyan',
  '登出': 'default',
  '修改密码': 'orange',
  '修改状态': 'blue',
  '上传': 'geekblue',
}

// Supabase operation_logs 表返回的原始数据类型
interface OperationLogRow {
  id: string
  user_id: string
  action: string
  module: string
  target: string | null
  ip: string | null
  detail: string | null
  created_at: string
  users?: { nickname: string | null } | null
}

/** 将 Supabase 原始行映射为前端 OperationLogItem */
const mapRowToLogItem = (row: OperationLogRow): OperationLogItem => ({
  id: row.id,
  time: dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss'),
  user_name: row.users?.nickname || '未知用户',
  action: row.action,
  module: row.module,
  target: row.target || '',
  ip: row.ip || '',
  detail: row.detail || '',
})

const OperationLogs: React.FC = () => {
  const { isAdmin } = usePermission()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<OperationLogItem[]>([])
  const [searchUser, setSearchUser] = useState('')
  const [filterModule, setFilterModule] = useState<string | undefined>(undefined)
  const [filterAction, setFilterAction] = useState<string | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 从 Supabase 加载操作日志
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('operation_logs')
        .select('*, users:user_id(nickname)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('加载操作日志失败:', error)
        message.error('加载操作日志失败')
        setLogs([])
        return
      }

      const items: OperationLogItem[] = (data as OperationLogRow[] || []).map(mapRowToLogItem)
      setLogs(items)
    } catch (err) {
      console.error('加载操作日志异常:', err)
      message.error('加载操作日志异常')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // 筛选后的数据
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 用户搜索
      if (searchUser && !log.user_name.includes(searchUser)) return false
      // 模块筛选
      if (filterModule && log.module !== filterModule) return false
      // 操作类型筛选
      if (filterAction && log.action !== filterAction) return false
      // 时间范围筛选
      if (dateRange && dateRange[0] && dateRange[1]) {
        const logTime = dayjs(log.time)
        if (logTime.isBefore(dateRange[0], 'day') || logTime.isAfter(dateRange[1], 'day')) return false
      }
      return true
    })
  }, [logs, searchUser, filterModule, filterAction, dateRange])

  // 分页后的数据
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [filteredLogs, currentPage, pageSize])

  // 重置筛选
  const handleReset = () => {
    setSearchUser('')
    setFilterModule(undefined)
    setFilterAction(undefined)
    setDateRange(null)
    setCurrentPage(1)
  }

  // 导出 CSV
  const handleExport = () => {
    exportToCSV(
      filteredLogs,
      [
        { title: '时间', dataIndex: 'time' },
        { title: '用户', dataIndex: 'user_name' },
        { title: '操作', dataIndex: 'action' },
        { title: '模块', dataIndex: 'module' },
        { title: '目标', dataIndex: 'target' },
        { title: 'IP', dataIndex: 'ip' },
        { title: '详情', dataIndex: 'detail' },
      ],
      `操作日志_${dayjs().format('YYYYMMDD_HHmmss')}`
    )
  }

  // 表格列定义
  const columns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 170,
      sorter: (a: OperationLogItem, b: OperationLogItem) => dayjs(a.time).unix() - dayjs(b.time).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 100,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => (
        <Tag color={ACTION_COLOR_MAP[action] || 'default'}>{action}</Tag>
      ),
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 100,
      render: (module: string) => (
        <Tag color={MODULE_COLOR_MAP[module] || 'default'}>{module}</Tag>
      ),
    },
    {
      title: '目标',
      dataIndex: 'target',
      key: 'target',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
      render: (detail: string) => (
        <Tooltip title={detail}>
          <span>{detail}</span>
        </Tooltip>
      ),
    },
  ]

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Empty description="无权限访问此页面" />
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载操作日志..." />
      </div>
    )
  }

  return (
    <div>
      {/* 搜索和筛选 */}
      <Card style={{ borderRadius: 8, marginBottom: 16 }}>
        <Space wrap style={{ width: '100%' }} size="middle">
          <Input
            placeholder="搜索用户名"
            prefix={<SearchOutlined />}
            value={searchUser}
            onChange={e => { setSearchUser(e.target.value); setCurrentPage(1) }}
            style={{ width: 180 }}
            allowClear
          />
          <Select
            placeholder="操作类型"
            value={filterAction}
            onChange={val => { setFilterAction(val); setCurrentPage(1) }}
            options={ACTION_OPTIONS}
            style={{ width: 140 }}
            allowClear
          />
          <Select
            placeholder="模块"
            value={filterModule}
            onChange={val => { setFilterModule(val); setCurrentPage(1) }}
            options={MODULE_OPTIONS}
            style={{ width: 140 }}
            allowClear
          />
          <RangePicker
            value={dateRange as [Dayjs, Dayjs] | null}
            onChange={(dates) => { setDateRange(dates as [Dayjs | null, Dayjs | null] | null); setCurrentPage(1) }}
            placeholder={['开始日期', '结束日期']}
          />
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchLogs}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={handleExport}
            disabled={filteredLogs.length === 0}
          >
            导出
          </Button>
        </Space>
        <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 13 }}>
          共 {filteredLogs.length} 条记录
        </div>
      </Card>

      {/* 日志列表 */}
      <Card style={{ borderRadius: 8 }}>
        <Table
          dataSource={paginatedLogs}
          columns={columns}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total: filteredLogs.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page)
              setPageSize(size)
            },
          }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>
    </div>
  )
}

export default OperationLogs
