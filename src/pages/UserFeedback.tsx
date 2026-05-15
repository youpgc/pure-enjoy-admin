import React, { useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space,
  message, Card, Statistic, Row, Col, Typography, Tooltip,
  Popconfirm, Descriptions, Badge, Image
} from 'antd'
import {
  EyeOutlined, EditOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ExclamationCircleOutlined,
  ExportOutlined, FilterOutlined, CommentOutlined
} from '@ant-design/icons'
import { usePermission } from '../hooks/usePermission'
import {
  mockFeedbacks,
  feedbackCategoryMap,
  feedbackStatusMap,
  feedbackPriorityMap,
  type MockFeedback
} from '../utils/mockData'
import { exportToCSV } from '../utils/export'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Text } = Typography

const UserFeedback: React.FC = () => {
  const { isAdmin } = usePermission()
  const [feedbacks, setFeedbacks] = useState<MockFeedback[]>(mockFeedbacks)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [replyModalOpen, setReplyModalOpen] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<MockFeedback | null>(null)
  const [replyForm] = Form.useForm()
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  const handleStatusChange = (record: MockFeedback, newStatus: MockFeedback['status']) => {
    const updated = feedbacks.map(f =>
      f.id === record.id ? { ...f, status: newStatus, updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss') } : f
    )
    setFeedbacks(updated)
    message.success(`状态已更新为"${feedbackStatusMap[newStatus]?.label}"`)
  }

  const handleReply = (values: { reply: string }) => {
    if (!selectedFeedback) return
    setSubmitting(true)
    setTimeout(() => {
      const updated = feedbacks.map(f =>
        f.id === selectedFeedback.id
          ? {
              ...f,
              reply: values.reply,
              replied_by: '管理员',
              replied_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              status: 'resolved' as const,
              updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            }
          : f
      )
      setFeedbacks(updated)
      message.success('回复成功')
      setReplyModalOpen(false)
      replyForm.resetFields()
      setSelectedFeedback(null)
      setSubmitting(false)
    }, 500)
  }

  const showDetail = (record: MockFeedback) => {
    setSelectedFeedback(record)
    setDetailModalOpen(true)
  }

  const openReplyModal = (record: MockFeedback) => {
    setSelectedFeedback(record)
    replyForm.setFieldsValue({
      reply: record.reply || '',
    })
    setReplyModalOpen(true)
  }

  const handleExport = () => {
    const dataToExport = filteredFeedbacks
    exportToCSV(
      dataToExport,
      [
        { title: 'ID', dataIndex: 'id' },
        { title: '用户', dataIndex: 'user_name' },
        { title: '分类', dataIndex: 'category', render: (v: unknown) => feedbackCategoryMap[v as string]?.label || String(v) },
        { title: '标题', dataIndex: 'title' },
        { title: '内容', dataIndex: 'content' },
        { title: '状态', dataIndex: 'status', render: (v: unknown) => feedbackStatusMap[v as string]?.label || String(v) },
        { title: '优先级', dataIndex: 'priority', render: (v: unknown) => feedbackPriorityMap[v as string]?.label || String(v) },
        { title: '回复', dataIndex: 'reply' },
        { title: '创建时间', dataIndex: 'created_at' },
      ],
      `用户反馈_${dayjs().format('YYYYMMDD_HHmmss')}`
    )
    message.success('导出成功')
  }

  // 过滤后的数据
  const filteredFeedbacks = feedbacks.filter(f => {
    if (filterStatus && f.status !== filterStatus) return false
    if (filterCategory && f.category !== filterCategory) return false
    return true
  })

  // 统计数据
  const pendingCount = feedbacks.filter(f => f.status === 'pending').length
  const processingCount = feedbacks.filter(f => f.status === 'processing').length
  const resolvedCount = feedbacks.filter(f => f.status === 'resolved').length
  const closedCount = feedbacks.filter(f => f.status === 'closed').length

  const categoryStats = [
    { key: 'bug', label: 'Bug反馈', count: feedbacks.filter(f => f.category === 'bug').length, color: '#ff4d4f' },
    { key: 'feature', label: '功能建议', count: feedbacks.filter(f => f.category === 'feature').length, color: '#1890ff' },
    { key: 'ux', label: '体验优化', count: feedbacks.filter(f => f.category === 'ux').length, color: '#fa8c16' },
    { key: 'other', label: '其他', count: feedbacks.filter(f => f.category === 'other').length, color: '#d9d9d9' },
  ]

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 100,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 110,
      render: (category: string) => {
        const info = feedbackCategoryMap[category]
        return <Tag color={info?.color}>{info?.label}</Tag>
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      ellipsis: true,
      render: (text: string, record: MockFeedback) => (
        <a onClick={() => showDetail(record)}>{text}</a>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => {
        const info = feedbackPriorityMap[priority]
        return <Tag color={info?.color}>{info?.label}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const info = feedbackStatusMap[status]
        return <Tag color={info?.color}>{info?.label}</Tag>
      },
    },
    {
      title: '回复状态',
      key: 'reply_status',
      width: 100,
      render: (_: unknown, record: MockFeedback) => (
        record.reply
          ? <Badge status="success" text="已回复" />
          : <Badge status="default" text="未回复" />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: unknown, record: MockFeedback) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showDetail(record)}
            />
          </Tooltip>
          <Tooltip title="回复">
            <Button
              type="link"
              size="small"
              icon={<CommentOutlined />}
              onClick={() => openReplyModal(record)}
            />
          </Tooltip>
          {record.status === 'pending' && (
            <Tooltip title="开始处理">
              <Button
                type="link"
                size="small"
                icon={<ExclamationCircleOutlined />}
                style={{ color: '#faad14' }}
                onClick={() => handleStatusChange(record, 'processing')}
              >
                处理
              </Button>
            </Tooltip>
          )}
          {(record.status === 'pending' || record.status === 'processing') && (
            <Tooltip title="标记已解决">
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleStatusChange(record, 'resolved')}
              >
                解决
              </Button>
            </Tooltip>
          )}
          {record.status !== 'closed' && (
            <Tooltip title="关闭">
              <Popconfirm
                title="确认关闭"
                description="关闭后将不再处理此反馈"
                onConfirm={() => handleStatusChange(record, 'closed')}
                okText="关闭"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<CloseCircleOutlined />}
                  style={{ color: '#999' }}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Text type="secondary">您没有权限访问此页面</Text>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3>用户反馈</h3>
        <Button
          icon={<ExportOutlined />}
          onClick={handleExport}
        >
          导出
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="待处理"
              value={pendingCount}
              valueStyle={{ color: pendingCount > 0 ? '#ff4d4f' : undefined }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="处理中"
              value={processingCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<EditOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已解决"
              value={resolvedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已关闭"
              value={closedCount}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="分类统计" style={{ padding: '8px 0' }}>
            <Space size="large">
              {categoryStats.map(item => (
                <div key={item.key} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: item.color }}>{item.count}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{item.label}</div>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <FilterOutlined style={{ color: '#999' }} />
          <Text type="secondary">筛选：</Text>
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 140 }}
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
          >
            <Select.Option value="pending">待处理</Select.Option>
            <Select.Option value="processing">处理中</Select.Option>
            <Select.Option value="resolved">已解决</Select.Option>
            <Select.Option value="closed">已关闭</Select.Option>
          </Select>
          <Select
            placeholder="分类筛选"
            allowClear
            style={{ width: 140 }}
            value={filterCategory}
            onChange={(val) => setFilterCategory(val)}
          >
            <Select.Option value="bug">Bug反馈</Select.Option>
            <Select.Option value="feature">功能建议</Select.Option>
            <Select.Option value="ux">体验优化</Select.Option>
            <Select.Option value="other">其他</Select.Option>
          </Select>
          {(filterStatus || filterCategory) && (
            <Button
              type="link"
              onClick={() => {
                setFilterStatus(undefined)
                setFilterCategory(undefined)
              }}
            >
              清除筛选
            </Button>
          )}
          <Text type="secondary" style={{ marginLeft: 16 }}>
            共 {filteredFeedbacks.length} 条反馈
          </Text>
        </Space>
      </Card>

      {/* 反馈列表 */}
      <Table
        columns={columns}
        dataSource={filteredFeedbacks}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
        size="middle"
      />

      {/* 反馈详情弹窗 */}
      <Modal
        title="反馈详情"
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false)
          setSelectedFeedback(null)
        }}
        footer={[
          selectedFeedback?.status !== 'closed' && selectedFeedback?.status !== 'resolved' ? (
            <Button
              key="reply"
              type="primary"
              icon={<CommentOutlined />}
              onClick={() => {
                setDetailModalOpen(false)
                if (selectedFeedback) openReplyModal(selectedFeedback)
              }}
            >
              回复
            </Button>
          ) : null,
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={720}
      >
        {selectedFeedback && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="反馈ID">{selectedFeedback.id}</Descriptions.Item>
              <Descriptions.Item label="用户">{selectedFeedback.user_name}</Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag color={feedbackCategoryMap[selectedFeedback.category]?.color}>
                  {feedbackCategoryMap[selectedFeedback.category]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={feedbackPriorityMap[selectedFeedback.priority]?.color}>
                  {feedbackPriorityMap[selectedFeedback.priority]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={feedbackStatusMap[selectedFeedback.status]?.color}>
                  {feedbackStatusMap[selectedFeedback.status]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(selectedFeedback.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <Text type="secondary">反馈标题：</Text>
              <Text strong style={{ fontSize: 16 }}>{selectedFeedback.title}</Text>
            </div>

            <div style={{ marginTop: 12 }}>
              <Text type="secondary">反馈内容：</Text>
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: '#f5f5f5',
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedFeedback.content}
              </div>
            </div>

            {selectedFeedback.images.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">附图：</Text>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  {selectedFeedback.images.map((img, idx) => (
                    <Image
                      key={idx}
                      src={img}
                      width={100}
                      height={100}
                      style={{ borderRadius: 4, objectFit: 'cover' }}
                      fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYkqS4tjQ45Pz5/P/jO1NTUqys3Jzc3NzMzMzMzMzMzMzMzIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMv4AT8xGKQoODhAWFxgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgY/8AARCAB4AJADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/SFhSRFEiN0FeUzR1eVlNZXR3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+gD/2Q=="
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedFeedback.reply && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">管理员回复：</Text>
                <div
                  style={{
                    marginTop: 8,
                    padding: 12,
                    background: '#e6f7ff',
                    borderRadius: 6,
                    border: '1px solid #91d5ff',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedFeedback.reply}
                </div>
                <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                  回复人：{selectedFeedback.replied_by} | 回复时间：{selectedFeedback.replied_at ? dayjs(selectedFeedback.replied_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 回复弹窗 */}
      <Modal
        title={`回复反馈 - ${selectedFeedback?.title || ''}`}
        open={replyModalOpen}
        onCancel={() => {
          setReplyModalOpen(false)
          replyForm.resetFields()
          setSelectedFeedback(null)
        }}
        onOk={() => replyForm.submit()}
        confirmLoading={submitting}
        width={640}
        okText="提交回复"
        cancelText="取消"
      >
        {selectedFeedback && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">反馈内容：</Text>
            <div
              style={{
                marginTop: 4,
                padding: 8,
                background: '#f5f5f5',
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              {selectedFeedback.content}
            </div>
          </div>
        )}
        <Form form={replyForm} layout="vertical" onFinish={handleReply}>
          <Form.Item
            name="reply"
            label="回复内容"
            rules={[{ required: true, message: '请输入回复内容' }]}
          >
            <TextArea
              rows={4}
              placeholder={'请输入回复内容，回复后反馈状态将自动更新为"已解决"'}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserFeedback
