import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, Table, Tabs, Tag, Button, Space, Input, Popconfirm,
  Spin, Empty, Statistic, Row, Col, DatePicker, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  MessageOutlined, DeleteOutlined, ReloadOutlined,
  SearchOutlined, WarningOutlined, ExportOutlined,
  RiseOutlined, LineChartOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { getActionColumn } from '../components/ActionColumn'
import { usePagination } from '../hooks/usePagination'
import { BaseService, apiQuery, apiExecute, handleApiError } from '../utils/apiClient'

// ==================== 类型定义 ====================

interface NovelAnnotation {
  id: string
  user_id: string
  novel_id: string
  chapter_id: string
  chapter_order: number
  start_offset: number
  end_offset: number
  highlighted_text: string
  note: string | null
  color: string
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

interface TrendItem {
  date: string
  count: number
}

// ==================== 常量 ====================

const COLOR_MAP: Record<string, string> = {
  yellow: '#faad14',
  green: '#52c41a',
  blue: '#1890ff',
  red: '#f5222d',
}

const SENSITIVE_WORDS = ['色情', '暴力', '赌博', '毒品', '反动', '政治', '傻逼', '他妈的']

const ColorDot = ({ color }: { color: string }) => (
  <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 4, background: COLOR_MAP[color] || color, border: '1px solid #ddd' }} />
)

const containsSensitive = (text: string) => SENSITIVE_WORDS.filter(w => text.includes(w))

// ==================== 组件 ====================

