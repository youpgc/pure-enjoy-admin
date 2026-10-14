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
  Popconfirm,
  Tooltip,
} from 'antd'
import EllipsisText from '../../components/common/EllipsisText'
import { UNKNOWN_USER_LABEL, isAccountIdentifier } from '../../utils/userDisplay'
import {
  SearchOutlined,
  ReloadOutlined,
  PoweroffOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { LOGIN_SOURCE_APP, LOGIN_SOURCE_ADMIN, type LoginSource } from '../../constants/roles'
import type dayjs from 'dayjs'
import { formatDateTime } from '../../utils/format'
import { apiRequest } from '../../utils/adminHttp'
import { fetchAdminMe } from '../../utils/adminSession'
import { handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { usePermission } from '../../hooks/usePermission'
import { useMounted } from '../../hooks/useMounted'
import { ROLE_USER, ROLE_SUPER_ADMIN } from '../../constants'
import common from '../../styles/common.module.css'
import styles from './index.module.css'

const { RangePicker } = DatePicker

// ==================== 类型定义 ====================

interface LoginLog {
  id: string
  user_id: string | null
  username: string | null
  role: string | null
  user_type: LoginSource
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

  // 取当前登录者 id（用于禁止强退自己）——本地后端 /auth/me 为权威
  useEffect(() => {
    fetchAdminMe().then((me) => {
      if (me) setCallerId(me.id)
    }).catch(() => {})
  }, [])

  // 加载日志列表（本地后端 GET /admin/audit/login-logs，keyword 服务端 OR 三列）
  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.current),
        page_size: String(pagination.pageSize),
      })
      if (filters.keyword) params.set('keyword', filters.keyword)
      if (filters.status) params.set('status', filters.status)
      if (filters.userType) params.set('user_type', filters.userType)
      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        params.set('from', filters.dateRange[0].format('YYYY-MM-DD[T]00:00:00'))
        params.set('to', filters.dateRange[1].format('YYYY-MM-DD[T]23:59:59'))
      }
      const result = await apiRequest<{ list: LoginLog[]; total: number }>(
        'GET',
        `/admin/audit/login-logs?${params.toString()}`,
      )

      if (!mountedRef.current) return

      setLogs(result.list || [])
      setTotal(result.total || 0)
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

  // 强退：调用本地后端吊销目标用户全部 refresh token
  const handleRevoke = async (record: LoginLog) => {
    if (!record.user_id) {
      message.warning('该记录无对应用户，无法强退')
      return
    }
    try {
      const result = await apiRequest<{ revoked: number }>(
        'POST',
        `/admin/audit/login-logs/revoke?user_id=${encodeURIComponent(record.user_id)}&realm=${encodeURIComponent(record.user_type)}`,
      )
      message.success(`已强退该用户（吊销 ${result.revoked} 个会话），其将无法再续期`)
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
      return record.role !== ROLE_SUPER_ADMIN
    }
    if (isAdmin()) {
      // 管理员仅可退普通用户
      return record.role === ROLE_USER
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
      // 归因失败的历史行会回落写入「登录账号」本身（手机号/邮箱）——那不是人名，
      // 直接展示即用户反馈的「用户名列为手机号」。这里显示占位文案，
      // 原始账号放悬停提示，审计信息不丢。
      render: (v: string | null, record: LoginLog) => {
        if (!record.user_id && isAccountIdentifier(v)) {
          return (
            <Tooltip title={`登录账号：${v}（该账号当前无法归属）`}>
              <span>{UNKNOWN_USER_LABEL}</span>
            </Tooltip>
          )
        }
        return v || '-'
      },
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 110,
      // 未解析出用户时 role 为 null：给纯文本 '-'，不再套 Tag
      // （Tag 会被误读成一个角色名，此前正是如此）
      render: (role: string | null) => {
        const info = ROLE_MAP[role || '']
        if (!info) return role || '-'
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
      render: (date: string) => formatDateTime(date),
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
      render: (v: string | null) => <EllipsisText text={v} maxWidth={200} />,
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
    <div className={common.p24}>
      {/* 筛选栏 */}
      <Card className={common.mb16}>
        <Space wrap>
          <Input
            placeholder="搜索用户名/IP/地点"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            className={styles.searchInput}
            allowClear
          />
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            className={styles.filterSelect}
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
            className={styles.filterSelect}
            allowClear
            options={[
              { value: LOGIN_SOURCE_APP, label: 'App端' },
              { value: LOGIN_SOURCE_ADMIN, label: '管理后台' },
            ]}
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
      <div className={styles.toolbarRight}>
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
