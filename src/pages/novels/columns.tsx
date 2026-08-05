import { Space, Tag, Badge, Typography } from 'antd'
import {
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { getActionColumn, type ActionButton } from '../../components/ActionColumn'
import NovelCover from '../../components/NovelCover'
import EllipsisText from '../../components/EllipsisText'
import {
  NOVEL_CATEGORY_MAP,
  NOVEL_STATUS_MAP,
  NOVEL_STATUS_COLORS,
  NOVEL_SOURCE_MAP,
  NOVEL_AGGREGATED_SOURCES,
} from '../../constants'
import type { DbNovel } from '../../types/database'

// 使用数据库生成的类型，确保与管理后台、App 端字段一致
type Novel = DbNovel

export interface NovelColumnCallbacks {
  canWrite: boolean
  canDelete: boolean
  onEdit: (record: Novel) => void
  onDelete: (id: string) => void
  onManageChapters: (novelId: string) => void
}

// 表格列定义（审查 P1 膨胀：从 Novels.tsx 抽离，组件只组合渲染）
export function buildNovelColumns(cb: NovelColumnCallbacks): ColumnsType<Novel> {
  const { Text } = Typography
  return [
    {
      title: '小说信息',
      key: 'novel',
      width: 300,
      render: (_, record) => (
        <Space>
          <NovelCover
            coverUrl={record.cover_url}
            title={record.title}
            width={50}
            height={70}
            borderRadius={4}
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              <EllipsisText text={record.title} maxWidth={200} />
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.author || '-'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string | null) => (
        <Tag>{category ? (NOVEL_CATEGORY_MAP[category] || category) : '-'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string | null) => {
        if (!status) return <Badge status="default" text="-" />
        const info = NOVEL_STATUS_COLORS[status] || 'default'
        return <Badge color={info} text={NOVEL_STATUS_MAP[status] || status} />
      },
    },
    {
      title: '聚合来源',
      dataIndex: 'source',
      key: 'source',
      width: 130,
      render: (source: string | null, record) => {
        if (!source) return <Tag>-</Tag>
        const label = NOVEL_SOURCE_MAP[source] || source
        const isAggregated = NOVEL_AGGREGATED_SOURCES.has(source)
        if (isAggregated && record.source_url) {
          return (
            <a href={record.source_url} target="_blank" rel="noreferrer">
              <LinkOutlined style={{ marginRight: 4 }} />
              {label}
            </a>
          )
        }
        return <Tag color={isAggregated ? 'blue' : 'default'}>{label}</Tag>
      },
    },
    {
      title: '章节数',
      dataIndex: 'chapter_count',
      key: 'chapter_count',
      width: 100,
      render: (count: number | null) => count ?? '-',
    },
    {
      title: '总字数',
      dataIndex: 'word_count',
      key: 'word_count',
      width: 120,
      render: (count: number | null) => {
        if (!count) return '-'
        if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
        return `${count}`
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    getActionColumn<Novel>(
      (record) => {
        const actions: ActionButton[] = []
        if (cb.canWrite) {
          actions.push({
            key: 'chapters',
            label: '章节管理',
            icon: <FileTextOutlined />,
            type: 'primary',
            onClick: () => cb.onManageChapters(record.id),
          })
          actions.push({
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => cb.onEdit(record),
          })
        }
        if (cb.canDelete) {
          actions.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => cb.onDelete(record.id),
          })
        }
        return actions
      },
      { width: 240, maxVisible: 3 }
    ),
  ]
}
