// 应用版本表格列定义（从 VersionManagement.tsx 抽取，行为保持）
import { Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  DeleteOutlined,
  EditOutlined,
  RollbackOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  QrcodeOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { getActionColumn } from '../../components/ActionColumn'
import type { ActionButton } from '../../components/ActionColumn'
import { VERSION_STATUS_MAP, VERSION_PLATFORM_MAP } from '../../constants'
import type { AppVersion } from './types'

const { Text } = Typography

interface BuildVersionColumnsParams {
  onEdit: (record: AppVersion) => void
  onDelete: (id: string) => void
  onRollback: (record: AppVersion) => void
  onForceUpdate: (record: AppVersion) => void
  onCopyUrl: (record: AppVersion) => void
  onDownload: (record: AppVersion) => void
  onShowQr: (record: AppVersion) => void
}

export function buildVersionColumns(params: BuildVersionColumnsParams): ColumnsType<AppVersion> {
  const {
    onEdit,
    onDelete,
    onRollback,
    onForceUpdate,
    onCopyUrl,
    onDownload,
    onShowQr,
  } = params

  return [
    {
      title: '应用名称',
      key: 'app_name',
      width: 200,
      render: (_: unknown, record: AppVersion) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.version}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>Build {record.build_number}</Text>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const info = VERSION_STATUS_MAP[status] || { color: 'default', label: status }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (platform: string) => {
        const info = VERSION_PLATFORM_MAP[platform] || { color: 'default', label: platform }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
      width: 120,
      render: (version: string) => <Text strong>v{version}</Text>,
    },
    {
      title: '构建号',
      dataIndex: 'build_number',
      key: 'build_number',
      width: 100,
    },
    {
      title: '文件大小',
      dataIndex: 'apk_size',
      key: 'apk_size',
      width: 120,
      render: (size: number) => {
        const bytes = size || 0
        if (!bytes) return <Text type="secondary">-</Text>
        if (bytes >= 1024 * 1024 * 1024) return <Text>{(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB</Text>
        if (bytes >= 1024 * 1024) return <Text>{(bytes / (1024 * 1024)).toFixed(2)} MB</Text>
        if (bytes >= 1024) return <Text>{(bytes / 1024).toFixed(2)} KB</Text>
        return <Text>{bytes} B</Text>
      },
    },
    {
      title: '强制更新',
      dataIndex: 'is_force_update',
      key: 'is_force_update',
      width: 100,
      render: (force: boolean) => (
        <Tag color={force ? 'red' : 'default'}>{force ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '更新说明',
      dataIndex: 'release_notes',
      key: 'release_notes',
      width: 200,
      ellipsis: true,
      render: (notes: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {notes || '-'}
        </Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    getActionColumn<AppVersion>(
      (record) => {
        const actions: ActionButton[] = []

        // 已失效(superseded)版本只展示删除按钮
        if (record.status === 'superseded') {
          actions.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => onDelete(record.id),
          })
          return actions
        }

        // 编辑按钮：status 非 superseded 时展示（已失效版本不展示）
        actions.push({
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          type: 'primary',
          onClick: () => onEdit(record),
        })

        // 回滚按钮：只在 status 为 revoked 时展示
        if (record.status === 'revoked') {
          actions.push({
            key: 'rollback',
            label: '回滚',
            icon: <RollbackOutlined />,
            onClick: () => onRollback(record),
          })
        }

        // 强制更新/取消强制：仅对 released 版本显示
        if (record.status === 'released') {
          actions.push({
            key: 'forceUpdate',
            label: record.is_force_update ? '取消强制' : '强制更新',
            icon: <ThunderboltOutlined />,
            danger: !record.is_force_update,
            onClick: () => onForceUpdate(record),
          })
        }

        // 复制下载地址
        actions.push({
          key: 'copyUrl',
          label: '复制地址',
          icon: <CopyOutlined />,
          onClick: () => onCopyUrl(record),
        })

        // 二维码
        actions.push({
          key: 'qrcode',
          label: '二维码',
          icon: <QrcodeOutlined />,
          onClick: () => onShowQr(record),
        })

        // 下载APK
        actions.push({
          key: 'download',
          label: '下载APK',
          icon: <DownloadOutlined />,
          onClick: () => onDownload(record),
        })

        actions.push({
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => onDelete(record.id),
        })

        return actions
      },
      { width: 240 }
    ),
  ]
}
