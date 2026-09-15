import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// 项目约定：时间一律 UTC 存储、展示统一北京时区（UTC+8），不依赖浏览器/设备时区。
// 与 App 端 DateTimeUtils（lib/utils/date_time_utils.dart）同口径，杜绝
// 「非 +08 环境打开后台 → 所有时间列整体偏差 8 小时」的问题。（2026-09-15）
//
// ⚠️ 渲染 DB 时间戳/按日期分桶一律用本文件的工具，禁止裸写 dayjs(x).format(...)。
//    （裸 dayjs 按浏览器时区，非 +08 环境整列偏差 8 小时、跨零点错桶。）
dayjs.extend(utc)
dayjs.extend(timezone)

const TZ = 'Asia/Shanghai'

/** 把任意时刻换算成北京墙钟并按模板格式化；空值返回 '-'。 */
export const formatBeijing = (
  date: string | dayjs.Dayjs | null | undefined,
  template: string,
): string => (date ? dayjs(date).tz(TZ).format(template) : '-')

/** 当前时刻的北京墙钟 Dayjs（用于「今天/本月」等与 DB 派生日期串的比较，保证同口径）。 */
export const beijingNow = () => dayjs().tz(TZ)

/** 当前时刻按北京墙钟格式化。 */
export const formatBeijingNow = (template: string): string => dayjs().tz(TZ).format(template)

/** YYYY-MM-DD HH:mm:ss —— created_at / updated_at / login_at 等完整时间戳。 */
export const formatDateTime = (date: string | null | undefined): string =>
  formatBeijing(date, 'YYYY-MM-DD HH:mm:ss')

/** YYYY-MM-DD HH:mm */
export const formatDateTimeMinute = (date: string | null | undefined): string =>
  formatBeijing(date, 'YYYY-MM-DD HH:mm')

/** YYYY-MM-DD —— DATE 字段展示、按「天」分桶的 key。 */
export const formatDate = (date: string | null | undefined): string =>
  formatBeijing(date, 'YYYY-MM-DD')

/** MM-DD HH:mm */
export const formatMonthDayTime = (date: string | null | undefined): string =>
  formatBeijing(date, 'MM-DD HH:mm')

/** MM-DD —— 趋势图按「日」分桶的 key / 轴标签。 */
export const formatMonthDay = (date: string | dayjs.Dayjs | null | undefined): string =>
  formatBeijing(date, 'MM-DD')

export const dateSorter = (field: string) => (a: any, b: any) =>
  ((a[field] as string) || '').localeCompare((b[field] as string) || '')
