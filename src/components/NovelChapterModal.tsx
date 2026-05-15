import React, { useState, useCallback, useEffect } from 'react'
import {
  Modal,
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Form,
  Input,
  InputNumber,
  Switch,
  Typography,
  Empty,
  Spin,
  Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ImportOutlined,
} from '@ant-design/icons'
import type { NovelRecord } from '../pages/NovelManagement'
import { supabase } from '../utils/supabase'

const { Title, Text } = Typography
const { TextArea } = Input

// ==================== 类型定义 ====================

interface ChapterRecord {
  id: string
  key: string
  novel_id: string
  chapter_num: number
  title: string
  content: string
  word_count: number
  is_free: boolean
  price: number
  created_at: string
}

interface NovelChapterModalProps {
  open: boolean
  novel: NovelRecord | null
  onClose: () => void
}

// ==================== 主组件 ====================

const NovelChapterModal: React.FC<NovelChapterModalProps> = ({
  open,
  novel,
  onClose,
}) => {
  const [loading, setLoading] = useState(false)
  const [chapters, setChapters] = useState<ChapterRecord[]>([])
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create')
  const [editingChapter, setEditingChapter] = useState<ChapterRecord | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [form] = Form.useForm()

  // 加载章节列表
  const fetchChapters = useCallback(async () => {
    if (!novel) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('novel_chapters')
        .select('*')
        .eq('novel_id', novel.id)
        .order('chapter_num', { ascending: true })

      if (error) throw error

      const records: ChapterRecord[] = (data || []).map((chapter) => ({
        ...chapter,
        key: chapter.id,
      }))

      setChapters(records)
    } catch (error) {
      console.error('获取章节列表失败:', error)
      message.error('获取章节列表失败')
    } finally {
      setLoading(false)
    }
  }, [novel])

  useEffect(() => {
    if (open && novel) {
      fetchChapters()
    }
  }, [open, novel, fetchChapters])

  // 新增章节
  const handleCreate = useCallback(() => {
    const nextChapterNum = chapters.length > 0
      ? Math.max(...chapters.map(c => c.chapter_num)) + 1
      : 1

    setEditMode('create')
    setEditingChapter(null)
    form.resetFields()
    form.setFieldsValue({
      chapter_num: nextChapterNum,
      is_free: true,
      price: 0,
    })
    setEditModalOpen(true)
  }, [chapters, form])

  // 编辑章节
  const handleEdit = useCallback((record: ChapterRecord) => {
    setEditMode('edit')
    setEditingChapter(record)
    form.setFieldsValue({
      chapter_num: record.chapter_num,
      title: record.title,
      content: record.content,
      word_count: record.word_count,
      is_free: record.is_free,
      price: record.price,
    })
    setEditModalOpen(true)
  }, [form])

  // 删除章节
  const handleDelete = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('novel_chapters')
        .delete()
        .eq('id', id)

      if (error) throw error

      setChapters((prev) => prev.filter((item) => item.id !== id))
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }, [])

  // 提交表单
  const handleFormSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields()

      if (!novel) return

      setConfirmLoading(true)

      // 计算字数
      const wordCount = values.content ? values.content.length : 0

      const chapterData = {
        novel_id: novel.id,
        chapter_num: values.chapter_num,
        title: values.title,
        content: values.content || '',
        word_count: wordCount,
        is_free: values.is_free !== false,
        price: values.price || 0,
      }

      if (editMode === 'create') {
        const { data, error } = await supabase
          .from('novel_chapters')
          .insert(chapterData)
          .select()
          .single()

        if (error) throw error

        const newChapter: ChapterRecord = {
          ...data,
          key: data.id,
        } as ChapterRecord

        setChapters((prev) => [...prev, newChapter].sort((a, b) => a.chapter_num - b.chapter_num))
        message.success('新增成功')
      } else {
        const { error } = await supabase
          .from('novel_chapters')
          .update({
            ...chapterData,
          })
          .eq('id', editingChapter?.id)

        if (error) throw error

        setChapters((prev) =>
          prev.map((item) =>
            item.id === editingChapter?.id
              ? { ...item, ...chapterData }
              : item
          )
        )
        message.success('更新成功')
      }

      setEditModalOpen(false)
    } catch (error) {
      console.error('操作失败:', error)
      message.error('操作失败')
    } finally {
      setConfirmLoading(false)
    }
  }, [novel, editMode, editingChapter, form])

  // 批量导入
  const handleBatchImport = useCallback(() => {
    message.info('批量导入功能开发中...')
  }, [])

  // 表格列配置
  const columns: ColumnsType<ChapterRecord> = [
    {
      title: '章节号',
      dataIndex: 'chapter_num',
      key: 'chapter_num',
      width: 80,
      sorter: (a, b) => a.chapter_num - b.chapter_num,
    },
    {
      title: '章节标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string) => (
        <span style={{ fontWeight: 500 }}>{title}</span>
      ),
    },
    {
      title: '字数',
      dataIndex: 'word_count',
      key: 'word_count',
      width: 100,
      render: (wordCount: number) => `${wordCount} 字`,
    },
    {
      title: '免费',
      dataIndex: 'is_free',
      key: 'is_free',
      width: 80,
      render: (isFree: boolean) => (
        <Tag color={isFree ? 'green' : 'orange'}>
          {isFree ? '免费' : '付费'}
        </Tag>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 80,
      render: (price: number, record) => (
        record.is_free ? '-' : `${price} 元`
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否继续？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Modal
        open={open}
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              章节管理
            </Title>
            {novel && (
              <Text type="secondary">
                《{novel.title}》- 共 {chapters.length} 章
              </Text>
            )}
          </Space>
        }
        onCancel={onClose}
        footer={null}
        width={1000}
        destroyOnClose
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : chapters.length === 0 ? (
          <Empty
            description="暂无章节"
            style={{ padding: '50px 0' }}
          >
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新增章节
              </Button>
              <Button icon={<ImportOutlined />} onClick={handleBatchImport}>
                批量导入
              </Button>
            </Space>
          </Empty>
        ) : (
          <>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">
                总字数：{chapters.reduce((sum, c) => sum + c.word_count, 0).toLocaleString()} 字
              </Text>
              <Space>
                <Button icon={<ImportOutlined />} onClick={handleBatchImport}>
                  批量导入
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  新增章节
                </Button>
              </Space>
            </div>
            <Table<ChapterRecord>
              columns={columns}
              dataSource={chapters}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 章`,
              }}
              size="small"
              scroll={{ y: 400 }}
            />
          </>
        )}
      </Modal>

      {/* 新增/编辑章节弹窗 */}
      <Modal
        open={editModalOpen}
        title={editMode === 'create' ? '新增章节' : '编辑章节'}
        onOk={handleFormSubmit}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={confirmLoading}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            is_free: true,
            price: 0,
          }}
        >
          <Form.Item
            name="chapter_num"
            label="章节号"
            rules={[{ required: true, message: '请输入章节号' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入章节号" />
          </Form.Item>

          <Form.Item
            name="title"
            label="章节标题"
            rules={[{ required: true, message: '请输入章节标题' }]}
          >
            <Input placeholder="请输入章节标题" />
          </Form.Item>

          <Form.Item
            name="content"
            label="章节内容"
          >
            <TextArea
              rows={10}
              placeholder="请输入章节内容"
              showCount
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item
            name="word_count"
            label="字数"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="自动计算" disabled />
          </Form.Item>

          <Form.Item
            name="is_free"
            label="是否免费"
            valuePropName="checked"
          >
            <Switch checkedChildren="免费" unCheckedChildren="付费" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.is_free !== currentValues.is_free}
          >
            {({ getFieldValue }) =>
              !getFieldValue('is_free') && (
                <Form.Item
                  name="price"
                  label="价格（元）"
                  rules={[{ required: true, message: '请输入价格' }]}
                >
                  <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="请输入价格" />
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default NovelChapterModal
