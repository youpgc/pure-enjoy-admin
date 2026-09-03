// 章节表格列定义（从 NovelChapterModal.tsx 抽离，审查 P1 膨胀）
// 通过参数注入 chapters（用于上/下移可用判定）与行内操作。
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { getActionColumn, type ActionButton } from '../../common/ActionColumn'
import EllipsisText from '../../common/EllipsisText'
import { toChineseNumber, type NovelChapter } from './helpers'

export const buildChapterColumns = (params: {
  chapters: NovelChapter[]
  onMove: (record: NovelChapter, direction: 'up' | 'down') => void
  onEdit: (record: NovelChapter) => void
  onDelete: (id: string) => void
}): ColumnsType<NovelChapter> => {
  const { chapters, onMove, onEdit, onDelete } = params
  return [
    {
      title: '序号',
      dataIndex: 'chapter_num',
      key: 'chapter_num',
      width: 120,
      render: (num: number) => `第${toChineseNumber(num)}章`,
      sorter: (a, b) => a.chapter_num - b.chapter_num,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <EllipsisText text={title} maxWidth={180} />,
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
      (record: NovelChapter): ActionButton[] => [
        {
          key: 'up',
          label: '上移',
          icon: <ArrowUpOutlined />,
          onClick: () => {
            const idx = chapters.findIndex((c) => c.id === record.id)
            if (idx > 0) onMove(record, 'up')
          },
        },
        {
          key: 'down',
          label: '下移',
          icon: <ArrowDownOutlined />,
          onClick: () => {
            const idx = chapters.findIndex((c) => c.id === record.id)
            if (idx >= 0 && idx < chapters.length - 1) onMove(record, 'down')
          },
        },
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          type: 'primary' as const,
          onClick: () => onEdit(record),
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => onDelete(record.id),
        },
      ],
      { width: 240, maxVisible: 3 },
    ),
  ]
}
