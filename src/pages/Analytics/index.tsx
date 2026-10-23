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
} from 'recharts'
import { UserOutlined, MessageOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAnalytics } from './useAnalytics'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

const { RangePicker } = DatePicker

const Analytics: React.FC = () => {
  const { loading, dateRange, setDateRange, dailyStats, summary, fetchAnalytics } = useAnalytics()

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
        <Col xs={24} sm={12}>
          <Card>
            <Statistic title='新增用户' value={summary.totalUsers} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
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
                <Line type='monotone' dataKey='newFeedback' name='新增反馈' stroke='#ff4d4f' />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty description='暂无数据' />
          )}
        </Card>
      )}
    </div>
  )
}

export default Analytics
