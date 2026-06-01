import React, { useMemo, useState, useCallback } from 'react'
import { Tag, Space, message, Modal, Card, Statistic, Row, Col, Table, Badge, Tabs } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, FireOutlined, CheckCircleOutlined, CalendarOutlined, TrophyOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { getActionColumn } from '../components/ActionColumn'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

// ==================== 类型定义 ====================

interface HabitCheckin {
  id: string
  habit_id: string
  checkin_date: string
  note: string | null
  created_at: string
}

interface HabitStats {
  totalCheckins: number
  currentStreak: number
  maxStreak: number
  completionRate: number
  weeklyCheckins: number
  monthlyCheckins: number
}

// ==================== 常量定义 ====================

const getFrequencyLabel = (freq: string): string => {
  const labels: Record<string, string> = {
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
    custom: '自定义',
  }
  return labels[freq] || freq || '-'
}

// ==================== 详情列表列配置 ====================

const getDetailColumns = (
  canDelete: boolean,
  onDelete: (id: string) => void,
  onEdit: (record: RecordItem) => void,
  onViewCheckins: (record: RecordItem) => void
): ColumnsType<RecordItem> => [
  {
    title: '状态',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 80,
    render: (isActive: boolean) => (
      isActive ? (
        <Tag color="success">进行中</Tag>
      ) : (
        <Tag color="default">已暂停</Tag>
      )
    ),
  },
  {
    title: '习惯名称',
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
    width: 200,
    render: (Name: string) => Name || '-',
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
    width: 200,
    render: (desc: string) => desc || '-',
  },
  {
    title: '频率',
    dataIndex: 'frequency',
    key: 'frequency',
    width: 100,
    render: (freq: string) => (
      <Tag color="blue">{getFrequencyLabel(freq)}</Tag>
    ),
  },
  {
    title: '当前连续',
    dataIndex: 'current_streak',
    key: 'current_streak',
    width: 120,
    sorter: (a, b) => {
      const sA = (a.current_streak as number) || 0
      const sB = (b.current_streak as number) || 0
      return sB - sA
    },
    render: (streak: number) => (
      <Space>
        <FireOutlined style={{ color: streak && streak > 0 ? '#ff4d4f' : '#999' }} />
        <span style={{ color: streak && streak > 0 ? '#ff4d4f' : '#999' }}>
          {typeof streak === 'number' ? streak : 0} 天
        </span>
      </Space>
    ),
  },
  {
    title: '总打卡',
    dataIndex: 'total_checkins',
    key: 'total_checkins',
    width: 100,
    sorter: (a, b) => {
      const tA = (a.total_checkins as number) || 0
      const tB = (b.total_checkins as number) || 0
      return tB - tA
    },
    render: (total: number) => (
      <Badge count={total || 0} showZero style={{ backgroundColor: '#52c41a' }} />
    ),
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
  },
  getActionColumn<any>(
    (record) => {
      const actions: import('../components/ActionColumn').ActionButton[] = [
        {
          key: 'checkins',
          label: '打卡记录',
          icon: <CalendarOutlined />,
          type: 'primary',
          onClick: () => onViewCheckins(record),
        },
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          onClick: () => onEdit(record),
        },
      ]
      if (canDelete) {
        actions.push({
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => onDelete(record.id as string),
        })
      }
      return actions
    },
    { width: 240, maxVisible: 2 }
  ),
]

// ==================== 打卡记录弹窗组件 ====================

