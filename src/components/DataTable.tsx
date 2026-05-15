import React, { useState, useMemo, useCallback } from 'react'
import {
  Table,
  Input,
  Button,
  Space,
  Popconfirm,
  message,
  Dropdown,
  Tag,
  DatePicker,
  Row,
  Col,
} from 'antd'
import type { TablePaginationConfig, ColumnType as AntColumnType } from 'antd/es/table'
import type { Key } from 'react'
import {
  SearchOutlined,
  ExportOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  FilterOutlined,
  DownOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { exportToCSV, exportToExcel } from '../utils/export'

const { RangePicker } = DatePicker

// ==================== 类型定义 ====================
export interface FilterField {
  name: string
  label: string
  type: 'input' | 'select' | 'dateRange'
  options?: { label: string; value: string }[]
  placeholder?: string
}

export interface DataType {
  id: string
  [key: string]: unknown
}

export interface ColumnType extends AntColumnType<DataType> {
  exportTitle?: string
  exportRender?: (value: unknown, record: DataType) => string
}

export interface DataTableProps {
  title: string
  columns: ColumnType[]
  data: DataType[]
  onExport?: () => void
  onDelete?: (ids: string[]) => void
  onView?: (record: DataType) => void
  onEdit?: (record: DataType) => void
  loading?: boolean
  searchPlaceholder?: string
  filterFields?: FilterField[]
}

// ==================== 组件 ====================
const DataTable: React.FC<DataTableProps> = ({
  title,
  columns,
  data,
  onExport,
  onDelete,
  onView,
  onEdit,
  loading = false,
  searchPlaceholder = '搜索关键词...',
  filterFields = [],
}) => {
  const [searchText, setSearchText] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({})
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total) => `共 ${total} 条`,
  })

  // ==================== 搜索与筛选 ====================
  const filteredData = useMemo(() => {
    let result = [...data]

    // 关键词搜索
    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase()
      result = result.filter(record => {
        return Object.values(record).some(value => {
          if (value === null || value === undefined) return false
          return String(value).toLowerCase().includes(keyword)
        })
      })
    }

    // 高级筛选
    filterFields.forEach(field => {
      const val = filterValues[field.name]
      if (val === undefined || val === null || val === '') return

      if (field.type === 'input' || field.type === 'select') {
        const filterStr = String(val).toLowerCase()
        result = result.filter(record => {
          const recordVal = record[field.name]
          if (recordVal === null || recordVal === undefined) return false
          return String(recordVal).toLowerCase().includes(filterStr)
        })
      }

      if (field.type === 'dateRange') {
        const dateRange = val as [string, string]
        if (dateRange && dateRange[0] && dateRange[1]) {
          result = result.filter(record => {
            const recordDate = record[field.name] as string
            if (!recordDate) return false
            return recordDate >= dateRange[0] && recordDate <= dateRange[1]
          })
        }
      }
    })

    return result
  }, [data, searchText, filterValues, filterFields])

  // ==================== 操作列 ====================
  const actionColumn: ColumnType = {
    title: '操作',
    key: 'action',
    fixed: 'right',
    width: 180,
    render: (_: unknown, record: DataType) => (
      <Space size="small">
        {onView && (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
          >
            查看
          </Button>
        )}
        {onEdit && (
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
        )}
        {onDelete && (
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否继续？"
            onConfirm={() => {
              onDelete([record.id])
              setSelectedRowKeys(prev => prev.filter(k => k !== record.id))
            }}
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
  }

  const allColumns = [...columns, actionColumn]

  // ==================== 批量删除 ====================
  const handleBatchDelete = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据')
      return
    }
    if (onDelete) {
      onDelete(selectedRowKeys.map(k => String(k)))
      setSelectedRowKeys([])
      message.success(`成功删除 ${selectedRowKeys.length} 条数据`)
    }
  }, [selectedRowKeys, onDelete])

  // ==================== 导出 ====================
  const handleExportCSV = useCallback(() => {
    if (onExport) {
      onExport()
      return
    }
    const exportColumns = columns
      .filter(col => col.dataIndex && col.title)
      .map(col => ({
        title: String(col.title),
        dataIndex: String(col.dataIndex),
        render: col.exportRender as ((value: unknown, record: Record<string, unknown>) => string) | undefined,
      }))
    exportToCSV(filteredData, exportColumns, title)
    message.success('CSV 导出成功')
  }, [columns, filteredData, title, onExport])

  const handleExportExcel = useCallback(() => {
    if (onExport) {
      onExport()
      return
    }
    const exportColumns = columns
      .filter(col => col.dataIndex && col.title)
      .map(col => ({
        title: String(col.title),
        dataIndex: String(col.dataIndex),
        render: col.exportRender as ((value: unknown, record: Record<string, unknown>) => string) | undefined,
      }))
    exportToExcel(filteredData, exportColumns, title)
    message.success('Excel 导出成功')
  }, [columns, filteredData, title, onExport])

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

  // ==================== 筛选区域 ====================
  const renderFilterFields = () => {
    if (filterFields.length === 0) return null

    return (
      <div
        style={{
          padding: '16px 0',
          display: showFilters ? 'block' : 'none',
        }}
      >
        <Row gutter={[16, 16]}>
          {filterFields.map(field => (
            <Col xs={24} sm={12} md={8} lg={6} key={field.name}>
              {field.type === 'input' && (
                <Input
                  placeholder={field.placeholder || field.label}
                  value={(filterValues[field.name] as string) || ''}
                  onChange={e =>
                    setFilterValues(prev => ({ ...prev, [field.name]: e.target.value }))
                  }
                  allowClear
                />
              )}
              {field.type === 'select' && (
                <select
                  style={{
                    width: '100%',
                    height: 32,
                    padding: '0 11px',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    fontSize: 14,
                    color: filterValues[field.name] ? undefined : '#bfbfbf',
                  }}
                  value={(filterValues[field.name] as string) || ''}
                  onChange={e =>
                    setFilterValues(prev => ({ ...prev, [field.name]: e.target.value }))
                  }
                >
                  <option value="">{field.placeholder || `请选择${field.label}`}</option>
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              {field.type === 'dateRange' && (
                <RangePicker
                  style={{ width: '100%' }}
                  onChange={(_, dateStrings) => {
                    setFilterValues(prev => ({
                      ...prev,
                      [field.name]: dateStrings,
                    }))
                  }}
                />
              )}
            </Col>
          ))}
        </Row>
      </div>
    )
  }

  // ==================== 渲染 ====================
  return (
    <div>
      {/* 顶部工具栏 */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space size="middle" wrap>
          <Input
            placeholder={searchPlaceholder}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => {
              setSearchText(e.target.value)
              setPagination(prev => ({ ...prev, current: 1 }))
            }}
            allowClear
            style={{ width: 260 }}
          />
          {filterFields.length > 0 && (
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilters(prev => !prev)}
              type={showFilters ? 'primary' : 'default'}
            >
              高级筛选
              {showFilters && (
                <Tag color="blue" style={{ marginLeft: 4 }}>
                  {Object.values(filterValues).filter(v => v !== undefined && v !== null && v !== '').length}
                </Tag>
              )}
            </Button>
          )}
        </Space>
        <Space size="middle">
          {selectedRowKeys.length > 0 && onDelete && (
            <Popconfirm
              title="批量删除"
              description={`确认删除选中的 ${selectedRowKeys.length} 条数据？`}
              onConfirm={handleBatchDelete}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
          <Dropdown menu={{ items: exportMenuItems, onClick: handleExportMenuClick }}>
            <Button icon={<ExportOutlined />}>
              导出 <DownOutlined />
            </Button>
          </Dropdown>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setSearchText('')
              setFilterValues({})
              setSelectedRowKeys([])
            }}
          >
            重置
          </Button>
        </Space>
      </div>

      {/* 高级筛选区域 */}
      {renderFilterFields()}

      {/* 数据表格 */}
      <Table<DataType>
        columns={allColumns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          total: filteredData.length,
        }}
        onChange={pag => setPagination(pag)}
        scroll={{ x: true }}
        rowSelection={
          onDelete
            ? {
                selectedRowKeys,
                onChange: (keys: Key[]) => setSelectedRowKeys(keys),
              }
            : undefined
        }
        size="middle"
        bordered
      />
    </div>
  )
}

export default DataTable
