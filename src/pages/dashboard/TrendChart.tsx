// Dashboard 用户增长趋势图（从 Dashboard.tsx 抽取，行为保持）
import { Empty, Typography, Tooltip } from 'antd'
import dayjs from 'dayjs'
import type { TrendPoint } from './types'
import styles from './TrendChart.module.css'

const { Text } = Typography

export function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return <Empty description="暂无数据" />
  }

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const barWidth = Math.max(20, 800 / data.length)

  return (
    <div className={styles.chartRoot}>
      {data.map((item, index) => {
        const height = (item.count / maxCount) * 250
        const isToday = dayjs(item.date).isSame(dayjs(), 'day')
        return (
          <Tooltip key={index} title={`${item.date}: ${item.count} 人`}>
            <div className={styles.barCol}>
              <div style={{
                width: barWidth,
                height: Math.max(height, 4),
                backgroundColor: isToday ? '#1890ff' : '#91d5ff',
                borderRadius: '2px 2px 0 0',
                transition: 'height 0.3s',
              }} />
              <Text type="secondary" className={styles.barLabel}>
                {dayjs(item.date).format('MM-DD')}
              </Text>
            </div>
          </Tooltip>
        )
      })}
    </div>
  )
}
