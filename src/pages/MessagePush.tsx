import React, { useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space,
  message, Card, Statistic, Row, Col, DatePicker, Typography, Tooltip, Popconfirm
} from 'antd'
import {
  PlusOutlined, ClockCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, BellOutlined,
  EyeOutlined, RedoOutlined
} from '@ant-design/icons'
import { usePermission } from '../hooks/usePermission'
import {
  mockPushMessages,
  pushTypeMap,
  pushStatusMap,
  type MockPushMessage
} from '../utils/mockData'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Text } = Typography

const MessagePush: React.FC = () => {
  const { isAdmin } = usePermission()
  const [messages, setMessages] = useState<MockPushMessage[]>(mockPushMessages)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<MockPushMessage | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const handleCreate = (values: {
    title: string
    content: string
    type: string
    target: string
    target_desc: string
    push_time: dayjs.Dayjs
  }) => {
    setSubmitting(true)
    setTimeout(() => {
      const newMessage: MockPushMessage = {
        id: `push_${String(messages.length + 1).padStart(3, '0')}`,
        title: values.title,
        content: values.content,
        type: values.type as MockPushMessage['type'],
        target: values.target as MockPushMessage['target'],
        target_desc: values.target_desc || (values.target === 'all' ? '全部用户' : ''),
        push_time: values.push_time.format('YYYY-MM-DD HH:mm:ss'),
        status: 'pending',
        sent_count: 0,
        delivered_count: 0,
        opened_count: 0,
        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        created_by: '管理员',
      }
      setMessages([newMessage, ...messages])
      message.success('推送消息创建成功')
      setCreateModalOpen(false)
      form.resetFields()
      setSubmitting(false)
    }, 500)
  }

  const handleResend = (record: MockPushMessage) => {
    const updated = messages.map(m =>
      m.id === record.id
        ? { ...m, status: 'pending' as const, sent_count: 0, delivered_count: 0, opened_count: 0 }
        : m
    )
    setMessages(updated)
    message.success('已重新加入发送队列')
  }

  const handleDelete = (record: MockPushMessage) => {
    setMessages(messages.filter(m => m.id !== record.id))
    message.success('已删除')
  }

  const showDetail = (record: MockPushMessage) => {
    setSelectedMessage(record)
    setDetailModalOpen(true)
  }

  // 统计数据
  const totalSent = messages.filter(m => m.status === 'sent').length
  const totalPending = messages.filter(m => m.status === 'pending').length
  const totalFailed = messages.filter(m => m.status === 'failed').length
  const totalDelivered = messages.reduce((sum, m) => sum + m.delivered_count, 0)
  const totalOpened = messages.reduce((sum, m) => sum + m.opened_count, 0)
  const totalSentCount = messages.reduce((sum, m) => sum + m.sent_count, 0)
  const deliveryRate = totalSentCount > 0 ? ((totalDelivered / totalSentCount) * 100).toFixed(1) : '0'
  const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : '0'

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (text: string, record: MockPushMessage) => (
        <a onClick={() => showDetail(record)}>{text}</a>
      ),
    },
    {
      title: '推送类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const info = pushTypeMap[type]
        return <Tag color={info?.color}>{info?.label}</Tag>
      },
    },
    {
      title: '目标用户',
      dataIndex: 'target_desc',
      key: 'target_desc',
      width: 120,
    },
    {
      title: '推送时间',
      dataIndex: 'push_time',
      key: 'push_time',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const info = pushStatusMap[status]
        return <Tag color={info?.color}>{info?.label}</Tag>
      },
    },
    {
      title: '送达率',
      key: 'delivery_rate',
      width: 100,
      render: (_: unknown, record: MockPushMessage) => {
        if (record.sent_count === 0) return <Text type="secondary">-</Text>
        const rate = ((record.delivered_count / record.sent_count) * 100).toFixed(1)
        return <Text>{rate}%</Text>
      },
    },
    {
      title: '打开率',
      key: 'open_rate',
      width: 100,
      render: (_: unknown, record: MockPushMessage) => {
        if (record.delivered_count === 0) return <Text type="secondary">-</Text>
        const rate = ((record.opened_count / record.delivered_count) * 100).toFixed(1)
        return <Text>{rate}%</Text>
      },
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
      width: 180,
      render: (_: unknown, record: MockPushMessage) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showDetail(record)}
            />
          </Tooltip>
          {record.status === 'failed' && (
            <Tooltip title="重新发送">
              <Button
                type="link"
                size="small"
                icon={<RedoOutlined />}
                onClick={() => handleResend(record)}
              />
            </Tooltip>
          )}
          {record.status === 'pending' && (
            <Popconfirm
              title="确认删除"
              description="确定要删除这条推送消息吗？"
              onConfirm={() => handleDelete(record)}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
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
        <h3>消息推送</h3>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          创建推送
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="总推送数"
              value={messages.length}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已发送"
              value={totalSent}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="待发送"
              value={totalPending}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="失败"
              value={totalFailed}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="送达率"
              value={deliveryRate}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="打开率"
              value={openRate}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* 推送历史列表 */}
      <Table
        columns={columns}
        dataSource={messages}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1300 }}
        size="middle"
      />

      {/* 创建推送弹窗 */}
      <Modal
        title="创建推送消息"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={640}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="title"
            label="推送标题"
            rules={[{ required: true, message: '请输入推送标题' }]}
          >
            <Input placeholder="请输入推送标题" maxLength={50} showCount />
          </Form.Item>
          <Form.Item
            name="content"
            label="推送内容"
            rules={[{ required: true, message: '请输入推送内容' }]}
          >
            <TextArea
              rows={4}
              placeholder="请输入推送内容"
              maxLength={500}
              showCount
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="推送类型"
                rules={[{ required: true, message: '请选择推送类型' }]}
              >
                <Select placeholder="选择推送类型">
                  <Select.Option value="system">系统通知</Select.Option>
                  <Select.Option value="version_update">版本更新</Select.Option>
                  <Select.Option value="activity">活动通知</Select.Option>
                  <Select.Option value="recommendation">个性化推荐</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="target"
                label="目标用户"
                rules={[{ required: true, message: '请选择目标用户' }]}
              >
                <Select placeholder="选择目标用户">
                  <Select.Option value="all">全部用户</Select.Option>
                  <Select.Option value="group">指定用户组</Select.Option>
                  <Select.Option value="single">单个用户</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.target !== cur.target}
          >
            {({ getFieldValue }) =>
              getFieldValue('target') === 'group' || getFieldValue('target') === 'single' ? (
                <Form.Item
                  name="target_desc"
                  label={getFieldValue('target') === 'group' ? '用户组名称' : '用户名'}
                  rules={[{ required: true, message: '请输入目标描述' }]}
                >
                  <Input
                    placeholder={
                      getFieldValue('target') === 'group'
                        ? '例如：VIP用户组、新注册用户'
                        : '请输入用户名'
                    }
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item
            name="push_time"
            label="推送时间"
            rules={[{ required: true, message: '请选择推送时间' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="选择推送时间"
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 推送详情弹窗 */}
      <Modal
        title="推送详情"
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false)
          setSelectedMessage(null)
        }}
        footer={[
          selectedMessage?.status === 'failed' ? (
            <Button
              key="resend"
              icon={<RedoOutlined />}
              onClick={() => {
                if (selectedMessage) {
                  handleResend(selectedMessage)
                  setDetailModalOpen(false)
                }
              }}
            >
              重新发送
            </Button>
          ) : null,
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={640}
      >
        {selectedMessage && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">推送标题：</Text>
                <Text strong>{selectedMessage.title}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">推送类型：</Text>
                <Tag color={pushTypeMap[selectedMessage.type]?.color}>
                  {pushTypeMap[selectedMessage.type]?.label}
                </Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary">目标用户：</Text>
                <Text>{selectedMessage.target_desc}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">推送状态：</Text>
                <Tag color={pushStatusMap[selectedMessage.status]?.color}>
                  {pushStatusMap[selectedMessage.status]?.label}
                </Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary">推送时间：</Text>
                <Text>{dayjs(selectedMessage.push_time).format('YYYY-MM-DD HH:mm:ss')}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">创建时间：</Text>
                <Text>{dayjs(selectedMessage.created_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">创建人：</Text>
                <Text>{selectedMessage.created_by}</Text>
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">推送内容：</Text>
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: '#f5f5f5',
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedMessage.content}
              </div>
            </div>
            {selectedMessage.status !== 'pending' && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">推送统计：</Text>
                <Row gutter={16} style={{ marginTop: 8 }}>
                  <Col span={8}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Statistic title="发送数" value={selectedMessage.sent_count} />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Statistic title="送达数" value={selectedMessage.delivered_count} />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Statistic title="打开数" value={selectedMessage.opened_count} />
                    </Card>
                  </Col>
                </Row>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default MessagePush
