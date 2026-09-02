// UserDimensionList 详情弹窗（从 components/UserDimensionList.tsx 抽取，行为保持）
import { useMemo } from 'react'
import { Modal, Descriptions, Divider, Table, Tag, Popconfirm, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined } from '@ant-design/icons'
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
  /** 是否允许后台删除（P1-6 UGC moderation） */
  canDelete?: boolean
  /** 删除单条记录回调 */
  onDeleteRecord?: (recordId: string) => void
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
  canDelete,
  onDeleteRecord,
}: UserDimensionDetailModalProps) {
  // 详情表格列：开启后台删除时追加「删除」操作列（带二次确认）
  const detailTableColumns = useMemo<ColumnsType<RecordItem>>(() => {
    if (!canDelete) return detailColumns
    return [
      ...detailColumns,
      {
        title: '操作',
        key: 'action',
        width: 100,
        fixed: 'right',
        render: (_: unknown, record: RecordItem) => (
          <Popconfirm
            title="确认删除该记录？"
            description="删除后不可恢复，且会同步主表统计。"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => onDeleteRecord?.(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        ),
      },
    ]
  }, [canDelete, detailColumns, onDeleteRecord])

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
      destroyOnHidden
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
            columns={detailTableColumns}
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
