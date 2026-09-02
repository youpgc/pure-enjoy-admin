import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined } from '@ant-design/icons'
import { ACTION_MAP } from '../../constants'
import { getActionColumn } from '../../components/ActionColumn'
import { UserName } from '../../components/UserName'
import EllipsisText from '../../components/EllipsisText'
import dayjs from 'dayjs'
import { getModuleInfo } from './constants'
import { formatDetails } from './helpers'
import type { OperationLog, UserMap } from './types'
import styles from './columns.module.css'

interface BuildColumnsArgs {
  hasPermission: (perm: string) => boolean
  userMap: UserMap
  handleDelete: (id: string) => void
}

// 表格列定义（参数注入权限/用户名映射/行操作，审查 P1 膨胀）
export function buildOperationLogColumns({
  hasPermission,
  userMap,
  handleDelete,
}: BuildColumnsArgs): ColumnsType<OperationLog> {
  return [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 200,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '用户名',
      dataIndex: 'user_id',
      key: 'username',
      width: 120,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => {
        const info = ACTION_MAP[action] || { color: 'default', label: action }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (module: string) => {
        const info = getModuleInfo(module)
        return (
          <Tag color={info.color} icon={info.icon}>
            {info.label}
          </Tag>
        )
      },
    },
    {
      title: '目标ID',
      dataIndex: 'target_id',
      key: 'target_id',
      width: 120,
      render: (v: string[] | null) => (v && v.length ? v.join(', ') : '-'),
    },
    {
      title: '操作内容',
      dataIndex: 'details',
      key: 'details',
      width: 320,
      ellipsis: true,
      render: (v: Record<string, unknown>, record: OperationLog) => {
        const text = formatDetails(v, record.module)
        return text ? (
          <EllipsisText text={text} maxWidth={320} stripHtml={false} />
        ) : (
          <span className={styles.mutedDash}>—</span>
        )
      },
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
      render: (v: string) => v || '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    getActionColumn<OperationLog>(
      (record) => {
        const actions = []
        if (hasPermission('operation_logs:delete')) {
          actions.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDelete(record.id),
          })
        }
        return actions
      },
      { width: 100, maxVisible: 1 },
    ),
  ]
}
