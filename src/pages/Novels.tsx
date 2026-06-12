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
  EyeOutlined,
  StarOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import DataFormModal, { FormField } from '../components/DataFormModal'
import FilterBar, { FilterField } from '../components/FilterBar'
import NovelChapterModal from '../components/NovelChapterModal'
import { exportToCSV, exportToExcel } from '../utils/export'
import { supabase, handleSupabaseError } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { getActionColumn } from '../components/ActionColumn'
import NoPermission from '../components/NoPermission'
import { useDictOptions } from '../hooks/useDictOptions'

const { Title } = Typography

// ==================== 类型定义 ====================

interface NovelRecord {
  id: string
  key: string
  title: string
  author: string | null
  cover_url: string | null
  description: string | null
  category: string | null
  source: string | null
  source_url: string | null
  tags: string[] | null
  chapter_count: number
  word_count: number
  status: string
  is_free: boolean
  price: number
  rating: number
  read_count: number
  collect_count: number
  created_at: string
  updated_at: string
}

// ==================== 常量定义 ====================

// 格式化字数显示
const formatWordCount = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万字'
  }
  return num.toLocaleString() + '字'
}

// ==================== 主组件 ====================

const Novels: React.FC = () => {
  const {
    canReadNovels,
    canWriteNovels,
    canDeleteNovels,
    canExportNovels,
  } = usePermission()

  // 字典查询
  const { options: categoryOptions, colors: categoryColors } = useDictOptions('novel_category')
  const { options: statusOptions, colors: statusColors } = useDictOptions('novel_status')

  // 状态
  const [data, setData] = useState<NovelRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 20,
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

  // 章节管理弹窗状态
  const [chapterModalOpen, setChapterModalOpen] = useState(false)
  const [selectedNovel, setSelectedNovel] = useState<NovelRecord | null>(null)

  // 加载数据
  const fetchNovels = useCallback(async () => {
    setLoading(true)
    
    try {
      const { data: novels, error } = await supabase
        .from('novels')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Novels] 获取小说列表失败:', error)
        const userMessage = handleSupabaseError(error, '获取小说列表')
        message.error(userMessage)
        setData([])
        return
      }

      if (!novels || novels.length === 0) {
        setData([])
        return
      }

      // 映射数据库英文状态到中文显示
      const displayStatusMap: Record<string, string> = {
        'ongoing': '连载',
        'completed': '完结',
      }

      const records: NovelRecord[] = novels.map((novel: any) => ({
        id: novel.id,
        key: novel.id,
        title: novel.title || '',
        author: novel.author || null,
        cover_url: novel.cover_url || null,
        description: novel.description || null,
        category: novel.category || null,
        source: novel.source || null,
        source_url: novel.source_url || null,
        tags: novel.tags || null,
        chapter_count: novel.chapter_count || 0,
        word_count: novel.word_count || 0,
        status: displayStatusMap[novel.status] || novel.status || '连载',
        is_free: novel.is_free !== false,
        price: novel.price || 0,
        rating: novel.rating || 0,
        read_count: novel.read_count || 0,
        collect_count: novel.collect_count || 0,
        created_at: novel.created_at || '',
        updated_at: novel.updated_at || '',
      }))

      setData(records)
    } catch (error) {
      console.error('[Novels] 获取小说列表异常:', error)
      message.error('获取小说列表失败，请检查网络连接后重试')
      setData([])
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
      options: categoryOptions,
      placeholder: '选择分类',
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      options: statusOptions,
      placeholder: '选择状态',
    },
    // is_published 筛选已移除
  ]

  // ==================== 表单配置 ====================

  const formFields: FormField[] = [
    {
      name: 'title',
      label: '标题',
      type: 'text',
      required: true,
      placeholder: '请输入小说标题',
    },
    {
      name: 'author',
      label: '作者',
      type: 'text',
      required: true,
      placeholder: '请输入作者',
    },
    {
      name: 'category',
      label: '分类',
      type: 'select',
      options: categoryOptions,
      placeholder: '选择分类',
    },
    {
      name: 'cover_url',
      label: '封面URL',
      type: 'text',
      placeholder: '请输入封面图片URL',
    },
    {
      name: 'description',
      label: '简介',
      type: 'textarea',
      rows: 4,
      placeholder: '请输入小说简介',
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      options: statusOptions,
      placeholder: '选择状态',
      defaultValue: '连载',
    },
    {
      name: 'word_count',
      label: '字数',
      type: 'number',
      placeholder: '请输入字数',
      min: 0,
      precision: 0,
    },
    {
      name: 'chapter_count',
      label: '章节数',
      type: 'number',
      placeholder: '请输入章节数',
      min: 0,
      precision: 0,
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
          record.author?.toLowerCase().includes(keyword)
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

    // is_published 筛选已移除

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

  // 删除单条（级联删除章节）
  const handleDelete = useCallback(
    async (id: string) => {
      if (!canDeleteNovels) {
        message.warning('您没有删除小说的权限')
        return
      }
      try {
        // 先删除关联章节
        const { error: chapterError } = await supabase
          .from('novel_chapters')
          .delete()
          .eq('novel_id', id)

        if (chapterError) throw chapterError

        // 再删除小说
        const { error } = await supabase.from('novels').delete().eq('id', id)
        if (error) throw error

        setData((prev) => prev.filter((item) => item.id !== id))
        message.success('删除成功（已级联删除关联章节）')
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
      // 批量删除关联章节
      const { error: chapterError } = await supabase
        .from('novel_chapters')
        .delete()
        .in('novel_id', selectedRowKeys as string[])

      if (chapterError) throw chapterError

      // 批量删除小说
      const { error } = await supabase
        .from('novels')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) throw error

      setData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)))
      setSelectedRowKeys([])
      message.success(`成功删除 ${selectedRowKeys.length} 条数据（已级联删除关联章节）`)
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
        // 映射中文状态到数据库英文值
        const statusMap: Record<string, string> = {
          '连载': 'ongoing',
          '完结': 'completed',
        }
        const dbStatus = statusMap[values.status as string] || 'ongoing'

        const novelData = {
          title: values.title as string,
          author: (values.author as string) || null,
          category: (values.category as string) || null,
          cover_url: (values.cover_url as string) || null,
          description: (values.description as string) || null,
          status: dbStatus,
          word_count: (values.word_count as number) || 0,
          chapter_count: (values.chapter_count as number) || 0,
          is_free: true, // 默认免费
          read_count: 0,
          collect_count: 0,
        }

        if (modalMode === 'create') {
          const { data: newNovel, error } = await supabase
            .from('novels')
            .insert(novelData)
            .select()
            .single()

          if (error) throw error

          // 映射数据库英文状态到中文显示
          const displayStatusMap: Record<string, string> = {
            'ongoing': '连载',
            'completed': '完结',
          }
          const newRecord: NovelRecord = {
            ...newNovel,
            key: newNovel.id,
            status: displayStatusMap[newNovel.status] || '连载',
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

          // 映射数据库英文状态到中文显示
          const displayStatusMap: Record<string, string> = {
            'ongoing': '连载',
            'completed': '完结',
          }
          setData((prev) =>
            prev.map((item) =>
              item.id === editingRecord?.id
                ? {
                    ...item,
                    ...novelData,
                    status: (displayStatusMap[novelData.status] || '连载') as '连载' | '完结',
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

  // 查看章节 - 打开章节管理弹窗
  const handleViewChapters = useCallback(
    (record: NovelRecord) => {
      setSelectedNovel(record)
      setChapterModalOpen(true)
    },
    []
  )

  // 关闭章节管理弹窗
  const handleCloseChapterModal = useCallback(() => {
    setChapterModalOpen(false)
    setSelectedNovel(null)
  }, [])

  // 导出
  const handleExportCSV = useCallback(() => {
    if (!canExportNovels) {
      message.warning('您没有导出小说的权限')
      return
    }
    const columns = [
      { title: '标题', dataIndex: 'title' },
      { title: '作者', dataIndex: 'author' },
      { title: '分类', dataIndex: 'category' },
      { title: '字数', dataIndex: 'word_count', render: (val: unknown) => formatWordCount(val as number) },
      { title: '章节数', dataIndex: 'chapter_count' },
      { title: '状态', dataIndex: 'status' },
      { title: '创建时间', dataIndex: 'created_at', render: (val: unknown) => dayjs(val as string).format('YYYY-MM-DD HH:mm') },
    ]
    exportToCSV<NovelRecord>(filteredData, columns, '小说管理')
    message.success('CSV 导出成功')
  }, [filteredData, canExportNovels])

  const handleExportExcel = useCallback(() => {
    if (!canExportNovels) {
      message.warning('您没有导出小说的权限')
      return
    }
    const columns = [
      { title: '标题', dataIndex: 'title' },
      { title: '作者', dataIndex: 'author' },
      { title: '分类', dataIndex: 'category' },
      { title: '字数', dataIndex: 'word_count', render: (val: unknown) => formatWordCount(val as number) },
      { title: '章节数', dataIndex: 'chapter_count' },
      { title: '状态', dataIndex: 'status' },
      { title: '创建时间', dataIndex: 'created_at', render: (val: unknown) => dayjs(val as string).format('YYYY-MM-DD HH:mm') },
    ]
    exportToExcel<NovelRecord>(filteredData, columns, '小说管理')
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
            preview={false}
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
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      sorter: (a, b) => a.title.localeCompare(b.title),
      ellipsis: true,
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
      width: 80,
      filters: categoryOptions.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.category === value,
      render: (category: string) => (
        category ? (
          <Tag color={categoryColors[category] || 'default'}>{categoryOptions.find(opt => opt.value === category)?.label || category}</Tag>
        ) : '-'
      ),
    },
    {
      title: '字数',
      dataIndex: 'word_count',
      key: 'word_count',
      width: 100,
      sorter: (a, b) => a.word_count - b.word_count,
      render: (wordCount: number) => formatWordCount(wordCount),
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
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 80,
      render: (source: string) => source || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      filters: statusOptions.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.status === value,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {statusOptions.find(opt => opt.value === status)?.label || status || '连载'}
        </Tag>
      ),
    },
    {
      title: '收藏量',
      dataIndex: 'collect_count',
      key: 'collect_count',
      width: 90,
      sorter: (a, b) => a.collect_count - b.collect_count,
      render: (count: number) => (
        <Space>
          <StarOutlined style={{ color: '#faad14' }} />
          <span>{count.toLocaleString()}</span>
        </Space>
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 80,
      sorter: (a, b) => a.rating - b.rating,
      render: (rating: number) => (
        <span style={{ color: rating >= 4 ? '#52c41a' : rating >= 3 ? '#faad14' : '#ff4d4f', fontWeight: 500 }}>
          {rating > 0 ? rating.toFixed(1) : '-'}
        </span>
      ),
    },
    // is_published 列已移除，所有公开小说都对用户可见
    getActionColumn<NovelRecord>(
      (record) => {
        const actions: import('../components/ActionColumn').ActionButton[] = [
          {
            key: 'chapters',
            label: '章节',
            icon: <EyeOutlined />,
            onClick: () => handleViewChapters(record),
          },
        ]
        if (canWriteNovels) {
          actions.push({
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          })
        }
        if (canDeleteNovels) {
          actions.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDelete(record.id),
          })
        }
        return actions
      },
      { width: 240, maxVisible: 2 }
    ),
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
    return <NoPermission module="小说" />
  }

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          小说管理
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
        searchPlaceholder="搜索标题、作者"
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
              description={`确认删除选中的 ${selectedRowKeys.length} 条数据？关联章节也将被一并删除。`}
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
          scroll={{ x: 1200 }}
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

      {/* 章节管理弹窗 */}
      <NovelChapterModal
        open={chapterModalOpen}
        novelId={selectedNovel?.id || ''}
        novelTitle={selectedNovel?.title || ''}
        onClose={handleCloseChapterModal}
      />
    </div>
  )
}

export default Novels
