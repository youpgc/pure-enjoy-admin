import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, Table, Statistic, Row, Col, Tag, Button, Space,
  Select, Input, Switch, Slider, Spin, InputNumber, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  EyeOutlined, ReadOutlined, StarOutlined,
  ReloadOutlined, SaveOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { usePagination } from '../hooks/usePagination'
import { BaseService, handleApiError } from '../utils/apiClient'

// ==================== 类型定义 ====================

interface UserRecommendationFeedback {
  id: string
  user_id: string
  novel_id: string
  feedback_type: 'click' | 'dismiss' | 'collect' | 'read' | 'not_interested'
  created_at: string
}

interface RecConfig {
  cold_start: string
  cold_min_reads: number
  rec_limit: number
  exclude_ongoing: boolean
  exclude_draft: boolean
  exclude_ids: string
  weight_category: number
  weight_read: number
  weight_collect: number
}

// ==================== 常量 ====================

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  click: '点击',
  dismiss: '忽略',
  collect: '收藏',
  read: '阅读',
  not_interested: '不感兴趣',
}

const FEEDBACK_TYPE_COLORS: Record<string, string> = {
  click: 'blue',
  dismiss: 'default',
  collect: 'magenta',
  read: 'green',
  not_interested: 'red',
}

// ==================== 组件 ====================

