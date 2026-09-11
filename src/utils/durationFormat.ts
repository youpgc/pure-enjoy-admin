/**
 * 游戏耗时进阶单位格式化（2026-09-11 用户拍板，与 App 端
 * shared/duration_format.dart 同口径）：
 * - < 120 秒 → 「N秒」
 * - 120 秒 ~ <120 分钟 → 「M分S秒」（整分省略秒）
 * - 120 分钟 ~ <120 小时 → 「H小时M分钟S秒」（零段省略）
 * - ≥ 120 小时 → 「D天H小时M分钟」
 */
export function formatDurationSmart(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  if (totalSec < 120) return `${totalSec}秒`
  const totalMin = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (totalMin < 120) {
    return sec > 0 ? `${totalMin}分${sec}秒` : `${totalMin}分`
  }
  const totalHour = Math.floor(totalMin / 60)
  const min = totalMin % 60
  if (totalHour < 120) {
    const parts = [`${totalHour}小时`]
    if (min > 0) parts.push(`${min}分钟`)
    if (sec > 0) parts.push(`${sec}秒`)
    return parts.join('')
  }
  const day = Math.floor(totalHour / 24)
  const hour = totalHour % 24
  const parts = [`${day}天`, `${hour}小时`]
  if (min > 0) parts.push(`${min}分钟`)
  return parts.join('')
}
