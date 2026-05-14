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
  Tooltip,
  Statistic,
  Row,
  Col,
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
import {
  mockWeightRecords,
  MockWeightRecord,
  getBmiLevel,
  calculateBmi,
} from '../utils/mockData'
import { exportToCSV, exportToExcel } from '../utils/export'
import { usePermission } from '../hooks/usePermission'

const { Title } = Typography

// ==================== 类型定义 ====================

interface WeightRecord extends MockWeightRecord {
  key: string
}

// ==================== 主组件 ====================

const WeightRecords: React.FC = () => {
  const {
    canReadWeights,
    canWriteWeights,
    canDeleteWeights,
    canExportWeights,
  } = usePermission()

  // 状态
  const [data, setData] = useState<WeightRecord[]>(
    mockWeightRecords.map((item) => ({ ...item, key: item.id }))
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
  const [editingRecord, setEditingRecord] = useState<WeightRecord | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // ==================== 统计数据 ====================

  const stats = useMemo(() => {
    if (data.length === 0) return null
    
    const sortedData = [...data].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    const latest = sortedData[0]
    const previous = sortedData[1]
    
    const avgWeight = data.reduce((sum, item) => sum + item.weight, 0) / data.length
    const avgBmi = data.reduce((sum, item) => sum + item.bmi, 0) / data.length
    
    let weightChange = 0
    if (previous && latest) {
      weightChange = latest.weight - previous.weight
    }
    
    return {
      latestWeight: latest?.weight || 0,
      latestBmi: latest?.bmi || 0,
      avgWeight: parseFloat(avgWeight.toFixed(1)),
      avgBmi: parseFloat(avgBmi.toFixed(1)),
      weightChange: parseFloat(weightChange.toFixed(1)),
      totalRecords: data.length,
    }
  }, [data])

  // ==================== 筛选配置 ====================

  const filterFields: FilterField[] = [
    {
      name: 'weightRange',
      label: '体重范围',
      type: 'numberRange',
      placeholder: '体重范围 (kg)',
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
      name: 'weight',
      label: '体重 (kg)',
      type: 'number',
      required: true,
      min: 20,
      max: 300,
      precision: 1,
      placeholder: '请输入体重',
    },
    {
      name: 'height',
      label: '身高 (cm)',
      type: 'number',
      required: false,
      min: 100,
      max: 250,
      precision: 0,
      placeholder: '用于计算BMI',
      tooltip: '身高用于计算BMI，可选填',
    },
    {
      name: 'body_fat',
      label: '体脂率 (%)',
      type: 'number',
      required: false,
      min: 3,
      max: 60,
      precision: 1,
      placeholder: '可选',
    },
    {
      name: 'note',
      label: '备注',
      type: 'textarea',
      rows: 3,
      placeholder: '记录备注信息',
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
          record.note?.toLowerCase().includes(keyword)
        )
      })
    }

    // 体重范围筛选
    if (filterValues.weightRange && Array.isArray(filterValues.weightRange)) {
      const [min, max] = filterValues.weightRange as [number | null, number | null]
      result = result.filter((record) => {
        if (min !== null && record.weight < min) return false
        if (max !== null && record.weight > max) return false
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
    if (!canWriteWeights) {
      message.warning('您没有新增体重记录的权限')
      return
    }
    setModalMode('create')
    setEditingRecord(null)
    setModalOpen(true)
  }, [canWriteWeights])

  // 编辑
  const handleEdit = useCallback(
    (record: WeightRecord) => {
      if (!canWriteWeights) {
        message.warning('您没有编辑体重记录的权限')
        return
      }
      setModalMode('edit')
      setEditingRecord(record)
      setModalOpen(true)
    },
    [canWriteWeights]
  )

  // 删除单条
  const handleDelete = useCallback(
    (id: string) => {
      if (!canDeleteWeights) {
        message.warning('您没有删除体重记录的权限')
        return
      }
      setData((prev) => prev.filter((item) => item.id !== id))
      message.success('删除成功')
    },
    [canDeleteWeights]
  )

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (!canDeleteWeights) {
      message.warning('您没有删除体重记录的权限')
      return
    }
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据')
      return
    }
    setData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)))
    setSelectedRowKeys([])
    message.success(`成功删除 ${selectedRowKeys.length} 条数据`)
  }, [selectedRowKeys, canDeleteWeights])

  // 表单提交
  const handleFormSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setConfirmLoading(true)
      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        const weight = values.weight as number
        const height = (values.height as number) || 170 // 默认身高170cm
        const bmi = calculateBmi(weight, height)

        if (modalMode === 'create') {
          const newRecord: WeightRecord = {
            id: `weight_${Date.now()}`,
            key: `weight_${Date.now()}`,
            user_id: 'current_user_id',
            user_name: '当前用户',
            weight,
            height,
            bmi,
            body_fat: (values.body_fat as number) || null,
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
                    weight,
                    height,
                    bmi,
                    body_fat: (values.body_fat as number) || null,
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
    if (!canExportWeights) {
      message.warning('您没有导出体重记录的权限')
      return
    }
    const columns = [
      { title: '用户ID', dataIndex: 'user_id' },
      { title: '用户名', dataIndex: 'user_name' },
      { title: '体重(kg)', dataIndex: 'weight' },
      { title: '身高(cm)', dataIndex: 'height' },
      { title: 'BMI', dataIndex: 'bmi' },
      { title: '体脂率(%)', dataIndex: 'body_fat' },
      { title: '备注', dataIndex: 'note' },
      { title: '日期', dataIndex: 'date' },
    ]
    exportToCSV<WeightRecord>(filteredData, columns, '体重记录')
    message.success('CSV 导出成功')
  }, [filteredData, canExportWeights])

  const handleExportExcel = useCallback(() => {
    if (!canExportWeights) {
      message.warning('您没有导出体重记录的权限')
      return
    }
    const columns = [
      { title: '用户ID', dataIndex: 'user_id' },
      { title: '用户名', dataIndex: 'user_name' },
      { title: '体重(kg)', dataIndex: 'weight' },
      { title: '身高(cm)', dataIndex: 'height' },
      { title: 'BMI', dataIndex: 'bmi' },
      { title: '体脂率(%)', dataIndex: 'body_fat' },
      { title: '备注', dataIndex: 'note' },
      { title: '日期', dataIndex: 'date' },
    ]
    exportToExcel<WeightRecord>(filteredData, columns, '体重记录')
    message.success('Excel 导出成功')
  }, [filteredData, canExportWeights])

  // 重置
  const handleReset = useCallback(() => {
    setSearchText('')
    setFilterValues({})
    setSelectedRowKeys([])
    setPagination((prev) => ({ ...prev, current: 1 }))
  }, [])

  // ==================== 表格列配置 ====================

  const columns: ColumnsType<WeightRecord> = [
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
      title: '体重',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      sorter: (a, b) => a.weight - b.weight,
      render: (weight: number) => (
        <Tag color="blue">{weight} kg</Tag>
      ),
    },
    {
      title: 'BMI',
      dataIndex: 'bmi',
      key: 'bmi',
      width: 120,
      sorter: (a, b) => a.bmi - b.bmi,
      render: (bmi: number) => {
        const level = getBmiLevel(bmi)
        return (
          <Tooltip title={`BMI ${bmi} - ${level.label}`}>
            <Tag color={level.color}>
              {bmi} ({level.label})
            </Tag>
          </Tooltip>
        )
      },
    },
    {
      title: '体脂率',
      dataIndex: 'body_fat',
      key: 'body_fat',
      width: 100,
      render: (body_fat: number | null) => (
        body_fat ? <Tag color="cyan">{body_fat}%</Tag> : '-'
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      width: 150,
      render: (note: string) => note || '-',
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
          {canWriteWeights && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )}
          {canDeleteWeights && (
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

  if (!canReadWeights) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Title level={4} type="secondary">
            您没有查看体重记录的权限
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
          体重记录管理
        </Title>
        <Space>
          {canWriteWeights && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新增记录
            </Button>
          )}
          {canExportWeights && (
            <Dropdown menu={{ items: exportMenuItems, onClick: handleExportMenuClick }}>
              <Button icon={<ExportOutlined />}>
                导出 <DownOutlined />
              </Button>
            </Dropdown>
          )}
        </Space>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={24}>
            <Col xs={12} sm={6}>
              <Statistic
                title="最新体重"
                value={stats.latestWeight}
                suffix="kg"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="体重变化"
                value={stats.weightChange}
                precision={1}
                suffix="kg"
                valueStyle={{ 
                  color: stats.weightChange > 0 ? '#ff4d4f' : stats.weightChange < 0 ? '#52c41a' : '#8c8c8c'
                }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="最新BMI"
                value={stats.latestBmi}
                suffix={getBmiLevel(stats.latestBmi).label}
                valueStyle={{ color: getBmiLevel(stats.latestBmi).color }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="平均体重"
                value={stats.avgWeight}
                suffix="kg"
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 筛选栏 */}
      <FilterBar
        fields={filterFields}
        values={filterValues}
        onChange={setFilterValues}
        onReset={handleReset}
        searchPlaceholder="搜索用户名或备注"
        searchText={searchText}
        onSearchTextChange={setSearchText}
        loading={loading}
      />

      {/* 批量操作栏 */}
      {selectedRowKeys.length > 0 && canDeleteWeights && (
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
        <Table<WeightRecord>
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
            canDeleteWeights
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
        title={modalMode === 'create' ? '新增体重记录' : '编辑体重记录'}
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

export default WeightRecords
