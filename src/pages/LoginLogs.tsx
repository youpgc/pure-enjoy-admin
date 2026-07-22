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
  Tooltip,
  Typography,
  Popconfirm,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PoweroffOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'
import { usePermission } from '../hooks/usePermission'
import { useMounted } from '../hooks/useMounted'

const { Text } = Typography
const { RangePicker } = DatePicker

// ==================== 类型定义 ====================

interface LoginLog {
  id: string
  user_id: string | null
  username: string | null
  role: string | null
  user_type: 'app' | 'admin'
  ip: string | null
  location: string | null
  user_agent: string | null
  login_at: string
  status: 'success' | 'failed'
}

interface LogFilters {
  keyword: string
  status: string | undefined
  userType: string | undefined
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
}

// ==================== 角色/类型映射 ====================

const ROLE_MAP: Record<string, { color: string; label: string }> = {
  user: { color: 'default', label: '普通用户' },
  admin: { color: 'blue', label: '管理员' },
  super_admin: { color: 'purple', label: '超级管理员' },
}

const USER_TYPE_MAP: Record<string, { color: string; label: string }> = {
  app: { color: 'green', label: 'App端' },
  admin: { color: 'geekblue', label: '管理后台' },
}

// ==================== 组件 ====================

const LoginLogs: React.FC = () => {
  const mountedRef = useMounted()

  const [logs, setLogs] = useState<LoginLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<LogFilters>({
    keyword: '',
    status: undefined,
    userType: undefined,
    dateRange: null,
  })
  const [callerId, setCallerId] = useState<string | null>(null)
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const { isSuperAdmin, isAdmin } = usePermission()

  // 取当前登录者 id（用于禁止强退自己）
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCallerId(data.user.id)
    }).catch(() => {})
  }, [])

  const logService = React.useMemo(() => new BaseService<LoginLog>('login_logs', {
    defaultOrder: { column: 'login_at', ascending: false },
  }), [])

  // 加载日志列表
  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await logService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`username.ilike.%${filters.keyword}%,ip.ilike.%${filters.keyword}%,location.ilike.%${filters.keyword}%`)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.userType) {
          query = query.eq('user_type', filters.userType)
        }
        if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
          query = query
            .gte('login_at', filters.dateRange[0].format('YYYY-MM-DD'))
            .lte('login_at', filters.dateRange[1].format('YYYY-MM-DD') + 'T23:59:59')
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'LoginLogs-加载日志')
        return
      }

      if (!mountedRef.current) return

      setLogs(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'LoginLogs-加载日志')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // 搜索 / 重置
  const handleSearch = () => {
    resetPage()
    loadLogs()
  }

  const handleReset = () => {
    setFilters({ keyword: '', status: undefined, userType: undefined, dateRange: null })
    resetPage()
  }

  // 强退：调用 RPC 撤销目标用户全部会话
  const handleRevoke = async (record: LoginLog) => {
    if (!record.user_id) {
      message.warning('该记录无对应用户，无法强退')
      return
    }
    try {
      const { error } = await supabase.rpc('admin_revoke_user', {
        p_target_user_id: record.user_id,
      } as any)
      if (error) throw error
      message.success('已强退该用户，其会话将立即失效')
      loadLogs()
    } catch (error: any) {
      const msg = error?.message || '强退失败'
      message.error(msg)
    }
  }

  // 是否可强退该记录（基于调用者角色 + 目标角色 + 是否自己）
  const canRevoke = (record: LoginLog): boolean => {
    if (!record.user_id) return false
    if (callerId && record.user_id === callerId) return false
    if (isSuperAdmin()) {
      // 超级管理员可退 admin + user，不可退其他超级管理员
      return record.role !== 'super_admin'
    }
    if (isAdmin()) {
      // 管理员仅可退普通用户
      return record.role === 'user'
    }
    return false
  }

  // 表格列定义
  const columns: ColumnsType<LoginLog> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      ellipsis: true,
      render: (v: string | null) => v || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 110,
      render: (role: string | null) => {
        const info = ROLE_MAP[role || ''] || { color: 'default', label: role || '-' }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '来源',
      dataIndex: 'user_type',
      key: 'user_type',
      width: 100,
      render: (t: string) => {
        const info = USER_TYPE_MAP[t] || { color: 'default', label: t }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
      ellipsis: true,
      render: (v: string | null) => v || '-',
    },
    {
      title: '登录地点',
      dataIndex: 'location',
      key: 'location',
      width: 160,
      ellipsis: true,
      render: (v: string | null) => v || '-',
    },
    {
      title: '登录时间',
      dataIndex: 'login_at',
      key: 'login_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) =>
        status === 'success'
          ? <Tag color="success">成功</Tag>
          : <Tag color="error">失败</Tag>,
    },
    {
      title: '用户代理',
      dataIndex: 'user_agent',
      key: 'user_agent',
      width: 200,
      ellipsis: true,
      render: (v: string | null) => {
        if (!v) return '-'
        return (
          <Tooltip title={v}>
            <Text ellipsis style={{ maxWidth: 180 }}>{v}</Text>
          </Tooltip>
        )
      },
    },
    {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 100,
        render: (_: unknown, record: LoginLog) => {
          if (!canRevoke(record)) return <span>-</span>
          return (
            <Popconfirm
              title="确认强退"
              description={`确定要强退「${record.username || record.user_id}」吗？其所有会话将立即失效。`}
              onConfirm={() => handleRevoke(record)}
              okText="强退"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<PoweroffOutlined />}>
                强退
              </Button>
            </Popconfirm>
          )
        },
      },
    ]

  return (
    <div style={{ padding: 24 }}>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索用户名/IP/地点"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { value: 'success', label: '成功' },
              { value: 'failed', label: '失败' },
            ]}
          />
          <Select
            placeholder="来源"
            value={filters.userType}
            onChange={(value) => setFilters(prev => ({ ...prev, userType: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { value: 'app', label: 'App端' },
              { value: 'admin', label: '管理后台' },
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
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
        scroll={{ x: 'max-content' }}
      />
    </div>
  )
}

export default LoginLogs
