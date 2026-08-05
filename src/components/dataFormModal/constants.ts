import type { MoodOption } from './types'

// Emoji 映射：心情值 -> 对应的 Emoji
export const MOOD_EMOJI_MAP: Record<string, string> = {
  happy: '😊',
  calm: '😌',
  normal: '😐',
  sad: '😢',
  anxious: '😰',
  tired: '😴',
  开心: '😊',
  平静: '😌',
  一般: '😐',
  难过: '😢',
  焦虑: '😰',
  疲惫: '😴',
}

// Fallback 心情选项
export const FALLBACK_MOOD_OPTIONS: MoodOption[] = [
  { label: '开心', value: '开心' },
  { label: '平静', value: '平静' },
  { label: '一般', value: '一般' },
  { label: '难过', value: '难过' },
  { label: '焦虑', value: '焦虑' },
]
