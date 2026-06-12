import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  message,
  Modal,
  Form,
  Popconfirm,
  DatePicker,
  Select,
  Typography,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'

const { Text } = Typography

// ==================== 枚举映射 ====================

const ANNIVERSARY_TYPE_MAP: Record<string, string> = {
  birthday: '生日',
  anniversary: '纪念日',
  holiday: '节日',
  other: '其他',
}

const ANNIVERSARY_TYPE_OPTIONS = Object.entries(ANNIVERSARY_TYPE_MAP).map(([code, label]) => ({ label, value: code }))

// ==================== 类型定义 ====================

interface Anniversary {
  id: string
  user_id: string
  title: string
  date: string
  type: 'birthday' | 'wedding' | 'work' | 'other'
  remind_days_before?: number
  description?: string
  repeat_yearly?: boolean
  remind_enabled?: boolean
  user_nickname?: string
  created_at: string
  updated_at?: string
}

// ==================== 组件 ====================

const Anniversaries: React.FC = () => {
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAnniversary, setEditingAnniversary] = useState<Anniversary | null>(null)
  const [form] = Form.useForm()

  const service = new BaseService<Anniversary>('user_anniversaries', { defaultOrder: { column: 'date', ascending: true } })

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.paginate(pagination.current, pagination.pageSize, (q) => {
        if (searchKeyword) {
          return q.or(`title.ilike.%${searchKeyword}%`)
        }
        return q
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Anniversaries-加载数据')
        return
      }
      setAnniversaries(result.data!.data)
      setPagination(prev => ({ ...prev, total: result.data!.total }))
    } catch (error) {
      handleApiError(error, 'Anniversaries-加载数据')
    } finally {
      setLoading(false)
    }
  }, [searchKeyword, pagination.current, pagination.pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 搜索
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingAnniversary(null)
    form.resetFields()
    form.setFieldsValue({ date: dayjs(), type: 'other', remind_days_before: 7 })
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: Anniversary) => {
    setEditingAnniversary(record)
    form.setFieldsValue({
      ...record,
      date: dayjs(record.date),
    })
    setModalVisible(true)
  }

  // 删除记录
  const handleDelete = async (id: string) => {
    try {
      const result = await service.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'Anniversaries-删除')
        return
      }
      message.success('删除成功')
      loadData()
    } catch (error) {
      handleApiError(error, 'Anniversaries-删除')
    }
  }

  // 保存记录
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      }
      if (editingAnniversary) {
        const result = await service.update(editingAnniversary.id, data)
        if (!result.success) {
          handleApiError(result.errorMessage, 'Anniversaries-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await service.create({
          ...data,
          created_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'Anniversaries-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingAnniversary(null)
      form.resetFields()
      loadData()
    } catch (error) {
      handleApiError(error, 'Anniversaries-保存')
    }
  }

  // 计算距离下一个纪念日的天数
  const getDaysUntil = (dateStr: string) => {
    const today = dayjs().startOf('day')
    const anniversary = dayjs(dateStr)
    let next = anniversary.year(today.year())
    if (next.isBefore(today)) {
      next = next.add(1, 'year')
    }
    return next.diff(today, 'day')
  }

  // 表格列定义
  const columns: ColumnsType<Anniversary> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <Text strong>{title}</Text>,
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => ANNIVERSARY_TYPE_MAP[type] || type,
    },
    {
      title: '距离下次',
      key: 'days_until',
      render: (_, record: Anniversary) => {
        const days = getDaysUntil(record.date)
        return <Text style={{ color: days <= 7 ? '#ff4d4f' : '#52c41a' }}>{days} 天后</Text>
      },
    },
    {
      title: '提醒天数',
      dataIndex: 'remind_days_before',
      key: 'remind_days_before',
      render: (days: number) => days ? `${days} 天前` : '-',
    },
    {
      title: '用户昵称',
      dataIndex: 'user_nickname',
      key: 'user_nickname',
      render: (nickname: string) => nickname || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="总纪念日数"
              value={anniversaries.length}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="7天内到期"
              value={anniversaries.filter(a => getDaysUntil(a.date) <= 7).length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索标题"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            allowClear
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
        </Space>
      </Card>

      {/* 操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增纪念日
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={anniversaries}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 20 }))
          },
        }}
        scroll={{ x: 800 }}
      />

      {/* 表单弹窗 */}
      <Modal
        title={editingAnniversary ? '编辑纪念日' : '新增纪念日'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingAnniversary(null)
          form.resetFields()
        }}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="user_id"
            label="用户ID"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <Input placeholder="请输入用户ID" />
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item
            name="date"
            label="日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
          </Form.Item>
          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select
              placeholder="请选择类型"
              options={ANNIVERSARY_TYPE_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            name="remind_days_before"
            label="提前提醒天数"
          >
            <Input placeholder="请输入提前提醒天数" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Anniversaries
