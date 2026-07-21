// Dashboard 最近活动列表（从 Dashboard.tsx 抽取，行为保持）
import { Avatar, Card, Empty, Tag, Typography } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { formatDateTime } from '../../utils/format'
import { ACTION_LABEL_MAP, OP_MODULE_LABEL_MAP } from '../../constants'
import type { RecentActivity } from './types'

interface RecentActivitiesProps {
  activities: RecentActivity[]
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  const { Text } = Typography

  return (
    <Card title="最近活动" style={{ marginBottom: 24 }}>
      {activities.length === 0 ? (
        <Empty description="暂无活动记录" />
      ) : (
        <div>
          {activities.map((activity) => (
            <div key={activity.id} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid #f0f0f0',
            }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 12 }} />
              <div style={{ flex: 1 }}>
              <Text strong>{activity.user_nickname || '系统'}</Text>
              <Text style={{ marginLeft: 8 }}>{ACTION_LABEL_MAP[activity.action] || activity.action}</Text>
              {activity.module && (
                <Tag color="blue" style={{ marginLeft: 8 }}>{OP_MODULE_LABEL_MAP[activity.module] || activity.module}</Tag>
              )}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatDateTime(activity.created_at)}
              </Text>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
