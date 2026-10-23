// Dashboard 仪表盘（God File 拆分：逻辑 Hook / 列 / 卡片 / 图 / 活动已抽离到 dashboard/ 子目录）
import React, { useMemo } from 'react'
import { Card, Spin, Button, Empty, Table, Typography } from 'antd'
import {
  TrophyOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { usePermission } from '../../hooks/usePermission'
import { useNavigation } from '../../contexts/NavigationContext'
import { useDashboard } from './useDashboard'
import { buildGameOverviewColumns } from './columns'
import { StatsCards } from './StatsCards'
import { RecentActivities } from './RecentActivities'
import { TrendChart } from './TrendChart'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

const { Text } = Typography

const Dashboard: React.FC = () => {
  const { hasPermission } = usePermission()
  const { setCurrentPage } = useNavigation()
  const {
    lastUpdated,
    loading,
    userStats,
    recentActivities,
    userTrendData,
    gameStats,
    gameRows,
    gameRowsLoading,
    loadGameRows,
    refreshAll,
  } = useDashboard()

  const gameColumns = useMemo(() => buildGameOverviewColumns(), [])

  if (!hasPermission('dashboard:read')) {
    return (
      <div className={styles.noPermission}>
        <Empty description="暂无仪表盘访问权限" />
      </div>
    )
  }

  return (
    <div className={styles.pageWrap}>
      {/* 工具栏：最后更新时间 + 手动刷新按钮 */}
      <div className={styles.toolbar}>
        <Text type="secondary">
          {lastUpdated ? `最后更新：${lastUpdated}` : '数据加载中…'}
        </Text>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={refreshAll}
          loading={loading || gameRowsLoading}
        >
          刷新数据
        </Button>
      </div>
      <Spin spinning={loading} tip="加载中...">
        <div>
          {/* 统计卡片（用户数据 + 游戏数据） */}
          <StatsCards
            userStats={userStats}
            gameStats={gameStats}
            onNavigate={setCurrentPage}
          />

          {/* 用户增长趋势 */}
          <Card title="用户增长趋势" className={common.mb24}>
            <div className={styles.chartBox}>
              <TrendChart data={userTrendData} />
            </div>
          </Card>

          {/* 最近活动：最多 10 条，「查看更多」跳转操作日志页 */}
          <RecentActivities
            activities={recentActivities}
            onViewMore={() => setCurrentPage('operation_logs')}
          />

          {/* 游戏数据概览 */}
          <Card
            title={
              <div className={styles.cardTitle}>
                <TrophyOutlined className={styles.titleIconPurple} />
                <span>游戏数据概览</span>
              </div>
            }
            extra={
              <Button size="small" icon={<ReloadOutlined />} onClick={loadGameRows} loading={gameRowsLoading}>
                刷新
              </Button>
            }
          >
            <Table
              columns={gameColumns}
              dataSource={gameRows}
              rowKey="id"
              loading={gameRowsLoading}
              pagination={false}
              size="small"
            />
          </Card>
        </div>
      </Spin>
    </div>
  )
}

export default Dashboard
