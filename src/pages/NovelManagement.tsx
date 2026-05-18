import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Tag,
  Button,
  Space,
  Popconfirm,
  message,
  Table,
  Card,
  Typography,
  Modal,
  Input,
  Statistic,
  Row,
  Col,
  Tooltip,
} from 'antd'
import type { TablePaginationConfig, ColumnsType } from 'antd/es/table'
import type { Key } from 'react'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  BookOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { useNavigation } from '../App'

const { Title, Text, Paragraph } = Typography

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

// ==================== 主组件 ====================

const NovelManagement: React.FC = () => {
  const { canDeleteNovels } = usePermission()
  const { novelChapterNav, setCurrentPage } = useNavigation()

  // 从导航上下文获取小说信息
  const novelId = novelChapterNav?.novelId || ''
  const novelTitle = novelChapterNav?.novelTitle || ''

  // 状态
  const [data, setData] = useState<ChapterRecord[]>([])
  const [loading, setLoading] = useState(true)
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

  // 加载章节数据
  const fetchChapters = useCallback(async () => {
    if (!novelId) return

    setLoading(true)
    try {
      const { data: chapters, error } = await supabase
        .from('novel_chapters')
        .select('*')
        .eq('novel_id', novelId)
        .order('chapter_num', { ascending: true })

      if (error) throw error

      const records: ChapterRecord[] = (chapters || []).map((chapter: any) => ({
        ...chapter,
        key: chapter.id,
      }))

      setData(records)
    } catch (error) {
      console.error('获取章节列表失败:', error)
      message.error('获取章节列表失败')
    } finally {
      setLoading(false)
    }
  }, [novelId])

  useEffect(() => {
    if (novelId) {
      fetchChapters()
    }
  }, [novelId, fetchChapters])

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
    return { totalChapters, totalWords }
  }, [data])

  // ==================== 操作处理 ====================

  // 查看章节内容
  const handleViewContent = useCallback((record: ChapterRecord) => {
    setViewingChapter(record)
    setContentModalOpen(true)
  }, [])

  // 删除单条章节
  const handleDelete = useCallback(
    async (id: string) => {
      if (!canDeleteNovels) {
        message.warning('您没有删除章节的权限')
        return
      }
      try {
        const { error } = await supabase
          .from('novel_chapters')
          .delete()
          .eq('id', id)

        if (error) throw error

        setData((prev) => prev.filter((item) => item.id !== id))
        message.success('删除成功')
      } catch (error) {
        console.error('删除失败:', error)
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
      const { error } = await supabase
        .from('novel_chapters')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) throw error

      setData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)))
      setSelectedRowKeys([])
      message.success(`成功删除 ${selectedRowKeys.length} 个章节`)
    } catch (error) {
      console.error('批量删除失败:', error)
      message.error('批量删除失败')
    }
  }, [selectedRowKeys, canDeleteNovels])

  // 返回小说列表
  const handleGoBack = useCallback(() => {
    setCurrentPage('novels')
  }, [setCurrentPage])

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
      width: 150,
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

  // ==================== 渲染 ====================

  // 如果没有传入 novelId，显示提示
  if (!novelId) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <BookOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
          <Title level={4} type="secondary">
            请从小说管理页面选择一本小说查看章节
          </Title>
          <Button type="primary" icon={<ArrowLeftOutlined />} onClick={handleGoBack}>
            返回小说管理
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleGoBack}>
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            章节管理
          </Title>
          {novelTitle && (
            <Text type="secondary">
              - 《{novelTitle}》
            </Text>
          )}
        </Space>
      </div>

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" bordered>
            <Statistic
              title="总章节数"
              value={stats.totalChapters}
              suffix="章"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" bordered>
            <Statistic
              title="总字数"
              value={stats.totalWords >= 10000
                ? parseFloat((stats.totalWords / 10000).toFixed(1))
                : stats.totalWords
              }
              suffix={stats.totalWords >= 10000 ? '万字' : '字'}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" bordered>
            <Statistic
              title="平均每章字数"
              value={stats.totalChapters > 0
                ? Math.round(stats.totalWords / stats.totalChapters)
                : 0
              }
              suffix="字"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索栏 */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索章节标题"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ maxWidth: 300 }}
        />
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
      <Card>
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
          scroll={{ x: 800 }}
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
      </Card>

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
    </div>
  )
}

export default NovelManagement
