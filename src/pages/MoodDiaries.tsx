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
} from '@ant-design/icons'
import dayjs from 'dayjs'
import DataFormModal, { FormField } from '../components/DataFormModal'
import FilterBar, { FilterField } from '../components/FilterBar'
import { MOOD_OPTIONS } from '../utils/mockData'
import { exportToCSV, exportToExcel } from '../utils/export'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

const { Title } = Typography

// ==================== 类型定义 ====================

interface MoodDiaryRecord {
  id: string
  key: string
  user_id: string
  user_name: string
  mood: string
  mood_label: string
  tags: string[]
  content: string
  date: string
  created_at: string
  updated_at: string
}

// ==================== 常量定义 ====================

const MOOD_EMOJI_MAP: Record<string, string> = {
  '开心': '😊',
  '平静': '😌',
  '一般': '😐',
  '难过': '😢',
  '焦虑': '😰',
}

// ==================== 主组件 ====================

const MoodDiaries: React.FC = () => {
  const {
    canReadMoods,
    canWriteMoods,
    canDeleteMoods,
    canExportMoods,
  } = usePermission()

  // 状态
  const [data, setData] = useState<MoodDiaryRecord[]>([])
  const [loading, setLoading] = useState(true)
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
  const [editingRecord, setEditingRecord] = useState<MoodDiaryRecord | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // 加载数据
  const fetchMoodDiaries = useCallback(async () => {
    setLoading(true)
    try {
      const { data: diaries, error } = await supabase
        .from('mood_diaries')
        .select('*, users:user_id(nickname)')
        .order('date', { ascending: false })

      if (error) throw error

      const records: MoodDiaryRecord[] = (diaries || []).map((item: any) => ({
        ...item,
        key: item.id,
        user_name: item.users?.nickname || '未知用户',
        tags: item.tags || [],
      }))

      setData(records)
    } catch (error) {
      console.error('获取心情日记失败:', error)
      message.error('获取心情日记失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMoodDiaries()
  }, [fetchMoodDiaries])

  // ==================== 筛选配置 ====================

  const filterFields: FilterField[] = [
    {
      name: 'mood',
      label: '心情',
      type: 'select',
      options: MOOD_OPTIONS,
      placeholder: '选择心情',
    },
    {
      name: 'dateRange',
      label: '日期范围',
      type: 'dateRange',
      placeholder: '选择日期范围',
    },
  ]

  // ==================== 表单配置 ====================

  const formFields: FormField[] = [
    {
      name: 'mood',
      label: '心情',
      type: 'emoji',
      required: true,
    },
    {
      name: 'tags',
      label: '标签',
      type: 'tags',
      placeholder: '输入标签后按回车添加',
    },
    {
      name: 'content',
      label: '内容',
      type: 'textarea',
      rows: 4,
      placeholder: '记录今天的心情...',
    },
    {
      name: 'date',
      label: '日期',
      type: 'date',
      required: true,
      defaultValue: dayjs().format('YYYY-MM-DD'),
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
          record.user_name?.toLowerCase().includes(keyword) ||
          record.mood?.toLowerCase().includes(keyword) ||
          record.content?.toLowerCase().includes(keyword) ||
          record.tags?.some((tag) => tag.toLowerCase().includes(keyword))
        )
      })
    }

    // 心情筛选
    if (filterValues.mood) {
      result = result.filter((record) => record.mood === filterValues.mood)
    }

    // 日期范围筛选
    if (filterValues.dateRange && Array.isArray(filterValues.dateRange)) {
      const [startDate, endDate] = filterValues.dateRange as [string, string]
      if (startDate && endDate) {
        result = result.filter((record) => {
          return record.date >= startDate && record.date <= endDate
        })
      }
    }

    return result
  }, [data, searchText, filterValues])

  // ==================== 操作处理 ====================

  // 新增
  const handleCreate = useCallback(() => {
    if (!canWriteMoods) {
      message.warning('您没有新增心情日记的权限')
      return
    }
    setModalMode('create')
    setEditingRecord(null)
    setModalOpen(true)
  }, [canWriteMoods])

  // 编辑
  const handleEdit = useCallback(
    (record: MoodDiaryRecord) => {
      if (!canWriteMoods) {
        message.warning('您没有编辑心情日记的权限')
        return
      }
      setModalMode('edit')
      setEditingRecord(record)
      setModalOpen(true)
    },
    [canWriteMoods]
  )

  // 删除单条
  const handleDelete = useCallback(
    async (id: string) => {
      if (!canDeleteMoods) {
        message.warning('您没有删除心情日记的权限')
        return
      }
      try {
        const { error } = await supabase.from('mood_diaries').delete().eq('id', id)
        if (error) throw error
        setData((prev) => prev.filter((item) => item.id !== id))
        message.success('删除成功')
      } catch (error) {
        console.error('删除失败:', error)
        message.error('删除失败')
      }
    },
    [canDeleteMoods]
  )

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (!canDeleteMoods) {
      message.warning('您没有删除心情日记的权限')
      return
    }
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据')
      return
    }
    try {
      const { error } = await supabase
        .from('mood_diaries')
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
  }, [selectedRowKeys, canDeleteMoods])

  // 表单提交
  const handleFormSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setConfirmLoading(true)
      try {
        if (modalMode === 'create') {
          const { error } = await supabase.from('mood_diaries').insert({
            mood: values.mood as string,
            mood_label: MOOD_OPTIONS.find((opt) => opt.value === values.mood)?.label || '',
            tags: (values.tags as string[]) || [],
            content: (values.content as string) || '',
            date: values.date as string,
          })
          if (error) throw error
          message.success('新增成功')
        } else {
          const { error } = await supabase
            .from('mood_diaries')
            .update({
              mood: values.mood as string,
              mood_label: MOOD_OPTIONS.find((opt) => opt.value === values.mood)?.label || '',
              tags: (values.tags as string[]) || [],
              content: (values.content as string) || '',
              date: values.date as string,
            })
            .eq('id', editingRecord?.id)
          if (error) throw error
          message.success('更新成功')
        }
        setModalOpen(false)
        fetchMoodDiaries()
      } catch (error) {
        console.error('操作失败:', error)
        message.error('操作失败，请重试')
      } finally {
        setConfirmLoading(false)
      }
    },
    [modalMode, editingRecord, fetchMoodDiaries]
  )

  // 导出
  const handleExportCSV = useCallback(() => {
    if (!canExportMoods) {
      message.warning('您没有导出心情日记的权限')
      return
    }
    const columns = [
      { title: '用户ID', dataIndex: 'user_id' },
      { title: '用户名', dataIndex: 'user_name' },
      { title: '心情', dataIndex: 'mood' },
      { title: '标签', dataIndex: 'tags', render: (val: unknown) => Array.isArray(val) ? val.join(', ') : '' },
      { title: '内容', dataIndex: 'content' },
      { title: '日期', dataIndex: 'date' },
    ]
    exportToCSV<MoodDiaryRecord>(filteredData, columns, '心情日记')
    message.success('CSV 导出成功')
  }, [filteredData, canExportMoods])

  const handleExportExcel = useCallback(() => {
    if (!canExportMoods) {
      message.warning('您没有导出心情日记的权限')
      return
    }
    const columns = [
      { title: '用户ID', dataIndex: 'user_id' },
      { title: '用户名', dataIndex: 'user_name' },
      { title: '心情', dataIndex: 'mood' },
      { title: '标签', dataIndex: 'tags', render: (val: unknown) => Array.isArray(val) ? val.join(', ') : '' },
      { title: '内容', dataIndex: 'content' },
      { title: '日期', dataIndex: 'date' },
    ]
    exportToExcel<MoodDiaryRecord>(filteredData, columns, '心情日记')
    message.success('Excel 导出成功')
  }, [filteredData, canExportMoods])

  // 重置
  const handleReset = useCallback(() => {
    setSearchText('')
    setFilterValues({})
    setSelectedRowKeys([])
    setPagination((prev) => ({ ...prev, current: 1 }))
  }, [])

  // ==================== 表格列配置 ====================

  const columns: ColumnsType<MoodDiaryRecord> = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 180,
      ellipsis: true,
      sorter: (a, b) => a.user_id.localeCompare(b.user_id),
    },
    {
      title: '用户名',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 100,
    },
    {
      title: '心情',
      dataIndex: 'mood',
      key: 'mood',
      width: 100,
      filters: MOOD_OPTIONS.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.mood === value,
      render: (mood: string) => (
        <Tooltip title={mood}>
          <span style={{ fontSize: 24, cursor: 'pointer' }}>
            {MOOD_EMOJI_MAP[mood] || '😐'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 180,
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {tags?.map((tag) => (
            <Tag key={tag} color="blue">
              {tag}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 300,
      render: (content: string) => (
        <Tooltip title={content}>
          <span>{content || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => a.date.localeCompare(b.date),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {canWriteMoods && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )}
          {canDeleteMoods && (
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

  if (!canReadMoods) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Title level={4} type="secondary">
            您没有查看心情日记的权限
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
          心情日记管理
        </Title>
        <Space>
          {canWriteMoods && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新增日记
            </Button>
          )}
          {canExportMoods && (
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
        searchPlaceholder="搜索用户名、心情、内容或标签"
        searchText={searchText}
        onSearchTextChange={setSearchText}
        loading={loading}
      />

      {/* 批量操作栏 */}
      {selectedRowKeys.length > 0 && canDeleteMoods && (
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
        <Table<MoodDiaryRecord>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            total: filteredData.length,
          }}
          onChange={(pag) => setPagination(pag)}
          scroll={{ x: 1100 }}
          rowSelection={
            canDeleteMoods
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
        title={modalMode === 'create' ? '新增心情日记' : '编辑心情日记'}
        mode={modalMode}
        fields={formFields}
        initialValues={editingRecord ? { ...editingRecord } : undefined}
        onOk={handleFormSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={confirmLoading}
        width={550}
      />
    </div>
  )
}

export default MoodDiaries
