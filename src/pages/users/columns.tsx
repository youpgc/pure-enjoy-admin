// 用户表格列定义（从 Users.tsx 抽取，行为保持）
import { Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  EyeOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { getActionColumn } from '../../components/common/ActionColumn'
import type { ActionButton } from '../../components/common/ActionColumn'
import { formatDateTime } from '../../utils/format'
import { USER_STATUS_ACTIVE } from '../../constants/roles'
import type { DictOption } from '../../hooks/useDictOptions'
import type { User, UserRole, MemberLevel, UserStatus } from '../../types/user'
import styles from './columns.module.css'

const { Text } = Typography

interface BuildUserColumnsParams {
  onViewUser: (user: User) => void
  onOpenEdit: (user: User) => void
  onToggleStatus: (user: User) => void
  onDelete: (ids: string[]) => void
  hasPermission: (perm: string) => boolean
  roleOptions: DictOption[]
  memberLevelOptions: DictOption[]
  statusOptions: DictOption[]
  getRoleColor: (role: UserRole) => string
  getStatusColor: (status: UserStatus) => string
  getMemberLevelColor: (level: MemberLevel) => string
}

export function buildUserColumns(params: BuildUserColumnsParams): ColumnsType<User> {
  const {
    onViewUser,
    onOpenEdit,
    onToggleStatus,
    onDelete,
    hasPermission,
    roleOptions,
    memberLevelOptions,
    statusOptions,
    getRoleColor,
    getStatusColor,
    getMemberLevelColor,
  } = params

  return [
    {
      title: '用户ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      fixed: 'left',
      render: (id: string, record: User) => (
        <Tooltip title="点击查看详情">
          <a onClick={() => onViewUser(record)}>
            <Text className={styles.idText}>{id}</Text>
          </a>
        </Tooltip>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true,
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
      render: (nickname: string | null) => nickname || <Text type="secondary">未设置</Text>,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (phone: string | null) => phone || <Text type="secondary">未设置</Text>,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 100,
      render: (username: string | null) => username || <Text type="secondary">-</Text>,
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 70,
      render: (gender: string | null) => gender || <Text type="secondary">-</Text>,
    },
    {
      title: '身高(cm)',
      dataIndex: 'height',
      key: 'height',
      width: 100,
      render: (height: number | null) => height != null ? `${height}` : <Text type="secondary">-</Text>,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: UserRole) => (
        <Tag color={getRoleColor(role)}>{roleOptions.find(opt => opt.value === role)?.label || role}</Tag>
      ),
    },
    {
      title: '会员等级',
      dataIndex: 'member_level',
      key: 'member_level',
      width: 100,
      render: (level: MemberLevel) => (
        <Tag color={getMemberLevelColor(level)}>{memberLevelOptions.find(opt => opt.value === level)?.label || level}</Tag>
      ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 100,
      sorter: (a, b) => (a.points ?? 0) - (b.points ?? 0),
      render: (points: number | null) =>
        points != null
          ? <Text strong>{points.toLocaleString('zh-CN')}</Text>
          : <Text type="secondary">0</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: UserStatus) => (
        <Tag color={getStatusColor(status)}>{statusOptions.find(opt => opt.value === status)?.label || status}</Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      width: 160,
      render: (date: string | null) => date ? formatDateTime(date) : <Text type="secondary">从未登录</Text>,
    },
    getActionColumn<User>(
      (record) => {
        const actions: ActionButton[] = [
          {
            key: 'view',
            label: '查看',
            icon: <EyeOutlined />,
            onClick: () => onViewUser(record),
          },
        ]
        if (hasPermission('users:write') || hasPermission('users:delete')) {
          actions.push(
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              onClick: () => onOpenEdit(record),
            },
            {
              key: 'toggle',
            label: record.status === USER_STATUS_ACTIVE ? '禁用' : '启用',
            icon: record.status === USER_STATUS_ACTIVE ? <StopOutlined /> : <CheckCircleOutlined />,
              danger: record.status === USER_STATUS_ACTIVE,
              onClick: () => onToggleStatus(record),
            },
            {
              key: 'delete',
              label: '删除',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => onDelete([record.id]),
            }
          )
        }
        return actions
      },
      { width: 240, maxVisible: 2 }
    ),
  ]
}
