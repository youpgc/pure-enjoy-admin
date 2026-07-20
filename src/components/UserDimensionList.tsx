// UserDimensionList 通用用户维度汇总组件（God File 拆分：逻辑 Hook / 列 / 详情弹窗已抽离到 user-dimension/ 子目录）
import React from 'react'
import { Card, Table, Button, Space, Divider, Typography, Empty } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useUserDimension } from './user-dimension/useUserDimension'
import { buildUserDimensionColumns } from './user-dimension/columns'
import { UserDimensionDetailModal } from './user-dimension/UserDimensionDetailModal'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './user-dimension/constants'
import type { ModuleConfig, RecordItem, UserSummary } from './user-dimension/types'

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
  } = moduleConfig

  const {
    loading,
    dataLimitWarning,
    data,
    pagination,
    setPagination,
    detailModalOpen,
    detailLoading,
    detailData,
    detailTotal,
    detailPage,
    detailPageSize,
    selectedUser,
    userMap,
    fetchData,
    handleViewDetail,
    handleDetailModalClose,
    handleDetailPageChange,
  } = useUserDimension({
    tableName,
    title,
    defaultPageSize,
    pageSizeOptions,
    onUserSelect: moduleConfig.onUserSelect,
  })

  const columns = buildUserDimensionColumns({ userMap, onViewDetail: handleViewDetail })

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large">
          <Text type="secondary">用户总数：</Text>
          <Text strong>{data.length}</Text>
          <Divider type="vertical" />
          <Text type="secondary">记录总数：</Text>
          <Text strong>{data.reduce((sum, item) => sum + item.total_count, 0)}</Text>
        </Space>
        {dataLimitWarning && (
          <div style={{ marginTop: 8 }}>
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
            pagination={{
              ...pagination,
              total: data.length,
            }}
            onChange={(pag) => setPagination(pag)}
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
      />
    </div>
  )
}

export default UserDimensionList
