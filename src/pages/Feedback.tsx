import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Table, Tag, Button, Modal, Input, Space, message, Tooltip, Timeline, Badge, Empty
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckOutlined, CloseOutlined, ClockCircleOutlined,
  DeleteOutlined, HistoryOutlined,
  ExclamationCircleOutlined, SyncOutlined, CheckCircleOutlined
} from '@ant-design/icons'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { formatDateTime } from '../utils/format'
import NoPermission from '../components/NoPermission'
import { useDictOptions, useDictColors } from '../hooks/useDictOptions'
import { useMounted } from '../hooks/useMounted'
import { usePagination } from '../hooks/usePagination'
import { getActionColumn } from '../components/ActionColumn'
import { feedbackService } from '../services/feedbackService'
import { FEEDBACK_STATUS_MAP, FEEDBACK_CATEGORY_MAP, FEEDBACK_STATUS_ACTIONS } from '../constants'

// ==================== 类型定义 ====================

interface FeedbackRecord {
  id: string
  user_id: string
  user_nickname: string | null
  title: string
  description: string | null
  category: string
  status: string
  admin_reply: string | null
  created_at: string
  updated_at: string | null
}

interface FlowRecord {
  id: string
  feedback_id: string
  action: string
  remark: string | null
  operator_id: string | null
  operator_name: string | null
  created_at: string
}

// ==================== 常量定义 ====================

const ACTION_TAG_MAP: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  confirmed: { color: 'blue', label: '确认', icon: <CheckOutlined /> },
  in_progress: { color: 'orange', label: '处理中', icon: <SyncOutlined spin /> },
  resolved: { color: 'green', label: '完成', icon: <CheckCircleOutlined /> },
  rejected: { color: 'red', label: '拒绝', icon: <CloseOutlined /> },
  delayed: { color: 'gold', label: '滞后', icon: <ClockCircleOutlined /> },
  deleted: { color: 'default', label: '删除', icon: <DeleteOutlined /> },
}

// ==================== 状态流转弹窗 ====================

