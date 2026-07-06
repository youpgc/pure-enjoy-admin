import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, Table, Button, Space, Select, Tag, Statistic, Row, Col,
  Input, Modal, Form, Spin, Empty, Tooltip, message, InputNumber,
  Slider, Divider,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  TrophyOutlined, ReloadOutlined, ExportOutlined,
  PushpinOutlined, EyeInvisibleOutlined,
  SettingOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { getActionColumn } from '../components/ActionColumn'
import { usePagination } from '../hooks/usePagination'
import { apiQuery, apiExecute, handleApiError } from '../utils/apiClient'
import { supabase } from '../utils/supabase'

// ==================== 类型定义 ====================

interface RankingItem {
  novel_id: string
  title: string
  author: string | null
  cover_url: string | null
  category: string | null
  status: string | null
  total_reads: number
  total_collects: number
  avg_rating: number
  rating_count: number
  daily_reads: number
  daily_collects: number
  weekly_reads: number
  weekly_collects: number
  monthly_reads: number
  monthly_collects: number
  created_at: string
  computed_at: string
}

type RankingType = 'daily_reads' | 'weekly_reads' | 'monthly_reads' | 'total_reads' |
  'daily_collects' | 'weekly_collects' | 'monthly_collects' | 'total_collects' |
  'avg_rating' | 'new_books'

interface Intervention {
  pin_ids: string[]
  block_ids: string[]
}

interface RankingRules {
  rating_min_count: number
  new_book_days_threshold: number
  read_weight: number
  collect_weight: number
  rating_weight: number
}

// ==================== 常量 ====================

const RANKING_OPTIONS = [
  { label: '日榜·阅读', value: 'daily_reads' },
  { label: '周榜·阅读', value: 'weekly_reads' },
  { label: '月榜·阅读', value: 'monthly_reads' },
  { label: '总榜·阅读', value: 'total_reads' },
  { label: '日榜·收藏', value: 'daily_collects' },
  { label: '周榜·收藏', value: 'weekly_collects' },
  { label: '月榜·收藏', value: 'monthly_collects' },
  { label: '总榜·收藏', value: 'total_collects' },
  { label: '评分榜', value: 'avg_rating' },
  { label: '新书榜', value: 'new_books' },
]

const DEFAULT_RULES: RankingRules = {
  rating_min_count: 10,
  new_book_days_threshold: 30,
  read_weight: 1.0,
  collect_weight: 1.0,
  rating_weight: 1.0,
}

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Tag color='gold' style={{ fontWeight: 700, fontSize: 14 }}>🥇</Tag>
  if (rank === 2) return <Tag color='silver' style={{ fontWeight: 700, fontSize: 14 }}>🥈</Tag>
  if (rank === 3) return <Tag color='orange' style={{ fontWeight: 700, fontSize: 14 }}>🥉</Tag>
  return <span style={{ color: '#999', fontWeight: 500 }}>{rank}</span>
}

// ==================== 组件 ====================

