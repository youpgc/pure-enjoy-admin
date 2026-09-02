// UserDimensionList 通用用户维度汇总组件（God File 拆分：逻辑 Hook / 列 / 详情弹窗已抽离到 user-dimension/ 子目录）
import React from 'react'
import { Card, Table, Button, Space, Divider, Typography, Empty } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useUserDimension } from './user-dimension/useUserDimension'
import { buildUserDimensionColumns } from './user-dimension/columns'
import { UserDimensionDetailModal } from './user-dimension/UserDimensionDetailModal'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './user-dimension/constants'
import type { ModuleConfig, RecordItem, UserSummary } from './user-dimension/types'
import common from '../styles/common.module.css'

// 保持对外公开类型（供各页面 moduleConfig 复用），避免消费者改动
export type { ModuleConfig, RecordItem, UserSummary }

const { Title, Text } = Typography

const UserDimensionList: React.FC<{
  moduleConfig: ModuleConfig
  pageSizeOptions?: string[]
  defaultPageSize?: number
}> = ({
  moduleConfig,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  defaultPageSize = DEFAULT_PAGE_SIZE,
}) => {
  const {
    title,
    tableName,
    detailColumns,
    detailTitle,
    enableDelete,
  } = moduleConfig

  const canDelete = !!enableDelete

  const {
    loading,
    dataLimitWarning,
    data,
    total,
    totalRecords,
    pagination,
    detailModalOpen,
    detailLoading,
    detailData,
    detailTotal,
    detailPage,
    detailPageSize,
    selectedUser,
    userMap,
    fetchData,
    handlePageChange,
    handleDeleteRecord,
    handleViewDetail,
    handleDetailModalClose,
    handleDetailPageChange,
  } = useUserDimension({
    tableName,
    title,
    defaultPageSize,
    pageSizeOptions,
    onUserSelect: moduleConfig.onUserSelect,
    canDelete,
  })

  const columns = buildUserDimensionColumns({ userMap, onViewDetail: handleViewDetail })

  return (
    <div>
      {/* 页面标题 */}
      <div className={`${common.mb16} ${common.flexBetween}`}>
        <Title level={4} className={common.noMargin}>
          {title}
        </Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchData()}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Card className={common.mb16}>
        <Space size="large">
          <Text type="secondary">用户总数：</Text>
          <Text strong>{total}</Text>
          <Divider type="vertical" />
          <Text type="secondary">记录总数：</Text>
          <Text strong>{totalRecords}</Text>
        </Space>
        {dataLimitWarning && (
          <div className={common.mt8}>
            <Text type="warning">{dataLimitWarning}</Text>
          </div>
        )}
      </Card>

      {/* 数据表格 */}
      <Card>
        {data.length === 0 && !loading ? (
          <Empty description={`暂无${title}数据`} />
        ) : (
          <Table<UserSummary>
            columns={columns}
            dataSource={data}
            rowKey="user_id"
            loading={loading}
            pagination={pagination}
            onChange={(pag) => handlePageChange(pag.current || 1, pag.pageSize || defaultPageSize)}
            scroll={{ x: 900 }}
            size="middle"
            bordered
          />
        )}
      </Card>

      {/* 详情弹窗 */}
      <UserDimensionDetailModal
        open={detailModalOpen}
        title={title}
        detailTitle={detailTitle}
        selectedUser={selectedUser}
        userMap={userMap}
        detailData={detailData}
        detailColumns={detailColumns}
        detailLoading={detailLoading}
        detailPage={detailPage}
        detailPageSize={detailPageSize}
        pageSizeOptions={pageSizeOptions}
        detailTotal={detailTotal}
        onPageChange={handleDetailPageChange}
        onClose={handleDetailModalClose}
        canDelete={canDelete}
        onDeleteRecord={handleDeleteRecord}
      />
    </div>
  )
}

export default UserDimensionList
