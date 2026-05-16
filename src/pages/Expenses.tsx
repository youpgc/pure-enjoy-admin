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
  UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import DataFormModal, { FormField } from '../components/DataFormModal'
import FilterBar, { FilterField } from '../components/FilterBar'
import { EXPENSE_CATEGORY_OPTIONS } from '../utils/mockData'
import { exportToCSV, exportToExcel } from '../utils/export'
import { usePermission } from '../hooks/usePermission'
import { supabase } from '../utils/supabase'

const { Title } = Typography

// ==================== 类型定义 ====================

interface ExpenseRecord {
  id: string
  key: string
  user_id: string
  user_name?: string
  nickname?: string
  amount: number
  category: string
  note: string
  date: string
  created_at: string
  updated_at: string
}

interface UserOption {
  id: string
  username: string | null
  nickname: string | null
}

// ==================== 常量定义 ====================

const CATEGORY_COLORS: Record<string, string> = {
  '餐饮': 'red',
  '交通': 'blue',
  '购物': 'green',
  '娱乐': 'purple',
  '其他': 'orange',
}

// ==================== 主组件 ====================

const Expenses: React.FC = () => {
  const {
    canReadExpenses,
    canWriteExpenses,
    canDeleteExpenses,
    canExportExpenses,
  } = usePermission()

  // 状态
  const [data, setData] = useState<ExpenseRecord[]>([])
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
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // ==================== 数据加载 ====================

  // 加载用户列表
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

  // 加载消费记录
  const fetchData = useCallback(async (userId?: string) => {
    setLoading(true)
    try {
      let query = supabase
        .from('expenses')
        .select('*, users(username, nickname)')
        .order('date', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error

      const records: ExpenseRecord[] = (data || []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        key: item.id as string,
        user_id: item.user_id as string,
        user_name: (item.users as Record<string, unknown>)?.username as string || '',
        nickname: (item.users as Record<string, unknown>)?.nickname as string || '',
        amount: item.amount as number,
        category: item.category as string,
        note: (item.note as string) || '',
        date: item.date as string,
        created_at: item.created_at as string,
        updated_at: item.updated_at as string,
      }))

      setData(records)
    } catch (err) {
      console.error('加载消费记录失败:', err)
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
      options: EXPENSE_CATEGORY_OPTIONS,
      placeholder: '选择分类',
    },
    {
      name: 'amountRange',
      label: '金额范围',
      type: 'numberRange',
      placeholder: '金额范围',
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
      name: 'amount',
      label: '金额',
      type: 'number',
      required: true,
      min: 0,
      max: 1000000,
      precision: 2,
      placeholder: '请输入金额',
    },
    {
      name: 'category',
      label: '分类',
      type: 'select',
      required: true,
      options: EXPENSE_CATEGORY_OPTIONS,
      placeholder: '请选择分类',
    },
    {
      name: 'note',
      label: '备注',
      type: 'textarea',
      rows: 3,
      placeholder: '请输入备注信息',
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
        const displayName = record.nickname || record.user_name || ''
        return (
          displayName.toLowerCase().includes(keyword) ||
          record.category?.toLowerCase().includes(keyword) ||
          record.note?.toLowerCase().includes(keyword)
        )
      })
    }

    // 分类筛选
    if (filterValues.category) {
      result = result.filter((record) => record.category === filterValues.category)
    }

    // 金额范围筛选
    if (filterValues.amountRange && Array.isArray(filterValues.amountRange)) {
      const [min, max] = filterValues.amountRange as [number | null, number | null]
      result = result.filter((record) => {
        if (min !== null && record.amount < min) return false
        if (max !== null && record.amount > max) return false
        return true
      })
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
    if (!canWriteExpenses) {
      message.warning('您没有新增消费记录的权限')
      return
    }
    setModalMode('create')
    setEditingRecord(null)
    setModalOpen(true)
  }, [canWriteExpenses])

  // 编辑
  const handleEdit = useCallback(
    (record: ExpenseRecord) => {
      if (!canWriteExpenses) {
        message.warning('您没有编辑消费记录的权限')
        return
      }
      setModalMode('edit')
      setEditingRecord(record)
      setModalOpen(true)
    },
    [canWriteExpenses]
  )

  // 删除单条
  const handleDelete = useCallback(
    async (id: string) => {
      if (!canDeleteExpenses) {
        message.warning('您没有删除消费记录的权限')
        return
      }
      try {
        const { error } = await supabase.from('expenses').delete().eq('id', id)
        if (error) throw error
        setData((prev) => prev.filter((item) => item.id !== id))
        message.success('删除成功')
      } catch (err) {
        message.error('删除失败')
      }
    },
    [canDeleteExpenses]
  )

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (!canDeleteExpenses) {
      message.warning('您没有删除消费记录的权限')
      return
    }
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据')
      return
    }
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) throw error
      setData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)))
      setSelectedRowKeys([])
      message.success(`成功删除 ${selectedRowKeys.length} 条数据`)
    } catch (err) {
      message.error('批量删除失败')
    }
  }, [selectedRowKeys, canDeleteExpenses])

  // 表单提交
  const handleFormSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setConfirmLoading(true)
      try {
        if (modalMode === 'create') {
          const { data: newData, error } = await supabase
            .from('expenses')
            .insert({
              user_id: 'current_user_id',
              amount: values.amount,
              category: values.category,
              note: values.note || '',
              date: values.date,
            })
            .select('*, users(username, nickname)')
            .single()

          if (error) throw error

          if (newData) {
            const newRecord: ExpenseRecord = {
              id: newData.id,
              key: newData.id,
              user_id: newData.user_id,
              user_name: newData.users?.username || '',
              nickname: newData.users?.nickname || '',
              amount: newData.amount,
              category: newData.category,
              note: newData.note || '',
              date: newData.date,
              created_at: newData.created_at,
              updated_at: newData.updated_at,
            }
            setData((prev) => [newRecord, ...prev])
          }
          message.success('新增成功')
        } else if (editingRecord) {
          const { error } = await supabase
            .from('expenses')
            .update({
              amount: values.amount,
              category: values.category,
              note: values.note || '',
              date: values.date,
            })
            .eq('id', editingRecord.id)

          if (error) throw error

          setData((prev) =>
            prev.map((item) =>
              item.id === editingRecord.id
                ? {
                    ...item,
                    amount: values.amount as number,
                    category: values.category as string,
                    note: (values.note as string) || '',
                    date: values.date as string,
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
    if (!canExportExpenses) {
      message.warning('您没有导出消费记录的权限')
      return
    }
    const columns = [
      { title: '用户', dataIndex: 'nickname' },
      { title: '金额', dataIndex: 'amount' },
      { title: '分类', dataIndex: 'category' },
      { title: '备注', dataIndex: 'note' },
      { title: '日期', dataIndex: 'date' },
    ]
    exportToCSV<ExpenseRecord>(filteredData, columns, '消费记录')
    message.success('CSV 导出成功')
  }, [filteredData, canExportExpenses])

  const handleExportExcel = useCallback(() => {
    if (!canExportExpenses) {
      message.warning('您没有导出消费记录的权限')
      return
    }
    const columns = [
      { title: '用户', dataIndex: 'nickname' },
      { title: '金额', dataIndex: 'amount' },
      { title: '分类', dataIndex: 'category' },
      { title: '备注', dataIndex: 'note' },
      { title: '日期', dataIndex: 'date' },
    ]
    exportToExcel<ExpenseRecord>(filteredData, columns, '消费记录')
    message.success('Excel 导出成功')
  }, [filteredData, canExportExpenses])

  // 重置
  const handleReset = useCallback(() => {
    setSearchText('')
    setFilterValues({})
    setSelectedRowKeys([])
    setPagination((prev) => ({ ...prev, current: 1 }))
  }, [])

  // 用户选择变更
  const handleUserChange = useCallback((userId: string | undefined) => {
    setSelectedUserId(userId)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }, [])

  // ==================== 表格列配置 ====================

  const columns: ColumnsType<ExpenseRecord> = [
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
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      sorter: (a, b) => a.amount - b.amount,
      render: (amount: number) => (
        <Tag color="red">¥{amount.toFixed(2)}</Tag>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      filters: EXPENSE_CATEGORY_OPTIONS.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.category === value,
      render: (category: string) => (
        <Tag color={CATEGORY_COLORS[category] || 'default'}>{category}</Tag>
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      width: 200,
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
          {canWriteExpenses && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )}
          {canDeleteExpenses && (
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

  if (!canReadExpenses) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Title level={4} type="secondary">
            您没有查看消费记录的权限
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
          消费记录管理
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
          {canWriteExpenses && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新增记录
            </Button>
          )}
          {canExportExpenses && (
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
        searchPlaceholder="搜索用户名、分类或备注"
        searchText={searchText}
        onSearchTextChange={setSearchText}
        loading={loading}
      />

      {/* 批量操作栏 */}
      {selectedRowKeys.length > 0 && canDeleteExpenses && (
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
        <Table<ExpenseRecord>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            total: filteredData.length,
          }}
          onChange={(pag) => setPagination(pag)}
          scroll={{ x: 900 }}
          rowSelection={
            canDeleteExpenses
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
        title={modalMode === 'create' ? '新增消费记录' : '编辑消费记录'}
        mode={modalMode}
        fields={formFields}
        initialValues={editingRecord ? { ...editingRecord } : undefined}
        onOk={handleFormSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={confirmLoading}
        width={500}
      />
    </div>
  )
}

export default Expenses