const Annotations: React.FC = () => {
  const [activeTab, setActiveTab] = useState('list')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<NovelAnnotation[]>([])
  const [filtered, setFiltered] = useState<NovelAnnotation[]>([])
  const [searchUser, setSearchUser] = useState('')
  const [searchNovel, setSearchNovel] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([])
  const [trendData, setTrendData] = useState<TrendItem[]>([])
  const annotationService = React.useMemo(() => new BaseService<NovelAnnotation>('novel_annotations', { defaultOrder: { column: 'created_at', ascending: false } }), [])
  const { pagination, resetPage, setTotal, tablePagination } = usePagination(20)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await annotationService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q.eq('is_deleted', false)
        if (searchUser) query = query.eq('user_id', searchUser)
        if (searchNovel) query = query.eq('novel_id', searchNovel)
        if (dateRange[0] && dateRange[1]) {
          query = query
            .gte('created_at', dateRange[0].format('YYYY-MM-DD'))
            .lte('created_at', dateRange[1].format('YYYY-MM-DD') + 'T23:59:59')
        }
        return query
      })
      if (result.success && result.data) {
        setData(result.data.data)
        setFiltered(result.data.data)
        setTotal(result.data.total)
      }
    } catch (error) {
      handleApiError(error, 'Annotations-加载数据')
    } finally {
      setLoading(false)
    }
  }, [searchUser, searchNovel, dateRange, annotationService, pagination.current, pagination.pageSize, setTotal])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchTrend = useCallback(async () => {
    setLoading(true)
    try {
      const result = await annotationService.findAll((q) => q.eq('is_deleted', false))
      if (result.success && result.data) {
        const allData = result.data
        // 按日期分组统计
        const dateMap = new Map<string, number>()
        const today = dayjs()
        for (let i = 29; i >= 0; i--) {
          dateMap.set(today.subtract(i, 'day').format('YYYY-MM-DD'), 0)
        }
        allData.forEach((a) => {
          const d = dayjs(a.created_at).format('YYYY-MM-DD')
          if (dateMap.has(d)) {
            dateMap.set(d, (dateMap.get(d) || 0) + 1)
          }
        })
        const trend = Array.from(dateMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date))
        setTrendData(trend)
      }
    } catch (error) {
      handleApiError(error, 'Annotations-加载趋势')
    } finally {
      setLoading(false)
    }
  }, [annotationService])

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchTrend()
    }
  }, [activeTab, fetchTrend])

  const handleDelete = async (id: string) => {
    try {
      const result = await apiExecute(
        () => annotationService.update(id, { is_deleted: true, deleted_at: new Date().toISOString() }),
        'Annotations-删除批注'
      )
      if (result.success) {
        message.success('批注已删除')
        fetchData()
      }
    } catch (error) {
      handleApiError(error, 'Annotations-删除批注')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return message.warning('请先选择批注')
    try {
      const result = await annotationService.batchUpdate(selectedIds as string[], {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      if (result.success) {
        message.success(`已删除 ${selectedIds.length} 条批注`)
        setSelectedIds([])
        fetchData()
      }
    } catch (error) {
      handleApiError(error, 'Annotations-批量删除')
    }
  }

  const handleExport = () => {
    const headers = ['ID', '用户ID', '小说ID', '章节', '高亮文本', '笔记', '颜色', '创建时间']
    const rows = data.map(a => [
      a.id, a.user_id, a.novel_id, a.chapter_order,
      a.highlighted_text, a.note || '', a.color, a.created_at,
    ])
    const csv = [headers, ...rows].map(row =>
      row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `批注导出_${dayjs().format('YYYYMMDD')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    message.success('导出成功')
  }

  const reviewData = data.filter(a => {
    const text = (a.highlighted_text || '') + (a.note || '')
    return containsSensitive(text).length > 0
  })

  const renderActions = (record: NovelAnnotation) => [
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(record.id),
    },
  ]

  const columns: ColumnsType<NovelAnnotation> = [
    {
      title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 140,
      render: (v: string) => v.slice(0, 12) + '...',
    },
    {
      title: '小说ID', dataIndex: 'novel_id', key: 'novel_id', width: 140,
      render: (v: string) => v.slice(0, 12) + '...',
    },
    { title: '章节', dataIndex: 'chapter_order', key: 'chapter', width: 80, render: (v: number) => `第${v}章` },
    {
      title: '高亮文本', dataIndex: 'highlighted_text', key: 'text',
      render: (v: string) => <span style={{ maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>,
    },
    { title: '备注', dataIndex: 'note', key: 'note', render: (v: string | null) => v || '-' },
    {
      title: '颜色', dataIndex: 'color', key: 'color', width: 60, align: 'center',
      render: (v: string) => <ColorDot color={v} />,
    },
    {
      title: '时间', dataIndex: 'created_at', key: 'created_at', width: 150,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
    getActionColumn<NovelAnnotation>(renderActions, { width: 100 }),
  ]

  const reviewColumns: ColumnsType<NovelAnnotation> = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 140, render: (v: string) => v.slice(0, 12) + '...' },
    { title: '高亮文本', dataIndex: 'highlighted_text', key: 'text' },
    { title: '备注', dataIndex: 'note', key: 'note', render: (v: string | null) => v || '-' },
    {
      title: '命中敏感词', key: 'sensitive',
      render: (_: unknown, r: NovelAnnotation) => {
        const words = containsSensitive((r.highlighted_text || '') + (r.note || ''))
        return <Space>{words.map(w => <Tag color='error' key={w}>{w}</Tag>)}</Space>
      },
    },
    getActionColumn<NovelAnnotation>(renderActions, { width: 100 }),
  ]

  const totalUsers = new Set(data.map(d => d.user_id)).size
  const thisWeek = data.filter(d => dayjs(d.created_at).isAfter(dayjs().subtract(7, 'day')))

  // 趋势数据：计算最大值用于图表高度
  const maxTrendCount = trendData.length > 0 ? Math.max(...trendData.map(t => t.count)) : 1

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab='批注列表' key='list' />
        <Tabs.TabPane tab={`待审核${reviewData.length > 0 ? ` (${reviewData.length})` : ''}`} key='review' />
        <Tabs.TabPane tab='统计报表' key='stats' />
      </Tabs>

      {activeTab === 'list' && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Space wrap>
              <Input placeholder='用户ID' value={searchUser} onChange={e => setSearchUser(e.target.value)} style={{ width: 160 }} prefix={<SearchOutlined />} />
              <Input placeholder='小说ID' value={searchNovel} onChange={e => setSearchNovel(e.target.value)} style={{ width: 160 }} />
              <DatePicker.RangePicker value={dateRange} onChange={dates => setDateRange(dates || [null, null])} />
              <Button type='primary' icon={<SearchOutlined />} onClick={() => { resetPage(); fetchData() }}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
              <Button icon={<ExportOutlined />} onClick={handleExport}>导出CSV</Button>
              <Button danger onClick={handleBatchDelete} disabled={selectedIds.length === 0}>
                <DeleteOutlined /> 批量删除 ({selectedIds.length})
              </Button>
            </Space>
          </Card>
          <Card>
            {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size='large' /></div> :
              <Table
                columns={columns}
                dataSource={filtered}
                rowKey='id'
                rowSelection={{ selectedRowKeys: selectedIds, onChange: setSelectedIds }}
                scroll={{ x: 1100 }}
                pagination={tablePagination}
                size='small'
                bordered
              />
            }
          </Card>
        </>
      )}

      {activeTab === 'review' && (
        <Card>
          {reviewData.length === 0 ? <Empty description='暂无待审核批注' /> :
            <Table columns={reviewColumns} dataSource={reviewData} rowKey='id' pagination={{ pageSize: 20 }} size='small' bordered />
          }
        </Card>
      )}

      {activeTab === 'stats' && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title='总批注数' value={data.length} prefix={<MessageOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title='批注用户数' value={totalUsers} prefix={<MessageOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title='本周新增' value={thisWeek.length} prefix={<RiseOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title='日均新增' value={trendData.length > 0 ? (data.length / 30).toFixed(1) : '0'} prefix={<LineChartOutlined />} /></Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title='近30天批注趋势'>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : trendData.length === 0 ? (
                  <Empty description='暂无趋势数据' />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 4, padding: '0 8px' }}>
                    {trendData.map((item, index) => {
                      const height = maxTrendCount > 0 ? (item.count / maxTrendCount) * 180 : 0
                      return (
                        <div key={item.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <div style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>{item.count}</div>
                          <div
                            style={{
                              width: '100%',
                              height: `${height}px`,
                              background: index % 7 === 6 ? '#1890ff' : '#91d5ff',
                              borderRadius: '2px 2px 0 0',
                              minHeight: item.count > 0 ? 4 : 0,
                            }}
                            title={`${item.date}: ${item.count} 条`}
                          />
                          <div style={{ fontSize: 10, color: '#999', marginTop: 4, transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap' }}>
                            {dayjs(item.date).format('MM-DD')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </Col>
            <Col span={24}>
              <Card title='颜色分布'>
                <Space size='large'>
                  {['yellow', 'green', 'blue', 'red'].map(c => {
                    const count = data.filter(d => d.color === c).length
                    return (
                      <Space key={c}>
                        <ColorDot color={c} />
                        <span>{c === 'yellow' ? '黄色' : c === 'green' ? '绿色' : c === 'blue' ? '蓝色' : '红色'}: <b>{count}</b></span>
                      </Space>
                    )
                  })}
                </Space>
              </Card>
            </Col>
            <Col span={24}>
              <Card title={`待审核批注: ${reviewData.length} 条`}>
                {reviewData.length > 0 && (
                  <Space>
                    <WarningOutlined style={{ color: '#ff4d4f' }} />
                    <span style={{ color: '#ff4d4f' }}>发现 {reviewData.length} 条含敏感词的批注，请尽快审核</span>
                  </Space>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}

export default Annotations