// 章节管理辅助：类型与展示函数（从 NovelChapterModal.tsx 抽离，审查 P1 膨胀）

export interface NovelChapter {
  id: string
  novel_id: string
  chapter_num: number
  title: string
  content: string
  word_count: number
  is_free: boolean
  created_at: string
  updated_at: string
}

// 章节号转中文数字（1→第一章，2→第二章，...，999→第九百九十九章）
export const toChineseNumber = (num: number): string => {
  const chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  const chineseUnits = ['', '十', '百']

  if (num === 0) return '零'

  const digits = num.toString().split('').map(Number)
  let result = ''

  for (let i = 0; i < digits.length; i++) {
    const digit = digits[i]!
    const unitIndex = digits.length - 1 - i

    if (digit === 0) {
      const nextDigit = digits[i + 1]
      if (i < digits.length - 1 && nextDigit !== undefined && nextDigit !== 0) {
        result += chineseNums[0]
      }
    } else {
      const unit = chineseUnits[unitIndex]
      result += chineseNums[digit] + (unit ?? '')
    }
  }

  // 处理特殊简写：十一~十九 简化为 十一~十九；十 简化为 十
  if (num >= 10 && num < 20) {
    result = result.replace(/^一/, '')
  }

  return result
}