const Rankings: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [rankingType, setRankingType] = useState<RankingType>('weekly_reads')
  const [data, setData] = useState<RankingItem[]>([])
  const [lastRefresh, setLastRefresh] = useState<string>('-')
  const [intervention, setIntervention] = useState<Intervention>({ pin_ids: [], block_ids: [] })
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'pin' | 'block'>('pin')
  const [rulesModalOpen, setRulesModalOpen] = useState(false)
  const [rules, setRules] = useState<RankingRules>(DEFAULT_RULES)
  const { pagination, resetPage, setTotal, tablePagination } = usePagination(20)

  // 从 localStorage 加载运营干预配置
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ranking_intervention') || '{}')
      setIntervention({
        pin_ids: saved.pin_ids || [],
        block_ids: saved.block_ids || [],
      })
    } catch {
      setIntervention({ pin_ids: [], block_ids: [] })
    }
  }, [])

  // 从 localStorage 加载榜单规则配置
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ranking_rules') || '{}')
      setRules({
        rating_min_count: saved.rating_min_count ?? DEFAULT_RULES.rating_min_count,
        new_book_days_threshold: saved.new_book_days_threshold ?? DEFAULT_RULES.new_book_days_threshold,
        read_weight: saved.read_weight ?? DEFAULT_RULES.read_weight,
        collect_weight: saved.collect_weight ?? DEFAULT_RULES.collect_weight,
        rating_weight: saved.rating_weight ?? DEFAULT_RULES.rating_weight,
      })
    } catch {
      setRules(DEFAULT_RULES)
    }
  }, [])

  const fetchRankings = useCallback(async () => {
    setLoading(true)
    try {
      const result = await apiQuery<RankingItem[]>(
        () => supabase
          .from('mv_novel_rankings')
          .select('*')
          .order(rankingType, { ascending: false })
          .limit(100),
        'Rankings-查询榜单'
      )
      if (result.success && result.data) {
        let list = result.data.filter(r => !intervention.block_ids.includes(r.novel_id))

        // 应用榜单规则过滤
        if (rankingType === 'avg_rating') {
          list = list.filter(r => r.rating_count >= rules.rating_min_count)
        }
        if (rankingType === 'new_books') {
          const thresholdDate = dayjs().subtract(rules.new_book_days_threshold, 'day')
          list = list.filter(r => dayjs(r.created_at).isAfter(thresholdDate))
          list.sort((a, b) => (b.weekly_reads + b.weekly_collects) - (a.weekly_reads + a.weekly_collects))
        }

        // 置顶优先
        list.sort((a, b) => {
          const aPinned = intervention.pin_ids.includes(a.novel_id) ? 1 : 0
          const bPinned = intervention.pin_ids.includes(b.novel_id) ? 1 : 0
          return bPinned - aPinned
        })
        setData(list)
        setTotal(list.length)
      }
      setLastRefresh(dayjs().format('YYYY-MM-DD HH:mm:ss'))
    } catch (error) {
      handleApiError(error, 'Rankings-加载榜单')
    } finally {
      setLoading(false)
    }
  }, [rankingType, intervention.block_ids, intervention.pin_ids, rules.rating_min_count, rules.new_book_days_threshold, setTotal])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  const handleRefresh = async () => {
    try {
      await apiExecute(() => supabase.rpc('fn_refresh_rankings'), 'Rankings-刷新物化视图')
      message.success('榜单数据已刷新')
      fetchRankings()
    } catch (error) {
      handleApiError(error, 'Rankings-刷新物化视图')
    }
  }

  const handleExport = () => {
    const headers = ['排名', '小说ID', '小说名称', '作者', '分类', '阅读量', '收藏量', '评分', '评分人数']
    const rows = data.map((r, i) => [
      i + 1, r.novel_id, r.title, r.author || '-', r.category || '-',
      r.total_reads, r.total_collects, r.avg_rating, r.rating_count,
    ])
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `排行榜_${rankingType}_${dayjs().format('YYYYMMDD')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const saveIntervention = (type: 'pin' | 'block', ids: string[]) => {
    const key = type === 'pin' ? 'pin_ids' : 'block_ids'
    const newIntervention = { ...intervention, [key]: ids }
    setIntervention(newIntervention)
    localStorage.setItem('ranking_intervention', JSON.stringify(newIntervention))
    message.success(type === 'pin' ? '置顶已更新' : '屏蔽已更新')
    fetchRankings()
  }

  const saveRules = (newRules: RankingRules) => {
    setRules(newRules)
    localStorage.setItem('ranking_rules', JSON.stringify(newRules))
    message.success('榜单规则已保存')
    fetchRankings()
  }

  const renderActions = (record: RankingItem) => {
    const isPinned = intervention.pin_ids.includes(record.novel_id)
    return [
      {
        key: 'pin',
        label: isPinned ? '取消置顶' : '置顶',
        icon: <PushpinOutlined />,
        type: isPinned ? 'primary' : 'default',
        onClick: () => {
          const ids = isPinned
            ? intervention.pin_ids.filter(id => id !== record.novel_id)
            : [...intervention.pin_ids, record.novel_id]
          saveIntervention('pin', ids)
        },
      },
      {
        key: 'block',
        label: '屏蔽',
        icon: <EyeInvisibleOutlined />,
        danger: true,
        onClick: () => {
          if (!intervention.block_ids.includes(record.novel_id)) {
            saveIntervention('block', [...intervention.block_ids, record.novel_id])
          }
        },
      },
    ]
  }

  const columns: ColumnsType<RankingItem> = [
    {
      title: '#', key: 'rank', width: 60, align: 'center',
      render: (_: unknown, __: unknown, index: number) => <RankBadge rank={index + 1} />,
    },
    {
      title: '小说名称', dataIndex: 'title', key: 'title',
      render: (title: string, record) => (
        <Space>
          {intervention.pin_ids.includes(record.novel_id) && <PushpinOutlined style={{ color: '#faad14' }} />}
          <span style={{ fontWeight: 500 }}>{title}</span>
        </Space>
      ),
    },
    { title: '作者', dataIndex: 'author', key: 'author', width: 120, render: (v: string | null) => v || '-' },
    { title: '分类', dataIndex: 'category', key: 'category', width: 100, render: (v: string | null) => v || '-' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (v: string | null) => <Tag color={v === 'completed' ? 'success' : 'blue'}>{v === 'completed' ? '已完结' : '连载中'}</Tag> },
    {
      title: '日阅读', dataIndex: 'daily_reads', key: 'daily_reads', width: 90, align: 'right',
      render: (v: number) => <Tag color='blue'>{v || 0}</Tag>,
    },
    {
      title: '周阅读', dataIndex: 'weekly_reads', key: 'weekly_reads', width: 90, align: 'right',
      render: (v: number) => <Tag color='cyan'>{v || 0}</Tag>,
    },
    {
      title: '月阅读', dataIndex: 'monthly_reads', key: 'monthly_reads', width: 90, align: 'right',
      render: (v: number) => <Tag color='geekblue'>{v || 0}</Tag>,
    },
    {
      title: '总阅读', dataIndex: 'total_reads', key: 'total_reads', width: 90, align: 'right',
      render: (v: number) => <Tag color='purple'>{v || 0}</Tag>,
    },
    {
      title: '总收藏', dataIndex: 'total_collects', key: 'total_collects', width: 90, align: 'right',
      render: (v: number) => <Tag color='magenta'>{v || 0}</Tag>,
    },
    {
      title: '评分', dataIndex: 'avg_rating', key: 'avg_rating', width: 80, align: 'right',
      render: (v: number, r: RankingItem) => (
        <Tooltip title={`${r.rating_count} 人评分`}>
          <Tag color='orange'>{(v || 0).toFixed(1)}</Tag>
        </Tooltip>
      ),
    },
    getActionColumn<RankingItem>(renderActions, { width: 220, maxVisible: 2 }),
  ]

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title='总小说数' value={data.length} prefix={<TrophyOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title='已完结' value={data.filter(d => d.status === 'completed').length} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title='置顶数' value={intervention.pin_ids.length} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title='屏蔽数' value={intervention.block_ids.length} /></Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Select
              value={rankingType}
              options={RANKING_OPTIONS}
              style={{ width: 140 }}
              onChange={setRankingType}
            />
            <Button type='primary' onClick={fetchRankings} loading={loading}>查询</Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>刷新榜单</Button>
          </Space>
          <Space>
            <Button icon={<ExportOutlined />} onClick={handleExport}>导出CSV</Button>
            <Button icon={<SettingOutlined />} onClick={() => setRulesModalOpen(true)}>
              规则配置
            </Button>
            <Button onClick={() => { setModalType('pin'); setModalOpen(true) }}>
              <PushpinOutlined /> 置顶管理
            </Button>
            <Button danger onClick={() => { setModalType('block'); setModalOpen(true) }}>
              <EyeInvisibleOutlined /> 屏蔽管理
            </Button>
          </Space>
        </Space>
        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
          上次刷新：{lastRefresh}
          {rankingType === 'avg_rating' && (
            <Tag size='small' style={{ marginLeft: 8 }} color='blue'>
              评分门槛 ≥ {rules.rating_min_count} 人
            </Tag>
          )}
          {rankingType === 'new_books' && (
            <Tag size='small' style={{ marginLeft: 8 }} color='green'>
              近 {rules.new_book_days_threshold} 天上架
            </Tag>
          )}
        </div>
      </Card>

      {/* 数据表格 */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Spin size='large' /></div>
        ) : data.length === 0 ? (
          <Empty description='暂无榜单数据' />
        ) : (
          <Table
            columns={columns}
            dataSource={data}
            rowKey='novel_id'
            scroll={{ x: 1300 }}
            pagination={tablePagination}
            size='small'
            bordered
          />
        )}
      </Card>

      {/* 干预弹窗 */}
      <Modal
        title={modalType === 'pin' ? '置顶小说管理' : '屏蔽小说管理'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form layout='vertical'>
          <Form.Item label={modalType === 'pin' ? '置顶小说ID（逗号分隔）' : '屏蔽小说ID（逗号分隔）'}>
            <Input.TextArea
              rows={4}
              defaultValue={(modalType === 'pin' ? intervention.pin_ids : intervention.block_ids).join(', ')}
              placeholder='输入小说UUID，多个用逗号分隔'
            />
          </Form.Item>
          <Button
            type='primary'
            onClick={() => {
              const textarea = document.querySelector('.ant-modal textarea') as HTMLTextAreaElement
              const ids = textarea.value.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
              saveIntervention(modalType, ids)
              setModalOpen(false)
            }}
          >
            保存
          </Button>
        </Form>
      </Modal>

      {/* 规则配置弹窗 */}
      <Modal
        title='榜单规则配置'
        open={rulesModalOpen}
        onCancel={() => setRulesModalOpen(false)}
        footer={null}
        width={520}
      >
        <Form layout='vertical' initialValues={rules}>
          <Divider orientation='left' plain>参与门槛</Divider>
          <Form.Item label='评分榜最少评分人数' name='rating_min_count'>
            <InputNumber
              min={1}
              max={1000}
              style={{ width: '100%' }}
              placeholder='默认 10 人'
              onChange={(v) => setRules(prev => ({ ...prev, rating_min_count: v ?? DEFAULT_RULES.rating_min_count }))}
            />
          </Form.Item>
          <Form.Item label='新书榜天数阈值' name='new_book_days_threshold'>
            <InputNumber
              min={1}
              max={365}
              style={{ width: '100%' }}
              placeholder='默认 30 天'
              onChange={(v) => setRules(prev => ({ ...prev, new_book_days_threshold: v ?? DEFAULT_RULES.new_book_days_threshold }))}
            />
          </Form.Item>

          <Divider orientation='left' plain>算法权重</Divider>
          <Form.Item label={`阅读量权重 (${rules.read_weight}x)`}>
            <Slider
              min={0}
              max={5}
              step={0.1}
              value={rules.read_weight}
              onChange={(v) => setRules(prev => ({ ...prev, read_weight: v }))}
            />
          </Form.Item>
          <Form.Item label={`收藏量权重 (${rules.collect_weight}x)`}>
            <Slider
              min={0}
              max={5}
              step={0.1}
              value={rules.collect_weight}
              onChange={(v) => setRules(prev => ({ ...prev, collect_weight: v }))}
            />
          </Form.Item>
          <Form.Item label={`评分权重 (${rules.rating_weight}x)`}>
            <Slider
              min={0}
              max={5}
              step={0.1}
              value={rules.rating_weight}
              onChange={(v) => setRules(prev => ({ ...prev, rating_weight: v }))}
            />
          </Form.Item>

          <Space style={{ marginTop: 16 }}>
            <Button type='primary' onClick={() => { saveRules(rules); setRulesModalOpen(false) }}>
              保存并应用
            </Button>
            <Button onClick={() => { setRules(DEFAULT_RULES); saveRules(DEFAULT_RULES) }}>
              恢复默认
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  )
}

export default Rankings
