// UserDimensionList 详情弹窗（从 components/UserDimensionList.tsx 抽取，行为保持）
import { Modal, Descriptions, Divider, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { RecordItem, UserSummary } from './types'

interface UserDimensionDetailModalProps {
  open: boolean
  title: string
  detailTitle?: string
  selectedUser: UserSummary | null
  userMap: Map<string, { nickname: string; username: string }>
  detailData: RecordItem[]
  detailColumns: ColumnsType<RecordItem>
  detailLoading: boolean
  detailPage: number
  detailPageSize: number
  pageSizeOptions: string[]
  detailTotal: number
  onPageChange: (page: number, pageSize: number) => void
  onClose: () => void
}

export function UserDimensionDetailModal({
  open,
  title,
  detailTitle,
  selectedUser,
  userMap,
  detailData,
  detailColumns,
  detailLoading,
  detailPage,
  detailPageSize,
  pageSizeOptions,
  detailTotal,
  onPageChange,
  onClose,
}: UserDimensionDetailModalProps) {
  return (
    <Modal
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span>{detailTitle || title} - 用户详情</span>
          {selectedUser && (
            <Tag color="blue">{selectedUser.total_count} 条记录</Tag>
          )}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnClose
    >
      {selectedUser && (
        <>
          {/* 用户信息 */}
          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="用户名">
              {(() => {
                const info = userMap.get(selectedUser.user_id)
                return info?.username || selectedUser.user_nickname || '-'
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="昵称">
              {(() => {
                const info = userMap.get(selectedUser.user_id)
                return info?.nickname || '-'
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="记录总数">
              <Tag color="blue">{selectedUser.total_count}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="最近记录">
              {selectedUser.latest_date ? dayjs(selectedUser.latest_date).format('YYYY-MM-DD HH:mm') : '-'}
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '12px 0' }} />

          {/* 详情列表 */}
          <Table<RecordItem>
            columns={detailColumns}
            dataSource={detailData}
            rowKey="id"
            loading={detailLoading}
            pagination={{
              current: detailPage,
              pageSize: detailPageSize,
              total: detailTotal,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions,
              showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
              onChange: onPageChange,
            }}
            scroll={{ x: 800, y: 400 }}
            size="small"
            bordered
          />
        </>
      )}
    </Modal>
  )
}
