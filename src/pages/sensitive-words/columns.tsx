// 敏感词表格列定义（从 SensitiveWords.tsx 抽取，行为保持）
import { Typography, Tag } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { getActionColumn } from '../../components/ActionColumn'
import { Switch } from 'antd'
import {
  SENSITIVE_CATEGORY_MAP,
  SENSITIVE_LEVEL_MAP,
  SENSITIVE_MATCH_MODE_MAP,
} from '../../constants'
import type { SensitiveWord } from './types'

const { Text } = Typography

interface ColumnCallbacks {
  onEdit: (record: SensitiveWord) => void
  onDelete: (id: string) => void
  onToggleActive: (record: SensitiveWord) => void
}

export function buildSensitiveWordsColumns({ onEdit, onDelete, onToggleActive }: ColumnCallbacks): ColumnsType<SensitiveWord> {
  return [
    {
      title: '敏感词',
      dataIndex: 'word',
      key: 'word',
      render: (word: string) => <Text strong style={{ color: '#ff4d4f' }}>{word}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const info = SENSITIVE_CATEGORY_MAP[category] || { color: 'default', label: category }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => {
        const info = SENSITIVE_LEVEL_MAP[level] || { color: 'default', label: level }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '替换词',
      dataIndex: 'replace_word',
      key: 'replace_word',
      width: 120,
      render: (replaceWord: string) => replaceWord || '-',
    },
    {
      title: '匹配模式',
      dataIndex: 'match_mode',
      key: 'match_mode',
      width: 100,
      render: (mode: string) => {
        const info = SENSITIVE_MATCH_MODE_MAP[mode] || { color: 'default', label: mode }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '命中次数',
      dataIndex: 'hit_count',
      key: 'hit_count',
      width: 100,
      render: (count: number) => <Text>{count ?? 0}</Text>,
    },
    {
      title: '创建者',
      dataIndex: 'created_by',
      key: 'created_by',
      width: 120,
      render: (createdBy: string) => createdBy || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean, record: SensitiveWord) => (
        <Switch
          checked={isActive}
          onChange={() => onToggleActive(record)}
          checkedChildren="启用"
          unCheckedChildren="停用"
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    getActionColumn<SensitiveWord>(
      (record) => [
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          type: 'primary',
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
      { width: 200, maxVisible: 2 }
    ),
  ]
}
