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
import { usePagination } from '../hooks/usePagination'

const { Text } = Typography

// ==================== 类型定义 ====================

interface NovelChapter {
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
  const { pagination, tablePagination, setTotal } = usePagination()

  const chapterService = new BaseService<NovelChapter>('novel_chapters', { defaultOrder: { column: 'chapter_num', ascending: true } })

  // 加载章节列表
  const loadChapters = useCallback(async () => {
    if (!novelId) return
    setLoading(true)
    try {
      const result = await chapterService.paginate(
        pagination.current,
        pagination.pageSize,
        (q) => q.eq('novel_id', novelId),
      )
      if (!result.success) {
        handleApiError(result.errorMessage, 'NovelChapterModal-加载章节')
        return
      }
      setChapters(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'NovelChapterModal-加载章节')
    } finally {
      setLoading(false)
    }
  }, [novelId, pagination.current, pagination.pageSize, setTotal])

  useEffect(() => {
    if (open && novelId) {
      loadChapters()
    }
  }, [open, novelId, loadChapters])

  // 打开新增弹窗（查询全局最大章节号，避免与已有章节冲突）
  const handleAdd = async () => {
    setEditingChapter(null)
    form.resetFields()
    // 查询该小说全局最大章节号
    let nextNumber = 1
    try {
      const { data, error } = await supabase
        .from('novel_chapters')
        .select('chapter_num')
        .eq('novel_id', novelId)
        .order('chapter_num', { ascending: false })
        .limit(1)
        .single()
      if (!error && data) {
        nextNumber = (data.chapter_num || 0) + 1
      }
    } catch (err) {
      // 查询失败时使用当前页数据兜底
      nextNumber = chapters.length > 0
        ? Math.max(...chapters.map(c => c.chapter_num)) + 1
        : 1
    }
    form.setFieldsValue({ chapter_num: nextNumber })
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

  // 调整章节顺序（查询数据库真实相邻章节，支持跨页移动）
  const handleMoveChapter = async (chapter: NovelChapter, direction: 'up' | 'down') => {
    try {
      // 上移：查询 chapter_num < 当前值 的最大值（降序取第一条）
      // 下移：查询 chapter_num > 当前值 的最小值（升序取第一条）
      let query = supabase
        .from('novel_chapters')
        .select('id, chapter_num')
        .eq('novel_id', novelId)
        .neq('id', chapter.id)

      if (direction === 'up') {
        query = query.lt('chapter_num', chapter.chapter_num).order('chapter_num', { ascending: false })
      } else {
        query = query.gt('chapter_num', chapter.chapter_num).order('chapter_num', { ascending: true })
      }

      const { data: targetData, error: targetError } = await query.limit(1)

      if (targetError || !targetData || targetData.length === 0) {
        message.warning(direction === 'up' ? '已经是第一章' : '已经是最后一章')
        return
      }

      const targetChapter = targetData[0]
      if (!targetChapter) {
        message.warning(direction === 'up' ? '已经是第一章' : '已经是最后一章')
        return
      }

      // 如果目标章节的 chapter_num 和当前章节相同，说明数据有重复，需要先重排
      if (targetChapter.chapter_num === chapter.chapter_num) {
        message.error('章节号存在重复，请先使用"重新编号"功能整理')
        return
      }

      // 交换章节号
      const [update1, update2] = await Promise.all([
        apiExecute(
          () => supabase.from('novel_chapters').update({ chapter_num: targetChapter.chapter_num }).eq('id', chapter.id) as any,
          'NovelChapterModal-调整顺序1'
        ),
        apiExecute(
          () => supabase.from('novel_chapters').update({ chapter_num: chapter.chapter_num }).eq('id', targetChapter.id) as any,
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
      dataIndex: 'chapter_num',
      key: 'chapter_num',
      width: 80,
      sorter: (a, b) => a.chapter_num - b.chapter_num,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: NovelChapter) => (
        <Space>
          <Text strong>{title}</Text>
          {!record.is_free && <Tag color="gold">VIP</Tag>}
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
          pagination={tablePagination}
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
            name="chapter_num"
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
            name="is_free"
            label="免费章节"
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
