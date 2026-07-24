import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, Table, Statistic, Row, Col, Tag, Button, Space,
  Input, InputNumber, Spin, Empty, Tabs,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AudioOutlined, ClockCircleOutlined, UserOutlined,
  ReloadOutlined, SearchOutlined, FireOutlined,
  WarningOutlined, BarChartOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { usePagination } from '../hooks/usePagination'
import { BaseService, handleApiError } from '../utils/apiClient'
import { supabase } from '../utils/supabase'
import { useUsernames } from '../hooks/useUsernames'
import { UserName } from '../components/UserName'

// ==================== 类型定义 ====================

interface TtsPlaybackLog {
  id: string
  user_id: string
  novel_id: string
  chapter_id: string
  start_sentence_index: number
  end_sentence_index: number | null
  duration_seconds: number | null
  speech_rate: number
  playback_mode: string
  created_at: string
}

interface UserPlayStats {
  user_id: string
  play_count: number
  total_duration: number
}

interface NovelPlayStats {
  novel_id: string
  play_count: number
  total_duration: number
  unique_users: number
}

// ==================== 常量 ====================

const PLAYBACK_MODE_MAP: Record<string, string> = {
  sentence: '逐句',
  paragraph: '逐段',
  chapter: '整章',
}

const PLAYBACK_MODE_COLORS: Record<string, string> = {
  sentence: 'blue',
  paragraph: 'cyan',
  chapter: 'purple',
}

// ==================== 组件 ====================

const TtsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('logs')
  const [logs, setLogs] = useState<TtsPlaybackLog[]>([])
  const [loading, setLoading] = useState(false)
  const [searchUser, setSearchUser] = useState('')
  const [minDuration, setMinDuration] = useState<number | null>(null)
  const [playStats, setPlayStats] = useState<UserPlayStats[]>([])

  // 批量解析列表中涉及的用户名（用于「用户名」列）
  const userMap = useUsernames([...logs, ...playStats].map((l) => l.user_id))
  const [novelStats, setNovelStats] = useState<NovelPlayStats[]>([])
  const [errorStats, setErrorStats] = useState({ failCount: 0, interruptCount: 0, totalCount: 0 })
  const logService = React.useMemo(() => new BaseService<TtsPlaybackLog>('tts_playback_logs', { defaultOrder: { column: 'created_at', ascending: false } }), [])
  const { pagination, resetPage, setTotal, tablePagination } = usePagination(20)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await logService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (searchUser) query = query.eq('user_id', searchUser)
        if (minDuration) query = query.gte('duration_seconds', minDuration)
        return query
      })
      if (result.success && result.data) {
        setLogs(result.data.data)
        setTotal(result.data.total)
      }
    } catch (error) {
      handleApiError(error, 'TtsManagement-加载记录')
    } finally {
      setLoading(false)
    }
  }, [searchUser, minDuration, logService, pagination.current, pagination.pageSize, setTotal])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const fetchStats = async () => {
    setLoading(true)
    try {
      // 用户播放排行
      const { data: rawData, error } = await supabase
        .from('tts_playback_logs')
        .select('user_id, duration_seconds')
      if (error) throw error
      const userMap = new Map<string, { count: number; duration: number }>()
      ;(rawData || []).forEach((log: any) => {
        const uid = log.user_id
        if (!userMap.has(uid)) userMap.set(uid, { count: 0, duration: 0 })
        const s = userMap.get(uid)!
        s.count++
        s.duration += (log.duration_seconds || 0)
      })
      const stats = Array.from(userMap.entries())
        .map(([uid, v]) => ({ user_id: uid, play_count: v.count, total_duration: v.duration }))
        .sort((a, b) => b.play_count - a.play_count)
        .slice(0, 20)
      setPlayStats(stats)

      // 热门小说排行
      const novelMap = new Map<string, { count: number; duration: number; users: Set<string> }>()
      ;(rawData || []).forEach((log: any) => {
        const nid = log.novel_id
        if (!novelMap.has(nid)) novelMap.set(nid, { count: 0, duration: 0, users: new Set() })
        const s = novelMap.get(nid)!
        s.count++
        s.duration += (log.duration_seconds || 0)
        s.users.add(log.user_id)
      })
      const nstats = Array.from(novelMap.entries())
        .map(([nid, v]) => ({ novel_id: nid, play_count: v.count, total_duration: v.duration, unique_users: v.users.size }))
        .sort((a, b) => b.play_count - a.play_count)
        .slice(0, 20)
      setNovelStats(nstats)

      // 异常监控统计
      const total = rawData?.length || 0
      const fails = logs.filter(l => l.duration_seconds === null || l.duration_seconds === 0).length
      const interrupts = logs.filter(l => l.end_sentence_index !== null && l.end_sentence_index !== undefined).length
      setErrorStats({ failCount: fails, interruptCount: interrupts, totalCount: total })
    } catch (error) {
      handleApiError(error, 'TtsManagement-加载统计')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}分${s}秒` : `${s}秒`
  }

  const columns: ColumnsType<TtsPlaybackLog> = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 140, render: (v: string) => v.slice(0, 12) + '...' },
    { title: '用户名', dataIndex: 'user_id', key: 'username', width: 120, render: (v: string) => <UserName userId={v} userMap={userMap} /> },
    { title: '小说ID', dataIndex: 'novel_id', key: 'novel_id', width: 140, render: (v: string) => v.slice(0, 12) + '...' },
    { title: '语速', dataIndex: 'speech_rate', key: 'speech_rate', width: 70, render: (v: number) => `${v.toFixed(1)}x` },
    {
      title: '模式', dataIndex: 'playback_mode', key: 'mode', width: 80,
      render: (v: string) => <Tag color={PLAYBACK_MODE_COLORS[v] || 'default'}>{PLAYBACK_MODE_MAP[v] || v}</Tag>,
    },
    {
      title: '时长', dataIndex: 'duration_seconds', key: 'duration', width: 100,
      render: (v: number | null) => formatDuration(v),
    },
    {
      title: '收听时间', dataIndex: 'created_at', key: 'created_at', width: 150,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
  ]

  const statsColumns: ColumnsType<UserPlayStats> = [
    { title: '#', key: 'rank', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id', render: (v: string) => v.slice(0, 12) + '...' },
    { title: '用户名', dataIndex: 'user_id', key: 'username', width: 120, render: (v: string) => <UserName userId={v} userMap={userMap} /> },
    { title: '播放次数', dataIndex: 'play_count', key: 'play_count', width: 120, align: 'right' },
    { title: '总时长', dataIndex: 'total_duration', key: 'total_duration', width: 120, align: 'right', render: (v: number) => formatDuration(v) },
  ]

  const novelColumns: ColumnsType<NovelPlayStats> = [
    { title: '#', key: 'rank', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: '小说ID', dataIndex: 'novel_id', key: 'novel_id', render: (v: string) => v.slice(0, 12) + '...' },
    { title: '播放次数', dataIndex: 'play_count', key: 'play_count', width: 120, align: 'right' },
    { title: '独立听众', dataIndex: 'unique_users', key: 'users', width: 120, align: 'right' },
    { title: '总时长', dataIndex: 'total_duration', key: 'total_duration', width: 120, align: 'right', render: (v: number) => formatDuration(v) },
  ]

  const totalPlays = logs.length
  const avgDuration = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + (l.duration_seconds || 0), 0) / logs.length)
    : 0
  const uniqueModes = new Set(logs.map(l => l.playback_mode)).size

  const failRate = errorStats.totalCount > 0
    ? ((errorStats.failCount / errorStats.totalCount) * 100).toFixed(1)
    : '0.0'
  const interruptRate = errorStats.totalCount > 0
    ? ((errorStats.interruptCount / errorStats.totalCount) * 100).toFixed(1)
    : '0.0'

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title='播放次数' value={totalPlays} prefix={<AudioOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title='平均时长' value={formatDuration(avgDuration)} prefix={<ClockCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title='播放模式' value={uniqueModes} suffix='种' prefix={<AudioOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title='用户数' value={new Set(logs.map(l => l.user_id)).size} prefix={<UserOutlined />} /></Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab='播放记录' key='logs' />
        <Tabs.TabPane tab='热门内容' key='hot' />
        <Tabs.TabPane tab='异常监控' key='error' />
      </Tabs>

      {activeTab === 'logs' && (
        <Card
          title='听书播放记录'
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => { resetPage(); fetchLogs() }}>刷新</Button>
              <Button onClick={fetchStats} loading={loading}>统计报表</Button>
            </Space>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Input
                placeholder='用户ID'
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                style={{ width: 160 }}
                prefix={<SearchOutlined />}
                allowClear
              />
              <InputNumber
                placeholder='最短时长(秒)'
                value={minDuration}
                min={0}
                style={{ width: 160 }}
                onChange={v => setMinDuration(v || null)}
              />
              <Button type='primary' icon={<SearchOutlined />} onClick={() => { resetPage(); fetchLogs() }}>查询</Button>
            </Space>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80 }}><Spin size='large' /></div>
          ) : (
            <Table
              columns={columns}
              dataSource={logs}
              rowKey='id'
              scroll={{ x: 900 }}
              pagination={tablePagination}
              size='small'
              bordered
            />
          )}
        </Card>
      )}

      {activeTab === 'hot' && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title='热门小说 Top20' extra={<FireOutlined style={{ color: '#ff4d4f' }} />}>
              {novelStats.length === 0 ? (
                <Empty description='暂无数据，点击统计报表加载' />
              ) : (
                <Table
                  columns={novelColumns}
                  dataSource={novelStats}
                  rowKey='novel_id'
                  pagination={false}
                  size='small'
                  bordered
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title='活跃用户 Top20' extra={<BarChartOutlined />}>
              {playStats.length === 0 ? (
                <Empty description='暂无数据，点击统计报表加载' />
              ) : (
                <Table
                  columns={statsColumns}
                  dataSource={playStats}
                  rowKey='user_id'
                  pagination={false}
                  size='small'
                  bordered
                />
              )}
            </Card>
          </Col>
        </Row>
      )}

      {activeTab === 'error' && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title='失败率'
                value={failRate}
                suffix='%'
                valueStyle={{ color: parseFloat(failRate) > 5 ? '#ff4d4f' : '#52c41a' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title='中断率'
                value={interruptRate}
                suffix='%'
                valueStyle={{ color: parseFloat(interruptRate) > 10 ? '#faad14' : '#52c41a' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title='异常总数'
                value={errorStats.failCount + errorStats.interruptCount}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col span={24}>
            <Card title='异常记录'>
              {logs.filter(l => l.duration_seconds === null || l.duration_seconds === 0).length === 0 ? (
                <Empty description='暂无异常记录' />
              ) : (
                <Table
                  columns={columns}
                  dataSource={logs.filter(l => l.duration_seconds === null || l.duration_seconds === 0)}
                  rowKey='id'
                  pagination={{ pageSize: 10 }}
                  size='small'
                  bordered
                />
              )}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}

export default TtsManagement