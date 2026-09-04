// Dashboard 最近活动列表（从 Dashboard.tsx 抽取，行为保持）
import { Avatar, Card, Empty, Tag, Typography, theme } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { formatDateTime } from '../../utils/format'
import { ACTION_LABEL_MAP, getModuleLabel, getModuleColor } from '../../constants'
import type { RecentActivity } from './types'
import styles from './RecentActivities.module.css'
import common from '../../styles/common.module.css'

interface RecentActivitiesProps {
  activities: RecentActivity[]
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  const { token } = theme.useToken()
  const { Text } = Typography

  return (
    <Card title="最近活动" className={common.mb24}>
      {activities.length === 0 ? (
        <Empty description="暂无活动记录" />
      ) : (
        <div>
          {activities.map((activity) => (
            <div key={activity.id} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}>
              <Avatar size="small" icon={<UserOutlined />} className={styles.activityAvatar} />
              <div className={common.flex1}>
              <Text strong>{activity.user_nickname || '系统'}</Text>
              <Text className={common.ml8}>{ACTION_LABEL_MAP[activity.action] || activity.action}</Text>
              {activity.module && (
                <Tag color={getModuleColor(activity.module)} className={common.ml8}>{getModuleLabel(activity.module)}</Tag>
              )}
              </div>
              <Text type="secondary" className={styles.activityTime}>
                {formatDateTime(activity.created_at)}
              </Text>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
