import React, { useMemo } from 'react'
import { Tag, Button, Space, Popconfirm, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { LineChartOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import UserDimensionList, { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

// ==================== 常量定义 ====================

const getWeightColor = (weight: number): string => {
  if (weight < 50) return 'cyan'
  if (weight < 70) return 'green'
  if (weight < 90) return 'gold'
  return 'orange'
}

// ==================== 详情列表列配置 ====================

const getDetailColumns = (
  canDelete: boolean,
  onDelete: (id: string) => void,
  onEdit: (record: RecordItem) => void
): ColumnsType<RecordItem> => [
  {
    title: '体重(kg)',
    dataIndex: 'weight',
    key: 'weight',
    width: 120,
    sorter: (a, b) => {
      const wA = (a.weight as number) || 0
      const wB = (b.weight as number) || 0
      return wB - wA
    },
    render: (weight: number) => (
      <Tag color={getWeightColor(typeof weight === 'number' ? weight : 0)} icon={<LineChartOutlined />}>
        {typeof weight === 'number' ? weight.toFixed(1) : weight} kg
      </Tag>
    ),
  },
  {
    title: '记录日期',
    dataIndex: 'record_date',
    key: 'record_date',
    width: 120,
    sorter: (a, b) => {
      const dateA = (a.record_date as string) || ''
      const dateB = (b.record_date as string) || ''
      return dateA.localeCompare(dateB)
    },
    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
  },
  {
    title: '备注',
    dataIndex: 'note',
    key: 'note',
    ellipsis: true,
    width: 200,
    render: (note: string) => note || '-',
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
  },
  {
    title: '操作',
    key: 'action',
    fixed: 'right',
    width: 120,
    render: (_, record) => (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => onEdit(record)}
        >
          编辑
        </Button>
        {canDelete && (
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否继续？"
            onConfirm={() => onDelete(record.id as string)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        )}
      </Space>
    ),
  },
]

// ==================== 主组件 ====================

const WeightRecords: React.FC = () => {
  const { canReadWeights, canWriteWeights, canDeleteWeights } = usePermission()

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!canDeleteWeights) {
      message.warning('您没有删除体重记录的权限')
      return
    }
    try {
      const { error } = await supabase.from('weight_records').delete().eq('id', id)
      if (error) throw error
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 编辑记录
  const handleEdit = (_record: RecordItem) => {
    if (!canWriteWeights) {
      message.warning('您没有编辑体重记录的权限')
      return
    }
    message.info('编辑功能开发中')
  }

  // 模块配置
  const moduleConfig: ModuleConfig = useMemo(() => ({
    key: 'weight_records',
    title: '体重记录管理',
    tableName: 'weight_records',
    detailTitle: '体重记录详情',
    detailColumns: getDetailColumns(canDeleteWeights || false, handleDelete, handleEdit),
  }), [canDeleteWeights, canWriteWeights])

  // 权限检查
  if (!canReadWeights) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Tag color="warning">您没有查看体重记录的权限</Tag>
      </div>
    )
  }

  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default WeightRecords
