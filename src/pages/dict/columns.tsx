// 字典管理表格列定义（从 DictManagement.tsx 抽取，行为保持）
import { Tag, Typography, Button, Space, Popconfirm } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { DictType, DictItem } from './types'
import EllipsisText from '../../components/EllipsisText'

const { Text } = Typography

interface BuildTypeColumnsParams {
  onEdit: (record: DictType) => void
  onDelete: (id: string) => void
}

export function buildTypeColumns({ onEdit, onDelete }: BuildTypeColumnsParams): ColumnsType<DictType> {
  return [
    {
      title: '类型编码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: '类型名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (value: string) => <EllipsisText text={value} maxWidth={220} />,
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除类型后，该类型下的所有字典项也将无法使用"
            onConfirm={() => onDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]
}

interface BuildItemColumnsParams {
  onEdit: (record: DictItem) => void
  onDelete: (id: string) => void
}

export function buildItemColumns({ onEdit, onDelete }: BuildItemColumnsParams): ColumnsType<DictItem> {
  return [
    {
      title: '编码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: '标签',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      render: (value: string) => <EllipsisText text={value} maxWidth={200} stripHtml={false} />,
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
    {
      title: '默认',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 80,
      render: (isDefault: boolean) => (
        <Tag color={isDefault ? 'blue' : 'default'}>{isDefault ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            onConfirm={() => onDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]
}
