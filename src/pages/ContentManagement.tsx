import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Tag, Space, message, Switch,
  Popconfirm, Tooltip, Card
} from 'antd'
import {
  PlusOutlined, EditOutlined, ReloadOutlined, StopOutlined,
  SearchOutlined, FileTextOutlined
} from '@ant-design/icons'
import { supabase } from '../utils/supabase'
import dayjs from 'dayjs'
import type { ContentPage, ContentPageFormData } from '../types/content'

// 动态导入 react-quill 以避免 SSR 问题
const ReactQuill = React.lazy(() => import('react-quill'))

// 导入 react-quill 样式
import 'react-quill/dist/quill.snow.css'

const ContentManagement: React.FC = () => {
  const [pages, setPages] = useState<ContentPage[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ContentPage | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [form] = Form.useForm()

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('content_pages')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        message.error('加载内容列表失败: ' + error.message)
      } else {
        setPages(data || [])
      }
    } catch (err) {
      message.error('加载内容列表失败')
    }
    setLoading(false)
  }

  const handleTogglePublish = async (record: ContentPage) => {
    try {
      const { error } = await supabase
        .from('content_pages')
        .update({ is_published: !record.is_published, updated_at: new Date().toISOString() })
        .eq('id', record.id)

      if (error) throw error
      message.success(`已${record.is_published ? '取消发布' : '发布'}「${record.title}」`)
      fetchPages()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误'
      message.error(`操作失败: ${msg}`)
    }
  }

  const handleEdit = (record: ContentPage) => {
    setEditingRecord(record)
    form.setFieldsValue({
      key: record.key,
      title: record.title,
      content: record.content || '',
      is_published: record.is_published,
    })
    setModalOpen(true)
  }

  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({
      is_published: false,
      content: '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: ContentPageFormData) => {
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      
      if (editingRecord) {
        // 更新
        const { error } = await supabase
          .from('content_pages')
          .update({
            title: values.title,
            content: values.content,
            is_published: values.is_published,
            updated_at: now,
          })
          .eq('id', editingRecord.id)

        if (error) throw error
        message.success('更新成功')
      } else {
        // 新增
        const { error } = await supabase
          .from('content_pages')
          .insert({
            key: values.key,
            title: values.title,
            content: values.content,
            is_published: values.is_published,
            created_at: now,
            updated_at: now,
          })

        if (error) throw error
        message.success('新增成功')
      }

      setModalOpen(false)
      form.resetFields()
      setEditingRecord(null)
      fetchPages()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误'
      message.error(`${editingRecord ? '更新' : '新增'}失败: ${msg}`)
    }
    setSubmitting(false)
  }

  const handleDelete = async (record: ContentPage) => {
    try {
      const { error } = await supabase
        .from('content_pages')
        .delete()
        .eq('id', record.id)

      if (error) throw error
      message.success('删除成功')
      fetchPages()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误'
      message.error(`删除失败: ${msg}`)
    }
  }

  // 富文本编辑器配置
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image'],
      ['clean']
    ],
  }

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'align',
    'list', 'bullet',
    'indent',
    'link', 'image'
  ]

  // 过滤数据
  const filteredPages = pages.filter(page => {
    if (!searchKeyword) return true
    const keyword = searchKeyword.toLowerCase()
    return (
      page.key.toLowerCase().includes(keyword) ||
      page.title.toLowerCase().includes(keyword)
    )
  })

  const columns = [
    {
      title: '标识键',
      dataIndex: 'key',
      key: 'key',
      width: 150,
      render: (v: string) => (
        <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: '发布状态',
      dataIndex: 'is_published',
      key: 'is_published',
      width: 120,
      render: (isPublished: boolean, record: ContentPage) => (
        <Switch
          checked={isPublished}
          checkedChildren="已发布"
          unCheckedChildren="未发布"
          onChange={() => handleTogglePublish(record)}
        />
      ),
    },
    {
      title: '内容摘要',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string | null) => {
        if (!content) return '-'
        // 去除 HTML 标签后显示纯文本摘要
        const textContent = content.replace(/<[^>]*>/g, '')
        return textContent.length > 60 ? textContent.substring(0, 60) + '...' : textContent
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: ContentPage) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              size="small"
              type="primary"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description={`确定要删除「${record.title}」吗？此操作不可恢复。`}
            onConfirm={() => handleDelete(record)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button size="small" danger icon={<StopOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <FileTextOutlined style={{ fontSize: 20, color: '#6C63FF' }} />
            <span style={{ fontSize: 16, fontWeight: 500 }}>内容管理</span>
            <span style={{ color: '#999', fontSize: 14 }}>
              管理关于我们、隐私政策、用户协议等富文本内容
            </span>
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchPages}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新增内容
            </Button>
          </Space>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="搜索标识键或标题"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={filteredPages}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1000 }}
      />

      <Modal
        title={editingRecord ? '编辑内容' : '新增内容'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
          setEditingRecord(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={900}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="key"
            label="标识键 (key)"
            rules={[
              { required: true, message: '请输入标识键' },
              { pattern: /^[a-z_]+$/, message: '只能使用小写字母和下划线' }
            ]}
            extra="唯一标识，创建后不可修改。建议使用 about, privacy, terms 等"
          >
            <Input
              placeholder="例如: about, privacy, terms"
              disabled={!!editingRecord}
            />
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="例如: 关于我们, 隐私政策" />
          </Form.Item>
          <Form.Item
            name="is_published"
            label="发布状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="已发布" unCheckedChildren="未发布" />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <React.Suspense fallback={<div style={{ padding: 20, textAlign: 'center' }}>加载编辑器中...</div>}>
              <ReactQuill
                theme="snow"
                modules={quillModules}
                formats={quillFormats}
                style={{ height: 300, marginBottom: 40 }}
                placeholder="请输入富文本内容..."
              />
            </React.Suspense>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ContentManagement