const Recommendations: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [feedbackData, setFeedbackData] = useState<UserRecommendationFeedback[]>([])
  const [config, setConfig] = useState<RecConfig>({
    cold_start: 'hot',
    cold_min_reads: 100,
    rec_limit: 10,
    exclude_ongoing: false,
    exclude_draft: true,
    exclude_ids: '',
    weight_category: 50,
    weight_read: 30,
    weight_collect: 20,
  })
  const feedbackService = React.useMemo(() => new BaseService<UserRecommendationFeedback>('user_recommendation_feedback', { defaultOrder: { column: 'created_at', ascending: false } }), [])
  const { pagination, setTotal, tablePagination } = usePagination(20)

  // 加载配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rec_config')
      if (saved) setConfig(JSON.parse(saved))
    } catch {
      // ignore
    }
  }, [])

  const fetchFeedback = useCallback(async () => {
    setLoading(true)
    try {
      const result = await feedbackService.paginate(pagination.current, pagination.pageSize)
      if (result.success && result.data) {
        setFeedbackData(result.data.data)
        setTotal(result.data.total)
      }
    } catch (error) {
      handleApiError(error, 'Recommendations-加载反馈')
    } finally {
      setLoading(false)
    }
  }, [feedbackService, pagination.current, pagination.pageSize, setTotal])

  useEffect(() => { fetchFeedback() }, [fetchFeedback])

  const saveConfig = () => {
    localStorage.setItem('rec_config', JSON.stringify(config))
    message.success('推荐配置已保存')
  }

  // 统计
  const counts = { click: 0, dismiss: 0, collect: 0, read: 0, not_interested: 0 }
  feedbackData.forEach(r => {
    const key = r.feedback_type as keyof typeof counts
    if (key in counts) counts[key]++
  })
  const total = feedbackData.length
  const ctr = total > 0 ? (counts.click / total * 100).toFixed(1) : '0.0'
  const convRead = total > 0 ? (counts.read / total * 100).toFixed(1) : '0.0'
  const convCollect = total > 0 ? (counts.collect / total * 100).toFixed(1) : '0.0'

  const columns: ColumnsType<UserRecommendationFeedback> = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 140, render: (v: string) => v.slice(0, 12) + '...' },
    { title: '小说ID', dataIndex: 'novel_id', key: 'novel_id', width: 140, render: (v: string) => v.slice(0, 12) + '...' },
    {
      title: '反馈类型', dataIndex: 'feedback_type', key: 'type', width: 120,
      render: (v: string) => <Tag color={FEEDBACK_TYPE_COLORS[v] || 'default'}>{FEEDBACK_TYPE_LABELS[v] || v}</Tag>,
    },
    {
      title: '时间', dataIndex: 'created_at', key: 'created_at', width: 150,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
  ]

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card><Statistic title='推荐点击率' value={ctr} suffix='%' prefix={<EyeOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card><Statistic title='阅读转化率' value={convRead} suffix='%' prefix={<ReadOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card><Statistic title='收藏转化率' value={convCollect} suffix='%' prefix={<StarOutlined />} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
      </Row>

      {/* 配置面板 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title='冷启动策略' extra={<Button type='primary' icon={<SaveOutlined />} onClick={saveConfig}>保存</Button>}>
            <Space direction='vertical' style={{ width: '100%' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>新用户默认推荐</label>
                <Select
                  value={config.cold_start}
                  style={{ width: '100%' }}
                  options={[
                    { label: '热门推荐', value: 'hot' },
                    { label: '最新上架', value: 'latest' },
                    { label: '高评分', value: 'rated' },
                  ]}
                  onChange={v => setConfig({ ...config, cold_start: v })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>冷启动小说池下限（阅读量）</label>
                <InputNumber
                  value={config.cold_min_reads}
                  min={0}
                  style={{ width: '100%' }}
                  onChange={v => setConfig({ ...config, cold_min_reads: v || 0 })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>推荐数量</label>
                <InputNumber
                  value={config.rec_limit}
                  min={1}
                  max={50}
                  style={{ width: '100%' }}
                  onChange={v => setConfig({ ...config, rec_limit: v || 10 })}
                />
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title='内容池管理' extra={<Button type='primary' icon={<SaveOutlined />} onClick={saveConfig}>保存</Button>}>
            <Space direction='vertical' style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>排除未完结小说</span>
                <Switch checked={config.exclude_ongoing} onChange={v => setConfig({ ...config, exclude_ongoing: v })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>排除草稿状态</span>
                <Switch checked={config.exclude_draft} onChange={v => setConfig({ ...config, exclude_draft: v })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>排除小说ID（逗号分隔）</label>
                <Input.TextArea
                  rows={2}
                  value={config.exclude_ids}
                  placeholder='输入小说UUID'
                  onChange={e => setConfig({ ...config, exclude_ids: e.target.value })}
                />
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title='权重调整' extra={<Button type='primary' icon={<SaveOutlined />} onClick={saveConfig}>保存</Button>}>
            <Space direction='vertical' style={{ width: '100%' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>分类偏好权重: {config.weight_category}</label>
                <Slider value={config.weight_category} min={0} max={100} onChange={v => setConfig({ ...config, weight_category: v })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>阅读时长权重: {config.weight_read}</label>
                <Slider value={config.weight_read} min={0} max={100} onChange={v => setConfig({ ...config, weight_read: v })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>收藏权重: {config.weight_collect}</label>
                <Slider value={config.weight_collect} min={0} max={100} onChange={v => setConfig({ ...config, weight_collect: v })} />
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title='反馈数据汇总'>
            <Table
              columns={[
                { title: '类型', key: 'type', render: (_: unknown, r: { type: string; count: number }) => <Tag color={FEEDBACK_TYPE_COLORS[r.type] || 'default'}>{FEEDBACK_TYPE_LABELS[r.type] || r.type}</Tag> },
                { title: '次数', key: 'count', render: (_: unknown, r: { count: number }) => <b>{r.count}</b> },
              ]}
              dataSource={[
                { type: 'click', count: counts.click },
                { type: 'read', count: counts.read },
                { type: 'collect', count: counts.collect },
                { type: 'not_interested', count: counts.not_interested },
                { type: 'dismiss', count: counts.dismiss },
              ]}
              rowKey='type'
              pagination={false}
              size='small'
              bordered
            />
          </Card>
        </Col>
      </Row>

      {/* 反馈明细 */}
      <Card title='用户反馈明细' extra={<Button icon={<ReloadOutlined />} onClick={fetchFeedback}>刷新</Button>}>
        {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size='large' /></div> :
          <Table columns={columns} dataSource={feedbackData} rowKey='id' scroll={{ x: 800 }} pagination={tablePagination} size='small' bordered />
        }
      </Card>
    </div>
  )
}

export default Recommendations
