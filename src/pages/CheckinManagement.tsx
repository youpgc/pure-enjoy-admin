import React, { useState, useCallback, useEffect } from 'react'
import { Card, Table, Button, Drawer, Space, Typography, Empty, Spin, Tag, message, theme } from 'antd'
import { ReloadOutlined, CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'
import { supabase } from '../utils/supabase'

// ==================== 类型 ====================

// 签到日历专用品牌色（无对应 antd token，集中定义避免散落内联 hex）
const CHECKIN_ACCENT = '#6C63FF' // 正常签到主色（品牌紫）
const CHECKIN_ACCENT_MAKEUP = '#FF9800' // 补签色（橙）
const CHECKIN_ACCENT_SOFT = 'rgba(108,99,255,0.12)' // 签到主色浅底

interface CheckinSummary {
  user_id: string
  nickname: string | null
  username: string | null
  total_checkin_days: number
  current_streak: number
  last_checkin_date: string | null
}

// ==================== 签到日历抽屉 ====================

const CheckinCalendarDrawer: React.FC<{
  open: boolean
  user: CheckinSummary | null
  onClose: () => void
}> = ({ open, user, onClose }) => {
  const { token } = theme.useToken()
  const [displayMonth, setDisplayMonth] = useState<Dayjs>(dayjs())
  const [checkinDates, setCheckinDates] = useState<Set<string>>(new Set())
  const [makeupDates, setMakeupDates] = useState<Set<string>>(new Set())
  const [earliestMonth, setEarliestMonth] = useState<Dayjs | null>(null)
  const [loadingDates, setLoadingDates] = useState(false)

  const today = dayjs()
  const canGoNext = displayMonth.isBefore(today, 'month')
  // 对齐 App _earliestDataMonth / canGoPrev：展示月到该用户最早签到月即禁用「上一月」
  const canGoPrev = earliestMonth == null || displayMonth.isAfter(earliestMonth, 'month')

  const fetchDates = useCallback(async (m: Dayjs) => {
    if (!user) return
    setLoadingDates(true)
    try {
      const { data, error } = (await supabase.rpc('get_user_checkin_dates', {
        p_user_id: user.user_id,
        p_year: m.year(),
        p_month: m.month() + 1,
      } as any)) as any
      if (error) throw error
      const set = new Set<string>()
      const makeup = new Set<string>()
      for (const r of (data || []) as Array<{ checkin_date: string; is_makeup: boolean }>) {
        const key = dayjs(r.checkin_date).format('YYYY-MM-DD')
        set.add(key)
        if (r.is_makeup) makeup.add(key)
      }
      setCheckinDates(set)
      setMakeupDates(makeup)
    } catch (e: any) {
      message.error(`加载签到日历失败：${e?.message || e}`)
    } finally {
      setLoadingDates(false)
    }
  }, [user])

  // 打开 / 切换月份时拉取
  useEffect(() => {
    if (open && user) {
      fetchDates(displayMonth)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, displayMonth])

  // 取该用户最早签到月份，约束向前翻月范围（对齐 App getEarliestCheckinMonth / _earliestDataMonth）
  useEffect(() => {
    if (!open || !user) {
      setEarliestMonth(null)
      return
    }
    setDisplayMonth(dayjs()) // 每切换用户从当前月看起
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = (await supabase.rpc('get_user_earliest_checkin_month', {
          p_user_id: user.user_id,
        } as any)) as any
        if (cancelled) return
        if (error) throw error
        setEarliestMonth(data ? dayjs(data as string).startOf('month') : null)
      } catch {
        setEarliestMonth(null) // 取不到不阻断日历，仅不约束上一月
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, user])

  const goPrev = () => {
    if (canGoPrev) setDisplayMonth((m) => m.subtract(1, 'month'))
  }
  const goNext = () => {
    if (canGoNext) setDisplayMonth((m) => m.add(1, 'month'))
  }

  // 月历网格（周一开头，对齐 App 端 checkin_calendar_card）
  const firstDay = displayMonth.startOf('month')
  const daysInMonth = displayMonth.daysInMonth()
  const leading = firstDay.day() === 0 ? 6 : firstDay.day() - 1 // 周一=0
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7
  const cells: React.ReactNode[] = []
  for (let i = 0; i < totalCells; i++) {
    if (i < leading || i >= leading + daysInMonth) {
      cells.push(<div key={`e${i}`} />)
      continue
    }
    const day = i - leading + 1
    const key = displayMonth.format('YYYY-MM-') + String(day).padStart(2, '0')
    const isToday = key === today.format('YYYY-MM-DD')
    const checked = checkinDates.has(key)
    const isMakeup = makeupDates.has(key)
    const dotColor = isMakeup ? CHECKIN_ACCENT_MAKEUP : CHECKIN_ACCENT
    cells.push(
      <div key={key} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 4 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 13,
            fontWeight: checked ? 600 : 400,
            color: checked ? '#fff' : isToday ? CHECKIN_ACCENT : token.colorText,
            background: checked ? dotColor : isToday ? CHECKIN_ACCENT_SOFT : 'transparent',
            border: !checked && isToday ? `1px solid ${CHECKIN_ACCENT}` : 'none',
          }}
          title={checked ? (isMakeup ? '补签' : '正常签到') : undefined}
        >
          {day}
        </div>
      </div>
    )
  }

  const weekdays = ['一', '二', '三', '四', '五', '六', '日']

  return (
    <Drawer
      title={user ? `签到日历 · ${user.nickname || user.username || user.user_id}` : '签到日历'}
      width={420}
      open={open}
      onClose={onClose}
    >
      {user && (
        <Space style={{ marginBottom: 16 }} size="large">
          <span>当前连续签到：<Tag color="purple">{user.current_streak} 天</Tag></span>
          <span>累计签到：<b>{user.total_checkin_days}</b> 天</span>
        </Space>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Button type="text" icon={<LeftOutlined />} onClick={goPrev} disabled={!canGoPrev} />
        <Typography.Text strong>{displayMonth.format('YYYY 年 M 月')}</Typography.Text>
        <Button type="text" icon={<RightOutlined />} onClick={goNext} disabled={!canGoNext} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
        {weekdays.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{w}</div>
        ))}
      </div>
      {loadingDates ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 4 }}>
          {cells}
        </div>
      )}
      <div style={{ marginTop: 16, fontSize: 12, color: token.colorTextTertiary }}>
        <span style={{ color: CHECKIN_ACCENT, fontWeight: 700 }}>●</span> 正常签到
        <span style={{ margin: '0 12px', color: CHECKIN_ACCENT_MAKEUP, fontWeight: 700 }}>●</span> 补签（本月 {makeupDates.size} 天）
      </div>
    </Drawer>
  )
}

