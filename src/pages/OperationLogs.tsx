import React from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Card,
  DatePicker,
} from 'antd'
import { SearchOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { ACTION_OPTIONS, MODULE_OPTIONS } from '../constants'
import { buildOperationLogColumns } from './operationLogs/columns'
import { useOperationLogs } from './operationLogs/useOperationLogs'

const { RangePicker } = DatePicker

const OperationLogs: React.FC = () => {
  const {
    logs,
    loading,
    filters,
    setFilters,
    selectedRowKeys,
    setSelectedRowKeys,
    tablePagination,
    hasPermission,
    userMap,
    loadLogs,
    handleSearch,
    handleReset,
    handleDelete,
    handleBatchDelete,
  } = useOperationLogs()

  const columns = buildOperationLogColumns({ hasPermission, userMap, handleDelete })

  return (
    <div style={{ padding: 24 }}>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索操作/详情"
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="操作类型"
            value={filters.action}
            onChange={(value) => setFilters((prev) => ({ ...prev, action: value }))}
            style={{ width: 120 }}
            allowClear
            options={ACTION_OPTIONS}
          />
          <Select
            placeholder="模块"
            value={filters.module}
            onChange={(value) => setFilters((prev) => ({ ...prev, module: value }))}
            style={{ width: 120 }}
            allowClear
            options={MODULE_OPTIONS}
          />
          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => setFilters((prev) => ({ ...prev, dateRange: dates }))}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      {/* 操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          {selectedRowKeys.length > 0 && (
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
              批量删除 ({selectedRowKeys.length})
            </Button>
          )}
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadLogs} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 日志表格 */}
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        pagination={tablePagination}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  )
}

export default OperationLogs
