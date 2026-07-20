// Dashboard 仪表盘（God File 拆分：逻辑 Hook / 列 / 卡片 / 图 / 活动已抽离到 dashboard/ 子目录）
import React, { useMemo } from 'react'
import { Card, Spin, Button, Empty, Table, Typography } from 'antd'
import {
  BookOutlined, MessageOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '../hooks/usePermission'
import { useDashboard } from './dashboard/useDashboard'
import { buildNovelColumns, buildCommentColumns } from './dashboard/columns'
import { StatsCards } from './dashboard/StatsCards'
import { RecentActivities } from './dashboard/RecentActivities'
import { TrendChart } from './dashboard/TrendChart'

const { Text } = Typography

const Dashboard: React.FC = () => {
  const { hasPermission } = usePermission()
  const navigate = useNavigate()
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
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Empty description="暂无仪表盘访问权限" />
      </div>
    )
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* 工具栏：最后更新时间 + 手动刷新按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
            onNavigate={navigate}
          />

          {/* 用户增长趋势 */}
          <Card title="用户增长趋势" style={{ marginBottom: 24 }}>
            <div style={{ height: 300 }}>
              <TrendChart data={userTrendData} />
            </div>
          </Card>

          {/* 最近活动 */}
          <RecentActivities activities={recentActivities} />

          {/* 小说排行榜 */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <BookOutlined style={{ marginRight: 8, color: '#722ed1' }} />
                <span>小说排行榜</span>
              </div>
            }
            style={{ marginBottom: 24 }}
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
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <MessageOutlined style={{ marginRight: 8, color: '#52c41a' }} />
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
