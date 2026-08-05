// 批注表格列定义（从 Annotations.tsx 抽离，审查 P1 膨胀）
// 列表列与审核列分别构建；通过参数注入 userMap 与行内操作，避免逻辑裸露在页面。
import type { ColumnsType } from 'antd/es/table'
import { Tag, Space } from 'antd'
import dayjs from 'dayjs'
import { getActionColumn, type ActionButton } from '../../components/ActionColumn'
import EllipsisText from '../../components/EllipsisText'
import { UserName } from '../../components/UserName'
import { ColorDot, containsSensitive } from './constants'
import type { UserInfo } from '../../hooks/useUsernames'
import type { NovelAnnotation } from './types'

export type UserMap = Map<string, UserInfo>

export const buildAnnotationColumns = (params: {
  userMap: UserMap
  renderActions: (record: NovelAnnotation) => ActionButton[]
}): ColumnsType<NovelAnnotation> => {
  const { userMap, renderActions } = params
  return [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 140,
      render: (v: string) => v.slice(0, 12) + '...',
    },
    {
      title: '用户名',
      dataIndex: 'user_id',
      key: 'username',
      width: 120,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    {
      title: '小说ID',
      dataIndex: 'novel_id',
      key: 'novel_id',
      width: 140,
      render: (v: string) => v.slice(0, 12) + '...',
    },
    {
      title: '章节',
      dataIndex: 'chapter_order',
      key: 'chapter',
      width: 80,
      render: (v: number) => `第${v}章`,
    },
    {
      title: '高亮文本',
      dataIndex: 'highlighted_text',
      key: 'text',
      render: (v: string) => <EllipsisText text={v} maxWidth={200} />,
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      render: (v: string | null) => <EllipsisText text={v} maxWidth={200} />,
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      width: 60,
      align: 'center',
      render: (v: string) => <ColorDot color={v} />,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
    getActionColumn<NovelAnnotation>(renderActions, { width: 100 }),
  ]
}

export const buildReviewColumns = (params: {
  userMap: UserMap
  renderReviewActions: (record: NovelAnnotation) => ActionButton[]
}): ColumnsType<NovelAnnotation> => {
  const { userMap, renderReviewActions } = params
  return [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 140,
      render: (v: string) => v.slice(0, 12) + '...',
    },
    {
      title: '用户名',
      dataIndex: 'user_id',
      key: 'username',
      width: 120,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    {
      title: '高亮文本',
      dataIndex: 'highlighted_text',
      key: 'text',
      render: (v: string) => <EllipsisText text={v} maxWidth={200} />,
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      render: (v: string | null) => <EllipsisText text={v} maxWidth={200} />,
    },
    {
      title: '命中敏感词',
      key: 'sensitive',
      render: (_: unknown, r: NovelAnnotation) => {
        const words = containsSensitive((r.highlighted_text || '') + (r.note || ''))
        return (
          <Space>
            {words.map((w) => (
              <Tag color='error' key={w}>
                {w}
              </Tag>
            ))}
          </Space>
        )
      },
    },
    getActionColumn<NovelAnnotation>(renderReviewActions, { width: 160 }),
  ]
}
