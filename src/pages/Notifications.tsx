import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, Table, Select, Button, Tag, Space, Spin, Empty, Tooltip, message, Modal, Form, Input, Popconfirm, Radio } from 'antd'
import { ReloadOutlined, DeleteOutlined, PlusOutlined, BellOutlined, CheckCircleOutlined, EyeOutlined, EyeInvisibleOutlined, SoundOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePagination } from '../hooks/usePagination'
import { useDictOptions, useDictColors } from '../hooks/useDictOptions'

// ==================== 类型定义 ====================

interface NotificationItem {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  icon: string
  color: string
  payload: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

interface UserOption {
  value: string
  label: string
}

// ==================== 常量定义 ====================

const TYPE_OPTIONS_FALLBACK = [
  { label: '系统通知', value: 'system' },
  { label: '版本更新', value: 'version_update' },
  { label: '提醒', value: 'reminder' },
  { label: '习惯', value: 'habit' },
  { label: '小说', value: 'novel' },
  { label: '消费', value: 'expense' },
]

const READ_STATUS_OPTIONS = [
  { label: '未读', value: 'unread' },
  { label: '已读', value: 'read' },
]

// ==================== 主组件 ====================

const Notifications: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [filterType, setFilterType] = useState<string | undefined>(undefined)
  const [filterReadStatus, setFilterReadStatus] = useState<string | undefined>(undefined)
  const { currentPage, pageSize, paginate, resetPage, setCurrentPage, setPageSize } = usePagination()

  // 字典查询
  const { options: typeOptions } = useDictOptions('notification_type', TYPE_OPTIONS_FALLBACK)
  const { getColor: getTypeColor } = useDictColors('notification_type')

  // 发送通知弹窗
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [sendMode, setSendMode] = useState<'notification' | 'announcement'>('notification')
  const [form] = Form.useForm()

