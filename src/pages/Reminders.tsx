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
  Switch,
  Typography,
  Descriptions,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'

const { Text } = Typography

// ==================== 枚举映射 ====================

const REPEAT_TYPE_MAP: Record<string, string> = {
  none: '不重复',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年',
  weekday: '工作日',
  weekend: '周末',
  custom: '自定义',
}

// ==================== 类型定义 ====================

interface Reminder {
  id: string
  user_id: string
  title: string
  description?: string
  remind_at: string
  is_completed: boolean
  is_repeated?: boolean
  repeat_type?: string
  created_at: string
  updated_at?: string
}

// ==================== 组件 ====================

const Reminders: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [detailReminder, setDetailReminder] = useState<Reminder | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [form] = Form.useForm()

  const service = new BaseService<Reminder>('reminders', { defaultOrder: { column: 'remind_at', ascending: true } })

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (searchKeyword) {
          query = query.or(`title.ilike.%${searchKeyword}%,description.ilike.%${searchKeyword}%`)
        }
        if (userFilter) {
          query = query.eq('user_id', userFilter)
        }
        return query
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Reminders-加载数据')
        return
      }
      setReminders(result.data!.data)
      setTotal(result.data!.total)
    } catch (error) {
      handleApiError(error, 'Reminders-加载数据')
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
    setEditingReminder(null)
    form.resetFields()
    form.setFieldsValue({ remind_at: dayjs(), is_completed: false })
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: Reminder) => {
    setEditingReminder(record)
    form.setFieldsValue({
      ...record,
      remind_at: dayjs(record.remind_at),
    })
    setModalVisible(true)
  }

  // 查看详情
  const handleViewDetail = (record: Reminder) => {
    setDetailReminder(record)
    setDetailVisible(true)
  }

  // 删除记录
  const handleDelete = async (id: string) => {
    try {
      const result = await service.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'Reminders-删除')
        return
      }
      message.success('删除成功')
      loadData()
    } catch (error) {
      handleApiError(error, 'Reminders-删除')
    }
  }

  // 切换完成状态
  const handleToggleComplete = async (record: Reminder) => {
    try {
      const result = await service.update(record.id, {
        is_completed: !record.is_completed,
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Reminders-切换状态')
        return
      }
      message.success('状态更新成功')
      loadData()
    } catch (error) {
      handleApiError(error, 'Reminders-切换状态')
    }
  }

  // 保存记录
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        ...values,
        remind_at: values.remind_at.format('YYYY-MM-DD HH:mm:ss'),
      }
      if (editingReminder) {
        const result = await service.update(editingReminder.id, data)
        if (!result.success) {
          handleApiError(result.errorMessage, 'Reminders-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await service.create({
          ...data,
          created_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'Reminders-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingReminder(null)
      form.resetFields()
      loadData()
    } catch (error) {
      handleApiError(error, 'Reminders-保存')
    }
  }

  // 表格列定义
  const columns: ColumnsType<Reminder> = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      ellipsis: true,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Reminder) => (
        <Text strong style={{ textDecoration: record.is_completed ? 'line-through' : 'none', color: record.is_completed ? '#999' : 'inherit' }}>
          {title}
        </Text>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '是否重复',
      dataIndex: 'is_repeated',
      key: 'is_repeated',
      render: (repeated: boolean) => repeated ? '是' : '否',
    },
    {
      title: '重复类型',
      dataIndex: 'repeat_type',
      key: 'repeat_type',
      render: (type: string) => REPEAT_TYPE_MAP[type] || type || '-',
    },
    {
      title: '提醒时间',
      dataIndex: 'remind_at',
      key: 'remind_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '完成',
      dataIndex: 'is_completed',
      key: 'is_completed',
      render: (isCompleted: boolean, record: Reminder) => (
        <Switch
          checked={isCompleted}
          onChange={() => handleToggleComplete(record)}
          checkedChildren="已完成"
          unCheckedChildren="未完成"
        />
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
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索标题/内容"
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
          新增提醒
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={reminders}
        rowKey="id"
        loading={loading}
        pagination={tablePagination}
        scroll={{ x: 'max-content' }}
      />

      {/* 表单弹窗 */}
      <Modal
        title={editingReminder ? '编辑提醒' : '新增提醒'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingReminder(null)
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
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item
            name="remind_at"
            label="提醒时间"
            rules={[{ required: true, message: '请选择提醒时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} placeholder="请选择提醒时间" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="提醒详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setDetailReminder(null) }}
        footer={[
          <Button key="close" onClick={() => { setDetailVisible(false); setDetailReminder(null) }}>
            关闭
          </Button>,
        ]}
        width={500}
      >
        {detailReminder && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="用户ID">{detailReminder.user_id}</Descriptions.Item>
            <Descriptions.Item label="标题">{detailReminder.title}</Descriptions.Item>
            <Descriptions.Item label="描述">{detailReminder.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="是否重复">{detailReminder.is_repeated ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="重复类型">{REPEAT_TYPE_MAP[detailReminder.repeat_type || ''] || detailReminder.repeat_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="提醒时间">{dayjs(detailReminder.remind_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
            <Descriptions.Item label="完成状态">{detailReminder.is_completed ? '已完成' : '未完成'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{dayjs(detailReminder.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default Reminders
