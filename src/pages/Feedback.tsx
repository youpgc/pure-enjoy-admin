import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Card,
  message,
  Modal,
  Form,
  Select,
  Popconfirm,
  Tooltip,
  Typography,
  Descriptions,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'
import { getActionColumn } from '../components/ActionColumn'

const { Text, Paragraph } = Typography

// ==================== 类型定义 ====================

interface FeedbackItem {
  id: string
  user_id: string
  title: string
  description: string
  category: string
  status: string
  admin_reply?: string
  user_nickname?: string
  created_at: string
  updated_at: string
}

interface FeedbackFilters {
  keyword: string
  category: string | undefined
  status: string | undefined
}

// ==================== 状态映射 ====================

const FEEDBACK_STATUS_MAP: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  pending: { color: 'orange', label: '待处理', icon: <ClockCircleOutlined /> },
  confirmed: { color: 'cyan', label: '已确认', icon: <CheckCircleOutlined /> },
  in_progress: { color: 'blue', label: '处理中', icon: <ExclamationCircleOutlined /> },
  resolved: { color: 'green', label: '已解决', icon: <CheckCircleOutlined /> },
}

// ==================== 组件 ====================

const Feedback: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<FeedbackFilters>({
    keyword: '',
    category: undefined,
    status: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null)
  const [replyForm] = Form.useForm()
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()

  const feedbackService = new BaseService<FeedbackItem>('user_feedback', {
    defaultOrder: { column: 'created_at', ascending: false },
  })

  // 加载反馈列表
  const loadFeedback = useCallback(async () => {
    setLoading(true)
    try {
      const result = await feedbackService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`title.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%,user_nickname.ilike.%${filters.keyword}%`)
        }
        if (filters.category) {
          query = query.eq('category', filters.category)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'Feedback-加载反馈')
        return
      }

      setFeedbackList(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'Feedback-加载反馈')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  // 搜索
  const handleSearch = () => {
    resetPage()
    loadFeedback()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      category: undefined,
      status: undefined,
    })
    resetPage()
  }

  // 删除反馈
  const handleDelete = async (id: string) => {
    try {
      const result = await feedbackService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'Feedback-删除')
        return
      }
      message.success('删除成功')
      loadFeedback()
    } catch (error) {
      handleApiError(error, 'Feedback-删除')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的反馈')
      return
    }
    try {
      const result = await feedbackService.batchDelete(selectedRowKeys as string[])
      if (!result.success) {
        handleApiError(result.errorMessage, 'Feedback-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 条反馈`)
      setSelectedRowKeys([])
      loadFeedback()
    } catch (error) {
      handleApiError(error, 'Feedback-批量删除')
    }
  }

  // 更新反馈状态
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const result = await feedbackService.update(id, {
        status,
        updated_at: new Date().toISOString(),
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Feedback-更新状态')
        return
      }
      message.success('状态更新成功')
      loadFeedback()
    } catch (error) {
      handleApiError(error, 'Feedback-更新状态')
    }
  }

  // 提交回复
  const handleReply = async () => {
    try {
      const values = await replyForm.validateFields()
      if (!selectedFeedback) return

      const result = await feedbackService.update(selectedFeedback.id, {
        admin_reply: values.admin_reply,
        status: 'resolved',
        updated_at: new Date().toISOString(),
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Feedback-回复')
        return
      }
      message.success('回复成功')
      setDetailModalOpen(false)
      setSelectedFeedback(null)
      replyForm.resetFields()
      loadFeedback()
    } catch (error) {
      handleApiError(error, 'Feedback-回复')
    }
  }

  // 查看详情
  const handleViewDetail = (record: FeedbackItem) => {
    setSelectedFeedback(record)
    replyForm.setFieldsValue({ admin_reply: record.admin_reply || '' })
    setDetailModalOpen(true)
  }

  // 表格列定义
  const columns: ColumnsType<FeedbackItem> = [
    {
      title: '反馈信息',
      key: 'info',
      width: 300,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.user_nickname || record.user_id}
          </Text>
          <div>
            <Tag>{record.category || '-'}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (content: string) => (
        <Tooltip title={content}>
          <span>{content}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const info = FEEDBACK_STATUS_MAP[status] || { color: 'default', label: status, icon: null }
        return <Tag color={info.color} icon={info.icon}>{info.label}</Tag>
      },
    },
    {
      title: '管理员回复',
      dataIndex: 'admin_reply',
      key: 'admin_reply',
      width: 150,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    getActionColumn<FeedbackItem>(
      (record) => [
        {
          key: 'view',
          label: '查看',
          icon: <EyeOutlined />,
          type: 'primary',
          onClick: () => handleViewDetail(record),
        },
        {
          key: 'resolve',
          label: '标记已解决',
          icon: <CheckCircleOutlined />,
          onClick: () => handleUpdateStatus(record.id, 'resolved'),
          disabled: record.status === 'resolved',
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        },
      ],
      { width: 240, maxVisible: 3 }
    ),
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索标题/描述/用户"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="分类"
            value={filters.category}
            onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '功能建议', value: 'feature' },
              { label: 'Bug反馈', value: 'bug' },
              { label: '投诉', value: 'complaint' },
              { label: '其他', value: 'other' },
            ]}
          />
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '待处理', value: 'pending' },
              { label: '已确认', value: 'confirmed' },
              { label: '处理中', value: 'in_progress' },
              { label: '已解决', value: 'resolved' },
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
            <Popconfirm
              title="确认批量删除"
              description={`确定要删除选中的 ${selectedRowKeys.length} 条反馈吗？`}
              onConfirm={handleBatchDelete}
              okText="确认"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadFeedback} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 反馈表格 */}
      <Table
        columns={columns}
        dataSource={feedbackList}
        rowKey="id"
        loading={loading}
        pagination={tablePagination}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 'max-content' }}
      />

      {/* 详情弹窗 */}
      <Modal
        title="反馈详情"
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false)
          setSelectedFeedback(null)
          replyForm.resetFields()
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalOpen(false)
            setSelectedFeedback(null)
            replyForm.resetFields()
          }}>
            关闭
          </Button>,
          <Button key="reply" type="primary" onClick={handleReply}>
            提交回复
          </Button>,
        ]}
        width={700}
      >
        {selectedFeedback && (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="标题">{selectedFeedback.title}</Descriptions.Item>
              <Descriptions.Item label="用户">{selectedFeedback.user_nickname || selectedFeedback.user_id}</Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag>{selectedFeedback.category || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={
                  selectedFeedback.status === 'pending' ? 'orange' :
                  selectedFeedback.status === 'confirmed' ? 'cyan' :
                  selectedFeedback.status === 'in_progress' ? 'blue' :
                  selectedFeedback.status === 'resolved' ? 'green' : 'default'
                }>
                  {FEEDBACK_STATUS_MAP[selectedFeedback.status]?.label || selectedFeedback.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(selectedFeedback.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginBottom: 16 }}>
              <Text strong>反馈内容：</Text>
              <Paragraph style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                {selectedFeedback.description}
              </Paragraph>
            </div>

            {selectedFeedback.admin_reply && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>历史回复：</Text>
                <Paragraph style={{ marginTop: 8, padding: 12, background: '#f6ffed', borderRadius: 4 }}>
                  {selectedFeedback.admin_reply}
                </Paragraph>
              </div>
            )}

            <Form form={replyForm} layout="vertical">
              <Form.Item
                name="admin_reply"
                label="回复内容"
                rules={[{ required: true, message: '请输入回复内容' }]}
              >
                <Input.TextArea rows={4} placeholder="请输入回复内容" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  )
}

export default Feedback
