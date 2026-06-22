import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Tag, Modal, Descriptions, Statistic, Row, Col, Calendar, Badge, Typography, Empty, Spin, Timeline, Button, Card } from 'antd'
import { CheckCircleOutlined, CalendarOutlined, FireOutlined, TrophyOutlined, HistoryOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import type { ColumnsType } from 'antd/es/table'
import { BaseService, handleApiError } from '../utils/apiClient'

// ==================== 打卡记录弹窗 ====================

interface CheckinRecord {
  id: string
  habit_id: string
  checkin_at: string
  note: string | null
  created_at: string
}

interface CheckinModalProps {
  visible: boolean
  habitId: string | null
  habitName: string
  onClose: () => void
}

const CheckinModal: React.FC<CheckinModalProps> = ({ visible, habitId, habitName, onClose }) => {
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'stats' | 'calendar' | 'timeline'>('stats')

  const checkinService = useMemo(() => new BaseService<CheckinRecord>('habit_checkins'), [])

  const loadCheckins = useCallback(async () => {
    if (!habitId) return
    setLoading(true)
    try {
      const result = await checkinService.findAll((q) =>
        q.eq('habit_id', habitId).order('checkin_at', { ascending: false })
      )
      if (result.success && result.data) {
        setCheckins(result.data)
      } else {
        handleApiError(result.errorMessage, 'CheckinModal-加载打卡记录')
      }
    } catch (error) {
      handleApiError(error, 'CheckinModal-加载打卡记录')
    } finally {
      setLoading(false)
    }
  }, [habitId, checkinService])

  useEffect(() => {
    if (visible && habitId) {
      loadCheckins()
      setActiveTab('stats')
    }
  }, [visible, habitId, loadCheckins])

  // 统计数据
  const stats = useMemo(() => {
    if (checkins.length === 0) {
      return { total: 0, currentStreak: 0, longestStreak: 0, thisMonth: 0, thisWeek: 0 }
    }

    const total = checkins.length
    const now = dayjs()
    const thisMonth = checkins.filter(c => dayjs(c.checkin_at).format('YYYY-MM') === now.format('YYYY-MM')).length
    const thisWeek = checkins.filter(c => dayjs(c.checkin_at).diff(now.startOf('week')) >= 0).length

    // 计算连续打卡天数（从今天往前推）
    let currentStreak = 0
    const sortedDates = [...checkins].map(c => dayjs(c.checkin_at).format('YYYY-MM-DD')).sort().reverse()
    let checkDate = now.startOf('day')
    if (!sortedDates.includes(checkDate.format('YYYY-MM-DD'))) {
      checkDate = checkDate.subtract(1, 'day')
    }
    for (const dateStr of sortedDates) {
      if (dateStr === checkDate.format('YYYY-MM-DD')) {
        currentStreak++
        checkDate = checkDate.subtract(1, 'day')
      } else if (checkDate.isAfter(dayjs(dateStr))) {
        break
      }
    }

    // 计算最长连续打卡
    let longestStreak = 0
    let tempStreak = 1
    const allDates = [...checkins].map(c => dayjs(c.checkin_at).format('YYYY-MM-DD')).sort()
    for (let i = 1; i < allDates.length; i++) {
      const prev = dayjs(allDates[i - 1])
      const curr = dayjs(allDates[i])
      if (curr.diff(prev, 'day') === 1) {
        tempStreak++
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak)

    return { total, currentStreak, longestStreak, thisMonth, thisWeek }
  }, [checkins])

  // 日历打卡数据
  const calendarData = useMemo(() => {
    const data: Record<string, CheckinRecord[]> = {}
    checkins.forEach(c => {
      const date = dayjs(c.checkin_at).format('YYYY-MM-DD')
      if (!data[date]) data[date] = []
      data[date].push(c)
    })
    return data
  }, [checkins])

  const dateCellRender = (date: dayjs.Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD')
    const records = calendarData[dateStr]
    if (records && records.length > 0) {
      return (
        <div className="flex items-center justify-center">
          <Badge status="success" />
        </div>
      )
    }
    return null
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <HistoryOutlined />
          <span>{habitName} - 打卡记录</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={720}
      footer={null}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {checkins.length === 0 && !loading ? (
          <Empty description="暂无打卡记录" />
        ) : (
          <>
            {/* 统计卡片 */}
            <Row gutter={16} className="mb-4">
              <Col span={6}>
                <Card size="small">
                  <Statistic title="总打卡" value={stats.total} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#1890ff' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="连续打卡" value={stats.currentStreak} suffix="天" prefix={<FireOutlined />} valueStyle={{ color: '#f5222d' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="最长连续" value={stats.longestStreak} suffix="天" prefix={<TrophyOutlined />} valueStyle={{ color: '#faad14' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="本月打卡" value={stats.thisMonth} prefix={<CalendarOutlined />} valueStyle={{ color: '#52c41a' }} />
                </Card>
              </Col>
            </Row>

            {/* Tab 切换 */}
            <Card size="small">
              <div className="flex gap-2 mb-4">
                {([
                  { key: 'stats' as const, label: '统计', icon: <CheckCircleOutlined /> },
                  { key: 'calendar' as const, label: '日历', icon: <CalendarOutlined /> },
                  { key: 'timeline' as const, label: '明细', icon: <HistoryOutlined /> },
                ]).map(tab => (
                  <Tag
                    key={tab.key}
                    color={activeTab === tab.key ? 'blue' : 'default'}
                    className="cursor-pointer"
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.icon} {tab.label}
                  </Tag>
                ))}
              </div>

              {activeTab === 'stats' && (
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="总打卡次数">{stats.total} 次</Descriptions.Item>
                  <Descriptions.Item label="当前连续">{stats.currentStreak} 天</Descriptions.Item>
                  <Descriptions.Item label="最长连续">{stats.longestStreak} 天</Descriptions.Item>
                  <Descriptions.Item label="本月打卡">{stats.thisMonth} 次</Descriptions.Item>
                  <Descriptions.Item label="本周打卡">{stats.thisWeek} 次</Descriptions.Item>
                  <Descriptions.Item label="首次打卡">
                    {checkins.length > 0 ? dayjs(checkins[checkins.length - 1]!.checkin_at).format('YYYY-MM-DD') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="最近打卡" span={2}>
                    {checkins.length > 0 ? dayjs(checkins[0]!.checkin_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                  </Descriptions.Item>
                </Descriptions>
              )}

              {activeTab === 'calendar' && (
                <Calendar cellRender={(date, info) => {
                  if (info.type === 'date') return dateCellRender(date)
                  return null
                }} />
              )}

              {activeTab === 'timeline' && (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  <Timeline
                    items={checkins.slice(0, 50).map(c => ({
                      color: 'green',
                      children: (
                        <div>
                          <Typography.Text strong>{dayjs(c.checkin_at).format('YYYY-MM-DD HH:mm:ss')}</Typography.Text>
                          {c.note && <Typography.Text type="secondary" className="ml-2">- {c.note}</Typography.Text>}
                        </div>
                      ),
                    }))}
                  />
                  {checkins.length > 50 && (
                    <Typography.Text type="secondary" className="text-center block mt-2">
                      仅显示最近50条记录，共 {checkins.length} 条
                    </Typography.Text>
                  )}
                </div>
              )}
            </Card>
          </>
        )}
      </Spin>
    </Modal>
  )
}

// ==================== 页面组件 ====================

const Habits: React.FC = () => {
  const [checkinModalVisible, setCheckinModalVisible] = useState(false)
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null)
  const [selectedHabitName, setSelectedHabitName] = useState<string>('')

  const showCheckinModal = useCallback((record: RecordItem) => {
    setSelectedHabitId(record.id)
    setSelectedHabitName((record.name as string) || '未命名习惯')
    setCheckinModalVisible(true)
  }, [])

  // 详情弹窗列定义（含"查看打卡记录"操作列）
  const detailColumns: ColumnsType<RecordItem> = useMemo(() => [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true, render: (v: string) => v || '-' },
    {
      title: '目标天数',
      dataIndex: 'target_days',
      key: 'target_days',
      width: 90,
      render: (v: number) => v ? `${v} 天` : '-',
    },
    {
      title: '当前连续',
      dataIndex: 'current_streak',
      key: 'current_streak',
      width: 90,
      render: (v: number) => `${v || 0} 天`,
    },
    {
      title: '最长连续',
      dataIndex: 'longest_streak',
      key: 'longest_streak',
      width: 90,
      render: (v: number) => `${v || 0} 天`,
    },
    {
      title: '是否激活',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '进行中' : '已停用'}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_: unknown, record: RecordItem) => (
        <Button
          type="link"
          size="small"
          icon={<HistoryOutlined />}
          onClick={() => showCheckinModal(record)}
        >
          打卡记录
        </Button>
      ),
    },
  ], [showCheckinModal])

  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'habits',
    title: '习惯',
    tableName: 'habits',
    detailColumns,
  }), [detailColumns])

  return (
    <>
      <UserDimensionList moduleConfig={moduleConfig} />
      <CheckinModal
        visible={checkinModalVisible}
        habitId={selectedHabitId}
        habitName={selectedHabitName}
        onClose={() => setCheckinModalVisible(false)}
      />
    </>
  )
}

export default Habits
