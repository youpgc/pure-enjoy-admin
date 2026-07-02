import dayjs from 'dayjs'

export const formatDateTime = (date: string | null | undefined): string =>
  date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'

export const formatDate = (date: string | null | undefined): string =>
  date ? dayjs(date).format('YYYY-MM-DD') : '-'

export const dateSorter = (field: string) => (a: any, b: any) =>
  ((a[field] as string) || '').localeCompare((b[field] as string) || '')
