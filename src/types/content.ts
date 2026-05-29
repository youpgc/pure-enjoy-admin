/**
 * 富文本内容页面类型定义
 */

export interface ContentPage {
  id: string
  key: string
  title: string
  content: string
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface ContentPageFormData {
  key: string
  title: string
  content: string
  is_published: boolean
}
