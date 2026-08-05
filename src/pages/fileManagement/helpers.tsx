// 文件管理辅助：类型与展示函数（从 FileManagement.tsx 抽离，审查 P1 膨胀）
import {
  PictureOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FileTextOutlined,
  FileOutlined,
} from '@ant-design/icons'

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
  if (mimeType.startsWith('image/')) return <PictureOutlined style={{ color: '#1890ff' }} />
  if (mimeType.startsWith('video/')) return <VideoCameraOutlined style={{ color: '#ff4d4f' }} />
  if (mimeType.startsWith('audio/')) return <AudioOutlined style={{ color: '#52c41a' }} />
  if (mimeType.startsWith('text/')) return <FileTextOutlined style={{ color: '#faad14' }} />
  return <FileOutlined style={{ color: '#999' }} />
}
