import { Button, Space, Switch, Tag, Popconfirm, Typography } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { GAME_SHARED_ICON_BASE, GAME_ENGINE_MAP, GAME_DIMENSION_VALUE_TYPE_MAP, GAME_DIMENSION_AGGREGATE_MAP } from '../../constants'
import type { DbGame, DbGameDimension } from '../../types/database'

const { Text } = Typography

/** 列操作回调（数据与状态由容器页持有，列定义只负责渲染与回传） */
export interface GameConfigColumnsOps {
  canWrite: boolean
  canDelete: boolean
  onEdit: (record: any) => void
  onDelete: (id: string) => void
  onToggleEnabled: (record: DbGame, next: boolean) => void
}

/// 游戏配置列（Tab1）
export function buildGameColumns(ops: GameConfigColumnsOps): ColumnsType<DbGame> {
  return [
    { title: '编码', dataIndex: 'code', key: 'code', render: (v: string) => <Text strong>{v}</Text> },
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      render: (v: string | null) =>
        v ? (
          <img
            src={`${GAME_SHARED_ICON_BASE}/${v}.svg`}
            alt={v}
            style={{ width: 28, height: 28, objectFit: 'contain' }}
          />
        ) : (
          '-'
        ),
    },
    {
      title: '引擎',
      dataIndex: 'engine',
      key: 'engine',
      width: 110,
      render: (v: string) => {
        const info = GAME_ENGINE_MAP[v] || { color: 'default', label: v }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    {
      title: '选关',
      dataIndex: 'level_selectable',
      key: 'level_selectable',
      width: 90,
      render: (v: boolean) =>
        v ? <Tag color="green">可</Tag> : <Tag>不可</Tag>,
    },
    {
      title: '选关模式',
      dataIndex: 'level_select_mode',
      key: 'level_select_mode',
      width: 120,
      render: (v: string, record: DbGame) =>
        record.level_selectable
          ? v === 'free'
            ? <Tag color="blue">直接选关</Tag>
            : <Tag color="gold">需通关</Tag>
          : <Tag>—</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record: DbGame) => (
        <Switch
          checked={enabled}
          disabled={!ops.canWrite}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={(next) => ops.onToggleEnabled(record, next)}
        />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" icon={<EditOutlined />} disabled={!ops.canWrite} onClick={() => ops.onEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除" onConfirm={() => ops.onDelete(record.id)} okText="确认" cancelText="取消">
            <Button danger size="small" icon={<DeleteOutlined />} disabled={!ops.canDelete}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]
}

/// 成绩维度列（Tab2）
export function buildDimColumns(ops: GameConfigColumnsOps): ColumnsType<DbGameDimension> {
  return [
    { title: '编码', dataIndex: 'code', key: 'code', render: (v: string) => <Text strong>{v}</Text> },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '单位', dataIndex: 'unit', key: 'unit', render: (v: string | null) => v || '-' },
    {
      title: '值类型',
      dataIndex: 'value_type',
      key: 'value_type',
      width: 100,
      render: (v: string) => {
        const info = GAME_DIMENSION_VALUE_TYPE_MAP[v] || { color: 'default', label: v }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '聚合',
      dataIndex: 'aggregate',
      key: 'aggregate',
      width: 110,
      render: (v: string) => {
        const info = GAME_DIMENSION_AGGREGATE_MAP[v] || { color: 'default', label: v }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '主维度',
      dataIndex: 'is_primary',
      key: 'is_primary',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="green">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" icon={<EditOutlined />} disabled={!ops.canWrite} onClick={() => ops.onEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除" onConfirm={() => ops.onDelete(record.id)} okText="确认" cancelText="取消">
            <Button danger size="small" icon={<DeleteOutlined />} disabled={!ops.canDelete}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]
}
