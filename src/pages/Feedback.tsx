// Feedback 问题反馈（God File 拆分：逻辑 Hook / 列 / 两弹窗已抽离到 feedback/ 子目录）
import React, { useMemo } from 'react'
import { Table, Tag, Space, Badge } from 'antd'
import { usePermission } from '../hooks/usePermission'
import NoPermission from '../components/NoPermission'
import { FEEDBACK_STATUS_PENDING } from '../constants'
import { useFeedback } from './feedback/useFeedback'
import { buildFeedbackColumns } from './feedback/columns'
import { ActionModal } from './feedback/ActionModal'
import { FlowHistoryModal } from './feedback/FlowHistoryModal'

const Feedback: React.FC = () => {
  const { hasPermission } = usePermission()
  const {
    data,
    loading,
    tablePagination,
    handlePageChange,
    statusOptions,
    categoryOptions,
    getStatusColor,
    getCategoryColor,
    selectedRecord,
    selectedAction,
    actionModalOpen,
    flowModalOpen,
    actionLoading,
    fetchData,
    handleAction,
    buildActions,
    closeActionModal,
    closeFlowModal,
  } = useFeedback()

  const columns = useMemo(() => buildFeedbackColumns({
    statusOptions,
    categoryOptions,
    getStatusColor,
    getCategoryColor,
    buildActions,
  }), [statusOptions, categoryOptions, getStatusColor, getCategoryColor, buildActions])

  // 权限检查
  if (!hasPermission('feedback:read')) {
    return <NoPermission module="反馈" />
  }

  return (
    <>
      <div style={{ padding: '0 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>问题反馈</h3>
        <Space>
          {statusOptions.length > 0 ? statusOptions.map(opt => (
            <Badge key={opt.value} count={data.filter(d => d.status === opt.value).length} offset={[0, 0]}>
              <Tag color={getStatusColor(opt.value) || 'default'}>{opt.label}</Tag>
            </Badge>
          )) : (
            <>
              <Badge count={data.filter(d => d.status === FEEDBACK_STATUS_PENDING).length} offset={[0, 0]}>
                <Tag color="default">待确认</Tag>
              </Badge>
              <Badge count={data.filter(d => d.status === 'in_progress').length} offset={[0, 0]}>
                <Tag color="warning">处理中</Tag>
              </Badge>
              <Badge count={data.filter(d => d.status === 'delayed').length} offset={[0, 0]}>
                <Tag color="orange">已滞后</Tag>
              </Badge>
            </>
          )}
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          ...tablePagination,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          onChange: (page, pageSize) => {
            handlePageChange(page, pageSize)
            fetchData(page, pageSize)
          },
        }}
        size="middle"
      />

      <ActionModal
        open={actionModalOpen}
        record={selectedRecord}
        action={selectedAction}
        onClose={closeActionModal}
        onConfirm={handleAction}
        loading={actionLoading}
      />

      <FlowHistoryModal
        open={flowModalOpen}
        record={selectedRecord}
        onClose={closeFlowModal}
      />
    </>
  )
}

export default Feedback
