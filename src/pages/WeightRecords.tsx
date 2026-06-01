import React, { useMemo, useState, useEffect } from 'react'
import { Tag, message, Card, Row, Col, Statistic, DatePicker } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, LineChartOutlined, DashboardOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { getActionColumn } from '../components/ActionColumn'
import EditRecordModal, { EditFieldConfig } from '../components/EditRecordModal'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

// ==================== 常量定义 ====================

const getWeightColor = (weight: number): string => {
  if (weight < 50) return 'cyan'
  if (weight < 70) return 'green'
  if (weight < 90) return 'gold'
  return 'orange'
}

const getBMIColor = (bmi: number): string => {
  if (bmi < 18.5) return 'cyan'
  if (bmi < 24) return 'green'
  if (bmi < 28) return 'gold'
  return 'red'
}

const { RangePicker } = DatePicker

// ==================== 编辑字段配置 ====================

const EDIT_FIELDS: EditFieldConfig[] = [
  {
    name: 'weight',
    label: '体重(kg)',
    type: 'number',
    required: true,
    min: 0,
    step: 0.1,
    placeholder: '请输入体重',
  },
  {
    name: 'body_fat',
    label: '体脂率(%)',
    type: 'number',
    min: 0,
    max: 100,
    step: 0.1,
    placeholder: '请输入体脂率',
  },
  {
    name: 'bmi',
    label: 'BMI',
    type: 'number',
    min: 0,
    step: 0.1,
    placeholder: '请输入BMI',
  },
  {
    name: 'date',
    label: '日期',
    type: 'date',
    required: true,
  },
  {
    name: 'note',
    label: '备注',
    type: 'textarea',
    placeholder: '请输入备注信息',
  },
]

// ==================== 详情列表列配置 ====================

