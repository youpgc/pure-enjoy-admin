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
import { mockExpenses, MockExpense, EXPENSE_CATEGORY_OPTIONS } from '../utils/mockData'
import { exportToCSV, exportToExcel } from '../utils/export'
import { usePermission } from '../hooks/usePermission'

const { Title } = Typography

// ==================== 类型定义 ====================

interface ExpenseRecord extends MockExpense {
  key: string
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
  const [data, setData] = useState<ExpenseRecord[]>(
    mockExpenses.map((item) => ({ ...item, key: item.id }))
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
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

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
        return (
          record.user_name?.toLowerCase().includes(keyword) ||
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
    (id: string) => {
      if (!canDeleteExpenses) {
        message.warning('您没有删除消费记录的权限')
        return
      }
      setData((prev) => prev.filter((item) => item.id !== id))
      message.success('删除成功')
    },
    [canDeleteExpenses]
  )

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (!canDeleteExpenses) {
      message.warning('您没有删除消费记录的权限')
      return
    }
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据')
      return
    }
    setData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)))
    setSelectedRowKeys([])
    message.success(`成功删除 ${selectedRowKeys.length} 条数据`)
  }, [selectedRowKeys, canDeleteExpenses])

  // 表单提交
  const handleFormSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setConfirmLoading(true)
      try {
        // 模拟异步操作
        await new Promise((resolve) => setTimeout(resolve, 500))

        if (modalMode === 'create') {
          const newRecord: ExpenseRecord = {
            id: `expense_${Date.now()}`,
            key: `expense_${Date.now()}`,
            user_id: 'current_user_id',
            user_name: '当前用户',
            amount: values.amount as number,
            category: values.category as string,
            note: (values.note as string) || '',
            date: values.date as string,
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
                    ...values,
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
      { title: '用户ID', dataIndex: 'user_id' },
      { title: '用户名', dataIndex: 'user_name' },
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
      { title: '用户ID', dataIndex: 'user_id' },
      { title: '用户名', dataIndex: 'user_name' },
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

  // ==================== 表格列配置 ====================

  const columns: ColumnsType<ExpenseRecord> = [
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
          scroll={{ x: 1000 }}
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
