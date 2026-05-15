import React, { useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space,
  message, Card, Statistic, Row, Col, DatePicker, Typography,
  Calendar, Badge, Tooltip, Popconfirm, Image
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  CalendarOutlined, TeamOutlined, TrophyOutlined,
  CheckCircleOutlined, ClockCircleOutlined, StopOutlined
} from '@ant-design/icons'
import { usePermission } from '../hooks/usePermission'
import {
  mockActivities,
  activityTypeMap,
  activityStatusMap,
  type MockActivity
} from '../utils/mockData'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

const { TextArea } = Input
const { Text } = Typography

const ActivityManagement: React.FC = () => {
  const { isAdmin } = usePermission()
  const [activities, setActivities] = useState<MockActivity[]>(mockActivities)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [calendarModalOpen, setCalendarModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<MockActivity | null>(null)
  const [editingActivity, setEditingActivity] = useState<MockActivity | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const handleCreate = (values: {
    name: string
    description: string
    type: string
    start_time: Dayjs
    end_time: Dayjs
    rules: string
    status: string
  }) => {
    setSubmitting(true)
    setTimeout(() => {
      const newActivity: MockActivity = {
        id: `activity_${String(activities.length + 1).padStart(3, '0')}`,
        name: values.name,
        description: values.description,
        cover_url: `https://picsum.photos/seed/new${Date.now()}/400/200`,
        type: values.type as MockActivity['type'],
        start_time: values.start_time.format('YYYY-MM-DD HH:mm:ss'),
        end_time: values.end_time.format('YYYY-MM-DD HH:mm:ss'),
        status: (values.status || 'draft') as MockActivity['status'],
        rules: values.rules,
        participant_count: 0,
        conversion_rate: 0,
        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        created_by: '管理员',
      }
      setActivities([newActivity, ...activities])
      message.success('活动创建成功')
      setFormModalOpen(false)
      form.resetFields()
      setEditingActivity(null)
      setSubmitting(false)
    }, 500)
  }

  const handleEdit = (values: {
    name: string
    description: string
    type: string
    start_time: Dayjs
    end_time: Dayjs
    rules: string
    status: string
  }) => {
    if (!editingActivity) return
    setSubmitting(true)
    setTimeout(() => {
      const updated = activities.map(a =>
        a.id === editingActivity.id
          ? {
              ...a,
              name: values.name,
              description: values.description,
              type: values.type as MockActivity['type'],
              start_time: values.start_time.format('YYYY-MM-DD HH:mm:ss'),
              end_time: values.end_time.format('YYYY-MM-DD HH:mm:ss'),
              rules: values.rules,
              status: (values.status || a.status) as MockActivity['status'],
            }
          : a
      )
      setActivities(updated)
      message.success('活动更新成功')
      setFormModalOpen(false)
      form.resetFields()
      setEditingActivity(null)
      setSubmitting(false)
    }, 500)
  }

  const handleDelete = (record: MockActivity) => {
    setActivities(activities.filter(a => a.id !== record.id))
    message.success('活动已删除')
  }

  const handleStartActivity = (record: MockActivity) => {
    const updated = activities.map(a =>
      a.id === record.id ? { ...a, status: 'active' as const } : a
    )
    setActivities(updated)
    message.success('活动已开始')
  }

  const handleEndActivity = (record: MockActivity) => {
    const updated = activities.map(a =>
      a.id === record.id ? { ...a, status: 'ended' as const } : a
    )
    setActivities(updated)
    message.success('活动已结束')
  }

  const openCreateModal = () => {
    setEditingActivity(null)
    form.resetFields()
    setFormModalOpen(true)
  }

  const openEditModal = (record: MockActivity) => {
    setEditingActivity(record)
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      type: record.type,
      start_time: dayjs(record.start_time),
      end_time: dayjs(record.end_time),
      rules: record.rules,
      status: record.status,
    })
    setFormModalOpen(true)
  }

  const showDetail = (record: MockActivity) => {
    setSelectedActivity(record)
    setDetailModalOpen(true)
  }

  // 统计数据
  const activeCount = activities.filter(a => a.status === 'active').length
  const draftCount = activities.filter(a => a.status === 'draft').length
  const endedCount = activities.filter(a => a.status === 'ended').length
  const totalParticipants = activities.reduce((sum, a) => sum + a.participant_count, 0)
  const avgConversion = activities.filter(a => a.status !== 'draft').length > 0
    ? (activities.filter(a => a.status !== 'draft').reduce((sum, a) => sum + a.conversion_rate, 0)
      / activities.filter(a => a.status !== 'draft').length).toFixed(1)
    : '0'

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (text: string, record: MockActivity) => (
        <a onClick={() => showDetail(record)}>{text}</a>
      ),
    },
    {
      title: '活动类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const info = activityTypeMap[type]
        return <Tag color={info?.color}>{info?.label}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const info = activityStatusMap[status]
        return <Tag color={info?.color}>{info?.label}</Tag>
      },
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '参与人数',
      dataIndex: 'participant_count',
      key: 'participant_count',
      width: 100,
      render: (count: number) => <Text>{count.toLocaleString()}</Text>,
    },
    {
      title: '转化率',
      dataIndex: 'conversion_rate',
      key: 'conversion_rate',
      width: 100,
      render: (rate: number) => <Text>{rate}%</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: unknown, record: MockActivity) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showDetail(record)}
            />
          </Tooltip>
          {(record.status === 'draft' || record.status === 'active') && (
            <Tooltip title="编辑">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
              />
            </Tooltip>
          )}
          {record.status === 'draft' && (
            <Tooltip title="开始活动">
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleStartActivity(record)}
              />
            </Tooltip>
          )}
          {record.status === 'active' && (
            <Tooltip title="结束活动">
              <Popconfirm
                title="确认结束"
                description="确定要提前结束此活动吗？"
                onConfirm={() => handleEndActivity(record)}
                okText="结束"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<StopOutlined />}
                  style={{ color: '#ff4d4f' }}
                />
              </Popconfirm>
            </Tooltip>
          )}
          {record.status === 'draft' && (
            <Popconfirm
              title="确认删除"
              description="确定要删除此活动吗？"
              onConfirm={() => handleDelete(record)}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  // 日历数据
  const calendarDateMap = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD')
    const matched = activities.filter(a => {
      const start = dayjs(a.start_time).format('YYYY-MM-DD')
      const end = dayjs(a.end_time).format('YYYY-MM-DD')
      return dateStr >= start && dateStr <= end
    })
    return matched
  }

  const cellRender = (date: Dayjs) => {
    const listData = calendarDateMap(date)
    if (listData.length === 0) return null
    return (
      <div style={{ padding: '0 4px' }}>
        {listData.slice(0, 2).map(a => (
          <div key={a.id} style={{ marginBottom: 2 }}>
            <Badge
              status={
                a.status === 'active' ? 'processing' :
                a.status === 'draft' ? 'default' : 'success'
              }
              text={
                <span style={{ fontSize: 11, lineHeight: '18px' }}>
                  {a.name.length > 6 ? a.name.slice(0, 6) + '...' : a.name}
                </span>
              }
            />
          </div>
        ))}
        {listData.length > 2 && (
          <div style={{ fontSize: 11, color: '#999' }}>+{listData.length - 2} 更多</div>
        )}
      </div>
    )
  }

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
        <h3>活动管理</h3>
        <Space>
          <Button
            icon={<CalendarOutlined />}
            onClick={() => setCalendarModalOpen(true)}
          >
            日历视图
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            创建活动
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="进行中"
              value={activeCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="草稿"
              value={draftCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已结束"
              value={endedCount}
              prefix={<StopOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="总参与人数"
              value={totalParticipants}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="平均转化率"
              value={avgConversion}
              suffix="%"
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="活动总数"
              value={activities.length}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 活动列表 */}
      <Table
        columns={columns}
        dataSource={activities}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
        size="middle"
      />

      {/* 创建/编辑活动弹窗 */}
      <Modal
        title={editingActivity ? '编辑活动' : '创建活动'}
        open={formModalOpen}
        onCancel={() => {
          setFormModalOpen(false)
          form.resetFields()
          setEditingActivity(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={720}
        okText={editingActivity ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingActivity ? handleEdit : handleCreate}
        >
          <Form.Item
            name="name"
            label="活动名称"
            rules={[{ required: true, message: '请输入活动名称' }]}
          >
            <Input placeholder="请输入活动名称" maxLength={50} showCount />
          </Form.Item>
          <Form.Item
            name="description"
            label="活动描述"
            rules={[{ required: true, message: '请输入活动描述' }]}
          >
            <TextArea
              rows={4}
              placeholder="请输入活动描述，支持富文本内容"
              maxLength={1000}
              showCount
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="活动类型"
                rules={[{ required: true, message: '请选择活动类型' }]}
              >
                <Select placeholder="选择活动类型">
                  <Select.Option value="limited_free">限时免费</Select.Option>
                  <Select.Option value="discount">折扣优惠</Select.Option>
                  <Select.Option value="checkin_reward">签到奖励</Select.Option>
                  <Select.Option value="reading_challenge">阅读挑战</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              {editingActivity && (
                <Form.Item name="status" label="活动状态">
                  <Select placeholder="选择活动状态">
                    <Select.Option value="draft">草稿</Select.Option>
                    <Select.Option value="active">进行中</Select.Option>
                    <Select.Option value="ended">已结束</Select.Option>
                  </Select>
                </Form.Item>
              )}
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="start_time"
                label="开始时间"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="选择开始时间"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="end_time"
                label="结束时间"
                rules={[{ required: true, message: '请选择结束时间' }]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="选择结束时间"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="rules"
            label="活动规则"
            rules={[{ required: true, message: '请输入活动规则' }]}
          >
            <TextArea
              rows={5}
              placeholder="请输入活动规则，每条规则一行"
              maxLength={2000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 活动详情弹窗 */}
      <Modal
        title="活动详情"
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false)
          setSelectedActivity(null)
        }}
        footer={[
          selectedActivity?.status === 'draft' ? (
            <Button
              key="edit"
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                setDetailModalOpen(false)
                if (selectedActivity) openEditModal(selectedActivity)
              }}
            >
              编辑
            </Button>
          ) : null,
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={720}
      >
        {selectedActivity && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Image
                src={selectedActivity.cover_url}
                alt={selectedActivity.name}
                style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }}
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYkqS4tjQ45Pz5/P/jO1NTUqys3Jzc3NzMzMzMzMzMzMzMzIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMv4AT8xGKQoODhAWFxgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgY/8AARCAB4AJADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/SFhSRFEiN0FeUzR1eVlNZXR3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+gD/2Q=="
              />
            </div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">活动名称：</Text>
                <Text strong>{selectedActivity.name}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">活动类型：</Text>
                <Tag color={activityTypeMap[selectedActivity.type]?.color}>
                  {activityTypeMap[selectedActivity.type]?.label}
                </Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary">活动状态：</Text>
                <Tag color={activityStatusMap[selectedActivity.status]?.color}>
                  {activityStatusMap[selectedActivity.status]?.label}
                </Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary">创建人：</Text>
                <Text>{selectedActivity.created_by}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">开始时间：</Text>
                <Text>{dayjs(selectedActivity.start_time).format('YYYY-MM-DD HH:mm')}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">结束时间：</Text>
                <Text>{dayjs(selectedActivity.end_time).format('YYYY-MM-DD HH:mm')}</Text>
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">活动描述：</Text>
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: '#f5f5f5',
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedActivity.description}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">活动规则：</Text>
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: '#fffbe6',
                  borderRadius: 6,
                  border: '1px solid #ffe58f',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedActivity.rules}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">数据统计：</Text>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Statistic
                      title="参与人数"
                      value={selectedActivity.participant_count}
                      prefix={<TeamOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Statistic
                      title="转化率"
                      value={selectedActivity.conversion_rate}
                      suffix="%"
                      prefix={<TrophyOutlined />}
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Modal>

      {/* 日历视图弹窗 */}
      <Modal
        title="活动日历"
        open={calendarModalOpen}
        onCancel={() => setCalendarModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setCalendarModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={900}
      >
        <Calendar cellRender={(date) => cellRender(date as Dayjs)} />
      </Modal>
    </div>
  )
}

export default ActivityManagement