const ActionModal: React.FC<{
  open: boolean
  record: FeedbackRecord | null
  action: string | null
  onClose: () => void
  onConfirm: (remark: string) => void
  loading: boolean
}> = ({ open, record, action, onClose, onConfirm, loading }) => {
  const [remark, setRemark] = useState('')
  const { options: actionOptions } = useDictOptions('feedback_action', [])
  const { options: statusOptions } = useDictOptions('feedback_status', [])
  const { getColor: getActionColor } = useDictColors('feedback_action')
  const { getColor: getStatusColor } = useDictColors('feedback_status')
  const actionConfig = action
    ? (() => {
        const dictOpt = actionOptions.find(opt => opt.value === action)
        const fallback = ACTION_TAG_MAP[action]
        if (!dictOpt && !fallback) return null
        return {
          color: getActionColor(action) || fallback?.color || 'default',
          label: dictOpt?.label || fallback?.label || action,
          icon: fallback?.icon || null,
        }
      })()
    : null

  const getStatusLabel = (status: string) => {
    const dictOpt = statusOptions.find(opt => opt.value === status)
    const fallback = FEEDBACK_STATUS_MAP[status]
    return dictOpt?.label || fallback?.label || status
  }
  const getStatusColorValue = (status: string) => {
    return getStatusColor(status) || FEEDBACK_STATUS_MAP[status]?.color || 'default'
  }

  useEffect(() => {
    if (open) setRemark('')
  }, [open])

  if (!record || !action || !actionConfig) return null

  return (
    <Modal
      title={
        <Space>
          {actionConfig.icon}
          <span>{actionConfig.label}反馈</span>
          <Tag color={getStatusColorValue(record.status)}>
            {getStatusLabel(record.status)}
          </Tag>
          <span style={{ color: '#999' }}>→</span>
          <Tag color={action === 'deleted' ? getStatusColorValue(record.status) : getStatusColorValue(action)}>
            {action === 'deleted' ? '删除' : getStatusLabel(action)}
          </Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={() => onConfirm(remark)}
      confirmLoading={loading}
      okText="确认"
      cancelText="取消"
      width={480}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{record.title}</div>
        {record.description && (
          <div style={{ color: '#666', fontSize: 13 }}>{record.description}</div>
        )}
      </div>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>
        <ExclamationCircleOutlined style={{ marginRight: 4, color: '#faad14' }} />
        备注说明（必填）
      </div>
      <Input.TextArea
        rows={3}
        placeholder={`请输入${actionConfig.label}原因/备注...`}
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        maxLength={500}
        showCount
      />
    </Modal>
  )
}

// ==================== 流转记录弹窗 ====================

const FlowHistoryModal: React.FC<{
  open: boolean
  record: FeedbackRecord | null
  onClose: () => void
}> = ({ open, record, onClose }) => {
  const mountedRef = useMounted()
  const [records, setRecords] = useState<FlowRecord[]>([])
  const [loading, setLoading] = useState(false)
  const { options: actionOptions } = useDictOptions('feedback_action', [])
  const { options: statusOptions } = useDictOptions('feedback_status', [])
  const { getColor: getActionColor } = useDictColors('feedback_action')
  const { getColor: getStatusColor } = useDictColors('feedback_status')

  const getStatusLabel = (status: string) => {
    const dictOpt = statusOptions.find(opt => opt.value === status)
    const fallback = FEEDBACK_STATUS_MAP[status]
    return dictOpt?.label || fallback?.label || status
  }
  const getStatusColorValue = (status: string) => {
    return getStatusColor(status) || FEEDBACK_STATUS_MAP[status]?.color || 'default'
  }

  useEffect(() => {
    if (open && record) {
      setLoading(true)
      supabase
        .from('feedback_flow_records')
        .select('*')
        .eq('feedback_id', record.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) console.error('获取流转记录失败:', error)
          if (!mountedRef.current) return
          setRecords(data || [])
          setLoading(false)
        })
    }
  }, [open, record])

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          <span>流转记录</span>
          {record && <Tag color={getStatusColorValue(record.status)}>{getStatusLabel(record.status)}</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={560}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
      ) : records.length === 0 ? (
        <Empty description="暂无流转记录" />
      ) : (
        <Timeline
          items={records.map((r) => {
            const dictOpt = actionOptions.find(opt => opt.value === r.action)
            const fallback = ACTION_TAG_MAP[r.action]
            const config = {
              color: getActionColor(r.action) || fallback?.color || 'default',
              label: dictOpt?.label || fallback?.label || r.action,
              icon: fallback?.icon || null,
            }
            return {
              color: config.color,
              children: (
                <div key={r.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Tag color={config.color} style={{ margin: 0 }}>
                      {config.icon} {config.label}
                    </Tag>
                    <span style={{ color: '#999', fontSize: 12 }}>{formatDateTime(r.created_at)}</span>
                    {r.operator_name && (
                      <span style={{ color: '#666', fontSize: 12 }}>操作人: {r.operator_name}</span>
                    )}
                  </div>
                  {r.remark && (
                    <div style={{
                      background: '#f5f5f5', padding: '8px 12px', borderRadius: 6,
                      fontSize: 13, color: '#333', marginTop: 4
                    }}>
                      {r.remark}
                    </div>
                  )}
                </div>
              ),
            }
          })}
        />
      )}
    </Modal>
  )
}

// ==================== 主组件 ====================

