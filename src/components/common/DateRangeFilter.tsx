import React from 'react'
import { DatePicker } from 'antd'
import type { Dayjs } from 'dayjs'

// 宠物模块表格「日期范围筛选栏」（服务端参数过滤）：
// RangePicker 选值 → 北京时间整天边界 ISO 参数 → service 链上 gte/lte 下推 PostgREST。
// 与列头 filterDropdown 的区别：筛选条件属于查询本身（配合服务端分页），
// 改条件即重新拉取，而非对已拉取行做客户端过滤。

export interface DateRangeValue {
  start: string
  end: string
}

/** RangePicker 选值 → 服务端参数（北京时间整天边界 ISO，gte/lte 用） */
export function rangeToParams(dates: [Dayjs, Dayjs] | null): DateRangeValue | null {
  if (!dates) return null
  return {
    start: `${dates[0].format('YYYY-MM-DD')}T00:00:00+08:00`,
    end: `${dates[1].format('YYYY-MM-DD')}T23:59:59+08:00`,
  }
}

/** 日期范围筛选栏：选值即触发 onChange（null = 未筛选/重置/清除） */
const DateRangeFilter: React.FC<{
  value: [Dayjs, Dayjs] | null
  onChange: (dates: [Dayjs, Dayjs] | null) => void
}> = ({ value, onChange }) => (
  <DatePicker.RangePicker
    value={value}
    onChange={(d) => onChange((d as [Dayjs, Dayjs] | null) ?? null)}
  />
)

export default DateRangeFilter
