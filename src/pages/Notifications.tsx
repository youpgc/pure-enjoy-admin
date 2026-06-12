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
  Select,
  Popconfirm,
  Badge,
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
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { getActionColumn } from '../components/ActionColumn'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'

const { Text } = Typography

// ==================== 类型定义 ====================

interface Notification {
  id: string
  title: string
  body: string
  type: 'system' | 'user' | 'novel' | 'activity'
  user_id?: string | null
  icon?: string
  color?: string
  payload?: Record<string, any>
  is_read: boolean
  read_at?: string
  created_at: string
}

interface NotificationFilters {
  keyword: string
  type: string | undefined
}

// ==================== 组件 ====================

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [filters, setFilters] = useState<NotificationFilters>({
    keyword: '',
    type: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null)
  const [form] = Form.useForm()
  const { isAdmin: _isAdmin } = usePermission()

  const notificationService = new BaseService<Notification>('notifications', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载通知列表
  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const result = await notificationService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`title.ilike.%${filters.keyword}%,body.ilike.%${filters.keyword}%`)
        }
        if (filters.type) {
          query = query.eq('type', filters.type)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'Notifications-加载通知')
        return
      }

      setNotifications(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'Notifications-加载通知')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // 搜索
  const handleSearch = () => {
    resetPage()
    loadNotifications()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      type: undefined,
    })
    resetPage()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingNotification(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: Notification) => {
    setEditingNotification(record)
    form.setFieldsValue({
      ...record,
    })
    setModalVisible(true)
  }

  // 删除通知
  const handleDelete = async (id: string) => {
    try {
      const result = await notificationService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'Notifications-删除')
        return
      }
      message.success('删除成功')
      loadNotifications()
    } catch (error) {
      handleApiError(error, 'Notifications-删除')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的通知')
      return
    }
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) {
        handleApiError(error, 'Notifications-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 条通知`)
      setSelectedRowKeys([])
      loadNotifications()
    } catch (error) {
      handleApiError(error, 'Notifications-批量删除')
    }
  }

  // 保存通知
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      // payload 字符串转对象
      if (values.payload && typeof values.payload === 'string') {
        try {
          values.payload = JSON.parse(values.payload)
        } catch (e) {
          message.error('附加数据格式错误，请输入有效JSON')
          return
        }
      }
      if (editingNotification) {
        const result = await notificationService.update(editingNotification.id, {
          ...values,
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'Notifications-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await notificationService.create({
          ...values,
          is_read: false,
          created_at: new Date().toISOString(),
        } as any)
        if (!result.success) {
          handleApiError(result.errorMessage, 'Notifications-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingNotification(null)
      form.resetFields()
      loadNotifications()
    } catch (error) {
      handleApiError(error, 'Notifications-保存')
    }
  }

  // 表格列定义
  const columns: ColumnsType<Notification> = [
    {
      title: '通知信息',
      key: 'info',
      width: 300,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.title}</div>
          <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
            {record.body}
          </Text>
          <div>
            <Tag>{record.type}</Tag>
            {record.user_id && <Tag color="green">指定用户</Tag>}
            {!record.user_id && <Tag color="blue">全局通知</Tag>}
          </div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, { color: string; label: string }> = {
          system: { color: 'blue', label: '系统' },
          user: { color: 'green', label: '用户' },
          novel: { color: 'purple', label: '小说' },
          activity: { color: 'orange', label: '活动' },
        }
        const info = typeMap[type] || { color: 'default', label: type }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '已读',
      dataIndex: 'is_read',
      key: 'is_read',
      width: 80,
      render: (isRead: boolean) => (
        <Badge status={isRead ? 'success' : 'processing'} text={isRead ? '已读' : '未读'} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '阅读时间',
      dataIndex: 'read_at',
      key: 'read_at',
      width: 170,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    getActionColumn<Notification>(
      (record) => [
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          type: 'primary',
          onClick: () => handleEdit(record),
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        },
      ],
      { width: 200, maxVisible: 2 }
    ),
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="请输入标题或内容关键词"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="类型"
            value={filters.type}
            onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '系统', value: 'system' },
              { label: '用户', value: 'user' },
              { label: '小说', value: 'novel' },
              { label: '活动', value: 'activity' },
            ]}
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
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增通知
          </Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title="确认批量删除"
              description={`确定要删除选中的 ${selectedRowKeys.length} 条通知吗？`}
              onConfirm={handleBatchDelete}
              okText="确认"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadNotifications} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 通知表格 */}
      <Table
        columns={columns}
        dataSource={notifications}
        rowKey="id"
        loading={loading}
        pagination={tablePagination}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 'max-content' }}
      />

      {/* 通知表单弹窗 */}
      <Modal
        title={editingNotification ? '编辑通知' : '新增通知'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingNotification(null)
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
            name="body"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入内容" />
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
                { label: '用户', value: 'user' },
                { label: '小说', value: 'novel' },
                { label: '活动', value: 'activity' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="user_id"
            label="目标用户ID"
            tooltip="留空表示全局通知，发送给所有用户"
          >
            <Input placeholder="留空表示全局通知" allowClear />
          </Form.Item>
          <Form.Item
            name="icon"
            label="图标"
          >
            <Input placeholder="请输入图标名称（可选）" />
          </Form.Item>
          <Form.Item
            name="color"
            label="颜色"
          >
            <Input placeholder="请输入颜色值（可选，如 #1890ff）" />
          </Form.Item>
          <Form.Item
            name="payload"
            label="附加数据 (JSON)"
            tooltip="JSON格式的附加数据（可选）"
          >
            <Input.TextArea rows={3} placeholder='{"key": "value"}' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Notifications