const Feedback: React.FC = () => {
  const { hasPermission } = usePermission()
  const mountedRef = useMounted()

  // 列表数据
  const [data, setData] = useState<FeedbackRecord[]>([])
  const [loading, setLoading] = useState(false)
  const { pagination, setTotal, tablePagination, handlePageChange } = usePagination(20)

  // 字典查询
  const { options: statusOptions } = useDictOptions('feedback_status', [])
  const { options: categoryOptions } = useDictOptions('feedback_category', [])
  const { options: actionOptions } = useDictOptions('feedback_action', [])
  const { getColor: getStatusColor } = useDictColors('feedback_status')
  const { getColor: getCategoryColor } = useDictColors('feedback_category')
  const { getColor: getActionColor } = useDictColors('feedback_action')

  // 弹窗状态
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [flowModalOpen, setFlowModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<FeedbackRecord | null>(null)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // 加载数据
  const fetchData = useCallback(async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    try {
      const result = await feedbackService.paginateFeedback(page, pageSize)
      if (!result.success) {
        console.error('获取反馈列表失败:', result.errorMessage)
        message.error('获取反馈列表失败')
        return
      }
      if (!mountedRef.current) return
      setData(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      console.error('获取反馈列表失败:', error)
      message.error('获取反馈列表失败')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, setTotal])

  useEffect(() => {
    if (hasPermission('feedback:read')) fetchData()
  }, [hasPermission, fetchData])

  // 执行状态流转
  const handleAction = async (remark: string) => {
    if (!selectedRecord || !selectedAction) return

    // 删除操作不需要 remark（但弹窗中已设为必填）
    if (!remark.trim() && selectedAction !== 'deleted') {
      message.warning('请输入备注说明')
      return
    }

    setActionLoading(true)
    try {
      // 获取操作人信息
      const adminUserStr = localStorage.getItem('admin_user')
      const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null
      const operatorId = adminUser?.id || adminUser?.user_id || 'system'
      const operatorName = adminUser?.nickname || adminUser?.username || '管理员'

      let result
      if (selectedAction === 'deleted') {
        result = await feedbackService.softDelete(
          selectedRecord.id,
          remark.trim() || '删除反馈记录',
          operatorId,
          operatorName
        )
      } else {
        result = await feedbackService.updateStatus(
          selectedRecord.id,
          selectedAction,
          remark.trim(),
          operatorId,
          operatorName
        )
      }

      if (!result.success) {
        message.error(result.errorMessage || '操作失败')
        return
      }

      const actionLabel = (() => {
        const dictOpt = actionOptions.find(opt => opt.value === selectedAction)
        const fallback = ACTION_TAG_MAP[selectedAction]
        return dictOpt?.label || fallback?.label || selectedAction
      })()
      message.success(`${actionLabel}成功`)

      setActionModalOpen(false)
      setSelectedRecord(null)
      setSelectedAction(null)
      fetchData(pagination.current, pagination.pageSize)
    } catch (error: unknown) {
      console.error('操作失败:', error)
      const errMsg = error instanceof Error ? error.message : '未知错误'
      message.error(`操作失败: ${errMsg}`)
    } finally {
      setActionLoading(false)
    }
  }

  // 打开操作弹窗
  const openActionModal = (record: FeedbackRecord, action: string) => {
    if (!hasPermission('feedback:write')) {
      message.warning('您没有操作反馈的权限')
      return
    }
    setSelectedRecord(record)
    setSelectedAction(action)
    setActionModalOpen(true)
  }

  // 构建操作列按钮
  const buildActions = useCallback((record: FeedbackRecord) => {
    const actions = FEEDBACK_STATUS_ACTIONS[record.status] || []
    const buttons: import('../components/ActionColumn').ActionButton[] = actions.map((action) => {
      const dictOpt = actionOptions.find(opt => opt.value === action)
      const fallback = ACTION_TAG_MAP[action]
      const config = {
        color: getActionColor(action) || fallback?.color || 'default',
        label: dictOpt?.label || fallback?.label || action,
        icon: fallback?.icon || null,
      }
      return {
        key: action,
        label: config.label,
        icon: config.icon,
        onClick: () => openActionModal(record, action),
      }
    })

    buttons.push({
      key: 'history',
      label: '流转记录',
      icon: <HistoryOutlined />,
      onClick: () => {
        setSelectedRecord(record)
        setFlowModalOpen(true)
      },
    })

    if (hasPermission('feedback:delete')) {
      buttons.push({
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => openActionModal(record, 'deleted'),
      })
    }

    return buttons
  }, [hasPermission, actionOptions, getActionColor])

  // 列配置
  const columns: ColumnsType<FeedbackRecord> = useMemo(() => [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      fixed: 'left',
      filters: statusOptions.length > 0
        ? statusOptions.map(opt => ({ text: opt.label, value: opt.value }))
        : Object.entries(FEEDBACK_STATUS_MAP).map(([value, { label }]) => ({ text: label, value })),
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        const dictOpt = statusOptions.find(opt => opt.value === status)
        const fallback = FEEDBACK_STATUS_MAP[status]
        const label = dictOpt?.label || fallback?.label || status
        const color = getStatusColor(status) || fallback?.color || 'default'
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 180,
      render: (title: string, record) => (
        <Tooltip title={`用户: ${record.user_nickname || record.user_id?.substring(0, 6)}`}>
          {title || '-'}
        </Tooltip>
      ),
    },
    {
      title: '用户',
      dataIndex: 'user_nickname',
      key: 'user_nickname',
      width: 120,
      render: (nickname: string, record) => nickname || `用户${record.user_id?.substring(0, 6)}`,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      filters: categoryOptions.length > 0
        ? categoryOptions.map(opt => ({ text: opt.label, value: opt.value }))
        : Object.entries(FEEDBACK_CATEGORY_MAP).map(([value, { label }]) => ({ text: label, value })),
      onFilter: (value, record) => record.category === value,
      render: (category: string) => {
        const dictOpt = categoryOptions.find(opt => opt.value === category)
        const fallback = FEEDBACK_CATEGORY_MAP[category]
        const label = dictOpt?.label || fallback?.label || category
        const color = getCategoryColor(category) || fallback?.color || 'default'
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 220,
      render: (desc: string) => desc || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => formatDateTime(date),
    },
    getActionColumn<FeedbackRecord>(buildActions, { width: 280, maxVisible: 2 }),
  ], [statusOptions, categoryOptions, getStatusColor, getCategoryColor, buildActions])

  // 权限检查
  if (!hasPermission('feedback:read')) {
    return <NoPermission module="反馈" />
  }

  return (
    <>
      <div style={{ padding: '0 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>问题反馈</h3>
        <Space>
          {statusOptions.length > 0 ? statusOptions.map(opt => (
            <Badge key={opt.value} count={data.filter(d => d.status === opt.value).length} offset={[0, 0]}>
              <Tag color={getStatusColor(opt.value) || 'default'}>{opt.label}</Tag>
            </Badge>
          )) : (
            <>
              <Badge count={data.filter(d => d.status === 'pending').length} offset={[0, 0]}>
                <Tag color="default">待确认</Tag>
              </Badge>
              <Badge count={data.filter(d => d.status === 'in_progress').length} offset={[0, 0]}>
                <Tag color="warning">处理中</Tag>
              </Badge>
              <Badge count={data.filter(d => d.status === 'delayed').length} offset={[0, 0]}>
                <Tag color="orange">已滞后</Tag>
              </Badge>
            </>
          )}
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          ...tablePagination,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          onChange: (page, pageSize) => {
            handlePageChange(page, pageSize)
            fetchData(page, pageSize)
          },
        }}
        size="middle"
      />

      <ActionModal
        open={actionModalOpen}
        record={selectedRecord}
        action={selectedAction}
        onClose={() => {
          setActionModalOpen(false)
          setSelectedRecord(null)
          setSelectedAction(null)
        }}
        onConfirm={handleAction}
        loading={actionLoading}
      />

      <FlowHistoryModal
        open={flowModalOpen}
        record={selectedRecord}
        onClose={() => {
          setFlowModalOpen(false)
          setSelectedRecord(null)
        }}
      />
    </>
  )
}

export default Feedback
