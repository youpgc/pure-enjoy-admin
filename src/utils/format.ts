import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// 项目约定：时间一律 UTC 存储、展示统一北京时区（UTC+8），不依赖浏览器/设备时区。
// 与 App 端 DateTimeUtils（lib/utils/date_time_utils.dart）同口径，杜绝
// 「非 +08 环境打开后台 → 所有时间列整体偏差 8 小时」的问题。（2026-09-15）
dayjs.extend(utc)
dayjs.extend(timezone)

const TZ = 'Asia/Shanghai'

export const formatDateTime = (date: string | null | undefined): string =>
  date ? dayjs(date).tz(TZ).format('YYYY-MM-DD HH:mm:ss') : '-'

export const formatDate = (date: string | null | undefined): string =>
  date ? dayjs(date).tz(TZ).format('YYYY-MM-DD') : '-'

export const dateSorter = (field: string) => (a: any, b: any) =>
  ((a[field] as string) || '').localeCompare((b[field] as string) || '')
