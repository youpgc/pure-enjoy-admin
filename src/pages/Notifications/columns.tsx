// 通知表格列定义（从 Notifications.tsx 抽离，审查 P1 膨胀）
// 通过参数注入 hasPermission 与行内操作，避免逻辑裸露在页面。
import type { ColumnsType } from 'antd/es/table'
import { Tag, Badge } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getActionColumn, type ActionButton } from '../../components/common/ActionColumn'
import EllipsisText from '../../components/common/EllipsisText'
import { NOTIFICATION_TYPE_MAP, NOTIFICATION_TYPE_TAG_MAP } from '../../constants'
import type { Notification } from './types'
import styles from './columns.module.css'

export const buildNotificationColumns = (params: {
  hasPermission: (code: string) => boolean
  onEdit: (record: Notification) => void
  onDelete: (id: string) => void
}): ColumnsType<Notification> => {
  const { hasPermission, onEdit, onDelete } = params
  return [
    {
      title: '通知信息',
      key: 'info',
      width: 300,
      render: (_, record) => (
        <div>
          <div className={styles.titleText}>{record.title}</div>
          <EllipsisText text={record.body} maxWidth={240} />
          <div>
            <Tag color={NOTIFICATION_TYPE_MAP[record.type]?.color || 'default'}>
              {NOTIFICATION_TYPE_TAG_MAP[record.type] || record.type}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const info = NOTIFICATION_TYPE_MAP[type] || { color: 'default', label: type }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '已读',
      dataIndex: 'is_read',
      key: 'is_read',
      width: 80,
      render: (isRead: boolean) => (
        <Badge status={isRead ? 'success' : 'processing'} text={isRead ? '已读' : '未读'} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    getActionColumn<Notification>(
      (record): ActionButton[] => {
        const actions: ActionButton[] = []
        if (hasPermission('notifications:write')) {
          actions.push({
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            type: 'primary',
            onClick: () => onEdit(record),
          })
        }
        if (hasPermission('notifications:delete')) {
          actions.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => onDelete(record.id),
          })
        }
        return actions
      },
      { width: 200, maxVisible: 2 },
    ),
  ]
}