  // ==================== 数据加载 ====================

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) {
        console.error('加载通知失败:', error)
        message.error(`加载通知失败: ${error.message}`)
        setNotifications([])
        return
      }

      setNotifications((data as NotificationItem[]) || [])
    } catch (err) {
      console.error('加载通知异常:', err)
      message.error('加载通知异常，请稍后重试')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, nickname')
        .order('nickname', { ascending: true })

      if (error) throw error

      setUserOptions(
        (data || []).map((u: any) => ({
          value: u.id,
          label: u.nickname || u.id,
        }))
      )
    } catch (err) {
      console.error('加载用户列表失败:', err)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // ==================== 筛选逻辑 ====================

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (filterType && item.type !== filterType) return false
      if (filterReadStatus === 'read' && !item.is_read) return false
      if (filterReadStatus === 'unread' && item.is_read) return false
      return true
    })
  }, [notifications, filterType, filterReadStatus])

  const paginatedNotifications = useMemo(() => paginate(filteredNotifications), [filteredNotifications, currentPage, pageSize, paginate])

  // ==================== 操作处理 ====================

  // 标记已读/未读
  const handleToggleRead = async (record: NotificationItem) => {
    const newReadStatus = !record.is_read
    try {
      const updateData: any = {
        is_read: newReadStatus,
      }
      if (newReadStatus) {
        updateData.read_at = new Date().toISOString()
      } else {
        updateData.read_at = null
      }

      const { error } = await supabase
        .from('notifications')
        .update(updateData)
        .eq('id', record.id)

      if (error) throw error

      message.success(newReadStatus ? '已标记为已读' : '已标记为未读')
      fetchNotifications()
    } catch (err) {
      console.error('操作失败:', err)
      message.error('操作失败')
    }
  }

  // 批量标记已读
  const handleMarkAllRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false)

      if (error) throw error

      message.success('已全部标记为已读')
      fetchNotifications()
    } catch (err) {
      console.error('批量标记失败:', err)
      message.error('批量标记失败')
    }
  }

  // 删除通知
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) throw error

      message.success('删除成功')
      fetchNotifications()
    } catch (err) {
      console.error('删除失败:', err)
      message.error('删除失败')
    }
  }

  // 发送通知/公告
  const handleSendNotification = async () => {
    try {
      const values = await form.validateFields()
      setSendLoading(true)

      if (sendMode === 'announcement') {
        // 发送公告：插入 announcements 表，user_id 为 null 表示所有用户
        const { error } = await supabase
          .from('announcements')
          .insert({
            title: values.title,
            content: values.body,
            type: '系统公告',
            priority: '高',
            is_published: true,
            publish_at: new Date().toISOString(),
          })

        if (error) throw error
        message.success('公告发送成功，所有用户可见')
      } else {
        // 发送普通通知
        const insertData: any = {
          title: values.title,
          body: values.body,
          type: values.type,
          is_read: false,
        }

        if (values.user_id === 'all') {
          // 发送给所有用户：先查询所有用户，然后逐个插入
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id')

          if (usersError) throw usersError

          const records = (users || []).map((u: any) => ({
            ...insertData,
            user_id: u.id,
          }))

          const { error } = await supabase
            .from('notifications')
            .insert(records)

          if (error) throw error

          message.success(`已向 ${records.length} 位用户发送通知`)
        } else {
          insertData.user_id = values.user_id
          const { error } = await supabase
            .from('notifications')
            .insert(insertData)

          if (error) throw error

          message.success('通知发送成功')
        }
      }

      setSendModalOpen(false)
      form.resetFields()
      fetchNotifications()
    } catch (err: any) {
      if (err.errorFields) return // 表单校验失败，不提示
      console.error('发送失败:', err)
      message.error('发送失败')
    } finally {
      setSendLoading(false)
    }
  }

  // 重置筛选
  const handleReset = () => {
    setFilterType(undefined)
    setFilterReadStatus(undefined)
    resetPage()
  }

  // 打开发送弹窗时加载用户列表
  const handleOpenSendModal = () => {
    if (userOptions.length === 0) {
      fetchUsers()
    }
    setSendMode('notification')
    form.resetFields()
    setSendModalOpen(true)
  }

  // ==================== 表格列定义 ====================

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (title: string, record: NotificationItem) => (
        <Tooltip title={title}>
          <Space>
            {!record.is_read && (
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#ff4d4f',
                }}
              />
            )}
            <span style={{ fontWeight: record.is_read ? 'normal' : 600 }}>
              {title || '-'}
            </span>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const dictOpt = typeOptions.find(opt => opt.value === type)
        return <Tag color={getTypeColor(type) || 'default'}>{dictOpt?.label || type || '-'}</Tag>
      },
    },
    {
      title: '内容',
      dataIndex: 'body',
      key: 'body',
      ellipsis: true,
      width: 280,
      render: (body: string) => (
        <Tooltip title={body}>
          <span>{body || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_read',
      key: 'is_read',
      width: 80,
      render: (isRead: boolean) => (
        isRead ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>已读</Tag>
        ) : (
          <Tag color="orange" icon={<BellOutlined />}>未读</Tag>
        )
      ),
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      sorter: (a: NotificationItem, b: NotificationItem) =>
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: NotificationItem) => (
        <Space size="small">
          <Tooltip title={record.is_read ? '标记为未读' : '标记为已读'}>
            <Button
              type="text"
              size="small"
              icon={record.is_read ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => handleToggleRead(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条通知吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ==================== 渲染 ====================

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载通知..." />
      </div>
    )
  }

  return (
    <div>
      {/* 筛选栏 */}
      <Card style={{ borderRadius: 8, marginBottom: 16 }}>
        <Space wrap style={{ width: '100%' }} size="middle">
          <Select
            placeholder="通知类型"
            value={filterType}
            onChange={(val) => { setFilterType(val); setCurrentPage(1) }}
            options={typeOptions}
            style={{ width: 140 }}
            allowClear
          />
          <Select
            placeholder="阅读状态"
            value={filterReadStatus}
            onChange={(val) => { setFilterReadStatus(val); setCurrentPage(1) }}
            options={READ_STATUS_OPTIONS}
            style={{ width: 120 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchNotifications}>
            刷新
          </Button>
          <Popconfirm
            title="确认操作"
            description="确定要将所有未读通知标记为已读吗？"
            onConfirm={handleMarkAllRead}
            okText="确认"
            cancelText="取消"
          >
            <Button type="primary" ghost icon={<CheckCircleOutlined />}>
              全部已读
            </Button>
          </Popconfirm>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenSendModal}>
            发送通知
          </Button>
          <Button type="primary" icon={<SoundOutlined />} onClick={() => {
            if (userOptions.length === 0) fetchUsers()
            setSendMode('announcement')
            form.resetFields()
            setSendModalOpen(true)
          }}>
            发送公告
          </Button>
        </Space>
        <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 13 }}>
          共 {filteredNotifications.length} 条通知
          {notifications.filter((n) => !n.is_read).length > 0 && (
            <span style={{ marginLeft: 12, color: '#ff4d4f' }}>
              {notifications.filter((n) => !n.is_read).length} 条未读
            </span>
          )}
        </div>
      </Card>

      {/* 通知列表 */}
      <Card style={{ borderRadius: 8 }}>
        <Table
          dataSource={paginatedNotifications}
          columns={columns}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total: filteredNotifications.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page)
              setPageSize(size)
            },
          }}
          scroll={{ x: 1000 }}
          size="middle"
          locale={{
            emptyText: <Empty description="暂无通知" />,
          }}
        />
      </Card>

      {/* 发送通知/公告弹窗 */}
      <Modal
        title={sendMode === 'announcement' ? '发送公告' : '发送新通知'}
        open={sendModalOpen}
        onCancel={() => {
          setSendModalOpen(false)
          form.resetFields()
        }}
        onOk={handleSendNotification}
        okText="发送"
        cancelText="取消"
        confirmLoading={sendLoading}
        width={520}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item label="发送模式" style={{ marginBottom: 16 }}>
            <Radio.Group
              value={sendMode}
              onChange={(e) => {
                setSendMode(e.target.value)
                form.resetFields()
              }}
            >
              <Radio.Button value="notification">普通通知</Radio.Button>
              <Radio.Button value="announcement">公告</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入标题" maxLength={100} />
          </Form.Item>
          <Form.Item
            name="body"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea
              placeholder="请输入内容"
              rows={4}
              maxLength={1000}
              showCount
            />
          </Form.Item>

          {sendMode === 'notification' && (
            <>
              <Form.Item
                name="type"
                label="类型"
                rules={[{ required: true, message: '请选择通知类型' }]}
              >
                <Select placeholder="请选择通知类型" options={typeOptions} />
              </Form.Item>
              <Form.Item
                name="user_id"
                label="目标用户"
                rules={[{ required: true, message: '请选择目标用户' }]}
              >
                <Select
                  placeholder="请选择目标用户"
                  showSearch
                  optionFilterProp="label"
                  options={[
                    { value: 'all', label: '所有用户' },
                    ...userOptions,
                  ]}
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </>
          )}

          {sendMode === 'announcement' && (
            <Form.Item>
              <div style={{ color: '#8c8c8c', fontSize: 13 }}>
                公告将发送给所有用户，并在公告管理页面中显示。
              </div>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default Notifications