const CheckinModal: React.FC<{
  open: boolean
  habit: RecordItem | null
  onClose: () => void
}> = ({ open, habit, onClose }) => {
  const [checkins, setCheckins] = useState<HabitCheckin[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<HabitStats>({
    totalCheckins: 0,
    currentStreak: 0,
    maxStreak: 0,
    completionRate: 0,
    weeklyCheckins: 0,
    monthlyCheckins: 0,
  })

  // 加载打卡记录
  const loadCheckins = useCallback(async () => {
    if (!habit) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('habit_checkins')
        .select('*')
        .eq('habit_id', habit.id)
        .order('checkin_date', { ascending: false })

      if (error) throw error
      setCheckins(data || [])

      // 计算统计数据
      calculateStats(data || [], habit)
    } catch (error) {
      console.error('加载打卡记录失败:', error)
      message.error('加载打卡记录失败')
    } finally {
      setLoading(false)
    }
  }, [habit])

  // 计算统计数据
  const calculateStats = (checkinList: HabitCheckin[], habitData: RecordItem) => {
    const total = checkinList.length
    const now = dayjs()
    const weekAgo = now.subtract(7, 'day')
    const monthAgo = now.subtract(30, 'day')

    const weekly = checkinList.filter(c => dayjs(c.checkin_date).isAfter(weekAgo)).length
    const monthly = checkinList.filter(c => dayjs(c.checkin_date).isAfter(monthAgo)).length

    // 计算最大连续天数
    let maxStreak = 0
    let currentStreak = 0
    if (checkinList.length > 0) {
      const sortedDates = checkinList.map(c => dayjs(c.checkin_date)).sort((a, b) => a.diff(b))
      let streak = 1
      maxStreak = 1
      for (let i = 1; i < sortedDates.length; i++) {
        const current = sortedDates[i]!
        const prev = sortedDates[i - 1]!
        if (current.diff(prev, 'day') === 1) {
          streak++
          maxStreak = Math.max(maxStreak, streak)
        } else if (current.diff(prev, 'day') > 1) {
          streak = 1
        }
      }

      // 计算当前连续天数
      const today = now.startOf('day')
      const yesterday = today.subtract(1, 'day')
      const hasToday = sortedDates.some(d => d.isSame(today, 'day'))
      const hasYesterday = sortedDates.some(d => d.isSame(yesterday, 'day'))
      
      if (hasToday || hasYesterday) {
        currentStreak = 1
        for (let i = sortedDates.length - 1; i >= 0; i--) {
          const date = sortedDates[i]
          if (!date) continue
          if (date.isSame(today.subtract(currentStreak - 1, 'day'), 'day')) {
            currentStreak++
          } else if (date.isSame(today.subtract(currentStreak, 'day'), 'day')) {
            currentStreak++
          } else {
            break
          }
        }
        currentStreak = hasToday ? currentStreak - 1 : currentStreak
      }
    }

    // 计算完成率（基于目标天数）
    const targetDays = (habitData.target_days as number) || 21
    const completionRate = Math.min(100, Math.round((total / targetDays) * 100))

    setStats({
      totalCheckins: total,
      currentStreak,
      maxStreak,
      completionRate,
      weeklyCheckins: weekly,
      monthlyCheckins: monthly,
    })
  }

  React.useEffect(() => {
    if (open && habit) {
      loadCheckins()
    }
  }, [open, habit, loadCheckins])

  const columns: ColumnsType<HabitCheckin> = [
    {
      title: '打卡日期',
      dataIndex: 'checkin_date',
      key: 'checkin_date',
      width: 150,
      render: (date: string) => (
        <Space>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          {dayjs(date).format('YYYY-MM-DD')}
        </Space>
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      render: (note: string) => note || '-',
    },
    {
      title: '打卡时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  if (!habit) return null

  return (
    <Modal
      title={
        <Space>
          <TrophyOutlined style={{ color: '#faad14' }} />
          <span>{`习惯打卡记录 - ${habit.name}`}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <div>
        {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="总打卡次数"
                  value={stats.totalCheckins}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="当前连续"
                  value={stats.currentStreak}
                  suffix="天"
                  prefix={<FireOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="最大连续"
                  value={stats.maxStreak}
                  suffix="天"
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="完成率"
                  value={stats.completionRate}
                  suffix="%"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="近7天打卡"
                  value={stats.weeklyCheckins}
                  suffix="次"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="近30天打卡"
                  value={stats.monthlyCheckins}
                  suffix="次"
                />
              </Card>
            </Col>
          </Row>

          {/* 打卡记录列表 */}
          <Tabs
            items={[
              {
                key: 'list',
                label: '打卡记录',
                children: (
                  <Table
                    columns={columns}
                    dataSource={checkins}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      defaultPageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条`,
                    }}
                    size="small"
                    scroll={{ y: 300 }}
                  />
                ),
              },
              {
                key: 'calendar',
                label: '打卡日历',
                children: (
                  <div style={{ padding: '20px 0' }}>
                    <p style={{ color: '#999', textAlign: 'center' }}>
                      共打卡 {stats.totalCheckins} 天
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                      {checkins.slice(0, 30).map((checkin) => (
                        <Tag key={checkin.id} color="success" style={{ margin: 4 }}>
                          {dayjs(checkin.checkin_date).format('MM-DD')}
                        </Tag>
                      ))}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
    </Modal>
  )
}

// ==================== 主组件 ====================

const Habits: React.FC = () => {
  const { canReadHabits, canWriteHabits, canDeleteHabits } = usePermission()
  const [checkinModalOpen, setCheckinModalOpen] = useState(false)
  const [selectedHabit, setSelectedHabit] = useState<RecordItem | null>(null)

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!canDeleteHabits) {
      message.warning('您没有删除习惯的权限')
      return
    }
    try {
      const { error } = await supabase.from('user_habits').delete().eq('id', id)
      if (error) throw error
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 编辑记录
  const handleEdit = (_record: RecordItem) => {
    if (!canWriteHabits) {
      message.warning('您没有编辑习惯的权限')
      return
    }
    message.info('编辑功能开发中')
  }

  // 查看打卡记录
  const handleViewCheckins = (record: RecordItem) => {
    setSelectedHabit(record)
    setCheckinModalOpen(true)
  }

  // 模块配置
  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'habits',
    title: '习惯管理',
    tableName: 'user_habits',
    detailTitle: '习惯详情',
    detailColumns: getDetailColumns(
      canDeleteHabits || false,
      handleDelete,
      handleEdit,
      handleViewCheckins
    ),
  }), [canDeleteHabits, canWriteHabits])

  // 权限检查
  if (!canReadHabits) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Tag color="warning">您没有查看习惯的权限</Tag>
      </div>
    )
  }

  return (
    <>
      <UserDimensionList moduleConfig={moduleConfig} />
      <CheckinModal
        open={checkinModalOpen}
        habit={selectedHabit}
        onClose={() => {
          setCheckinModalOpen(false)
          setSelectedHabit(null)
        }}
      />
    </>
  )
}

export default Habits
