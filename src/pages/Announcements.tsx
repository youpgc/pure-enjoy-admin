import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag, Space,
  message, Popconfirm, Tooltip, Empty, Spin, DatePicker
} from 'antd'
import {
  ReloadOutlined, DeleteOutlined, PlusOutlined, EditOutlined,
  CheckCircleOutlined, StopOutlined, EyeOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePagination } from '../hooks/usePagination'
import { useDictOptions } from '../hooks/useDictOptions'

// ==================== 类型定义 ====================

interface Announcement {
  id: string
  title: string
  content: string
  type: '系统公告' | '活动通知' | '版本更新'
  priority: '高' | '中' | '低'
  is_published: boolean
  publish_at: string | null
  expire_at: string | null
  created_at: string
}

// ==================== 常量定义 ====================

const TYPE_OPTIONS_FALLBACK = [
  { label: '系统公告', value: '系统公告' },
  { label: '活动通知', value: '活动通知' },
  { label: '版本更新', value: '版本更新' },
]

const PRIORITY_OPTIONS_FALLBACK = [
  { label: '高', value: '高' },
  { label: '中', value: '中' },
  { label: '低', value: '低' },
]

const TYPE_COLOR_MAP: Record<string, string> = {
  '系统公告': 'blue',
  '活动通知': 'purple',
  '版本更新': 'green',
}

const PRIORITY_COLOR_MAP: Record<string, string> = {
  '高': 'red',
  '中': 'orange',
  '低': 'default',
}

// ==================== 主组件 ====================