const getDetailColumns = (
  canDelete: boolean,
  onDelete: (id: string) => void,
  onEdit: (record: RecordItem) => void
): ColumnsType<RecordItem> => [
  {
    title: '体重(kg)',
    dataIndex: 'weight',
    key: 'weight',
    width: 120,
    sorter: (a, b) => {
      const wA = (a.weight as number) || 0
      const wB = (b.weight as number) || 0
      return wB - wA
    },
    render: (weight: number) => (
      <Tag color={getWeightColor(typeof weight === 'number' ? weight : 0)} icon={<LineChartOutlined />}>
        {typeof weight === 'number' ? weight.toFixed(1) : weight} kg
      </Tag>
    ),
  },
  {
    title: 'BMI',
    dataIndex: 'bmi',
    key: 'bmi',
    width: 100,
    sorter: (a, b) => {
      const bA = (a.bmi as number) || 0
      const bB = (b.bmi as number) || 0
      return bB - bA
    },
    render: (bmi: number) => {
      if (!bmi) return '-'
      const color = getBMIColor(bmi)
      return <Tag color={color}>{bmi.toFixed(1)}</Tag>
    },
  },
  {
    title: '体脂率(%)',
    dataIndex: 'body_fat',
    key: 'body_fat',
    width: 100,
    sorter: (a, b) => {
      const fA = (a.body_fat as number) || 0
      const fB = (b.body_fat as number) || 0
      return fB - fA
    },
    render: (bodyFat: number) => {
      if (!bodyFat) return '-'
      const color = bodyFat < 15 ? 'cyan' : bodyFat < 25 ? 'green' : 'orange'
      return <Tag color={color}>{bodyFat.toFixed(1)}%</Tag>
    },
  },
  {
    title: '记录日期',
    dataIndex: 'date',
    key: 'date',
    width: 120,
    sorter: (a, b) => {
      const dateA = (a.date as string) || ''
      const dateB = (b.date as string) || ''
      return dateA.localeCompare(dateB)
    },
    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
  },
  {
    title: '备注',
    dataIndex: 'note',
    key: 'note',
    ellipsis: true,
    width: 200,
    render: (note: string) => note || '-',
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

// ==================== 统计图表组件 ====================

interface WeightStatsProps {
  userId?: string
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null]
}

const WeightStats: React.FC<WeightStatsProps> = ({ userId, dateRange }) => {
  const [stats, setStats] = useState({
    currentWeight: 0,
    minWeight: 0,
    maxWeight: 0,
    avgWeight: 0,
    avgBMI: 0,
    avgBodyFat: 0,
    trendData: [] as { date: string; weight: number; bmi: number; bodyFat: number }[],
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    loadStats()
  }, [userId, dateRange])

  const loadStats = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('weight_records')
        .select('*')
        .eq('user_id', userId)

      // 日期范围筛选
      if (dateRange[0] && dateRange[1]) {
        query = query
          .gte('date', dateRange[0].format('YYYY-MM-DD'))
          .lte('date', dateRange[1].format('YYYY-MM-DD'))
      }

      const { data, error } = await query.order('date', { ascending: true })

      if (error) throw error

      const records = data || []
      
      if (records.length === 0) {
        setStats({
          currentWeight: 0,
          minWeight: 0,
          maxWeight: 0,
          avgWeight: 0,
          avgBMI: 0,
          avgBodyFat: 0,
          trendData: [],
        })
        return
      }

      const weights = records.map(r => r.weight || 0)
      const bmis = records.map(r => r.bmi || 0).filter(b => b > 0)
      const bodyFats = records.map(r => r.body_fat || 0).filter(f => f > 0)

      const currentWeight = weights[weights.length - 1] || 0
      const minWeight = Math.min(...weights)
      const maxWeight = Math.max(...weights)
      const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length
      const avgBMI = bmis.length > 0 ? bmis.reduce((a, b) => a + b, 0) / bmis.length : 0
      const avgBodyFat = bodyFats.length > 0 ? bodyFats.reduce((a, b) => a + b, 0) / bodyFats.length : 0

      const trendData = records.map(r => ({
        date: dayjs(r.date).format('MM-DD'),
        weight: r.weight || 0,
        bmi: r.bmi || 0,
        bodyFat: r.body_fat || 0,
      }))

      setStats({
        currentWeight,
        minWeight,
        maxWeight,
        avgWeight,
        avgBMI,
        avgBodyFat,
        trendData,
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small" loading={loading}>
            <Statistic
              title="当前体重"
              value={stats.currentWeight}
              precision={1}
              suffix="kg"
              valueStyle={{ color: getWeightColor(stats.currentWeight) }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" loading={loading}>
            <Statistic
              title="最低体重"
              value={stats.minWeight}
              precision={1}
              suffix="kg"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" loading={loading}>
            <Statistic
              title="最高体重"
              value={stats.maxWeight}
              precision={1}
              suffix="kg"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" loading={loading}>
            <Statistic
              title="平均体重"
              value={stats.avgWeight}
              precision={1}
              suffix="kg"
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" loading={loading}>
            <Statistic
              title="平均BMI"
              value={stats.avgBMI}
              precision={1}
              valueStyle={{ color: getBMIColor(stats.avgBMI) }}
              prefix={<DashboardOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" loading={loading}>
            <Statistic
              title="平均体脂"
              value={stats.avgBodyFat}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title={<><LineChartOutlined /> 体重变化趋势</>}
        loading={loading}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" domain={['dataMin - 2', 'dataMax + 2']} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 50]} hide />
            <RechartsTooltip
              formatter={(value: number, name: string) => {
                if (name === 'weight') return [`${value.toFixed(1)} kg`, '体重']
                if (name === 'bmi') return [`${value.toFixed(1)}`, 'BMI']
                if (name === 'bodyFat') return [`${value.toFixed(1)}%`, '体脂率']
                return [value, name]
              }}
            />
            <ReferenceLine yAxisId="left" y={stats.avgWeight} stroke="#999" strokeDasharray="3 3" label="平均" />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="weight"
              stroke="#1890ff"
              strokeWidth={2}
              dot={{ fill: '#1890ff' }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="bmi"
              stroke="#52c41a"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

// ==================== 主组件 ====================

const WeightRecords: React.FC = () => {
  const { canReadWeights, canWriteWeights, canDeleteWeights } = usePermission()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null])

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!canDeleteWeights) {
      message.warning('您没有删除体重记录的权限')
      return
    }
    try {
      const { error } = await supabase.from('weight_records').delete().eq('id', id)
      if (error) throw error
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 编辑记录
  const handleEdit = (record: RecordItem) => {
    if (!canWriteWeights) {
      message.warning('您没有编辑体重记录的权限')
      return
    }
    setEditingRecord(record)
    setEditModalOpen(true)
  }

  // 处理用户选择变化
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
  }

  // 模块配置
  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'weight_records',
    title: '体重记录管理',
    tableName: 'weight_records',
    detailTitle: '体重记录详情',
    detailColumns: getDetailColumns(canDeleteWeights || false, handleDelete, handleEdit),
    onUserSelect: handleUserSelect,
  }), [canDeleteWeights, canWriteWeights])

  // 权限检查
  if (!canReadWeights) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Tag color="warning">您没有查看体重记录的权限</Tag>
      </div>
    )
  }

  return (
    <>
      {/* 筛选栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <RangePicker
          placeholder={['开始日期', '结束日期']}
          value={dateRange}
          onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
        />
      </Card>

      {/* 统计图表 */}
      {selectedUserId && (
        <WeightStats
          userId={selectedUserId}
          dateRange={dateRange}
        />
      )}

      <UserDimensionList moduleConfig={moduleConfig} />
      <EditRecordModal
        open={editModalOpen}
        record={editingRecord}
        tableName="weight_records"
        fields={EDIT_FIELDS}
        onClose={() => {
          setEditModalOpen(false)
          setEditingRecord(null)
        }}
        onSuccess={() => {
          window.location.reload()
        }}
      />
    </>
  )
}

export default WeightRecords
