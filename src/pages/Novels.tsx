import React, { useState, useMemo, useCallback } from 'react'
import {
  Tag,
  Button,
  Space,
  Popconfirm,
  message,
  Dropdown,
  Table,
  Card,
  Typography,
  Progress,
  Rate,
} from 'antd'
import type { TablePaginationConfig, ColumnsType } from 'antd/es/table'
import type { Key } from 'react'
import {
  PlusOutlined,
  ExportOutlined,
  DeleteOutlined,
  EditOutlined,
  DownOutlined,
  BookOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import DataFormModal, { FormField } from '../components/DataFormModal'
import FilterBar, { FilterField } from '../components/FilterBar'
import {
  mockNovels,
  MockNovel,
  NOVEL_CATEGORY_OPTIONS,
  NOVEL_STATUS_OPTIONS,
} from '../utils/mockData'
import { exportToCSV, exportToExcel } from '../utils/export'
import { usePermission } from '../hooks/usePermission'

const { Title } = Typography

// ==================== 类型定义 ====================

interface NovelRecord extends MockNovel {
  key: string
}

// ==================== 常量定义 ====================

const STATUS_COLORS: Record<string, string> = {
  ongoing: 'processing',
  completed: 'success',
}

const STATUS_LABELS: Record<string, string> = {
  ongoing: '连载中',
  completed: '已完结',
}

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}

// ==================== 主组件 ====================

