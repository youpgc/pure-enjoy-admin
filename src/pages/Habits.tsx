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
  CheckCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'

const { Text } = Typography

// ==================== 类型定义 ====================

interface Habit {
  id: string
  user_id: string
  name: string
  description?: string
  frequency: 'daily' | 'weekly' | 'monthly'
  streak: number
  total_count: number
  created_at: string
}

// ==================== 组件 ====================

const Habits: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [form] = Form.useForm()

  const service = new BaseService<Habit>('habits', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.findAll((q) => {
        if (searchKeyword) {
          return q.or(`name.ilike.%${searchKeyword}%,description.ilike.%${searchKeyword}%`)
        }
        return q
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Habits-加载数据')
        return
      }
      setHabits(result.data || [])
    } catch (error) {
      handleApiError(error, 'Habits-加载数据')
    } finally {
      setLoading(false)
    }
  }, [searchKeyword])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 搜索
  const handleSearch = () => {
    loadData()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingHabit(null)
    form.resetFields()
    form.setFieldsValue({ frequency: 'daily', streak: 0, total_count: 0 })
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
      title: '频率',
      dataIndex: 'frequency',
      key: 'frequency',
      render: (frequency: string) => {
        const map: Record<string, string> = {
          daily: '每日',
          weekly: '每周',
          monthly: '每月',
        }
        return map[frequency] || frequency
      },
    },
    {
      title: '连续天数',
      dataIndex: 'streak',
      key: 'streak',
      render: (streak: number) => <Text style={{ color: '#52c41a' }}>{streak} 天</Text>,
    },
    {
      title: '总完成次数',
      dataIndex: 'total_count',
      key: 'total_count',
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
              value={habits.length > 0 ? Math.round(habits.reduce((sum, h) => sum + h.streak, 0) / habits.length) : 0}
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
        pagination={{ pageSize: 20 }}
        scroll={{ x: 800 }}
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
            name="frequency"
            label="频率"
            rules={[{ required: true, message: '请选择频率' }]}
          >
            <Select
              placeholder="请选择频率"
              options={[
                { label: '每日', value: 'daily' },
                { label: '每周', value: 'weekly' },
                { label: '每月', value: 'monthly' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Habits
