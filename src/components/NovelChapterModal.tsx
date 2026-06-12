import React, { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  Table,
  Button,
  Input,
  Space,
  Form,
  message,
  Tag,
  Typography,
  Switch,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { getActionColumn } from './ActionColumn'
import { BaseService, apiExecute, handleApiError } from '../utils/apiClient'

const { Text } = Typography

// ==================== 类型定义 ====================

interface NovelChapter {
  id: string
  novel_id: string
  chapter_number: number
  title: string
  content: string
  word_count: number
  is_vip: boolean
  created_at: string
  updated_at: string
}

// ==================== 组件 ====================

const NovelChapterModal: React.FC<{
  open: boolean
  novelId: string
  onClose: () => void
}> = ({ open, novelId, onClose }) => {
  const [chapters, setChapters] = useState<NovelChapter[]>([])
  const [loading, setLoading] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<NovelChapter | null>(null)
  const [form] = Form.useForm()

  const chapterService = new BaseService<NovelChapter>('novel_chapters', { defaultOrder: { column: 'chapter_number', ascending: true } })

  // 加载章节列表
  const loadChapters = useCallback(async () => {
    if (!novelId) return
    setLoading(true)
    try {
      const result = await chapterService.findAll((q) => q.eq('novel_id', novelId))
      if (!result.success) {
        handleApiError(result.errorMessage, 'NovelChapterModal-加载章节')
        return
      }
      setChapters(result.data || [])
    } catch (error) {
      handleApiError(error, 'NovelChapterModal-加载章节')
    } finally {
      setLoading(false)
    }
  }, [novelId])

  useEffect(() => {
    if (open && novelId) {
      loadChapters()
    }
  }, [open, novelId, loadChapters])

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingChapter(null)
    form.resetFields()
    // 自动设置章节号
    const nextNumber = chapters.length > 0
      ? Math.max(...chapters.map(c => c.chapter_number)) + 1
      : 1
    form.setFieldsValue({ chapter_number: nextNumber })
    setEditModalOpen(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: NovelChapter) => {
    setEditingChapter(record)
    form.setFieldsValue({
      ...record,
    })
    setEditModalOpen(true)
  }

  // 删除章节
  const handleDelete = async (id: string) => {
    try {
      const result = await chapterService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'NovelChapterModal-删除章节')
        return
      }
      message.success('删除成功')
      loadChapters()
    } catch (error) {
      handleApiError(error, 'NovelChapterModal-删除章节')
    }
  }

  // 保存章节
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingChapter) {
        const result = await chapterService.update(editingChapter.id, {
          ...values,
          word_count: values.content?.length || 0,
          updated_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'NovelChapterModal-更新章节')
          return
        }
        message.success('更新成功')
      } else {
        const result = await chapterService.create({
          ...values,
          novel_id: novelId,
          word_count: values.content?.length || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        if (!result.success) {
          handleApiError(result.errorMessage, 'NovelChapterModal-创建章节')
          return
        }
        message.success('创建成功')
      }
      setEditModalOpen(false)
      setEditingChapter(null)
      form.resetFields()
      loadChapters()
    } catch (error) {
      handleApiError(error, 'NovelChapterModal-保存章节')
    }
  }

  // 调整章节顺序
  const handleMoveChapter = async (chapter: NovelChapter, direction: 'up' | 'down') => {
    const currentIndex = chapters.findIndex(c => c.id === chapter.id)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= chapters.length) return

    const targetChapter = chapters[targetIndex]
    if (!targetChapter) return

    try {
      // 交换章节号
      const [update1, update2] = await Promise.all([
        apiExecute(
          () => supabase.from('novel_chapters').update({ chapter_number: targetChapter.chapter_number }).eq('id', chapter.id) as any,
          'NovelChapterModal-调整顺序1'
        ),
        apiExecute(
          () => supabase.from('novel_chapters').update({ chapter_number: chapter.chapter_number }).eq('id', targetChapter.id) as any,
          'NovelChapterModal-调整顺序2'
        ),
      ])

      if (!update1.success || !update2.success) {
        message.error('调整顺序失败')
        return
      }

      message.success('调整成功')
      loadChapters()
    } catch (error) {
      handleApiError(error, 'NovelChapterModal-调整顺序')
    }
  }

  // 表格列定义
  const columns: ColumnsType<NovelChapter> = [
    {
      title: '章节号',
      dataIndex: 'chapter_number',
      key: 'chapter_number',
      width: 80,
      sorter: (a, b) => a.chapter_number - b.chapter_number,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: NovelChapter) => (
        <Space>
          <Text strong>{title}</Text>
          {record.is_vip && <Tag color="gold">VIP</Tag>}
        </Space>
      ),
    },
    {
      title: '字数',
      dataIndex: 'word_count',
      key: 'word_count',
      width: 100,
      render: (count: number) => `${count || 0} 字`,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    getActionColumn<NovelChapter>(
      (record: NovelChapter) => [
        {
          key: 'up',
          label: '上移',
          icon: <ArrowUpOutlined />,
          onClick: () => {
            const idx = chapters.findIndex(c => c.id === record.id)
            if (idx > 0) handleMoveChapter(record, 'up')
          },
        },
        {
          key: 'down',
          label: '下移',
          icon: <ArrowDownOutlined />,
          onClick: () => {
            const idx = chapters.findIndex(c => c.id === record.id)
            if (idx >= 0 && idx < chapters.length - 1) handleMoveChapter(record, 'down')
          },
        },
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          type: 'primary' as const,
          onClick: () => handleEdit(record),
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        },
      ],
      { width: 240, maxVisible: 3 }
    ),
  ]

  return (
    <>
      <Modal
        title="章节管理"
        open={open}
        onCancel={onClose}
        footer={null}
        width={900}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增章节
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadChapters} loading={loading}>
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={chapters}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
        />
      </Modal>

      {/* 章节编辑弹窗 */}
      <Modal
        title={editingChapter ? '编辑章节' : '新增章节'}
        open={editModalOpen}
        onOk={handleSave}
        onCancel={() => {
          setEditModalOpen(false)
          setEditingChapter(null)
          form.resetFields()
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="chapter_number"
            label="章节号"
            rules={[{ required: true, message: '请输入章节号' }]}
          >
            <Input type="number" placeholder="请输入章节号" />
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea rows={10} placeholder="请输入章节内容" />
          </Form.Item>
          <Form.Item
            name="is_vip"
            label="VIP章节"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default NovelChapterModal