const Novels: React.FC = () => {
  const {
    canReadNovels,
    canWriteNovels,
    canDeleteNovels,
    canExportNovels,
  } = usePermission()

  // 状态
  const [data, setData] = useState<NovelRecord[]>(
    mockNovels.map((item) => ({ ...item, key: item.id }))
  )
  const [loading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total) => `共 ${total} 条`,
  })

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingRecord, setEditingRecord] = useState<NovelRecord | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // ==================== 筛选配置 ====================

  const filterFields: FilterField[] = [
    {
      name: 'category',
      label: '分类',
      type: 'select',
      options: NOVEL_CATEGORY_OPTIONS,
      placeholder: '选择分类',
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      options: NOVEL_STATUS_OPTIONS,
      placeholder: '选择状态',
    },
  ]

  // ==================== 表单配置 ====================

  const formFields: FormField[] = [
    {
      name: 'title',
      label: '书名',
      type: 'text',
      required: true,
      placeholder: '请输入书名',
    },
    {
      name: 'author',
      label: '作者',
      type: 'text',
      placeholder: '请输入作者',
    },
    {
      name: 'source',
      label: '来源',
      type: 'text',
      placeholder: '如：起点中文网',
    },
    {
      name: 'category',
      label: '分类',
      type: 'select',
      options: NOVEL_CATEGORY_OPTIONS,
      placeholder: '选择分类',
    },
    {
      name: 'tags',
      label: '标签',
      type: 'tags',
      placeholder: '输入标签后按回车添加',
    },
    {
      name: 'description',
      label: '简介',
      type: 'textarea',
      rows: 4,
      placeholder: '请输入小说简介',
    },
  ]

  // ==================== 数据处理 ====================

  const filteredData = useMemo(() => {
    let result = [...data]

    // 关键词搜索
    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase()
      result = result.filter((record) => {
        return (
          record.title?.toLowerCase().includes(keyword) ||
          record.author?.toLowerCase().includes(keyword) ||
          record.category?.toLowerCase().includes(keyword) ||
          record.tags?.some((tag) => tag.toLowerCase().includes(keyword))
        )
      })
    }

    // 分类筛选
    if (filterValues.category) {
      result = result.filter((record) => record.category === filterValues.category)
    }

    // 状态筛选
    if (filterValues.status) {
      result = result.filter((record) => record.status === filterValues.status)
    }

    return result
  }, [data, searchText, filterValues])

  // ==================== 操作处理 ====================

  // 新增
  const handleCreate = useCallback(() => {
    if (!canWriteNovels) {
      message.warning('您没有新增小说的权限')
      return
    }
    setModalMode('create')
    setEditingRecord(null)
    setModalOpen(true)
  }, [canWriteNovels])

  // 编辑
  const handleEdit = useCallback(
    (record: NovelRecord) => {
      if (!canWriteNovels) {
        message.warning('您没有编辑小说的权限')
        return
      }
      setModalMode('edit')
      setEditingRecord(record)
      setModalOpen(true)
    },
    [canWriteNovels]
  )

  // 删除单条
  const handleDelete = useCallback(
    (id: string) => {
      if (!canDeleteNovels) {
        message.warning('您没有删除小说的权限')
        return
      }
      setData((prev) => prev.filter((item) => item.id !== id))
      message.success('删除成功')
    },
    [canDeleteNovels]
  )

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (!canDeleteNovels) {
      message.warning('您没有删除小说的权限')
      return
    }
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据')
      return
    }
    setData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)))
    setSelectedRowKeys([])
    message.success(`成功删除 ${selectedRowKeys.length} 条数据`)
  }, [selectedRowKeys, canDeleteNovels])

  // 表单提交
  const handleFormSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setConfirmLoading(true)
      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        if (modalMode === 'create') {
          const newRecord: NovelRecord = {
            id: `novel_${Date.now()}`,
            key: `novel_${Date.now()}`,
            user_id: 'current_user_id',
            user_name: '当前用户',
            title: values.title as string,
            author: (values.author as string) || '',
            source: (values.source as string) || '',
            category: (values.category as string) || '',
            tags: (values.tags as string[]) || [],
            word_count: 0,
            chapter_count: 0,
            status: 'ongoing',
            rating: 0,
            read_count: 0,
            collect_count: 0,
            progress: 0,
            last_read_at: null,
            description: (values.description as string) || '',
            cover_url: '',
            created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          }
          setData((prev) => [newRecord, ...prev])
          message.success('新增成功')
        } else {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingRecord?.id
                ? {
                    ...item,
                    title: values.title as string,
                    author: (values.author as string) || '',
                    source: (values.source as string) || '',
                    category: (values.category as string) || '',
                    tags: (values.tags as string[]) || [],
                    description: (values.description as string) || '',
                    updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                  }
                : item
            )
          )
          message.success('更新成功')
        }
        setModalOpen(false)
      } catch (error) {
        message.error('操作失败，请重试')
      } finally {
        setConfirmLoading(false)
      }
    },
    [modalMode, editingRecord]
  )

  // 导出
  const handleExportCSV = useCallback(() => {
    if (!canExportNovels) {
      message.warning('您没有导出小说的权限')
      return
    }
    const columns = [
      { title: '用户ID', dataIndex: 'user_id' },
      { title: '用户名', dataIndex: 'user_name' },
      { title: '书名', dataIndex: 'title' },
      { title: '作者', dataIndex: 'author' },
      { title: '来源', dataIndex: 'source' },
      { title: '分类', dataIndex: 'category' },
      { title: '字数', dataIndex: 'word_count' },
      { title: '章节数', dataIndex: 'chapter_count' },
      { title: '状态', dataIndex: 'status', render: (val: unknown) => String(STATUS_LABELS[val as string] || val) },
      { title: '评分', dataIndex: 'rating' },
      { title: '阅读进度', dataIndex: 'progress', render: (val: unknown) => `${((val as number) * 100).toFixed(0)}%` },
    ]
    exportToCSV<NovelRecord>(filteredData, columns, '小说书架')
    message.success('CSV 导出成功')
  }, [filteredData, canExportNovels])

  const handleExportExcel = useCallback(() => {
    if (!canExportNovels) {
      message.warning('您没有导出小说的权限')
      return
    }
    const columns = [
      { title: '用户ID', dataIndex: 'user_id' },
      { title: '用户名', dataIndex: 'user_name' },
      { title: '书名', dataIndex: 'title' },
      { title: '作者', dataIndex: 'author' },
      { title: '来源', dataIndex: 'source' },
      { title: '分类', dataIndex: 'category' },
      { title: '字数', dataIndex: 'word_count' },
      { title: '章节数', dataIndex: 'chapter_count' },
      { title: '状态', dataIndex: 'status', render: (val: unknown) => String(STATUS_LABELS[val as string] || val) },
      { title: '评分', dataIndex: 'rating' },
      { title: '阅读进度', dataIndex: 'progress', render: (val: unknown) => `${((val as number) * 100).toFixed(0)}%` },
    ]
    exportToExcel<NovelRecord>(filteredData, columns, '小说书架')
    message.success('Excel 导出成功')
  }, [filteredData, canExportNovels])

  // 重置
  const handleReset = useCallback(() => {
    setSearchText('')
    setFilterValues({})
    setSelectedRowKeys([])
    setPagination((prev) => ({ ...prev, current: 1 }))
  }, [])

  // ==================== 表格列配置 ====================

  const columns: ColumnsType<NovelRecord> = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 180,
      ellipsis: true,
      sorter: (a, b) => (a.user_id || '').localeCompare(b.user_id || ''),
      render: (userId: string | null) => userId || '-',
    },
    {
      title: '书名',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      sorter: (a, b) => a.title.localeCompare(b.title),
      render: (title: string) => (
        <Space>
          <BookOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>{title}</span>
        </Space>
      ),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 100,
      render: (author: string) => author || '-',
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (source: string) => (
        source ? <Tag color="purple">{source}</Tag> : '-'
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      filters: NOVEL_CATEGORY_OPTIONS.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.category === value,
      render: (category: string) => (
        category ? <Tag color="blue">{category}</Tag> : '-'
      ),
    },
    {
      title: '字数',
      dataIndex: 'word_count',
      key: 'word_count',
      width: 100,
      sorter: (a, b) => a.word_count - b.word_count,
      render: (wordCount: number) => formatNumber(wordCount),
    },
    {
      title: '章节数',
      dataIndex: 'chapter_count',
      key: 'chapter_count',
      width: 80,
      sorter: (a, b) => a.chapter_count - b.chapter_count,
      render: (chapterCount: number) => `${chapterCount}章`,
    },
    {
      title: '阅读进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      sorter: (a, b) => a.progress - b.progress,
      render: (progress: number) => (
        <Progress
          percent={Math.round(progress * 100)}
          size="small"
          status={progress >= 1 ? 'success' : 'active'}
        />
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 120,
      sorter: (a, b) => a.rating - b.rating,
      render: (rating: number) => (
        <Rate disabled defaultValue={rating / 2} allowHalf style={{ fontSize: 12 }} />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      filters: NOVEL_STATUS_OPTIONS.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.status === value,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: '最后阅读',
      dataIndex: 'last_read_at',
      key: 'last_read_at',
      width: 140,
      sorter: (a, b) => {
        if (!a.last_read_at) return 1
        if (!b.last_read_at) return -1
        return new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime()
      },
      render: (date: string | null) => (
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
          {canWriteNovels && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )}
          {canDeleteNovels && (
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
          )}
        </Space>
      ),
    },
  ]

  // ==================== 导出菜单 ====================

  const exportMenuItems = [
    { key: 'csv', label: '导出 CSV', icon: <ExportOutlined /> },
    { key: 'excel', label: '导出 Excel', icon: <ExportOutlined /> },
  ]

  const handleExportMenuClick = useCallback(
    ({ key }: { key: string }) => {
      if (key === 'csv') handleExportCSV()
      else if (key === 'excel') handleExportExcel()
    },
    [handleExportCSV, handleExportExcel]
  )

  // ==================== 渲染 ====================

  if (!canReadNovels) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Title level={4} type="secondary">
            您没有查看小说的权限
          </Title>
        </div>
      </Card>
    )
  }

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          小说书架管理
        </Title>
        <Space>
          {canWriteNovels && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新增小说
            </Button>
          )}
          {canExportNovels && (
            <Dropdown menu={{ items: exportMenuItems, onClick: handleExportMenuClick }}>
              <Button icon={<ExportOutlined />}>
                导出 <DownOutlined />
              </Button>
            </Dropdown>
          )}
        </Space>
      </div>

      {/* 筛选栏 */}
      <FilterBar
        fields={filterFields}
        values={filterValues}
        onChange={setFilterValues}
        onReset={handleReset}
        searchPlaceholder="搜索书名、作者、分类或标签"
        searchText={searchText}
        onSearchTextChange={setSearchText}
        loading={loading}
      />

      {/* 批量操作栏 */}
      {selectedRowKeys.length > 0 && canDeleteNovels && (
        <div style={{ marginBottom: 16 }}>
          <Space>
            <span>已选择 {selectedRowKeys.length} 条数据</span>
            <Popconfirm
              title="批量删除"
              description={`确认删除选中的 ${selectedRowKeys.length} 条数据？`}
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
        <Table<NovelRecord>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            total: filteredData.length,
          }}
          onChange={(pag) => setPagination(pag)}
          scroll={{ x: 1500 }}
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

      {/* 表单弹窗 */}
      <DataFormModal
        open={modalOpen}
        title={modalMode === 'create' ? '新增小说' : '编辑小说'}
        mode={modalMode}
        fields={formFields}
        initialValues={editingRecord ? { ...editingRecord } : undefined}
        onOk={handleFormSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={confirmLoading}
        width={600}
      />
    </div>
  )
}

export default Novels