// ==================== 主页面 ====================

const CheckinManagement: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CheckinSummary[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<CheckinSummary | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: rows, error } = (await supabase.rpc('get_checkin_summary' as any)) as any
      if (error) throw error
      const list = (rows || []) as CheckinSummary[]
      setData(list)
      setPagination((p) => ({ ...p, total: list.length }))
    } catch (e: any) {
      message.error(`加载签到汇总失败：${e?.message || e}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCalendar = (row: CheckinSummary) => {
    setSelectedUser(row)
    setDrawerOpen(true)
  }

  const columns: ColumnsType<CheckinSummary> = [
    {
      title: '用户',
      dataIndex: 'nickname',
      key: 'user',
      render: (_: string, r: CheckinSummary) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{r.nickname || r.username || '未知用户'}</span>
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{r.user_id}</span>
        </Space>
      ),
    },
    {
      title: '总签到日期',
      dataIndex: 'total_checkin_days',
      key: 'total_checkin_days',
      sorter: (a, b) => a.total_checkin_days - b.total_checkin_days,
      render: (v: number) => <b>{v}</b>,
    },
    {
      title: '当前连续签到天数',
      dataIndex: 'current_streak',
      key: 'current_streak',
      sorter: (a, b) => a.current_streak - b.current_streak,
      render: (v: number) => <Tag color={v > 0 ? 'purple' : 'default'}>{v} 天</Tag>,
    },
    {
      title: '最近签到日期',
      dataIndex: 'last_checkin_date',
      key: 'last_checkin_date',
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: string, r: CheckinSummary) => (
        <Button type="link" icon={<CalendarOutlined />} onClick={() => openCalendar(r)}>
          签到日历
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>签到管理</Typography.Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>刷新</Button>
        </Space>
      </div>

      <Card>
        {data.length === 0 && !loading ? (
          <Empty description="暂无签到数据" />
        ) : (
          <Table<CheckinSummary>
            columns={columns}
            dataSource={data}
            rowKey="user_id"
            loading={loading}
            pagination={pagination}
            onChange={(pag) => setPagination((p) => ({ ...p, current: pag.current || 1, pageSize: pag.pageSize || 20 }))}
            scroll={{ x: 700 }}
            size="middle"
            bordered
          />
        )}
      </Card>

      <CheckinCalendarDrawer open={drawerOpen} user={selectedUser} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

export default CheckinManagement
