import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Tag,
  Button,
  Space,
  Popconfirm,
  message,
  Table,
  Typography,
  Modal,
  Input,
  Row,
  Col,
  Tooltip,
  Form,
  Switch,
  InputNumber,
} from 'antd'
import type { TablePaginationConfig, ColumnsType } from 'antd/es/table'
import type { Key } from 'react'
import {
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

const { Title, Text, Paragraph } = Typography
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
  novelId: string
  novelTitle: string
  onClose: () => void
}

// ==================== 组件 ====================

const NovelChapterModal: React.FC<NovelChapterModalProps> = ({
  open,
  novelId,
  novelTitle,
  onClose,
}) => {
  const { canDeleteNovels, canWriteNovels } = usePermission()

  // 状态
  const [data, setData] = useState<ChapterRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 20,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total) => `共 ${total} 条`,
  })

  // 章节内容查看弹窗
  const [contentModalOpen, setContentModalOpen] = useState(false)
  const [viewingChapter, setViewingChapter] = useState<ChapterRecord | null>(null)

  // 章节编辑弹窗
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<ChapterRecord | null>(null)
  const [editForm] = Form.useForm()
  const [editLoading, setEditLoading] = useState(false)

  // 章节新增弹窗
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createForm] = Form.useForm()
  const [createLoading, setCreateLoading] = useState(false)

  // 加载章节数据
  const fetchChapters = useCallback(async () => {
    if (!novelId || !open) return

    setLoading(true)
    console.log(`[NovelChapterModal] 加载小说章节: ${novelId}`)
    
    try {
      // 移除默认的1000条限制，设置为10000
      const { data: chapters, error } = await supabase
        .from('novel_chapters')
        .select('*')
        .eq('novel_id', novelId)
        .order('chapter_num', { ascending: true })
        .limit(10000)

      if (error) {
        console.error('[NovelChapterModal] 获取章节列表失败:', error)
        throw error
      }

      const records: ChapterRecord[] = (chapters || []).map((chapter: any) => ({
        ...chapter,
        key: chapter.id,
      }))

      console.log(`[NovelChapterModal] 成功加载 ${records.length} 个章节`)
      setData(records)
    } catch (error) {
      console.error('[NovelChapterModal] 获取章节列表失败:', error)
      message.error('获取章节列表失败')
    } finally {
      setLoading(false)
    }
  }, [novelId, open])

  useEffect(() => {
    if (open && novelId) {
      fetchChapters()
    }
  }, [open, novelId, fetchChapters])

  // 关闭时重置状态
  useEffect(() => {
    if (!open) {
      setSearchText('')
      setSelectedRowKeys([])
      setData([])
    }
  }, [open])

  // ==================== 数据处理 ====================

  const filteredData = useMemo(() => {
    let result = [...data]

    // 关键词搜索
    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase()
      result = result.filter((record) => {
        return record.title?.toLowerCase().includes(keyword)
      })
    }

    return result
  }, [data, searchText])

  // 统计信息
  const stats = useMemo(() => {
    const totalChapters = data.length
    const totalWords = data.reduce((sum, c) => sum + (c.word_count || 0), 0)
    const maxChapterNum = data.length > 0 ? Math.max(...data.map(c => c.chapter_num)) : 0
    return { totalChapters, totalWords, maxChapterNum }
  }, [data])

  // ==================== 操作处理 ====================

  // 查看章节内容
  const handleViewContent = useCallback((record: ChapterRecord) => {
    setViewingChapter(record)
    setContentModalOpen(true)
  }, [])

  // 打开编辑弹窗
  const handleEdit = useCallback((record: ChapterRecord) => {
    if (!canWriteNovels) {
      message.warning('您没有编辑章节的权限')
      return
    }
    setEditingChapter(record)
    editForm.setFieldsValue({
      title: record.title,
      content: record.content,
      is_free: record.is_free,
      price: record.price || 0,
    })
    setEditModalOpen(true)
  }, [canWriteNovels, editForm])

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editingChapter) return
    
    try {
      const values = await editForm.validateFields()
      setEditLoading(true)

      const content = values.content || ''
      const wordCount = content.length

      const { error } = await supabase
        .from('novel_chapters')
        .update({
          title: values.title,
          content: content,
          word_count: wordCount,
          is_free: values.is_free,
          price: values.is_free ? 0 : (values.price || 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingChapter.id)

      if (error) throw error

      // 更新本地数据
      setData(prev => prev.map(item => 
        item.id === editingChapter.id
          ? {
              ...item,
              title: values.title,
              content: content,
              word_count: wordCount,
              is_free: values.is_free,
              price: values.is_free ? 0 : (values.price || 0),
            }
          : item
      ))

      message.success('章节更新成功')
      setEditModalOpen(false)
      setEditingChapter(null)
      editForm.resetFields()
    } catch (error) {
      console.error('保存章节失败:', error)
      message.error('保存章节失败')
    } finally {
      setEditLoading(false)
    }
  }, [editingChapter, editForm])

  // 打开新增弹窗
  const handleCreate = useCallback(() => {
    if (!canWriteNovels) {
      message.warning('您没有新增章节的权限')
      return
    }
    createForm.setFieldsValue({
      chapter_num: stats.maxChapterNum + 1,
      title: '',
      content: '',
      is_free: true,
      price: 0,
    })
    setCreateModalOpen(true)
  }, [canWriteNovels, createForm, stats.maxChapterNum])

  // 保存新增
  const handleSaveCreate = useCallback(async () => {
    try {
      const values = await createForm.validateFields()
      setCreateLoading(true)

      const content = values.content || ''
      const wordCount = content.length

      const { data: newChapter, error } = await supabase
        .from('novel_chapters')
        .insert({
          novel_id: novelId,
          chapter_num: values.chapter_num,
          title: values.title,
          content: content,
          word_count: wordCount,
          is_free: values.is_free,
          price: values.is_free ? 0 : (values.price || 0),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // 添加到本地数据
      setData(prev => [...prev, { ...newChapter, key: newChapter.id }])

      message.success('章节新增成功')
      setCreateModalOpen(false)
      createForm.resetFields()
    } catch (error) {
      console.error('新增章节失败:', error)
      message.error('新增章节失败')
    } finally {
      setCreateLoading(false)
    }
  }, [createForm, novelId])

  // 删除单条章节
  const handleDelete = useCallback(
    async (id: string) => {
      if (!canDeleteNovels) {
        message.warning('您没有删除章节的权限')
        return
      }
      try {
        console.log(`[NovelChapterModal] 删除章节: ${id}`)
        const { error } = await supabase
          .from('novel_chapters')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('[NovelChapterModal] 删除章节失败:', error)
          throw error
        }

        setData((prev) => prev.filter((item) => item.id !== id))
        message.success('删除成功')
        console.log(`[NovelChapterModal] 章节删除成功: ${id}`)
      } catch (error) {
        console.error('[NovelChapterModal] 删除失败:', error)
        message.error('删除失败')
      }
    },
    [canDeleteNovels]
  )

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (!canDeleteNovels) {
      message.warning('您没有删除章节的权限')
      return
    }
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的章节')
      return
    }
    try {
      console.log(`[NovelChapterModal] 批量删除章节:`, selectedRowKeys)
      const { error } = await supabase
        .from('novel_chapters')
        .delete()
        .in('id', selectedRowKeys as string[])
      
      if (error) {
        console.error('[NovelChapterModal] 批量删除失败:', error)
        throw error
      }

      setData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)))
      setSelectedRowKeys([])
      message.success(`成功删除 ${selectedRowKeys.length} 个章节`)
      console.log(`[NovelChapterModal] 批量删除成功: ${selectedRowKeys.length} 个章节`)
    } catch (error) {
      console.error('[NovelChapterModal] 批量删除失败:', error)
      message.error('批量删除失败')
    }
  }, [selectedRowKeys, canDeleteNovels])

  // ==================== 表格列配置 ====================

  const columns: ColumnsType<ChapterRecord> = [
    {
      title: '章节号',
      dataIndex: 'chapter_num',
      key: 'chapter_num',
      width: 90,
      sorter: (a, b) => a.chapter_num - b.chapter_num,
      render: (num: number) => (
        <Tag color="blue">第 {num} 章</Tag>
      ),
    },
    {
      title: '标题',
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
      sorter: (a, b) => a.word_count - b.word_count,
      render: (wordCount: number) => {
        if (wordCount >= 10000) {
          return (wordCount / 10000).toFixed(1) + '万字'
        }
        return (wordCount || 0).toLocaleString() + '字'
      },
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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      sorter: (a, b) => {
        if (!a.created_at) return 1
        if (!b.created_at) return -1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      },
      render: (date: string) => (
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看内容">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewContent(record)}
            >
              查看
            </Button>
          </Tooltip>
          {canWriteNovels && (
            <Tooltip title="编辑章节">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
            </Tooltip>
          )}
          {canDeleteNovels && (
            <Popconfirm
              title="确认删除"
              description={`确认删除章节「${record.title}」？此操作不可恢复。`}
              onConfirm={() => handleDelete(record.id)}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
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
            {novelTitle && (
              <Text type="secondary">
                - 《{novelTitle}》
              </Text>
            )}
          </Space>
        }
        onCancel={onClose}
        footer={null}
        width={1000}
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          {/* 统计信息 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <div style={{ padding: 12, background: '#f6ffed', borderRadius: 8, textAlign: 'center' }}>
                <Text type="secondary">总章节数</Text>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                  {stats.totalChapters} 章
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ padding: 12, background: '#e6f7ff', borderRadius: 8, textAlign: 'center' }}>
                <Text type="secondary">总字数</Text>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {stats.totalWords >= 10000
                    ? parseFloat((stats.totalWords / 10000).toFixed(1)) + '万字'
                    : stats.totalWords + '字'}
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ padding: 12, background: '#f9f0ff', borderRadius: 8, textAlign: 'center' }}>
                <Text type="secondary">平均每章字数</Text>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                  {stats.totalChapters > 0
                    ? Math.round(stats.totalWords / stats.totalChapters)
                    : 0} 字
                </div>
              </div>
            </Col>
          </Row>

          {/* 操作栏 */}
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Input
              placeholder="搜索章节标题"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ maxWidth: 300 }}
            />
            {canWriteNovels && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新增章节
              </Button>
            )}
          </div>

          {/* 批量操作栏 */}
          {selectedRowKeys.length > 0 && canDeleteNovels && (
            <div style={{ marginBottom: 16 }}>
              <Space>
                <span>已选择 {selectedRowKeys.length} 个章节</span>
                <Popconfirm
                  title="批量删除"
                  description={`确认删除选中的 ${selectedRowKeys.length} 个章节？此操作不可恢复。`}
                  onConfirm={handleBatchDelete}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    批量删除
                  </Button>
                </Popconfirm>
                <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
              </Space>
            </div>
          )}

          {/* 数据表格 */}
          <Table<ChapterRecord>
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              total: filteredData.length,
            }}
            onChange={(pag) => setPagination(pag)}
            scroll={{ x: 800, y: 400 }}
            rowSelection={
              canDeleteNovels
                ? {
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys),
                  }
                : undefined
            }
            size="middle"
            bordered
          />
        </div>
      </Modal>

      {/* 章节内容查看弹窗 */}
      <Modal
        open={contentModalOpen}
        title={
          viewingChapter
            ? `第 ${viewingChapter.chapter_num} 章 - ${viewingChapter.title}`
            : '章节内容'
        }
        onCancel={() => {
          setContentModalOpen(false)
          setViewingChapter(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setContentModalOpen(false)
              setViewingChapter(null)
            }}
          >
            关闭
          </Button>,
        ]}
        width={800}
        destroyOnClose
      >
        {viewingChapter && (
          <div>
            <div style={{ marginBottom: 12, display: 'flex', gap: 16 }}>
              <Tag color="blue">第 {viewingChapter.chapter_num} 章</Tag>
              <Tag color={viewingChapter.is_free ? 'green' : 'orange'}>
                {viewingChapter.is_free ? '免费' : `付费 ${viewingChapter.price} 元`}
              </Tag>
              <Text type="secondary">{(viewingChapter.word_count || 0).toLocaleString()} 字</Text>
            </div>
            <Paragraph
              style={{
                maxHeight: 500,
                overflow: 'auto',
                padding: 16,
                background: '#fafafa',
                borderRadius: 8,
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
              }}
            >
              {viewingChapter.content || '暂无内容'}
            </Paragraph>
          </div>
        )}
      </Modal>

      {/* 章节编辑弹窗 */}
      <Modal
        open={editModalOpen}
        title={editingChapter ? `编辑章节 - ${editingChapter.title}` : '编辑章节'}
        onCancel={() => {
          setEditModalOpen(false)
          setEditingChapter(null)
          editForm.resetFields()
        }}
        onOk={handleSaveEdit}
        confirmLoading={editLoading}
        width={800}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          preserve={false}
        >
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
            rules={[{ required: true, message: '请输入章节内容' }]}
          >
            <TextArea
              placeholder="请输入章节内容"
              rows={15}
              showCount
              maxLength={50000}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="is_free"
                label="是否免费"
                valuePropName="checked"
              >
                <Switch checkedChildren="免费" unCheckedChildren="付费" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.is_free !== curr.is_free}
              >
                {({ getFieldValue }) => (
                  !getFieldValue('is_free') && (
                    <Form.Item
                      name="price"
                      label="价格(元)"
                      rules={[{ required: true, message: '请输入价格' }]}
                    >
                      <InputNumber
                        min={0}
                        max={9999}
                        step={0.1}
                        precision={2}
                        style={{ width: '100%' }}
                        placeholder="请输入价格"
                      />
                    </Form.Item>
                  )
                )}
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 章节新增弹窗 */}
      <Modal
        open={createModalOpen}
        title="新增章节"
        onCancel={() => {
          setCreateModalOpen(false)
          createForm.resetFields()
        }}
        onOk={handleSaveCreate}
        confirmLoading={createLoading}
        width={800}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="chapter_num"
            label="章节号"
            rules={[{ required: true, message: '请输入章节号' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="请输入章节号"
            />
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
            rules={[{ required: true, message: '请输入章节内容' }]}
          >
            <TextArea
              placeholder="请输入章节内容"
              rows={15}
              showCount
              maxLength={50000}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="is_free"
                label="是否免费"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="免费" unCheckedChildren="付费" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.is_free !== curr.is_free}
              >
                {({ getFieldValue }) => (
                  !getFieldValue('is_free') && (
                    <Form.Item
                      name="price"
                      label="价格(元)"
                      rules={[{ required: true, message: '请输入价格' }]}
                      initialValue={0}
                    >
                      <InputNumber
                        min={0}
                        max={9999}
                        step={0.1}
                        precision={2}
                        style={{ width: '100%' }}
                        placeholder="请输入价格"
                      />
                    </Form.Item>
                  )
                )}
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  )
}

export default NovelChapterModal
