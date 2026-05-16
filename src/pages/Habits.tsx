import React, { useState, useMemo } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm,
  message, Card, Tooltip, Badge, Row, Col, Progress, Avatar, Calendar
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  CheckCircleOutlined, FireOutlined, TrophyOutlined,
  ReloadOutlined, BarChartOutlined
} from '@ant-design/icons'
import { mockHabits, mockUsers, mockHabitCheckins, habitFrequencyMap } from '../utils/mockData'
import type { MockHabit, MockHabitCheckin } from '../utils/mockData'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

type ViewMode = 'list' | 'calendar'

const Habits: React.FC = () => {
  const [habits, setHabits] = useState<MockHabit[]>(mockHabits)
  const [checkins, setCheckins] = useState<MockHabitCheckin[]>(mockHabitCheckins)
  const [loading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [checkinModalOpen, setCheckinModalOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<MockHabit | null>(null)
  const [selectedHabit, setSelectedHabit] = useState<MockHabit | null>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [form] = Form.useForm()
  const [checkinForm] = Form.useForm()

  // 过滤数据
  const filteredHabits = useMemo(() => {
    return habits.filter(item => {
      const matchSearch = !searchText || 
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchText.toLowerCase())
      const matchStatus = !statusFilter || 
        (statusFilter === 'active' ? item.is_active : !item.is_active)
      return matchSearch && matchStatus
    }).sort((a, b) => {
      // 活跃的排在前面，然后按当前连击排序
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
      return b.current_streak - a.current_streak
    })
  }, [habits, searchText, statusFilter])

  const handleAdd = () => {
    setEditingHabit(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: MockHabit) => {
    setEditingHabit(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setHabits(prev => prev.filter(item => item.id !== id))
    setCheckins(prev => prev.filter(c => c.habit_id !== id))
    message.success('删除成功')
  }

  const handleSubmit = async (values: any) => {
    if (editingHabit) {
      setHabits(prev => prev.map(item => 
        item.id === editingHabit.id 
          ? { ...item, ...values }
          : item
      ))
      message.success('更新成功')
    } else {
      const newHabit: MockHabit = {
        id: `habit_${Date.now()}`,
        ...values,
        current_streak: 0,
        max_streak: 0,
        total_checkins: 0,
        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      }
      setHabits(prev => [newHabit, ...prev])
      message.success('添加成功')
    }
    setModalOpen(false)
  }

  const handleCheckin = (habit: MockHabit) => {
    setSelectedHabit(habit)
    checkinForm.resetFields()
    setCheckinModalOpen(true)
  }

  const handleCheckinSubmit = (values: any) => {
    if (!selectedHabit) return

    const today = dayjs().format('YYYY-MM-DD')
    const existingCheckin = checkins.find(c => 
      c.habit_id === selectedHabit.id && c.checkin_date === today
    )

    if (existingCheckin) {
      message.warning('今天已经打卡了')
      return
    }

    const newCheckin: MockHabitCheckin = {
      id: `checkin_${Date.now()}`,
      habit_id: selectedHabit.id,
      checkin_date: today,
      note: values.note,
      created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }

    setCheckins(prev => [...prev, newCheckin])

    // 更新习惯统计
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
    const checkedInYesterday = checkins.some(c => 
      c.habit_id === selectedHabit.id && c.checkin_date === yesterday
    )

    setHabits(prev => prev.map(h => {
      if (h.id !== selectedHabit.id) return h
      const newStreak = checkedInYesterday ? h.current_streak + 1 : 1
      return {
        ...h,
        current_streak: newStreak,
        max_streak: Math.max(newStreak, h.max_streak),
        total_checkins: h.total_checkins + 1,
      }
    }))

    message.success('打卡成功！')
    setCheckinModalOpen(false)
  }

  const handleToggleActive = (record: MockHabit) => {
    setHabits(prev => prev.map(item => 
      item.id === record.id 
        ? { ...item, is_active: !item.is_active }
        : item
    ))
    message.success(record.is_active ? '已停用' : '已启用')
  }

  const getUserName = (userId: string) => {
    return mockUsers.find(u => u.id === userId)?.nickname || '未知用户'
  }

  const isCheckedInToday = (habitId: string) => {
    const today = dayjs().format('YYYY-MM-DD')
    return checkins.some(c => c.habit_id === habitId && c.checkin_date === today)
  }

  const columns = [
    {
      title: '习惯',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: MockHabit) => (
        <Space>
          <Avatar style={{ backgroundColor: record.color }} size="small">
            {name.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {habitFrequencyMap[record.frequency]?.label || record.frequency}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || '-',
    },
    {
      title: '当前连击',
      dataIndex: 'current_streak',
      key: 'current_streak',
      width: 120,
      render: (streak: number) => (
        <Space>
          <FireOutlined style={{ color: '#ff4d4f' }} />
          <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>{streak} 天</span>
        </Space>
      ),
    },
    {
      title: '最大连击',
      dataIndex: 'max_streak',
      key: 'max_streak',
      width: 120,
      render: (streak: number) => (
        <Space>
          <TrophyOutlined style={{ color: '#faad14' }} />
          <span>{streak} 天</span>
        </Space>
      ),
    },
    {
      title: '总打卡',
      dataIndex: 'total_checkins',
      key: 'total_checkins',
      width: 100,
      render: (count: number) => (
        <span style={{ fontWeight: 500 }}>{count} 次</span>
      ),
    },
    {
      title: '进度',
      key: 'progress',
      width: 150,
      render: (_: any, record: MockHabit) => {
        const progress = Math.min(100, Math.round((record.total_checkins / record.target_days) * 100))
        return (
          <Progress 
            percent={progress} 
            size="small" 
            strokeColor={record.color}
            format={() => `${record.total_checkins}/${record.target_days}`}
          />
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? '进行中' : '已停用'}
        </Tag>
      ),
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
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: MockHabit) => (
        <Space size="small">
          <Tooltip title="打卡">
            <Button
              type={isCheckedInToday(record.id) ? "default" : "primary"}
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleCheckin(record)}
              disabled={isCheckedInToday(record.id)}
            >
              {isCheckedInToday(record.id) ? '已打卡' : '打卡'}
            </Button>
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title={record.is_active ? '停用' : '启用'}>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => handleToggleActive(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个习惯吗？相关打卡记录也会被删除。"
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
    const dayCheckins = checkins.filter(c => c.checkin_date === dateStr)

    if (dayCheckins.length === 0) return null

    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {dayCheckins.slice(0, 3).map(item => {
          const habit = habits.find(h => h.id === item.habit_id)
          if (!habit) return null
          return (
            <li key={item.id} style={{ marginBottom: 2 }}>
              <Badge 
                color={habit.color}
                text={
                  <span style={{ fontSize: 12 }}>
                    {habit.name.length > 6 ? habit.name.slice(0, 6) + '...' : habit.name}
                  </span>
                }
              />
            </li>
          )
        })}
        {dayCheckins.length > 3 && (
          <li style={{ fontSize: 12, color: '#999' }}>
            +{dayCheckins.length - 3} 更多
          </li>
        )}
      </ul>
    )
  }

  const frequencies = Object.entries(habitFrequencyMap).map(([key, value]) => ({
    label: value.label,
    value: key,
  }))

  const colors = [
    '#1890FF', '#52C41A', '#FAAD14', '#FF4D4F', '#722ED1',
    '#13C2C2', '#EB2F96', '#F5222D', '#FA541C', '#FA8C16'
  ]

  const stats = {
    total: habits.length,
    active: habits.filter(h => h.is_active).length,
    totalCheckins: habits.reduce((sum, h) => sum + h.total_checkins, 0),
    avgStreak: habits.length > 0 
      ? Math.round(habits.reduce((sum, h) => sum + h.current_streak, 0) / habits.length)
      : 0,
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space size="middle">
              <Input
                placeholder="搜索习惯名称"
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
                <Option value="active">进行中</Option>
                <Option value="inactive">已停用</Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<BarChartOutlined />} onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}>
                {viewMode === 'list' ? '日历视图' : '列表视图'}
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                添加习惯
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
              <div style={{ color: '#666' }}>全部习惯</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{stats.active}</div>
              <div style={{ color: '#666' }}>进行中</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{stats.totalCheckins}</div>
              <div style={{ color: '#666' }}>总打卡次数</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>{stats.avgStreak}</div>
              <div style={{ color: '#666' }}>平均连击</div>
            </div>
          </Col>
        </Row>
      </Card>

      {viewMode === 'list' ? (
        <Table
          columns={columns}
          dataSource={filteredHabits}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
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
        title={editingHabit ? '编辑习惯' : '添加习惯'}
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
            name="name"
            label="习惯名称"
            rules={[{ required: true, message: '请输入习惯名称' }]}
          >
            <Input placeholder="例如：每天阅读30分钟" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={2} placeholder="请输入习惯描述（可选）" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="frequency"
                label="频率"
                rules={[{ required: true, message: '请选择频率' }]}
                initialValue="daily"
              >
                <Select placeholder="选择频率">
                  {frequencies.map(f => (
                    <Option key={f.value} value={f.value}>{f.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="target_days"
                label="目标天数"
                rules={[{ required: true, message: '请输入目标天数' }]}
                initialValue={21}
              >
                <Input type="number" min={1} max={365} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="color"
            label="颜色标识"
            rules={[{ required: true, message: '请选择颜色' }]}
            initialValue="#1890FF"
          >
            <Select placeholder="选择颜色">
              {colors.map(color => (
                <Option key={color} value={color}>
                  <span style={{ 
                    display: 'inline-block', 
                    width: 16, 
                    height: 16, 
                    backgroundColor: color,
                    borderRadius: 4,
                    marginRight: 8,
                    verticalAlign: 'middle'
                  }} />
                  {color}
                </Option>
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

          <Form.Item
            name="is_active"
            label="状态"
            initialValue={true}
          >
            <Select>
              <Option value={true}>进行中</Option>
              <Option value={false}>已停用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`打卡 - ${selectedHabit?.name}`}
        open={checkinModalOpen}
        onCancel={() => setCheckinModalOpen(false)}
        onOk={() => checkinForm.submit()}
        width={500}
      >
        <Form
          form={checkinForm}
          layout="vertical"
          onFinish={handleCheckinSubmit}
        >
          <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar style={{ backgroundColor: selectedHabit?.color }} size={48}>
                {selectedHabit?.name.charAt(0)}
              </Avatar>
              <div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{selectedHabit?.name}</div>
                <div style={{ color: '#666' }}>
                  当前连击: <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{selectedHabit?.current_streak} 天</span>
                  {' | '}
                  总打卡: {selectedHabit?.total_checkins} 次
                </div>
              </div>
            </div>
          </div>

          <Form.Item
            name="note"
            label="备注（可选）"
          >
            <TextArea rows={3} placeholder="记录今天的打卡心得..." />
          </Form.Item>

          <div style={{ textAlign: 'center', color: '#999' }}>
            今天: {dayjs().format('YYYY年MM月DD日')}
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default Habits
