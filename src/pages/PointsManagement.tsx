import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Table, Tag, Button, Modal, Input, InputNumber, Space, message, Empty
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  EyeOutlined, PlusOutlined, MinusOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { formatDateTime } from '../utils/format'
import { useDictOptions, useDictColors } from '../hooks/useDictOptions'

// ==================== 类型定义 ====================

interface UserRecord {
  id: string
  email: string | null
  nickname: string | null
  role: string | null
  member_level: string | null
  points: number | null
  login_count: number | null
  created_at: string
}

interface PointRecord {
  id: string
  user_id: string
  type: string
  amount: number
  remark: string | null
  operator_id: string | null
  operator_name: string | null
  created_at: string
  expires_at: string | null
  status: string | null
}

// ==================== 常量定义 ====================

const TYPE_TAG_MAP_FALLBACK: Record<string, { color: string; label: string }> = {
  checkin: { color: 'green', label: '打卡' },
  recharge: { color: 'blue', label: '充值' },
  deduct: { color: 'orange', label: '抵扣' },
  admin_recharge: { color: 'cyan', label: '后台充值' },
  admin_deduct: { color: 'red', label: '后台抵扣' },
}

const ROLE_TAG_MAP_FALLBACK: Record<string, { color: string; label: string }> = {
  super_admin: { color: 'red', label: '超级管理员' },
  admin: { color: 'orange', label: '管理员' },
  user: { color: 'default', label: '用户' },
}

// ==================== 查看记录弹窗 ====================

const RecordsModal: React.FC<{
  open: boolean
  userId: string | null
  nickname: string | null
  onClose: () => void
}> = ({ open, userId, nickname, onClose }) => {
  const [records, setRecords] = useState<PointRecord[]>([])
  const [loading, setLoading] = useState(false)
  const { options: pointTypeOptions } = useDictOptions('point_type', [])
  const { getColor: getPointTypeColor } = useDictColors('point_type')

  useEffect(() => {
    if (open && userId) {
      setLoading(true)
      supabase
        .from('point_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) console.error('获取积分记录失败:', error)
          setRecords(data || [])
          setLoading(false)
        })
    }
  }, [open, userId])

  const columns: ColumnsType<PointRecord> = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const dictOption = pointTypeOptions.find(opt => opt.value === type)
        const fallback = TYPE_TAG_MAP_FALLBACK[type]
        const label = dictOption?.label || fallback?.label || type
        const color = getPointTypeColor(type) || fallback?.color || 'default'
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: '积分数量',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount: number) => (
        <span style={{ color: amount > 0 ? '#52c41a' : amount < 0 ? '#ff4d4f' : '#999', fontWeight: 500 }}>
          {amount > 0 ? `+${amount}` : amount}
        </span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      render: (remark: string) => remark || '-',
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      key: 'operator_name',
      width: 120,
      render: (name: string) => name || '-',
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      width: 160,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const isActive = status === 'active'
        return <Tag color={isActive ? 'green' : 'default'}>{isActive ? '有效' : '已过期'}</Tag>
      },
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => formatDateTime(date),
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>积分记录</span>
          {nickname && <Tag>{nickname}</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={720}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
      ) : records.length === 0 ? (
        <Empty description="暂无积分记录" />
      ) : (
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ y: 400 }}
        />
      )}
    </Modal>
  )
}

// ==================== 充值/抵扣弹窗 ====================

