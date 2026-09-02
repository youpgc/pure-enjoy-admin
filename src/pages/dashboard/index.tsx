// Dashboard 仪表盘（God File 拆分：逻辑 Hook / 列 / 卡片 / 图 / 活动已抽离到 dashboard/ 子目录）
import React, { useMemo } from 'react'
import { Card, Spin, Button, Empty, Table, Typography } from 'antd'
import {
  BookOutlined, MessageOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { usePermission } from '../../hooks/usePermission'
import { useNavigation } from '../../App'
import { useDashboard } from './useDashboard'
import { buildNovelColumns, buildCommentColumns } from './columns'
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
    novelStats,
    novels,
    novelsLoading,
    novelPagination,
    comments,
    commentsLoading,
    commentPagination,
    recentActivities,
    userTrendData,
    loadNovels,
    loadComments,
    refreshAll,
  } = useDashboard()

  const novelColumns = useMemo(() => buildNovelColumns(), [])
  const commentColumns = useMemo(() => buildCommentColumns(), [])

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
          loading={loading || novelsLoading || commentsLoading}
        >
          刷新数据
        </Button>
      </div>
      <Spin spinning={loading} tip="加载中...">
        <div>
          {/* 统计卡片 */}
          <StatsCards
            userStats={userStats}
            novelStats={novelStats}
            onNavigate={setCurrentPage}
          />

          {/* 用户增长趋势 */}
          <Card title="用户增长趋势" className={common.mb24}>
            <div className={styles.chartBox}>
              <TrendChart data={userTrendData} />
            </div>
          </Card>

          {/* 最近活动 */}
          <RecentActivities activities={recentActivities} />

          {/* 小说排行榜 */}
          <Card
            title={
              <div className={styles.cardTitle}>
                <BookOutlined className={styles.titleIconPurple} />
                <span>小说排行榜</span>
              </div>
            }
            className={common.mb24}
          >
            <Table
              columns={novelColumns}
              dataSource={novels}
              rowKey="id"
              loading={novelsLoading}
              pagination={{
                ...novelPagination.tablePagination,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                onChange: (page, pageSize) => {
                  novelPagination.handlePageChange(page, pageSize)
                  loadNovels(page, pageSize)
                },
              }}
              size="small"
            />
          </Card>

          {/* 最新评论 */}
          <Card
            title={
              <div className={styles.cardTitle}>
                <MessageOutlined className={styles.titleIconGreen} />
                <span>最新评论</span>
              </div>
            }
          >
            <Table
              columns={commentColumns}
              dataSource={comments}
              rowKey="id"
              loading={commentsLoading}
              pagination={{
                ...commentPagination.tablePagination,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                onChange: (page, pageSize) => {
                  commentPagination.handlePageChange(page, pageSize)
                  loadComments(page, pageSize)
                },
              }}
              size="small"
            />
          </Card>
        </div>
      </Spin>
    </div>
  )
}

export default Dashboard
