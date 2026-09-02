import React from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Button,
  Spin,
  Empty,
  Table,
} from 'antd'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  UserOutlined,
  BookOutlined,
  ReadOutlined,
  MessageOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useAnalytics } from './useAnalytics'
import { buildTopNovelColumns } from './columns'
import { COLORS } from './types'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

const { RangePicker } = DatePicker

const Analytics: React.FC = () => {
  const {
    loading,
    dateRange,
    setDateRange,
    dailyStats,
    novelStats,
    topNovels,
    summary,
    fetchAnalytics,
  } = useAnalytics()

  const topNovelColumns = buildTopNovelColumns()

  return (
    <div className={styles.pageWrap}>
      <Card className={common.mb16}>
        <Row gutter={16} align='middle'>
          <Col>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]])
                }
              }}
            />
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchAnalytics}>
              刷新
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} className={common.mb16}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title='新增用户' value={summary.totalUsers} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title='新增小说' value={summary.totalNovels} prefix={<BookOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title='新增章节' value={summary.totalChapters} prefix={<ReadOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title='新增反馈' value={summary.totalFeedback} prefix={<MessageOutlined />} />
          </Card>
        </Col>
      </Row>

      {loading ? (
        <div className={styles.loadingBox}>
          <Spin size='large' />
        </div>
      ) : (
        <>
          <Card title='每日数据统计' className={common.mb16}>
            {dailyStats.length > 0 ? (
              <ResponsiveContainer width='100%' height={400}>
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type='monotone' dataKey='newUsers' name='新增用户' stroke='#1890ff' />
                  <Line type='monotone' dataKey='newNovels' name='新增小说' stroke='#52c41a' />
                  <Line type='monotone' dataKey='newChapters' name='新增章节' stroke='#faad14' />
                  <Line type='monotone' dataKey='newFeedback' name='新增反馈' stroke='#ff4d4f' />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description='暂无数据' />
            )}
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title='小说分类分布'>
                {novelStats.length > 0 ? (
                  <ResponsiveContainer width='100%' height={300}>
                    <PieChart>
                      <Pie
                        data={novelStats}
                        cx='50%'
                        cy='50%'
                        innerRadius={60}
                        outerRadius={100}
                        dataKey='count'
                        nameKey='category'
                        label={({ category, count }: { category: string; count: number }) => `${category}: ${count}`}
                      >
                        {novelStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description='暂无数据' />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title='热门小说 Top 10'>
                <Table
                  dataSource={topNovels}
                  columns={topNovelColumns}
                  rowKey='title'
                  pagination={false}
                  size='small'
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}

export default Analytics
