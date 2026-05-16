import React, { useState, useMemo } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm,
  message, Card, Tooltip, Badge, Row, Col, Calendar, Radio, DatePicker, TimePicker
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CalendarOutlined,
  ExclamationCircleOutlined, BellOutlined
} from '@ant-design/icons'
import { mockReminders, mockUsers, reminderPriorityMap } from '../utils/mockData'
import type { MockReminder } from '../utils/mockData'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

type ViewMode = 'list' | 'calendar'

const Reminders: React.FC = () => {
  const [reminders, setReminders] = useState<MockReminder[]>(mockReminders)
  const [loading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<MockReminder | null>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [form] = Form.useForm()

  // 过滤数据
  const filteredReminders = useMemo(() => {
    return reminders.filter(item => {
      const matchSearch = !searchText || 
        item.title.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchText.toLowerCase())
      const matchStatus = !statusFilter || 
        (statusFilter === 'completed' ? item.is_completed : !item.is_completed)
      const matchPriority = !priorityFilter || item.priority === priorityFilter
      return matchSearch && matchStatus && matchPriority
    }).sort((a, b) => {
      // 未完成的排在前面，然后按提醒时间排序
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
      return dayjs(a.remind_at).valueOf() - dayjs(b.remind_at).valueOf()
    })
  }, [reminders, searchText, statusFilter, priorityFilter])

  const handleAdd = () => {
    setEditingReminder(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: MockReminder) => {
    setEditingReminder(record)
    form.setFieldsValue({
      ...record,
      remind_date: dayjs(record.remind_at),
      remind_time: dayjs(record.remind_at),
    })
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setReminders(prev => prev.filter(item => item.id !== id))
    message.success('删除成功')
  }

  const handleSubmit = async (values: any) => {
    const remindAt = dayjs(values.remind_date)
      .hour(values.remind_time.hour())
      .minute(values.remind_time.minute())
      .format('YYYY-MM-DD HH:mm:ss')
    
    if (editingReminder) {
      setReminders(prev => prev.map(item => 
        item.id === editingReminder.id 
          ? { ...item, ...values, remind_at: remindAt }
          : item
      ))
      message.success('更新成功')
    } else {
      const newReminder: MockReminder = {
        id: `reminder_${Date.now()}`,
        ...values,
        remind_at: remindAt,
        is_completed: false,
        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      }
      setReminders(prev => [newReminder, ...prev])
      message.success('添加成功')
    }
    setModalOpen(false)
  }

  const handleToggleComplete = (record: MockReminder) => {
    setReminders(prev => prev.map(item => 
      item.id === record.id 
        ? { ...item, is_completed: !item.is_completed }
        : item
    ))
    message.success(record.is_completed ? '已标记为未完成' : '已标记为完成')
  }

  const getUserName = (userId: string) => {
    return mockUsers.find(u => u.id === userId)?.nickname || '未知用户'
  }

  const isOverdue = (remindAt: string, isCompleted: boolean) => {
    if (isCompleted) return false
    return dayjs(remindAt).isBefore(dayjs())
  }

  const columns = [
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_: any, record: MockReminder) => (
        <Tooltip title={record.is_completed ? '已完成' : '未完成'}>
          <Button
            type="text"
            icon={record.is_completed 
              ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> 
              : <ClockCircleOutlined style={{ color: isOverdue(record.remind_at, record.is_completed) ? '#ff4d4f' : '#faad14' }} />
            }
            onClick={() => handleToggleComplete(record)}
          />
        </Tooltip>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: MockReminder) => (
        <Space>
          {isOverdue(record.remind_at, record.is_completed) && (
            <Tooltip title="已过期">
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
          <span style={{ 
            textDecoration: record.is_completed ? 'line-through' : 'none',
            color: record.is_completed ? '#999' : 'inherit'
          }}>
            {title}
          </span>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string, record: MockReminder) => (
        <span style={{ color: record.is_completed ? '#999' : 'inherit' }}>
          {desc || '-'}
        </span>
      ),
    },
    {
      title: '提醒时间',
      dataIndex: 'remind_at',
      key: 'remind_at',
      width: 180,
      render: (date: string, record: MockReminder) => (
        <Space>
          <ClockCircleOutlined style={{ 
            color: isOverdue(date, record.is_completed) ? '#ff4d4f' : '#1890ff' 
          }} />
          <span style={{ 
            color: isOverdue(date, record.is_completed) ? '#ff4d4f' : 'inherit',
            fontWeight: isOverdue(date, record.is_completed) ? 500 : 'normal'
          }}>
            {dayjs(date).format('YYYY-MM-DD HH:mm')}
          </span>
        </Space>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const info = reminderPriorityMap[priority]
        return info ? <Tag color={info.color} icon={info.icon}>{info.label}</Tag> : <Tag>{priority}</Tag>
      },
    },
    {
      title: '用户',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 120,
      render: (userId: string) => getUserName(userId),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: MockReminder) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条提醒吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // 日历单元格渲染
  const dateCellRender = (value: dayjs.Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD')
    const dayReminders = reminders.filter(r => 
      dayjs(r.remind_at).format('YYYY-MM-DD') === dateStr
    )

    if (dayReminders.length === 0) return null

    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {dayReminders.slice(0, 3).map(item => (
          <li key={item.id} style={{ marginBottom: 2 }}>
            <Badge 
              color={item.is_completed ? '#52c41a' : reminderPriorityMap[item.priority]?.color || '#1890ff'}
              text={
                <span style={{ 
                  fontSize: 12,
                  textDecoration: item.is_completed ? 'line-through' : 'none',
                  color: item.is_completed ? '#999' : 'inherit'
                }}>
                  {item.title.length > 8 ? item.title.slice(0, 8) + '...' : item.title}
                </span>
              }
            />
          </li>
        ))}
        {dayReminders.length > 3 && (
          <li style={{ fontSize: 12, color: '#999' }}>
            +{dayReminders.length - 3} 更多
          </li>
        )}
      </ul>
    )
  }

  const priorities = Object.entries(reminderPriorityMap).map(([key, value]) => ({
    label: value.label,
    value: key,
  }))

  const stats = {
    total: reminders.length,
    completed: reminders.filter(r => r.is_completed).length,
    pending: reminders.filter(r => !r.is_completed).length,
    overdue: reminders.filter(r => isOverdue(r.remind_at, r.is_completed)).length,
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space size="middle">
              <Input
                placeholder="搜索标题、描述"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
              <Select
                placeholder="筛选状态"
                value={statusFilter || undefined}
                onChange={setStatusFilter}
                style={{ width: 120 }}
                allowClear
              >
                <Option value="pending">未完成</Option>
                <Option value="completed">已完成</Option>
              </Select>
              <Select
                placeholder="筛选优先级"
                value={priorityFilter || undefined}
                onChange={setPriorityFilter}
                style={{ width: 120 }}
                allowClear
              >
                {priorities.map(p => (
                  <Option key={p.value} value={p.value}>{p.label}</Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <Radio.Group value={viewMode} onChange={e => setViewMode(e.target.value)}>
                <Radio.Button value="list"><BellOutlined /> 列表</Radio.Button>
                <Radio.Button value="calendar"><CalendarOutlined /> 日历</Radio.Button>
              </Radio.Group>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                添加提醒
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.total}</div>
              <div style={{ color: '#666' }}>全部提醒</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>{stats.pending}</div>
              <div style={{ color: '#666' }}>待处理</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{stats.completed}</div>
              <div style={{ color: '#666' }}>已完成</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>{stats.overdue}</div>
              <div style={{ color: '#666' }}>已过期</div>
            </div>
          </Col>
        </Row>
      </Card>

      {viewMode === 'list' ? (
        <Table
          columns={columns}
          dataSource={filteredReminders}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      ) : (
        <Card>
          <Calendar 
            cellRender={dateCellRender}
            mode="month"
          />
        </Card>
      )}

      <Modal
        title={editingReminder ? '编辑提醒' : '添加提醒'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入提醒标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="请输入提醒描述（可选）" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="remind_date"
                label="日期"
                rules={[{ required: true, message: '请选择日期' }]}
                initialValue={dayjs()}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="remind_time"
                label="时间"
                rules={[{ required: true, message: '请选择时间' }]}
                initialValue={dayjs()}
              >
                <TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
            initialValue="normal"
          >
            <Select placeholder="选择优先级">
              {priorities.map(p => (
                <Option key={p.value} value={p.value}>{p.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="user_id"
            label="用户"
            rules={[{ required: true, message: '请选择用户' }]}
            initialValue={mockUsers[0]?.id}
          >
            <Select placeholder="选择用户">
              {mockUsers.slice(0, 10).map(user => (
                <Option key={user.id} value={user.id}>{user.nickname}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Reminders
