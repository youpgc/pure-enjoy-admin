import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  Switch,
  Select,
} from 'antd'
import type { TablePaginationConfig, ColumnsType } from 'antd/es/table'
import type { Key } from 'react'
import {
  PlusOutlined,
  ExportOutlined,
  DeleteOutlined,
  EditOutlined,
  DownOutlined,
  PushpinOutlined,
  PushpinFilled,
  UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import DataFormModal, { FormField } from '../components/DataFormModal'
import FilterBar, { FilterField } from '../components/FilterBar'
import { NOTE_CATEGORY_OPTIONS } from '../utils/mockData'
import { exportToCSV, exportToExcel } from '../utils/export'
import { usePermission } from '../hooks/usePermission'
import { supabase } from '../utils/supabase'

const { Title } = Typography

// ==================== 类型定义 ====================

interface NoteRecord {
  id: string
  key: string
  user_id: string
  user_name?: string
  nickname?: string
  title: string
  content: string
  category: string
  tags: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}

interface UserOption {
  id: string
  username: string | null
  nickname: string | null
}

// ==================== 主组件 ====================

const Notes: React.FC = () => {
  const {
    canReadNotes,
    canWriteNotes,
    canDeleteNotes,
    canExportNotes,
  } = usePermission()

  // 状态
  const [data, setData] = useState<NoteRecord[]>([])
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

  // 用户选择器
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined)

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingRecord, setEditingRecord] = useState<NoteRecord | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // ==================== 数据加载 ====================

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, nickname')
      if (error) throw error
      setUserOptions(data || [])
    } catch (err) {
      console.error('加载用户列表失败:', err)
    }
  }, [])

  const fetchData = useCallback(async (userId?: string) => {
    setLoading(true)
    try {
      let query = supabase
        .from('notes')
        .select('*, users(username, nickname)')

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query
      if (error) throw error

      const records: NoteRecord[] = (data || []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        key: item.id as string,
        user_id: item.user_id as string,
        user_name: (item.users as Record<string, unknown>)?.username as string || '',
        nickname: (item.users as Record<string, unknown>)?.nickname as string || '',
        title: item.title as string,
        content: (item.content as string) || '',
        category: (item.category as string) || '',
        tags: (item.tags as string[]) || [],
        is_pinned: (item.is_pinned as boolean) || false,
        created_at: item.created_at as string,
        updated_at: item.updated_at as string,
      }))

      setData(records)
    } catch (err) {
      console.error('加载笔记失败:', err)
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    fetchData(selectedUserId)
  }, [selectedUserId, fetchData])

  // ==================== 筛选配置 ====================

  const filterFields: FilterField[] = [
    {
      name: 'category',
      label: '分类',
      type: 'select',
      options: NOTE_CATEGORY_OPTIONS,
      placeholder: '选择分类',
    },
  ]

  // ==================== 表单配置 ====================

  const formFields: FormField[] = [
    {
      name: 'title',
      label: '标题',
      type: 'text',
      required: true,
      placeholder: '请输入笔记标题',
    },
    {
      name: 'content',
      label: '内容',
      type: 'textarea',
      rows: 6,
      placeholder: '记录笔记内容...',
    },
    {
      name: 'category',
      label: '分类',
      type: 'select',
      required: false,
      options: NOTE_CATEGORY_OPTIONS,
      placeholder: '选择分类',
    },
    {
      name: 'tags',
      label: '标签',
      type: 'tags',
      placeholder: '输入标签后按回车添加',
    },
    {
      name: 'is_pinned',
      label: '置顶',
      type: 'switch',
      defaultValue: false,
    },
  ]

  // ==================== 数据处理 ====================

  const filteredData = useMemo(() => {
    let result = [...data]

    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase()
      result = result.filter((record) => {
        return (
          record.title?.toLowerCase().includes(keyword) ||
          record.content?.toLowerCase().includes(keyword) ||
          record.category?.toLowerCase().includes(keyword) ||
          record.tags?.some((tag) => tag.toLowerCase().includes(keyword))
        )
      })
    }

    if (filterValues.category) {
      result = result.filter((record) => record.category === filterValues.category)
    }

    // 排序：置顶优先，然后按更新时间降序
    result.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

    return result
  }, [data, searchText, filterValues])

  // ==================== 操作处理 ====================

  const handleCreate = useCallback(() => {
    if (!canWriteNotes) {
      message.warning('您没有新增笔记的权限')
      return
    }
    setModalMode('create')
    setEditingRecord(null)
    setModalOpen(true)
  }, [canWriteNotes])

  const handleEdit = useCallback(
    (record: NoteRecord) => {
      if (!canWriteNotes) {
        message.warning('您没有编辑笔记的权限')
        return
      }
      setModalMode('edit')
      setEditingRecord(record)
      setModalOpen(true)
    },
    [canWriteNotes]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      if (!canDeleteNotes) {
        message.warning('您没有删除笔记的权限')
        return
      }
      try {
        const { error } = await supabase.from('notes').delete().eq('id', id)
        if (error) throw error
        setData((prev) => prev.filter((item) => item.id !== id))
        message.success('删除成功')
      } catch (err) {
        message.error('删除失败')
      }
    },
    [canDeleteNotes]
  )

  const handleBatchDelete = useCallback(async () => {
    if (!canDeleteNotes) {
      message.warning('您没有删除笔记的权限')
      return
    }
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据')
      return
    }
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) throw error
      setData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)))
      setSelectedRowKeys([])
      message.success(`成功删除 ${selectedRowKeys.length} 条数据`)
    } catch (err) {
      message.error('批量删除失败')
    }
  }, [selectedRowKeys, canDeleteNotes])

  const handleTogglePin = useCallback(
    async (id: string, isPinned: boolean) => {
      if (!canWriteNotes) {
        message.warning('您没有编辑笔记的权限')
        return
      }
      try {
        const { error } = await supabase
          .from('notes')
          .update({ is_pinned: !isPinned })
          .eq('id', id)
        if (error) throw error
        setData((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, is_pinned: !isPinned, updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss') }
              : item
          )
        )
        message.success(isPinned ? '已取消置顶' : '已置顶')
      } catch (err) {
        message.error('操作失败')
      }
    },
    [canWriteNotes]
  )

  const handleFormSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setConfirmLoading(true)
      try {
        if (modalMode === 'create') {
          const { data: newData, error } = await supabase
            .from('notes')
            .insert({
              user_id: 'current_user_id',
              title: values.title,
              content: values.content || '',
              category: values.category || '',
              tags: values.tags || [],
              is_pinned: values.is_pinned || false,
            })
            .select('*, users(username, nickname)')
            .single()

          if (error) throw error

          if (newData) {
            const newRecord: NoteRecord = {
              id: newData.id,
              key: newData.id,
              user_id: newData.user_id,
              user_name: newData.users?.username || '',
              nickname: newData.users?.nickname || '',
              title: newData.title,
              content: newData.content || '',
              category: newData.category || '',
              tags: newData.tags || [],
              is_pinned: newData.is_pinned || false,
              created_at: newData.created_at,
              updated_at: newData.updated_at,
            }
            setData((prev) => [newRecord, ...prev])
          }
          message.success('新增成功')
        } else if (editingRecord) {
          const { error } = await supabase
            .from('notes')
            .update({
              title: values.title,
              content: values.content || '',
              category: values.category || '',
              tags: values.tags || [],
              is_pinned: values.is_pinned || false,
            })
            .eq('id', editingRecord.id)

          if (error) throw error

          setData((prev) =>
            prev.map((item) =>
              item.id === editingRecord.id
                ? {
                    ...item,
                    title: values.title as string,
                    content: (values.content as string) || '',
                    category: (values.category as string) || '',
                    tags: (values.tags as string[]) || [],
                    is_pinned: (values.is_pinned as boolean) || false,
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

  const handleExportCSV = useCallback(() => {
    if (!canExportNotes) {
      message.warning('您没有导出笔记的权限')
      return
    }
    const columns = [
      { title: '用户', dataIndex: 'nickname' },
      { title: '标题', dataIndex: 'title' },
      { title: '内容', dataIndex: 'content' },
      { title: '分类', dataIndex: 'category' },
      { title: '标签', dataIndex: 'tags', render: (val: unknown) => Array.isArray(val) ? val.join(', ') : '' },
      { title: '置顶', dataIndex: 'is_pinned', render: (val: unknown) => val ? '是' : '否' },
      { title: '更新时间', dataIndex: 'updated_at' },
    ]
    exportToCSV<NoteRecord>(filteredData, columns, '笔记')
    message.success('CSV 导出成功')
  }, [filteredData, canExportNotes])

  const handleExportExcel = useCallback(() => {
    if (!canExportNotes) {
      message.warning('您没有导出笔记的权限')
      return
    }
    const columns = [
      { title: '用户', dataIndex: 'nickname' },
      { title: '标题', dataIndex: 'title' },
      { title: '内容', dataIndex: 'content' },
      { title: '分类', dataIndex: 'category' },
      { title: '标签', dataIndex: 'tags', render: (val: unknown) => Array.isArray(val) ? val.join(', ') : '' },
      { title: '置顶', dataIndex: 'is_pinned', render: (val: unknown) => val ? '是' : '否' },
      { title: '更新时间', dataIndex: 'updated_at' },
    ]
    exportToExcel<NoteRecord>(filteredData, columns, '笔记')
    message.success('Excel 导出成功')
  }, [filteredData, canExportNotes])

  const handleReset = useCallback(() => {
    setSearchText('')
    setFilterValues({})
    setSelectedRowKeys([])
    setPagination((prev) => ({ ...prev, current: 1 }))
  }, [])

  const handleUserChange = useCallback((userId: string | undefined) => {
    setSelectedUserId(userId)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }, [])

  // ==================== 表格列配置 ====================

  const columns: ColumnsType<NoteRecord> = [
    {
      title: '用户',
      key: 'user',
      width: 120,
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <span>{record.nickname || record.user_name || '未知用户'}</span>
        </Space>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      sorter: (a, b) => a.title.localeCompare(b.title),
      render: (title: string, record) => (
        <Space>
          {record.is_pinned && (
            <Tooltip title="已置顶">
              <PushpinFilled style={{ color: '#faad14' }} />
            </Tooltip>
          )}
          <span>{title}</span>
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
          <span style={{ color: '#666' }}>
            {content ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      filters: NOTE_CATEGORY_OPTIONS.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.category === value,
      render: (category: string) => (
        category ? <Tag color="blue">{category}</Tag> : '-'
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 180,
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {tags?.slice(0, 3).map((tag) => (
            <Tag key={tag} color="cyan">
              {tag}
            </Tag>
          ))}
          {tags && tags.length > 3 && (
            <Tag>+{tags.length - 3}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '置顶',
      dataIndex: 'is_pinned',
      key: 'is_pinned',
      width: 80,
      render: (isPinned: boolean, record) => (
        canWriteNotes ? (
          <Switch
            checked={isPinned}
            onChange={() => handleTogglePin(record.id, isPinned)}
            size="small"
            checkedChildren={<PushpinFilled />}
            unCheckedChildren={<PushpinOutlined />}
          />
        ) : (
          isPinned ? <Tag color="gold">置顶</Tag> : '-'
        )
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      sorter: (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {canWriteNotes && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )}
          {canDeleteNotes && (
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

  if (!canReadNotes) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Title level={4} type="secondary">
            您没有查看笔记的权限
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
          笔记管理
        </Title>
        <Space>
          {/* 用户选择器 */}
          <Select
            placeholder="选择用户"
            allowClear
            showSearch
            style={{ width: 200 }}
            value={selectedUserId}
            onChange={handleUserChange}
            filterOption={(input, option) =>
              (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={userOptions.map((u) => ({
              value: u.id,
              label: u.nickname || u.username || u.id,
            }))}
          />
          {canWriteNotes && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新增笔记
            </Button>
          )}
          {canExportNotes && (
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
        searchPlaceholder="搜索标题、内容、分类或标签"
        searchText={searchText}
        onSearchTextChange={setSearchText}
        loading={loading}
      />

      {/* 批量操作栏 */}
      {selectedRowKeys.length > 0 && canDeleteNotes && (
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
        <Table<NoteRecord>
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
            canDeleteNotes
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
        title={modalMode === 'create' ? '新增笔记' : '编辑笔记'}
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

export default Notes
