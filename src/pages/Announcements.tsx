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
  Select,
  DatePicker,
  Typography,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'

const { Text, Paragraph } = Typography

// ==================== 类型定义 ====================

interface Announcement {
  id: string
  title: string
  content: string
  type: 'system' | 'activity' | 'maintenance'
  priority: string
  is_published: boolean
  publish_at?: string
  expire_at?: string | null
  created_at: string
}

const PRIORITY_MAP: Record<string, { color: string; label: string }> = {
  high: { color: 'red', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'blue', label: '低' },
}

// ==================== 组件 ====================

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [form] = Form.useForm()

  const service = React.useMemo(() => new BaseService<Announcement>('announcements', { defaultOrder: { column: 'created_at', ascending: false } }), [])

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.paginate(pagination.current, pagination.pageSize, (q) => {
        if (searchKeyword) {
          return q.or(`title.ilike.%${searchKeyword}%,content.ilike.%${searchKeyword}%`)
        }
        return q
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Announcements-加载数据')
        return
      }
      setAnnouncements(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'Announcements-加载数据')
    } finally {
      setLoading(false)
    }
  }, [searchKeyword, pagination.current, pagination.pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 搜索
  const handleSearch = () => {
    resetPage()
    loadData()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingAnnouncement(null)
    form.resetFields()
    form.setFieldsValue({ type: 'system', priority: 'medium', is_published: false })
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: Announcement) => {
    setEditingAnnouncement(record)
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
        handleApiError(result.errorMessage, 'Announcements-删除')
        return
      }
      message.success('删除成功')
      loadData()
    } catch (error) {
      handleApiError(error, 'Announcements-删除')
    }
  }

  // 切换发布状态
  const handleTogglePublish = async (record: Announcement) => {
    try {
      const updateData: Partial<Announcement> = {
        is_published: !record.is_published,
      }
      if (!record.is_published) {
        updateData.publish_at = new Date().toISOString()
      }
      const result = await service.update(record.id, updateData)
      if (!result.success) {
        handleApiError(result.errorMessage, 'Announcements-切换状态')
        return
      }
      message.success(`公告已${!record.is_published ? '发布' : '撤回'}`)
      loadData()
    } catch (error) {
      handleApiError(error, 'Announcements-切换状态')
    }
  }

  // 保存记录
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      // 格式化 expire_at
      values.expire_at = values.expire_at?.format('YYYY-MM-DD HH:mm:ss') || null
      // 如果发布且没有 publish_at，自动设置
      if (values.is_published && !values.publish_at) {
        values.publish_at = new Date().toISOString()
      }
      if (editingAnnouncement) {
        const result = await service.update(editingAnnouncement.id, values)
        if (!result.success) {
          handleApiError(result.errorMessage, 'Announcements-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await service.create({
          ...values,
          created_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'Announcements-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingAnnouncement(null)
      form.resetFields()
      loadData()
    } catch (error) {
      handleApiError(error, 'Announcements-保存')
    }
  }

  // 表格列定义
  const columns: ColumnsType<Announcement> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <Text strong>{title}</Text>,
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Paragraph ellipsis={{ rows: 1 }} style={{ marginBottom: 0 }}>
          {content}
        </Paragraph>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const map: Record<string, { color: string; label: string }> = {
          system: { color: 'blue', label: '系统' },
          activity: { color: 'green', label: '活动' },
          maintenance: { color: 'orange', label: '维护' },
        }
        const info = map[type] || { color: 'default', label: type }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => {
        const info = PRIORITY_MAP[priority] || { color: 'default', label: priority || '中' }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '发布状态',
      dataIndex: 'is_published',
      key: 'is_published',
      width: 100,
      render: (isPublished: boolean, record: Announcement) => (
        <Switch
          checked={isPublished}
          onChange={() => handleTogglePublish(record)}
          checkedChildren="已发布"
          unCheckedChildren="未发布"
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
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
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索标题/内容"
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
          新增公告
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={announcements}
        rowKey="id"
        loading={loading}
        pagination={tablePagination}
        scroll={{ x: 'max-content' }}
      />

      {/* 表单弹窗 */}
      <Modal
        title={editingAnnouncement ? '编辑公告' : '新增公告'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingAnnouncement(null)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea rows={6} placeholder="请输入内容" />
          </Form.Item>
          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select
              placeholder="请选择类型"
              options={[
                { label: '系统', value: 'system' },
                { label: '活动', value: 'activity' },
                { label: '维护', value: 'maintenance' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select
              placeholder="请选择优先级"
              options={[
                { label: '高', value: 'high' },
                { label: '中', value: 'medium' },
                { label: '低', value: 'low' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="expire_at"
            label="过期时间"
          >
            <DatePicker
              showTime
              placeholder="请选择过期时间（可选）"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="is_published"
            label="立即发布"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Announcements