const Announcements: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [filterType, setFilterType] = useState<string | undefined>(undefined)
  const [filterPriority, setFilterPriority] = useState<string | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const { currentPage, pageSize, paginate, resetPage, setCurrentPage, setPageSize } = usePagination()
  const { options: typeOptions } = useDictOptions('announcement_type', TYPE_OPTIONS_FALLBACK)
  const { options: priorityOptions } = useDictOptions('priority_level', PRIORITY_OPTIONS_FALLBACK)

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Announcement | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<Announcement | null>(null)
  const [form] = Form.useForm()

  // ==================== 数据加载 ====================

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) {
        console.error('加载公告失败:', error)
        message.error(`加载公告失败: ${error.message}`)
        setAnnouncements([])
        return
      }

      setAnnouncements((data as Announcement[]) || [])
    } catch (err) {
      console.error('加载公告异常:', err)
      message.error('加载公告异常，请稍后重试')
      setAnnouncements([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  // ==================== 筛选逻辑 ====================

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      if (filterType && item.type !== filterType) return false
      if (filterPriority && item.priority !== filterPriority) return false
      if (filterStatus === 'published' && !item.is_published) return false
      if (filterStatus === 'unpublished' && item.is_published) return false
      return true
    })
  }, [announcements, filterType, filterPriority, filterStatus])

  const paginatedAnnouncements = useMemo(() => paginate(filteredAnnouncements), [filteredAnnouncements, currentPage, pageSize, paginate])

  // ==================== 操作处理 ====================

  // 新增/编辑提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setModalLoading(true)

      const submitData: any = {
        title: values.title,
        content: values.content,
        type: values.type,
        priority: values.priority,
        publish_at: values.publish_at ? values.publish_at.toISOString() : null,
        expire_at: values.expire_at ? values.expire_at.toISOString() : null,
      }

      if (editingRecord) {
        // 编辑
        const { error } = await supabase
          .from('announcements')
          .update(submitData)
          .eq('id', editingRecord.id)

        if (error) throw error
        message.success('公告更新成功')
      } else {
        // 新增
        submitData.is_published = false
        const { error } = await supabase
          .from('announcements')
          .insert(submitData)

        if (error) throw error
        message.success('公告创建成功')
      }

      setModalOpen(false)
      form.resetFields()
      setEditingRecord(null)
      fetchAnnouncements()
    } catch (err: any) {
      if (err.errorFields) return
      console.error('保存公告失败:', err)
      message.error('保存公告失败')
    } finally {
      setModalLoading(false)
    }
  }

  // 删除
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

      if (error) throw error

      message.success('删除成功')
      fetchAnnouncements()
    } catch (err) {
      console.error('删除失败:', err)
      message.error('删除失败')
    }
  }

  // 发布
  const handlePublish = async (record: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          is_published: true,
          publish_at: new Date().toISOString(),
        })
        .eq('id', record.id)

      if (error) throw error

      message.success('公告已发布')
      fetchAnnouncements()
    } catch (err) {
      console.error('发布失败:', err)
      message.error('发布失败')
    }
  }

  // 下架
  const handleUnpublish = async (record: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_published: false })
        .eq('id', record.id)

      if (error) throw error

      message.success('公告已下架')
      fetchAnnouncements()
    } catch (err) {
      console.error('下架失败:', err)
      message.error('下架失败')
    }
  }

  // 打开新增弹窗
  const handleOpenAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    setModalOpen(true)
  }

  // 打开编辑弹窗
  const handleOpenEdit = (record: Announcement) => {
    setEditingRecord(record)
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      type: record.type,
      priority: record.priority,
      publish_at: record.publish_at ? dayjs(record.publish_at) : null,
      expire_at: record.expire_at ? dayjs(record.expire_at) : null,
    })
    setModalOpen(true)
  }

  // 打开详情
  const handleOpenDetail = (record: Announcement) => {
    setDetailRecord(record)
    setDetailOpen(true)
  }

  // 重置筛选
  const handleReset = () => {
    setFilterType(undefined)
    setFilterPriority(undefined)
    setFilterStatus(undefined)
    resetPage()
  }

  // ==================== 表格列定义 ====================

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 220,
      ellipsis: true,
      render: (title: string, record: Announcement) => (
        <Tooltip title={title}>
          <Space>
            {record.is_published && (
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#52c41a',
                }}
              />
            )}
            <span style={{ fontWeight: record.is_published ? 600 : 'normal' }}>
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
      render: (type: string) => (
        <Tag color={TYPE_COLOR_MAP[type] || 'default'}>{type || '-'}</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => (
        <Tag color={PRIORITY_COLOR_MAP[priority] || 'default'}>{priority || '-'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_published',
      key: 'is_published',
      width: 90,
      render: (isPublished: boolean) => (
        isPublished ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>已发布</Tag>
        ) : (
          <Tag color="default" icon={<StopOutlined />}>未发布</Tag>
        )
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publish_at',
      key: 'publish_at',
      width: 170,
      render: (date: string | null) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '过期时间',
      dataIndex: 'expire_at',
      key: 'expire_at',
      width: 170,
      render: (date: string | null) => {
        if (!date) return '-'
        const isExpired = dayjs(date).isBefore(dayjs())
        return (
          <span style={{ color: isExpired ? '#ff4d4f' : 'inherit' }}>
            {dayjs(date).format('YYYY-MM-DD HH:mm:ss')}
            {isExpired && <Tag color="red" style={{ marginLeft: 4 }}>已过期</Tag>}
          </span>
        )
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      sorter: (a: Announcement, b: Announcement) =>
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right' as const,
      render: (_: any, record: Announcement) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenDetail(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          {record.is_published ? (
            <Popconfirm
              title="确认下架"
              description="确定要下架这条公告吗？"
              onConfirm={() => handleUnpublish(record)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<StopOutlined />}
              >
                下架
              </Button>
            </Popconfirm>
          ) : (
            <Button
              type="text"
              size="small"
              style={{ color: '#52c41a' }}
              icon={<CheckCircleOutlined />}
              onClick={() => handlePublish(record)}
            >
              发布
            </Button>
          )}
          <Popconfirm
            title="确认删除"
            description="确定要删除这条公告吗？删除后不可恢复。"
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
        <Spin size="large" tip="加载公告..." />
      </div>
    )
  }

  return (
    <div>
      {/* 筛选栏 */}
      <Card style={{ borderRadius: 8, marginBottom: 16 }}>
        <Space wrap style={{ width: '100%' }} size="middle">
          <Select
            placeholder="公告类型"
            value={filterType}
            onChange={(val) => { setFilterType(val); setCurrentPage(1) }}
            options={typeOptions}
            style={{ width: 140 }}
            allowClear
          />
          <Select
            placeholder="优先级"
            value={filterPriority}
            onChange={(val) => { setFilterPriority(val); setCurrentPage(1) }}
            options={priorityOptions}
            style={{ width: 120 }}
            allowClear
          />
          <Select
            placeholder="发布状态"
            value={filterStatus}
            onChange={(val) => { setFilterStatus(val); setCurrentPage(1) }}
            options={[
              { label: '已发布', value: 'published' },
              { label: '未发布', value: 'unpublished' },
            ]}
            style={{ width: 120 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchAnnouncements}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            新增公告
          </Button>
        </Space>
        <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 13 }}>
          共 {filteredAnnouncements.length} 条公告
          {announcements.filter((a) => a.is_published).length > 0 && (
            <span style={{ marginLeft: 12, color: '#52c41a' }}>
              {announcements.filter((a) => a.is_published).length} 条已发布
            </span>
          )}
        </div>
      </Card>

      {/* 公告列表 */}
      <Card style={{ borderRadius: 8 }}>
        <Table
          dataSource={paginatedAnnouncements}
          columns={columns}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total: filteredAnnouncements.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page)
              setPageSize(size)
            },
          }}
          scroll={{ x: 1200 }}
          size="middle"
          locale={{
            emptyText: <Empty description="暂无公告" />,
          }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingRecord ? '编辑公告' : '新增公告'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
          setEditingRecord(null)
        }}
        onOk={handleSubmit}
        okText={editingRecord ? '保存' : '创建'}
        cancelText="取消"
        confirmLoading={modalLoading}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入公告标题' }]}
          >
            <Input placeholder="请输入公告标题" maxLength={200} showCount />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入公告内容' }]}
          >
            <Input.TextArea
              placeholder="请输入公告内容"
              rows={6}
              maxLength={5000}
              showCount
            />
          </Form.Item>
          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择公告类型' }]}
          >
            <Select placeholder="请选择公告类型" options={typeOptions} />
          </Form.Item>
          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select placeholder="请选择优先级" options={priorityOptions} />
          </Form.Item>
          <Form.Item
            name="publish_at"
            label="定时发布时间"
            extra="留空则手动控制发布"
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="选择定时发布时间"
              format="YYYY-MM-DD HH:mm:ss"
            />
          </Form.Item>
          <Form.Item
            name="expire_at"
            label="过期时间"
            extra="留空则永不过期"
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="选择过期时间"
              format="YYYY-MM-DD HH:mm:ss"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="公告详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={600}
      >
        {detailRecord && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>标题</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{detailRecord.title}</div>
            </div>
            <Space style={{ marginBottom: 16 }} size="large">
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>类型</div>
                <Tag color={TYPE_COLOR_MAP[detailRecord.type]}>{detailRecord.type}</Tag>
              </div>
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>优先级</div>
                <Tag color={PRIORITY_COLOR_MAP[detailRecord.priority]}>{detailRecord.priority}</Tag>
              </div>
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>状态</div>
                {detailRecord.is_published ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>已发布</Tag>
                ) : (
                  <Tag color="default" icon={<StopOutlined />}>未发布</Tag>
                )}
              </div>
            </Space>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>内容</div>
              <div
                style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}
              >
                {detailRecord.content}
              </div>
            </div>
            <Space style={{ marginBottom: 8 }} size="large">
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>发布时间</div>
                <div>{detailRecord.publish_at ? dayjs(detailRecord.publish_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>
              </div>
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>过期时间</div>
                <div>
                  {detailRecord.expire_at
                    ? dayjs(detailRecord.expire_at).format('YYYY-MM-DD HH:mm:ss')
                    : '永不过期'}
                </div>
              </div>
            </Space>
            <div style={{ marginTop: 16 }}>
              <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>创建时间</div>
              <div>{dayjs(detailRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Announcements
