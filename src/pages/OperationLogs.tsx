import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, Table, Input, Select, DatePicker, Button, Tag, Space, Spin, Empty, Tooltip, message, Modal, Popconfirm, Row, Col, Statistic } from 'antd'
import { SearchOutlined, ExportOutlined, ReloadOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { usePermission } from '../hooks/usePermission'
import { usePagination } from '../hooks/usePagination'
import { exportToCSV } from '../utils/export'
import { supabase } from '../utils/supabase'
import { useDictOptions } from '../hooks/useDictOptions'

// 操作日志数据类型（与 operation_logs 表字段对应）
interface OperationLogItem {
  id: string
  time: string
  user_name: string
  action: string
  module: string
  target: string
  ip: string
  detail: string
}

const { RangePicker } = DatePicker







const OperationLogs: React.FC = () => {
  const { isAdmin } = usePermission()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<OperationLogItem[]>([])
  const [searchUser, setSearchUser] = useState('')
  const [filterModule, setFilterModule] = useState<string | undefined>(undefined)
  const [filterAction, setFilterAction] = useState<string | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const { currentPage, pageSize, paginate, resetPage, setCurrentPage, setPageSize } = usePagination()

  // 字典查询
  const { options: moduleOptions, colors: moduleColors } = useDictOptions('operation_module')
  const { options: actionOptions, colors: actionColors } = useDictOptions('operation_action')

  // 日志清理功能
  const [cleanModalOpen, setCleanModalOpen] = useState(false)
  const [cleanDays, setCleanDays] = useState<number>(30)
  const [cleanLoading, setCleanLoading] = useState(false)
  const [cleanStats, setCleanStats] = useState({ total: 0, toDelete: 0 })

  // 从 Supabase 加载操作日志
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      // 查询 operation_logs 表，关联 users 表获取用户昵称
      const { data, error } = await supabase
        .from('operation_logs')
        .select('id, user_id, action, module, target_id, details, ip, user_agent, created_at, users:user_id(nickname)')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) {
        console.error('加载操作日志失败:', error)
        message.error(`加载操作日志失败: ${error.message}`)
        setLogs([])
        return
      }

      // 映射数据库字段到界面展示字段
      const items: OperationLogItem[] = (data as any[] || []).map((row: any) => ({
        id: String(row.id),
        time: dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss'),
        user_name: row.users?.nickname || '未知用户',
        action: row.action || '',
        module: row.module || '',
        target: row.target_id || '',
        ip: row.ip || '',
        detail: typeof row.details === 'object' && row.details !== null
          ? JSON.stringify(row.details)
          : (row.details as string) || '',
      }))
      setLogs(items)
    } catch (err) {
      console.error('加载操作日志异常:', err)
      message.error('加载操作日志异常，请稍后重试')
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
  const paginatedLogs = useMemo(() => paginate(filteredLogs), [filteredLogs, currentPage, pageSize, paginate])

  // 重置筛选
  const handleReset = () => {
    setSearchUser('')
    setFilterModule(undefined)
    setFilterAction(undefined)
    setDateRange(null)
    resetPage()
  }

  // 计算清理预览
  const handlePreviewClean = useCallback(async () => {
    try {
      const beforeDate = dayjs().subtract(cleanDays, 'day').format('YYYY-MM-DD')

      // 查询将要删除的日志数量
      const { count, error } = await supabase
        .from('operation_logs')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', beforeDate)

      if (error) throw error

      setCleanStats({
        total: logs.length,
        toDelete: count || 0,
      })
    } catch (err) {
      console.error('计算清理数量失败:', err)
      message.error('计算清理数量失败')
    }
  }, [cleanDays, logs.length])

  // 执行清理
  const handleCleanLogs = async () => {
    setCleanLoading(true)
    try {
      const beforeDate = dayjs().subtract(cleanDays, 'day').format('YYYY-MM-DD')

      const { error } = await supabase
        .from('operation_logs')
        .delete()
        .lt('created_at', beforeDate)

      if (error) throw error

      message.success(`成功清理 ${cleanStats.toDelete} 条历史日志`)
      setCleanModalOpen(false)
      fetchLogs() // 刷新列表
    } catch (err) {
      console.error('清理日志失败:', err)
      message.error('清理日志失败')
    } finally {
      setCleanLoading(false)
    }
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
        <Tag color={actionColors[action] || 'default'}>{actionOptions.find(opt => opt.value === action)?.label || action}</Tag>
      ),
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 100,
      render: (module: string) => (
        <Tag color={moduleColors[module] || 'default'}>{moduleOptions.find(opt => opt.value === module)?.label || module}</Tag>
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
            options={actionOptions}
            style={{ width: 140 }}
            allowClear
          />
          <Select
            placeholder="模块"
            value={filterModule}
            onChange={val => { setFilterModule(val); setCurrentPage(1) }}
            options={moduleOptions}
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
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setCleanModalOpen(true)
              handlePreviewClean()
            }}
          >
            清理历史
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

      {/* 日志清理弹窗 */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#faad14' }} />
            <span>清理历史日志</span>
          </Space>
        }
        open={cleanModalOpen}
        onCancel={() => setCleanModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setCleanModalOpen(false)}>
            取消
          </Button>,
          <Popconfirm
            key="confirm"
            title="确认清理"
            description={`确定要删除 ${cleanDays} 天前的所有历史日志吗？此操作不可恢复！`}
            onConfirm={handleCleanLogs}
            okText="确认清理"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: cleanLoading }}
          >
            <Button type="primary" danger loading={cleanLoading}>
              确认清理
            </Button>
          </Popconfirm>,
        ]}
        width={500}
      >
        <div style={{ padding: '16px 0' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Statistic title="当前日志总数" value={cleanStats.total} />
            </Col>
            <Col span={12}>
              <Statistic
                title={`${cleanDays} 天前日志数`}
                value={cleanStats.toDelete}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
          </Row>
          <div style={{ marginTop: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <span>清理策略：删除指定天数之前的所有操作日志</span>
              <Select
                value={cleanDays}
                onChange={setCleanDays}
                style={{ width: '100%' }}
                options={[
                  { label: '7 天前的日志', value: 7 },
                  { label: '30 天前的日志', value: 30 },
                  { label: '90 天前的日志', value: 90 },
                  { label: '180 天前的日志', value: 180 },
                  { label: '365 天前的日志', value: 365 },
                ]}
              />
              <Button block onClick={handlePreviewClean}>
                刷新预览
              </Button>
            </Space>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default OperationLogs
