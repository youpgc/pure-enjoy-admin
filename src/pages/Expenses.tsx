import React, { useMemo, useState, useEffect } from 'react'
import { Tag, message, Card, Row, Col, Statistic, DatePicker, Select, Space as AntSpace } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PieChartOutlined, DollarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { getActionColumn } from '../components/ActionColumn'
import EditRecordModal, { EditFieldConfig } from '../components/EditRecordModal'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

// ==================== 常量定义 ====================

const CATEGORY_COLORS: Record<string, string> = {
  '餐饮': '#ff4d4f',
  '交通': '#1890ff',
  '购物': '#52c41a',
  '娱乐': '#722ed1',
  '其他': '#faad14',
}

const CATEGORY_OPTIONS = [
  { value: '餐饮', label: '餐饮' },
  { value: '交通', label: '交通' },
  { value: '购物', label: '购物' },
  { value: '娱乐', label: '娱乐' },
  { value: '其他', label: '其他' },
]

const { RangePicker } = DatePicker

// ==================== 编辑字段配置 ====================

const EDIT_FIELDS: EditFieldConfig[] = [
  {
    name: 'amount',
    label: '金额',
    type: 'number',
    required: true,
    min: 0,
    step: 0.01,
    placeholder: '请输入消费金额',
  },
  {
    name: 'category',
    label: '分类',
    type: 'select',
    required: true,
    options: CATEGORY_OPTIONS,
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
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    render: (amount: number) => (
      <Tag color="red">¥{typeof amount === 'number' ? amount.toFixed(2) : amount}</Tag>
    ),
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 100,
    render: (category: string) => (
      <Tag color={CATEGORY_COLORS[category || ''] || 'default'}>{category || '-'}</Tag>
    ),
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
    title: '日期',
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

// ==================== 统计卡片组件 ====================

interface StatsCardsProps {
  userId?: string
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null]
  categoryFilter: string | null
}

const StatsCards: React.FC<StatsCardsProps> = ({ userId, dateRange, categoryFilter }) => {
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalCount: 0,
    avgAmount: 0,
    categoryData: [] as { name: string; value: number; color: string }[],
    dailyData: [] as { date: string; amount: number }[],
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    loadStats()
  }, [userId, dateRange, categoryFilter])

  const loadStats = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)

      // 日期范围筛选
      if (dateRange[0] && dateRange[1]) {
        query = query
          .gte('date', dateRange[0].format('YYYY-MM-DD'))
          .lte('date', dateRange[1].format('YYYY-MM-DD'))
      }

      // 分类筛选
      if (categoryFilter) {
        query = query.eq('category', categoryFilter)
      }

      const { data, error } = await query

      if (error) throw error

      const records = data || []
      const totalAmount = records.reduce((sum, r) => sum + (r.amount || 0), 0)
      const totalCount = records.length
      const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0

      // 分类统计
      const categoryMap = new Map<string, number>()
      records.forEach((r) => {
        const cat = r.category || '其他'
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + (r.amount || 0))
      })
      const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || '#999',
      }))

      // 每日统计
      const dailyMap = new Map<string, number>()
      records.forEach((r) => {
        const date = r.date
        dailyMap.set(date, (dailyMap.get(date) || 0) + (r.amount || 0))
      })
      const dailyData = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, amount]) => ({ date: dayjs(date).format('MM-DD'), amount }))

      setStats({
        totalAmount,
        totalCount,
        avgAmount,
        categoryData,
        dailyData,
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
        <Col span={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="总支出"
              value={stats.totalAmount}
              precision={2}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<><DollarOutlined /> ¥</>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="记录数"
              value={stats.totalCount}
              suffix="笔"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="平均消费"
              value={stats.avgAmount}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="分类数"
              value={stats.categoryData.length}
              suffix="类"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card
            size="small"
            title={<><PieChartOutlined /> 分类占比</>}
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => `¥${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            size="small"
            title="每日消费趋势"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip formatter={(value: number) => `¥${value.toFixed(2)}`} />
                <Bar dataKey="amount" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

// ==================== 主组件 ====================

const Expenses: React.FC = () => {
  const { canReadExpenses, canWriteExpenses, canDeleteExpenses } = usePermission()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null])
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // ==================== 操作处理 ====================

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!canDeleteExpenses) {
      message.warning('您没有删除消费记录的权限')
      return
    }
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 编辑记录
  const handleEdit = (record: RecordItem) => {
    if (!canWriteExpenses) {
      message.warning('您没有编辑消费记录的权限')
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
    key: 'expenses',
    title: '消费记录管理',
    tableName: 'expenses',
    detailTitle: '消费记录详情',
    detailColumns: getDetailColumns(canDeleteExpenses || false, handleDelete, handleEdit),
    onUserSelect: handleUserSelect,
  }), [canDeleteExpenses, canWriteExpenses])

  // 权限检查
  if (!canReadExpenses) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Tag color="warning">您没有查看消费记录的权限</Tag>
      </div>
    )
  }

  return (
    <>
      {/* 筛选栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <AntSpace>
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
          />
          <Select
            placeholder="选择分类"
            allowClear
            style={{ width: 120 }}
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={CATEGORY_OPTIONS}
          />
        </AntSpace>
      </Card>

      {/* 统计图表 */}
      {selectedUserId && (
        <StatsCards
          userId={selectedUserId}
          dateRange={dateRange}
          categoryFilter={categoryFilter}
        />
      )}

      <UserDimensionList moduleConfig={moduleConfig} />
      <EditRecordModal
        open={editModalOpen}
        record={editingRecord}
        tableName="expenses"
        fields={EDIT_FIELDS}
        onClose={() => {
          setEditModalOpen(false)
          setEditingRecord(null)
        }}
        onSuccess={() => {
          // 刷新列表
          window.location.reload()
        }}
      />
    </>
  )
}

export default Expenses
