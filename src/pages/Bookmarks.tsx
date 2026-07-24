import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, Table, Tabs, Progress, Tag, Statistic, Row, Col,
  Input, Button, Space, Spin, Empty,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  BookOutlined, ReadOutlined, WarningOutlined,
  SearchOutlined, ReloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { usePagination } from '../hooks/usePagination'
import { BaseService, apiQuery, handleApiError } from '../utils/apiClient'
import EllipsisText from '../components/EllipsisText'
import { useUsernames } from '../hooks/useUsernames'
import { UserName } from '../components/UserName'

// ==================== 类型定义 ====================

interface UserNovelProgress {
  id: string
  user_id: string
  novel_id: string
  progress: number
  last_chapter: number
  reading_status: string
  last_read_at: string
  created_at: string
  updated_at: string
}

interface NovelSummary {
  id: string
  title: string
  chapter_count: number
}

interface CompletionRate {
  novel_id: string
  title: string
  total_readers: number
  finished_count: number
  completion_rate: number
}

// ==================== 组件 ====================

const Bookmarks: React.FC = () => {
  const [activeTab, setActiveTab] = useState('progress')
  const [loading, setLoading] = useState(false)
  const [progressData, setProgressData] = useState<UserNovelProgress[]>([])

  // 批量解析列表中涉及的用户名（用于「用户名」列）
  const userMap = useUsernames(progressData.map((d) => d.user_id))
  const [completionData, setCompletionData] = useState<CompletionRate[]>([])
  const [novelMap, setNovelMap] = useState<Map<string, string>>(new Map())
  const [searchUser, setSearchUser] = useState('')
  const [searchNovel, setSearchNovel] = useState('')
  const progressService = React.useMemo(() => new BaseService<UserNovelProgress>('user_novels', { defaultOrder: { column: 'last_read_at', ascending: false } }), [])
  const novelService = React.useMemo(() => new BaseService<NovelSummary>('novels'), [])
  const { pagination, resetPage, setTotal, tablePagination } = usePagination(20)

  const loadNovelTitles = useCallback(async () => {
    const result = await novelService.findAll()
    if (result.success && result.data) {
      const map = new Map<string, string>()
      result.data.forEach(n => map.set(n.id, n.title))
      setNovelMap(map)
    }
  }, [novelService])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === 'progress') {
        const result = await progressService.paginate(pagination.current, pagination.pageSize, (q) => {
          let query = q
          if (searchUser) query = query.eq('user_id', searchUser)
          if (searchNovel) query = query.eq('novel_id', searchNovel)
          return query
        })
        if (result.success && result.data) {
          setProgressData(result.data.data)
          setTotal(result.data.total)
        }
      } else if (activeTab === 'completion') {
        // 聚合完读率
        const result = await apiQuery<UserNovelProgress[]>(
          () => progressService.findAll(q => q.select('novel_id,reading_status')).then(r => r.data || []),
          'Bookmarks-完读率聚合'
        )
        if (result.success && result.data) {
          await loadNovelTitles()
          const novelStats = new Map<string, { total: number; finished: number }>()
          result.data.forEach(item => {
            const nid = item.novel_id
            if (!novelStats.has(nid)) novelStats.set(nid, { total: 0, finished: 0 })
            const s = novelStats.get(nid)!
            s.total++
            if (item.reading_status === 'finished') s.finished++
          })
          const rates = Array.from(novelStats.entries())
            .filter(([_, v]) => v.total >= 3)
            .map(([nid, v]) => ({
              novel_id: nid,
              title: novelMap.get(nid) || nid.slice(0, 8),
              total_readers: v.total,
              finished_count: v.finished,
              completion_rate: v.total > 0 ? Math.round(v.finished / v.total * 100) : 0,
            }))
            .sort((a, b) => b.completion_rate - a.completion_rate)
          setCompletionData(rates)
          setTotal(rates.length)
        }
      }
    } catch (error) {
      handleApiError(error, 'Bookmarks-加载数据')
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchUser, searchNovel, progressService, novelMap, loadNovelTitles, pagination.current, pagination.pageSize, setTotal])

  useEffect(() => {
    loadNovelTitles()
  }, [loadNovelTitles])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const statusTag = (status: string) => {
    const map: Record<string, React.ReactNode> = {
      unread: <Tag color='default'>未读</Tag>,
      reading: <Tag color='processing'>阅读中</Tag>,
      finished: <Tag color='success'>已读完</Tag>,
      dropped: <Tag color='error'>已弃书</Tag>,
    }
    return map[status] || <Tag>{status}</Tag>
  }

  const progressColumns: ColumnsType<UserNovelProgress> = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 140, render: (v: string) => v.slice(0, 12) + '...' },
    { title: '用户名', dataIndex: 'user_id', key: 'username', width: 120, render: (v: string) => <UserName userId={v} userMap={userMap} /> },
    { title: '小说', dataIndex: 'novel_id', key: 'novel', render: (v: string) => <EllipsisText text={novelMap.get(v) || v.slice(0, 8)} maxWidth={200} /> },
    {
      title: '进度', dataIndex: 'progress', key: 'progress', width: 180,
      render: (v: number) => <Progress percent={Math.round(v * 100)} size='small' status={v >= 1 ? 'success' : 'active'} />,
    },
    { title: '最后章节', dataIndex: 'last_chapter', key: 'last_chapter', width: 100 },
    { title: '状态', dataIndex: 'reading_status', key: 'status', width: 100, render: statusTag },
    { title: '最后阅读', dataIndex: 'last_read_at', key: 'last_read_at', width: 160, render: (v: string) => v ? dayjs(v).format('MM-DD HH:mm') : '-' },
  ]

  const completionColumns: ColumnsType<CompletionRate> = [
    { title: '#', key: 'rank', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: '小说名称', dataIndex: 'title', key: 'title', render: (v: string) => <EllipsisText text={v} maxWidth={200} /> },
    { title: '总读者', dataIndex: 'total_readers', key: 'total', width: 100, align: 'right' },
    { title: '完读人数', dataIndex: 'finished_count', key: 'finished', width: 100, align: 'right' },
    {
      title: '完读率', dataIndex: 'completion_rate', key: 'rate', width: 180,
      render: (v: number) => (
        <Space>
          <Progress percent={v} size='small' status={v >= 80 ? 'success' : v >= 50 ? 'active' : 'exception'} />
          <span style={{ minWidth: 40 }}>{v}%</span>
        </Space>
      ),
    },
    {
      title: '流失率', key: 'churn', width: 80, align: 'right',
      render: (_: unknown, r: CompletionRate) => <Tag color='error'>{100 - r.completion_rate}%</Tag>,
    },
  ]

  // 流失分析
  const churnNovels = completionData.filter(r => r.completion_rate < 30).slice(0, 10)

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab='阅读进度' key='progress' />
        <Tabs.TabPane tab='完读率' key='completion' />
        <Tabs.TabPane tab='流失分析' key='churn' />
      </Tabs>

      {activeTab === 'progress' && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Space>
              <Input placeholder='用户ID' value={searchUser} onChange={e => setSearchUser(e.target.value)} style={{ width: 160 }} prefix={<SearchOutlined />} />
              <Input placeholder='小说ID' value={searchNovel} onChange={e => setSearchNovel(e.target.value)} style={{ width: 160 }} prefix={<BookOutlined />} />
              <Button type='primary' icon={<SearchOutlined />} onClick={() => { resetPage(); fetchData() }}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
            </Space>
          </Card>
          <Card>
            {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size='large' /></div> :
              <Table columns={progressColumns} dataSource={progressData} rowKey='id' scroll={{ x: 900 }} pagination={tablePagination} size='small' bordered />
            }
          </Card>
        </>
      )}

      {activeTab === 'completion' && (
        <Card>
          {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size='large' /></div> :
            <Table columns={completionColumns} dataSource={completionData} rowKey='novel_id' scroll={{ x: 800 }} pagination={{ pageSize: 20 }} size='small' bordered />
          }
        </Card>
      )}

      {activeTab === 'churn' && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title='高风险流失小说' value={churnNovels.length} prefix={<WarningOutlined />} valueStyle={{ color: '#cf1322' }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title='平均完读率' value={completionData.length > 0 ? Math.round(completionData.reduce((s, r) => s + r.completion_rate, 0) / completionData.length) : 0} suffix='%' prefix={<ReadOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title='统计样本' value={completionData.length} prefix={<BookOutlined />} />
              </Card>
            </Col>
          </Row>
          <Card title='高流失风险小说 Top10'>
            {churnNovels.length === 0 ? <Empty description='暂无高流失风险小说' /> : (
              <Table
                columns={[
                  { title: '#', key: 'rank', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
                  { title: '小说', dataIndex: 'title', key: 'title', render: (v: string) => <EllipsisText text={v} maxWidth={200} /> },
                  { title: '读者数', dataIndex: 'total_readers', key: 'total', width: 100 },
                  { title: '完读率', dataIndex: 'completion_rate', key: 'rate', width: 120, render: (v: number) => <Tag color='error'>{v}%</Tag> },
                  { title: '建议', key: 'suggestion', render: () => <Tag color='warning'>优化开篇</Tag> },
                ]}
                dataSource={churnNovels}
                rowKey='novel_id'
                pagination={false}
                size='small'
                bordered
              />
            )}
          </Card>
        </>
      )}
    </div>
  )
}

export default Bookmarks
