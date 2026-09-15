// Dashboard 最近活动列表（从 Dashboard.tsx 抽取，行为保持）
import { Avatar, Button, Card, Empty, Tag, Typography, theme } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { formatDateTime } from '../../utils/format'
import { ACTION_LABEL_MAP, getModuleLabel, getModuleColor } from '../../constants'
import type { RecentActivity } from './types'
import styles from './RecentActivities.module.css'
import common from '../../styles/common.module.css'

/** 最多展示条数（超出部分由「查看更多」跳转对应数据页查看） */
const MAX_ITEMS = 10

interface RecentActivitiesProps {
  activities: RecentActivity[]
  /** 「查看更多」回调：跳转对应数据页面 */
  onViewMore?: () => void
}

export function RecentActivities({ activities, onViewMore }: RecentActivitiesProps) {
  const { token } = theme.useToken()
  const { Text } = Typography

  return (
    <Card
      title="最近活动"
      className={common.mb24}
      extra={
        activities.length > 0 && onViewMore ? (
          <Button size="small" type="link" onClick={onViewMore}>
            查看更多
          </Button>
        ) : undefined
      }
    >
      {activities.length === 0 ? (
        <Empty description="暂无活动记录" />
      ) : (
        <div>
          {activities.slice(0, MAX_ITEMS).map((activity) => (
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
