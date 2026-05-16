import React, { useState, useMemo, useCallback, useEffect } from 'react'
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
  Image,
  Switch,
  Tooltip,
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
  UnorderedListOutlined,
  ImportOutlined,
} from '@ant-design/icons'
import DataFormModal, { FormField } from '../components/DataFormModal'
import FilterBar, { FilterField } from '../components/FilterBar'
import NovelChapterModal from '../components/NovelChapterModal'
import { NOVEL_CATEGORY_OPTIONS } from '../utils/mockData'
import { exportToCSV, exportToExcel } from '../utils/export'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

const { Title } = Typography

// ==================== 类型定义 ====================

export interface NovelRecord {
  id: string
  key: string
  title: string
  author: string
  source: string | null
  source_url: string | null
  cover_url: string | null
  description: string | null
  category: string | null
  tags: string[]
  word_count: number
  chapter_count: number
  status: 'ongoing' | 'completed'
  is_free: boolean
  price: number
  rating: number | null
  read_count: number
  collect_count: number
  created_at: string
  updated_at: string
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

const NovelManagement: React.FC = () => {
  const { canManageNovels, canDeleteNovels, canExportNovels } = usePermission()

  // 状态
  const [data, setData] = useState<NovelRecord[]>([])
  const [loading, setLoading] = useState(false)
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

  // 章节弹窗状态
  const [chapterModalOpen, setChapterModalOpen] = useState(false)
  const [currentNovel, setCurrentNovel] = useState<NovelRecord | null>(null)

  // 加载数据
  const fetchNovels = useCallback(async () => {
    setLoading(true)
    try {
      // 查询所有小说（不限制 user_id 为 null，因为可能没有公共小说）
      const { data: novels, error } = await supabase
        .from('novels')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const records: NovelRecord[] = (novels || []).map((novel) => ({
        ...novel,
        key: novel.id,
        tags: novel.tags || [],
      }))

      setData(records)
    } catch (error) {
      console.error('获取小说列表失败:', error)
      message.error('获取小说列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNovels()
  }, [fetchNovels])

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
      options: [
        { label: '连载中', value: 'ongoing' },
        { label: '已完结', value: 'completed' },
      ],
      placeholder: '选择状态',
    },
    {
      name: 'is_free',
      label: '是否免费',
      type: 'select',
      options: [
        { label: '免费', value: 'true' },
        { label: '付费', value: 'false' },
      ],
      placeholder: '选择',
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
      required: true,
      placeholder: '请输入作者',
    },
    {
      name: 'source',
      label: '来源',
      type: 'text',
      placeholder: '如：起点中文网',
    },
    {
      name: 'source_url',
      label: '来源链接',
      type: 'text',
      placeholder: '小说来源网址',
    },
    {
      name: 'cover_url',
      label: '封面链接',
      type: 'text',
      placeholder: '封面图片URL',
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
      name: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '连载中', value: 'ongoing' },
        { label: '已完结', value: 'completed' },
      ],
      placeholder: '选择状态',
      defaultValue: 'ongoing',
    },
    {
      name: 'is_free',
      label: '是否免费',
      type: 'switch',
      defaultValue: true,
    },
    {
      name: 'price',
      label: '价格',
      type: 'number',
      placeholder: '付费价格',
      defaultValue: 0,
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

    // 是否免费筛选
    if (filterValues.is_free !== undefined && filterValues.is_free !== '') {
      const isFree = filterValues.is_free === 'true'
      result = result.filter((record) => record.is_free === isFree)
    }

    return result
  }, [data, searchText, filterValues])

  // ==================== 操作处理 ====================

  // 新增
  const handleCreate = useCallback(() => {
    if (!canManageNovels) {
      message.warning('您没有新增小说的权限')
      return
    }
    setModalMode('create')
    setEditingRecord(null)
    setModalOpen(true)
  }, [canManageNovels])

  // 编辑
  const handleEdit = useCallback(
    (record: NovelRecord) => {
      if (!canManageNovels) {
        message.warning('您没有编辑小说的权限')
        return
      }
      setModalMode('edit')
      setEditingRecord(record)
      setModalOpen(true)
    },
    [canManageNovels]
  )

  // 删除单条
  const handleDelete = useCallback(
    async (id: string) => {
      if (!canDeleteNovels) {
        message.warning('您没有删除小说的权限')
        return
      }
      try {
        const { error } = await supabase.from('novels').delete().eq('id', id)
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
      message.warning('您没有删除小说的权限')
      return
    }
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据')
      return
    }
    try {
      const { error } = await supabase
        .from('novels')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) throw error
      setData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)))
      setSelectedRowKeys([])
      message.success(`成功删除 ${selectedRowKeys.length} 条数据`)
    } catch (error) {
      console.error('批量删除失败:', error)
      message.error('批量删除失败')
    }
  }, [selectedRowKeys, canDeleteNovels])

  // 表单提交
  const handleFormSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setConfirmLoading(true)
      try {
        const novelData = {
          title: values.title as string,
          author: values.author as string,
          source: (values.source as string) || null,
          source_url: (values.source_url as string) || null,
          cover_url: (values.cover_url as string) || null,
          category: (values.category as string) || null,
          tags: (values.tags as string[]) || [],
          status: (values.status as 'ongoing' | 'completed') || 'ongoing',
          is_free: values.is_free !== false,
          price: (values.price as number) || 0,
          description: (values.description as string) || null,
          user_id: null, // 公共小说
        }

        if (modalMode === 'create') {
          const { data: newNovel, error } = await supabase
            .from('novels')
            .insert(novelData)
            .select()
            .single()

          if (error) throw error

          const newRecord: NovelRecord = {
            ...newNovel,
            key: newNovel.id,
            tags: newNovel.tags || [],
          } as NovelRecord

          setData((prev) => [newRecord, ...prev])
          message.success('新增成功')
        } else {
          const { error } = await supabase
            .from('novels')
            .update({
              ...novelData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingRecord?.id)

          if (error) throw error

          setData((prev) =>
            prev.map((item) =>
              item.id === editingRecord?.id
                ? {
                    ...item,
                    ...novelData,
                    updated_at: new Date().toISOString(),
                  }
                : item
            )
          )
          message.success('更新成功')
        }
        setModalOpen(false)
      } catch (error) {
        console.error('操作失败:', error)
        message.error('操作失败，请重试')
      } finally {
        setConfirmLoading(false)
      }
    },
    [modalMode, editingRecord]
  )

  // 查看章节
  const handleViewChapters = useCallback((record: NovelRecord) => {
    setCurrentNovel(record)
    setChapterModalOpen(true)
  }, [])

  // 导出
  const handleExportCSV = useCallback(() => {
    if (!canExportNovels) {
      message.warning('您没有导出小说的权限')
      return
    }
    const columns = [
      { title: '书名', dataIndex: 'title' },
      { title: '作者', dataIndex: 'author' },
      { title: '来源', dataIndex: 'source' },
      { title: '分类', dataIndex: 'category' },
      { title: '字数', dataIndex: 'word_count' },
      { title: '章节数', dataIndex: 'chapter_count' },
      { title: '状态', dataIndex: 'status', render: (val: unknown) => String(STATUS_LABELS[val as string] || val) },
      { title: '是否免费', dataIndex: 'is_free', render: (val: unknown) => val ? '免费' : '付费' },
      { title: '评分', dataIndex: 'rating' },
      { title: '阅读数', dataIndex: 'read_count' },
      { title: '收藏数', dataIndex: 'collect_count' },
    ]
    exportToCSV<NovelRecord>(filteredData, columns, '小说库')
    message.success('CSV 导出成功')
  }, [filteredData, canExportNovels])

  const handleExportExcel = useCallback(() => {
    if (!canExportNovels) {
      message.warning('您没有导出小说的权限')
      return
    }
    const columns = [
      { title: '书名', dataIndex: 'title' },
      { title: '作者', dataIndex: 'author' },
      { title: '来源', dataIndex: 'source' },
      { title: '分类', dataIndex: 'category' },
      { title: '字数', dataIndex: 'word_count' },
      { title: '章节数', dataIndex: 'chapter_count' },
      { title: '状态', dataIndex: 'status', render: (val: unknown) => String(STATUS_LABELS[val as string] || val) },
      { title: '是否免费', dataIndex: 'is_free', render: (val: unknown) => val ? '免费' : '付费' },
      { title: '评分', dataIndex: 'rating' },
      { title: '阅读数', dataIndex: 'read_count' },
      { title: '收藏数', dataIndex: 'collect_count' },
    ]
    exportToExcel<NovelRecord>(filteredData, columns, '小说库')
    message.success('Excel 导出成功')
  }, [filteredData, canExportNovels])

  // 重置
  const handleReset = useCallback(() => {
    setSearchText('')
    setFilterValues({})
    setSelectedRowKeys([])
    setPagination((prev) => ({ ...prev, current: 1 }))
  }, [])

  // 更新免费状态
  const handleFreeChange = useCallback(async (record: NovelRecord, isFree: boolean) => {
    try {
      const { error } = await supabase
        .from('novels')
        .update({ is_free: isFree, updated_at: new Date().toISOString() })
        .eq('id', record.id)

      if (error) throw error

      setData((prev) =>
        prev.map((item) =>
          item.id === record.id ? { ...item, is_free: isFree } : item
        )
      )
      message.success('更新成功')
    } catch (error) {
      console.error('更新失败:', error)
      message.error('更新失败')
    }
  }, [])

  // ==================== 表格列配置 ====================

  const columns: ColumnsType<NovelRecord> = [
    {
      title: '封面',
      dataIndex: 'cover_url',
      key: 'cover_url',
      width: 80,
      render: (coverUrl: string | null) => (
        coverUrl ? (
          <Image
            src={coverUrl}
            alt="封面"
            width={50}
            height={70}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />
        ) : (
          <div
            style={{
              width: 50,
              height: 70,
              background: '#f0f0f0',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BookOutlined style={{ color: '#999', fontSize: 20 }} />
          </div>
        )
      ),
    },
    {
      title: '书名',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      sorter: (a, b) => a.title.localeCompare(b.title),
      render: (title: string) => (
        <span style={{ fontWeight: 500 }}>{title}</span>
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      filters: [
        { text: '连载中', value: 'ongoing' },
        { text: '已完结', value: 'completed' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: '免费',
      dataIndex: 'is_free',
      key: 'is_free',
      width: 80,
      render: (isFree: boolean, record) => (
        <Switch
          checked={isFree}
          size="small"
          onChange={(checked) => handleFreeChange(record, checked)}
        />
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 80,
      sorter: (a, b) => (a.rating || 0) - (b.rating || 0),
      render: (rating: number | null) => (
        rating ? (
          <span style={{ color: '#faad14' }}>{rating.toFixed(1)}</span>
        ) : '-'
      ),
    },
    {
      title: '阅读数',
      dataIndex: 'read_count',
      key: 'read_count',
      width: 100,
      sorter: (a, b) => a.read_count - b.read_count,
      render: (readCount: number) => formatNumber(readCount),
    },
    {
      title: '收藏数',
      dataIndex: 'collect_count',
      key: 'collect_count',
      width: 100,
      sorter: (a, b) => a.collect_count - b.collect_count,
      render: (collectCount: number) => formatNumber(collectCount),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看章节">
            <Button
              type="link"
              size="small"
              icon={<UnorderedListOutlined />}
              onClick={() => handleViewChapters(record)}
            >
              章节
            </Button>
          </Tooltip>
          {canManageNovels && (
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

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          小说库管理
        </Title>
        <Space>
          {canManageNovels && (
            <>
              <Button icon={<ImportOutlined />}>
                从爬虫导入
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新增小说
              </Button>
            </>
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
          scroll={{ x: 1400 }}
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
        width={700}
      />

      {/* 章节管理弹窗 */}
      <NovelChapterModal
        open={chapterModalOpen}
        novel={currentNovel}
        onClose={() => {
          setChapterModalOpen(false)
          setCurrentNovel(null)
          fetchNovels() // 刷新小说列表以更新章节数
        }}
      />
    </div>
  )
}

export default NovelManagement
