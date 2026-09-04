// 数据分析表格列定义（从 Analytics.tsx 抽离，审查 P1 膨胀）
import type { ColumnsType } from 'antd/es/table'
import { Tag } from 'antd'
import EllipsisText from '../../components/common/EllipsisText'
import type { TopNovel } from './types'

export const buildTopNovelColumns = (): ColumnsType<TopNovel> => [
  {
    title: '排名',
    key: 'rank',
    width: 60,
    render: (_: unknown, __: unknown, index: number) => index + 1,
  },
  {
    title: '书名',
    dataIndex: 'title',
    key: 'title',
    render: (title: string) => <EllipsisText text={title} maxWidth={180} />,
  },
  {
    title: '作者',
    dataIndex: 'author',
    key: 'author',
  },
  {
    title: '阅读量',
    dataIndex: 'read_count',
    key: 'read_count',
    render: (count: number) => <Tag color='blue'>{count}</Tag>,
  },
  {
    title: '章节数',
    dataIndex: 'chapter_count',
    key: 'chapter_count',
  },
]
