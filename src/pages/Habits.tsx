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
  Popconfirm,
  Switch,
  InputNumber,
  Typography,
  Row,
  Col,
  Statistic,
  Descriptions,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'

const { Text } = Typography

// ==================== 类型定义 ====================

interface Habit {
  id: string
  user_id: string
  name: string
  description?: string
  target_days?: number
  current_streak?: number
  longest_streak?: number
  is_active?: boolean
  created_at: string
  updated_at?: string
}

// ==================== 组件 ====================

const Habits: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [detailHabit, setDetailHabit] = useState<Habit | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [form] = Form.useForm()

  const service = new BaseService<Habit>('habits', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (searchKeyword) {
          query = query.or(`name.ilike.%${searchKeyword}%,description.ilike.%${searchKeyword}%`)
        }
        if (userFilter) {
          query = query.eq('user_id', userFilter)
        }
        return query
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Habits-加载数据')
        return
      }
      setHabits(result.data!.data)
      setTotal(result.data!.total)
    } catch (error) {
      handleApiError(error, 'Habits-加载数据')
    } finally {
      setLoading(false)
    }
  }, [searchKeyword, userFilter, pagination.current, pagination.pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 搜索
  const handleSearch = () => {
    resetPage()
  }

  // 重置筛选
  const handleReset = () => {
    setSearchKeyword('')
    setUserFilter('')
    resetPage()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingHabit(null)
    form.resetFields()
    form.setFieldsValue({ target_days: 30, current_streak: 0, longest_streak: 0, is_active: true })
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: Habit) => {
    setEditingHabit(record)
    form.setFieldsValue({
      ...record,
    })
    setModalVisible(true)
  }

  // 查看详情
  const handleViewDetail = (record: Habit) => {
    setDetailHabit(record)
    setDetailVisible(true)
  }

  // 删除记录
  const handleDelete = async (id: string) => {
    try {
      const result = await service.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'Habits-删除')
        return
      }
      message.success('删除成功')
      loadData()
    } catch (error) {
      handleApiError(error, 'Habits-删除')
    }
  }

  // 保存记录
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingHabit) {
        const result = await service.update(editingHabit.id, values)
        if (!result.success) {
          handleApiError(result.errorMessage, 'Habits-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await service.create({
          ...values,
          created_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'Habits-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingHabit(null)
      form.resetFields()
      loadData()
    } catch (error) {
      handleApiError(error, 'Habits-保存')
    }
  }

  // 表格列定义
  const columns: ColumnsType<Habit> = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      ellipsis: true,
    },
    {
      title: '习惯名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '目标天数',
      dataIndex: 'target_days',
      key: 'target_days',
      render: (days: number) => days ? `${days} 天` : '-',
    },
    {
      title: '当前连续',
      dataIndex: 'current_streak',
      key: 'current_streak',
      render: (streak: number) => <Text style={{ color: '#52c41a' }}>{streak || 0} 天</Text>,
    },
    {
      title: '最长连续',
      dataIndex: 'longest_streak',
      key: 'longest_streak',
      render: (streak: number) => <Text style={{ color: '#1890ff' }}>{streak || 0} 天</Text>,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? '进行中' : '已停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
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
              title="总习惯数"
              value={habits.length}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="平均连续天数"
              value={habits.length > 0 ? Math.round(habits.reduce((sum, h) => sum + (h.current_streak || 0), 0) / habits.length) : 0}
              suffix="天"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索习惯名称/描述"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Input
            placeholder="按用户ID筛选"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增习惯
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={habits}
        rowKey="id"
        loading={loading}
        pagination={tablePagination}
        scroll={{ x: 'max-content' }}
      />

      {/* 表单弹窗 */}
      <Modal
        title={editingHabit ? '编辑习惯' : '新增习惯'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingHabit(null)
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
            name="name"
            label="习惯名称"
            rules={[{ required: true, message: '请输入习惯名称' }]}
          >
            <Input placeholder="请输入习惯名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={2} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item
            name="target_days"
            label="目标天数"
          >
            <InputNumber style={{ width: '100%' }} placeholder="请输入目标天数" min={1} />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="是否激活"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="习惯详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setDetailHabit(null) }}
        footer={[
          <Button key="close" onClick={() => { setDetailVisible(false); setDetailHabit(null) }}>
            关闭
          </Button>,
        ]}
        width={500}
      >
        {detailHabit && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="用户ID">{detailHabit.user_id}</Descriptions.Item>
            <Descriptions.Item label="习惯名称">{detailHabit.name}</Descriptions.Item>
            <Descriptions.Item label="描述">{detailHabit.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="目标天数">{detailHabit.target_days ? detailHabit.target_days + ' 天' : '-'}</Descriptions.Item>
            <Descriptions.Item label="当前连续">{detailHabit.current_streak || 0} 天</Descriptions.Item>
            <Descriptions.Item label="最长连续">{detailHabit.longest_streak || 0} 天</Descriptions.Item>
            <Descriptions.Item label="状态">{detailHabit.is_active ? '进行中' : '已停用'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(detailHabit.created_at).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default Habits
