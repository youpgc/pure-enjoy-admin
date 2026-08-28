// ==================== 批注审核状态 ====================

export type AnnotationStatus = 'pending' | 'approved' | 'rejected'

export const ANNOTATION_STATUS_PENDING = 'pending' as const
export const ANNOTATION_STATUS_APPROVED = 'approved' as const
export const ANNOTATION_STATUS_REJECTED = 'rejected' as const

export const ANNOTATION_STATUS_VALUES: AnnotationStatus[] = [
  ANNOTATION_STATUS_PENDING,
  ANNOTATION_STATUS_APPROVED,
  ANNOTATION_STATUS_REJECTED,
]

export const ANNOTATION_STATUS_LABELS: Record<AnnotationStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已封禁',
}
