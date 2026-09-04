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
import { ACTION_OPTIONS, MODULE_OPTIONS } from '../../constants'
import { buildOperationLogColumns } from './columns'
import { useOperationLogs } from './useOperationLogs'
import common from '../../styles/common.module.css'
import styles from './index.module.css'

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
    <div className={common.p24}>
      {/* 筛选栏 */}
      <Card className={common.mb16}>
        <Space wrap>
          <Input
            placeholder="搜索操作/详情"
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            className={styles.searchInput}
            allowClear
          />
          <Select
            placeholder="操作类型"
            value={filters.action}
            onChange={(value) => setFilters((prev) => ({ ...prev, action: value }))}
            className={styles.filterSelect}
            allowClear
            options={ACTION_OPTIONS}
          />
          <Select
            placeholder="模块"
            value={filters.module}
            onChange={(value) => setFilters((prev) => ({ ...prev, module: value }))}
            className={styles.filterSelect}
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
      <div className={`${common.flexBetween} ${common.mb16}`}>
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
