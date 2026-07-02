import React from 'react'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { lunar } from 'lunar-ts'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 类型映射 ====================

const ANNIVERSARY_TYPE_MAP: Record<string, string> = {
  birthday: '生日',
  anniversary: '纪念日',
  holiday: '节日',
  other: '其他',
}

const LUNAR_MONTH_NAMES = [
  '正', '二', '三', '四', '五', '六',
  '七', '八', '九', '十', '冬', '腊',
]

const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
]

// ==================== 农历转换工具 ====================

/**
 * 格式化农历日期为可读字符串
 * @param year  公历年
 * @param month 公历月 (1-12)
 * @param day   公历日 (1-31)
 * @returns 如 "正月初一"、"闰四月十五"
 */
function formatLunarDate(year: number, month: number, day: number): string {
  try {
    const d = lunar(new Date(year, month - 1, day))
    const lunarMonth = d.month
    const lunarDay = d.day
    if (lunarMonth == null || lunarDay == null) return '-'
    const monthName = (d.isLeap ? '闰' : '') + LUNAR_MONTH_NAMES[lunarMonth - 1] + '月'
    const dayName = LUNAR_DAY_NAMES[lunarDay - 1] ?? `初${lunarDay}`
    return `${monthName}${dayName}`
  } catch {
    return '-'
  }
}

/**
 * 根据记录获取农历显示文本
 * - 若 is_lunar === true，将 date 解析为农历日期展示（含年）
 * - 若 is_lunar === false，将公历 date 转换为农历展示
 */
function getLunarDisplay(record: RecordItem): string {
  const dateVal = record.date
  if (!dateVal || typeof dateVal !== 'string') return '-'

  const d = dayjs(dateVal)
  if (!d.isValid()) return '-'

  const year = d.year()
  const month = d.month() + 1
  const day = d.date()

  if (record.is_lunar === true) {
    // date 本身是农历日期，直接按农历格式展示
    const lunarMonthName = LUNAR_MONTH_NAMES[month - 1] ?? `${month}`
    const lunarDayName = LUNAR_DAY_NAMES[day - 1] ?? `${day}`
    return `${year}年${lunarMonthName}月${lunarDayName}`
  }

  // 公历转农历
  return formatLunarDate(year, month, day)
}

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  {
    title: '日期',
    dataIndex: 'date',
    key: 'date',
    width: 110,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
  },
  {
    title: '农历',
    key: 'lunar',
    width: 120,
    render: (_: unknown, record: RecordItem) => getLunarDisplay(record),
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 80,
    render: (v: string) => ANNIVERSARY_TYPE_MAP[v] || v || '-',
  },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true, render: (v: string) => v || '-' },
  {
    title: '每年重复',
    dataIndex: 'repeat_yearly',
    key: 'repeat_yearly',
    width: 80,
    render: (v: boolean) => v ? '是' : '否',
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 170,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
  },
]

// ==================== 模块配置 ====================

const moduleConfig: ModuleConfig = {
  key: 'user_anniversaries',
  title: '纪念日',
  tableName: 'user_anniversaries',
  detailColumns,
}

// ==================== 组件 ====================

const Anniversaries: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Anniversaries
