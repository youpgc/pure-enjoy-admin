// 文件管理表格列定义（从 FileManagement.tsx 抽离，审查 P1 膨胀）
import type { ColumnsType } from 'antd/es/table'
import { Tag, Space, Typography } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getActionColumn, type ActionButton } from '../../components/ActionColumn'
import EllipsisText from '../../components/EllipsisText'
import { getFileIcon, formatFileSize, type FileItem } from './helpers'

export const buildFileColumns = (params: {
  handleDelete: (record: FileItem) => void
}): ColumnsType<FileItem> => {
  const { handleDelete } = params
  return [
    {
      title: '文件名',
      key: 'name',
      width: 300,
      render: (_: unknown, record) => (
        <Space>
          {getFileIcon(record.mime_type)}
          <div>
            <div style={{ fontWeight: 500 }}>
              <EllipsisText text={record.file_name} maxWidth={200} />
            </div>
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>
              {record.bucket}
            </Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '类型',
      dataIndex: 'mime_type',
      key: 'mime_type',
      width: 150,
      render: (mime: string) => <Tag>{mime}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    getActionColumn<FileItem>(
      (record): ActionButton[] => [
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record),
        },
      ],
      { width: 120, maxVisible: 1 },
    ),
  ]
}
