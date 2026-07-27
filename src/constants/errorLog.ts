// ==================== 错误日志 ====================

export const ERROR_LOG_LEVEL_MAP: Record<string, { color: string; label: string }> = {
  error: { color: 'red', label: 'ERROR' },
  warning: { color: 'orange', label: 'WARNING' },
  info: { color: 'blue', label: 'INFO' },
}

export const ERROR_LOG_LEVEL_OPTIONS = [
  { label: 'ERROR', value: 'error' },
  { label: 'WARNING', value: 'warning' },
  { label: 'INFO', value: 'info' },
]