const PointsActionModal: React.FC<{
  open: boolean
  action: 'recharge' | 'deduct'
  user: UserRecord | null
  onClose: () => void
  onSuccess: () => void
}> = ({ open, action, user, onClose, onSuccess }) => {
  const [points, setPoints] = useState<number>(1)
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setPoints(1)
      setRemark('')
    }
  }, [open])

  if (!user) return null

  const isRecharge = action === 'recharge'

  const handleSubmit = async () => {
    if (!remark.trim()) {
      message.warning('请输入备注')
      return
    }
    if (points < 1) {
      message.warning('积分数量至少为1')
      return
    }

    setLoading(true)
    try {
      // 获取操作人信息
      const adminUserStr = localStorage.getItem('admin_user')
      const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null
      const operatorId = adminUser?.id || adminUser?.user_id || 'system'
      const operatorName = adminUser?.nickname || adminUser?.username || '管理员'

      const recordType = isRecharge ? 'admin_recharge' : 'admin_deduct'
      const pointsValue = isRecharge ? points : -points

      // 检查抵扣后积分不能为负数
      if (!isRecharge) {
        const currentPoints = user.points || 0
        if (currentPoints < points) {
          message.error(`积分不足，当前积分: ${currentPoints}`)
          setLoading(false)
          return
        }
      }

      // 计算过期时间：现在 + 180天
      const expiresAt = dayjs().add(180, 'day').toISOString()

      // 1. 插入 point_records 记录
      const { error: insertError } = await supabase.from('point_records').insert({
        user_id: user.id,
        type: recordType,
        amount: pointsValue,
        remark: remark.trim(),
        operator_id: operatorId,
        operator_name: operatorName,
        expires_at: expiresAt,
      })
      if (insertError) throw insertError

      // 2. 更新 users 表 points
      const { error: updateError } = await supabase
        .from('users')
        .update({ points: (user.points || 0) + pointsValue })
        .eq('id', user.id)
      if (updateError) throw updateError

      message.success(isRecharge ? '充值成功' : '抵扣成功')
      onClose()
      onSuccess()
    } catch (error: any) {
      console.error('操作失败:', error)
      message.error(`操作失败: ${error?.message || '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={
        <Space>
          {isRecharge ? <PlusOutlined /> : <MinusOutlined />}
          <span>{isRecharge ? '积分充值' : '积分抵扣'}</span>
          {user.nickname && <Tag>{user.nickname}</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="确认"
      cancelText="取消"
      width={480}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#666', fontSize: 13 }}>
          当前积分: <span style={{ fontWeight: 600, fontSize: 16 }}>{user.points || 0}</span>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>
          积分数量
        </div>
        <InputNumber
          min={1}
          value={points}
          onChange={(val) => setPoints(typeof val === 'number' ? val : 1)}
          style={{ width: '100%' }}
          placeholder="请输入积分数量"
        />
      </div>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>
        备注（必填）
      </div>
      <Input.TextArea
        rows={3}
        placeholder={isRecharge ? '请输入充值原因...' : '请输入抵扣原因...'}
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        maxLength={500}
        showCount
      />
    </Modal>
  )
}

// ==================== 主组件 ====================

const PointsManagement: React.FC = () => {
  // 列表数据
  const [data, setData] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })

  // 字典查询
  const { options: roleOptions } = useDictOptions('user_role', [])
  const { getColor: getRoleColor } = useDictColors('user_role')

  // 弹窗状态
  const [recordsModalOpen, setRecordsModalOpen] = useState(false)
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [selectedAction, setSelectedAction] = useState<'recharge' | 'deduct'>('recharge')

  // 加载数据
  const fetchData = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true)
    try {
      // 先获取总数
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
      if (countError) throw countError

      // 分页查询
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data: items, error } = await supabase
        .from('users')
        .select('id, email, nickname, role, member_level, points, login_count, created_at')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      setData(items || [])
      setPagination({ current: page, pageSize, total: count || 0 })
    } catch (error) {
      console.error('获取用户列表失败:', error)
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 列配置
  const columns: ColumnsType<UserRecord> = useMemo(() => [
    {
      title: '用户ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      ellipsis: true,
      render: (id: string) => (
        <span style={{ fontSize: 12, color: '#999' }}>{id.substring(0, 8)}...</span>
      ),
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
      render: (nickname: string) => nickname || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
      render: (email: string) => email || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => {
        const dictOption = roleOptions.find(opt => opt.value === role)
        const fallback = ROLE_TAG_MAP_FALLBACK[role]
        const label = dictOption?.label || fallback?.label || role || '未知'
        const color = getRoleColor(role) || fallback?.color || 'default'
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: '会员等级',
      dataIndex: 'member_level',
      key: 'member_level',
      width: 90,
      render: (level: string) => {
        const dictOption = roleOptions.find(opt => opt.value === level)
        const levelMap: Record<string, string> = {
          normal: '普通会员',
          member: '会员',
          super_member: '超级会员',
        }
        return level != null ? (dictOption?.label || levelMap[level] || level) : '-'
      },
    },
    {
      title: '总积分',
      dataIndex: 'points',
      key: 'points',
      width: 100,
      sorter: (a, b) => (a.points || 0) - (b.points || 0),
      render: (points: number) => (
        <span style={{ fontWeight: 600, color: '#6C63FF' }}>{points || 0}</span>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_: any, record: UserRecord) => (
        <Space size={4} wrap>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedUser(record)
              setRecordsModalOpen(true)
            }}
            style={{ padding: '0 6px' }}
          >
            查看记录
          </Button>
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedUser(record)
              setSelectedAction('recharge')
              setActionModalOpen(true)
            }}
            style={{ padding: '0 6px', color: '#52c41a' }}
          >
            充值
          </Button>
          <Button
            type="link"
            size="small"
            icon={<MinusOutlined />}
            onClick={() => {
              setSelectedUser(record)
              setSelectedAction('deduct')
              setActionModalOpen(true)
            }}
            style={{ padding: '0 6px', color: '#ff4d4f' }}
          >
            抵扣
          </Button>
        </Space>
      ),
    },
  ], [])

  return (
    <>
      <div style={{ padding: '0 0 16px' }}>
        <h3 style={{ margin: 0 }}>积分管理</h3>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          onChange: (page, pageSize) => fetchData(page, pageSize),
        }}
        size="middle"
      />

      <RecordsModal
        open={recordsModalOpen}
        userId={selectedUser?.id || null}
        nickname={selectedUser?.nickname || null}
        onClose={() => {
          setRecordsModalOpen(false)
          setSelectedUser(null)
        }}
      />

      <PointsActionModal
        open={actionModalOpen}
        action={selectedAction}
        user={selectedUser}
        onClose={() => {
          setActionModalOpen(false)
          setSelectedUser(null)
        }}
        onSuccess={() => fetchData(pagination.current, pagination.pageSize)}
      />
    </>
  )
}

export default PointsManagement
