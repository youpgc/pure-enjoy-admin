// 文件管理辅助：类型与展示函数（从 FileManagement.tsx 抽离，审查 P1 膨胀）
import {
  PictureOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FileTextOutlined,
  FileOutlined,
} from '@ant-design/icons'
import styles from './helpers.module.css'

export interface FileItem {
  id: string
  file_name: string
  bucket: string
  path: string
  size: number
  mime_type: string
  url: string
  created_at: string
}

export interface FileFilters {
  keyword: string
  bucket: string | undefined
}

// 格式化文件大小
export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取文件图标
export const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <PictureOutlined className={styles.iconImage} />
  if (mimeType.startsWith('video/')) return <VideoCameraOutlined className={styles.iconVideo} />
  if (mimeType.startsWith('audio/')) return <AudioOutlined className={styles.iconAudio} />
  if (mimeType.startsWith('text/')) return <FileTextOutlined className={styles.iconText} />
  return <FileOutlined className={styles.iconFile} />
}
