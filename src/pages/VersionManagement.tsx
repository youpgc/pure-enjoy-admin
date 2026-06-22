import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  InputNumber,
  Space,
  Tag,
  Card,
  message,
  Modal,
  Form,
  Select,
  Popconfirm,
  Typography,
  Row,
  Col,
  Switch,
  Descriptions,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  QrcodeOutlined,
  RollbackOutlined,
  ThunderboltOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { QRCodeSVG } from 'qrcode.react'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { getActionColumn, type ActionButton } from '../components/ActionColumn'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'

const { Text } = Typography

// ==================== 类型定义 ====================

interface AppVersion {
  id: string
  platform: 'ios' | 'android' | 'web'
  version: string
  build_number: number
  is_force_update: boolean
  release_notes?: string
  release_type?: string
  apk_url?: string
  apk_size?: number
  status?: string
  released_at?: string
  revoked_at?: string
  created_by?: string
  checksum?: string
  file_name?: string

  created_at: string
  updated_at: string
}

interface VersionFilters {
  keyword: string
  platform: string | undefined
  status: string | undefined
}

// ==================== 组件 ====================

const VersionManagement: React.FC = () => {
  const [versions, setVersions] = useState<AppVersion[]>([])
  const [loading, setLoading] = useState(false)
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [filters, setFilters] = useState<VersionFilters>({
    keyword: '',
    platform: undefined,
    status: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingVersion, setEditingVersion] = useState<AppVersion | null>(null)
  const [form] = Form.useForm()
  const [currentVersion, setCurrentVersion] = useState<AppVersion | null>(null)
  const [qrCodeVersion, setQrCodeVersion] = useState<AppVersion | null>(null)
  const { isAdmin: _isAdmin } = usePermission()

  const versionService = React.useMemo(() => new BaseService<AppVersion>('app_versions', { defaultOrder: { column: 'created_at', ascending: false } }), [])

  // 加载版本列表
  const loadVersions = useCallback(async () => {
    setLoading(true)
    try {
      const result = await versionService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`version.ilike.%${filters.keyword}%,release_notes.ilike.%${filters.keyword}%`)
        }
        if (filters.platform) {
          query = query.eq('platform', filters.platform)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'VersionManagement-加载版本')
        return
      }

      setVersions(result.data?.data || [])
      setTotal(result.data?.total || 0)

      // 获取当前发布版本（status=released 的最新版本）
      const activeRes = await versionService.findAll((q: any) =>
        q.eq('status', 'released').order('created_at', { ascending: false }).limit(1)
      )
      if (activeRes.data && activeRes.data.length > 0) {
        setCurrentVersion(activeRes.data[0] as AppVersion)
      }
    } catch (error) {
      handleApiError(error, 'VersionManagement-加载版本')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  // 搜索
  const handleSearch = () => {
    resetPage()
    loadVersions()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      platform: undefined,
      status: undefined,
    })
    resetPage()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingVersion(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: AppVersion) => {
    setEditingVersion(record)
    form.setFieldsValue({
      platform: record.platform,
      version: record.version,
      build_number: record.build_number,
      release_notes: record.release_notes,
      apk_url: record.apk_url,
      file_name: record.file_name,
      apk_size: record.apk_size,
      checksum: record.checksum,
      is_force_update: record.is_force_update,
      status: record.status,
    })
    setModalVisible(true)
  }

  // 删除版本
  const handleDelete = async (id: string) => {
    try {
      const result = await versionService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'VersionManagement-删除')
        return
      }
      message.success('删除成功')
      loadVersions()
    } catch (error) {
      handleApiError(error, 'VersionManagement-删除')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的版本')
      return
    }
    try {
      const { error } = await supabase
        .from('app_versions')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) {
        handleApiError(error, 'VersionManagement-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 个版本`)
      setSelectedRowKeys([])
      loadVersions()
    } catch (error) {
      handleApiError(error, 'VersionManagement-批量删除')
    }
  }

  // 回滚版本：将当前版本标记为 released，其他版本标记为 revoked
  const handleRollback = async (record: AppVersion) => {
    Modal.confirm({
      title: '确认回滚',
      content: `确定要将版本 ${record.version} (build ${record.build_number}) 回滚为当前发布版本吗？\n\n其他已发布版本将被标记为已下架。`,
      okText: '确认回滚',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 1. 将所有 released 版本标记为 revoked
          const { error: revokeError } = await supabase
            .from('app_versions')
            .update({
              status: 'revoked',
              revoked_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('status', 'released')

          if (revokeError) {
            handleApiError(revokeError, 'VersionManagement-回滚')
            return
          }

          // 2. 将目标版本标记为 released
          const { error: releaseError } = await supabase
            .from('app_versions')
            .update({
              status: 'released',
              released_at: new Date().toISOString(),
              revoked_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id)

          if (releaseError) {
            handleApiError(releaseError, 'VersionManagement-回滚')
            return
          }

          message.success(`版本 ${record.version} 已回滚为当前发布版本`)
          loadVersions()
        } catch (error) {
          handleApiError(error, 'VersionManagement-回滚')
        }
      },
    })
  }

  // 强制更新：切换 is_force_update 和 release_type
  const handleForceUpdate = async (record: AppVersion) => {
    const newForceUpdate = !record.is_force_update
    Modal.confirm({
      title: newForceUpdate ? '开启强制更新' : '关闭强制更新',
      content: newForceUpdate
        ? `确定要强制用户更新到版本 ${record.version} 吗？开启后所有用户必须更新才能继续使用。`
        : `确定要关闭版本 ${record.version} 的强制更新吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('app_versions')
            .update({
              is_force_update: newForceUpdate,
              release_type: newForceUpdate ? 'force' : 'feature',
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id)

          if (error) {
            handleApiError(error, 'VersionManagement-强制更新')
            return
          }

          message.success(
            newForceUpdate
              ? `版本 ${record.version} 已开启强制更新`
              : `版本 ${record.version} 已关闭强制更新`
          )
          loadVersions()
        } catch (error) {
          handleApiError(error, 'VersionManagement-强制更新')
        }
      },
    })
  }

  // 保存版本
  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      // 如果将版本设为 released，确保没有其他已发布的版本
      if (values.status === 'released') {
        const { data: existingReleased, error: checkError } = await supabase
          .from('app_versions')
          .select('id, version, build_number')
          .eq('status', 'released')
          .limit(1)

        if (checkError) {
          handleApiError(checkError, 'VersionManagement-检查已发布版本')
          return
        }

        const firstReleased = existingReleased?.[0]
        if (firstReleased && firstReleased.id !== editingVersion?.id) {
          message.warning(`已有已发布版本 v${firstReleased.version} (build ${firstReleased.build_number})，请先将其状态改为其他值，或使用回滚功能`)
          return
        }
      }

      if (editingVersion) {
        const result = await versionService.update(editingVersion.id, {
          ...values,
          updated_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'VersionManagement-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await versionService.create({
          ...values,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        if (!result.success) {
          handleApiError(result.errorMessage, 'VersionManagement-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingVersion(null)
      form.resetFields()
      loadVersions()
    } catch (error) {
      handleApiError(error, 'VersionManagement-保存')
    }
  }

  // 获取下载链接
  const getDownloadUrl = (record: AppVersion) => record.apk_url || ''

  // 表格列定义
  const columns: ColumnsType<AppVersion> = [
    {
      title: '应用名称',
      key: 'app_name',
      width: 200,
      render: (_, record) => (
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
        const statusMap: Record<string, { color: string; label: string }> = {
          released: { color: 'green', label: '已发布' },
          revoked: { color: 'orange', label: '已下架' },
          superseded: { color: 'default', label: '已失效' },
        }
        const info = statusMap[status] || { color: 'default', label: status }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (platform: string) => {
        const platformMap: Record<string, { color: string; label: string }> = {
          ios: { color: 'blue', label: 'iOS' },
          android: { color: 'green', label: 'Android' },
          web: { color: 'purple', label: 'Web' },
        }
        const info = platformMap[platform] || { color: 'default', label: platform }
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
            onClick: () => handleDelete(record.id),
          })
          return actions
        }

        // 编辑按钮：status 非 superseded 时展示（已失效版本不展示）
        actions.push({
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          type: 'primary',
          onClick: () => handleEdit(record),
        })

        // 回滚按钮：只在 status 为 revoked 时展示
        if (record.status === 'revoked') {
          actions.push({
            key: 'rollback',
            label: '回滚',
            icon: <RollbackOutlined />,
            onClick: () => handleRollback(record),
          })
        }

        // 强制更新/取消强制：仅对 released 版本显示
        if (record.status === 'released') {
          actions.push({
            key: 'forceUpdate',
            label: record.is_force_update ? '取消强制' : '强制更新',
            icon: <ThunderboltOutlined />,
            danger: !record.is_force_update,
            onClick: () => handleForceUpdate(record),
          })
        }

        // 复制下载地址
        actions.push({
          key: 'copyUrl',
          label: '复制地址',
          icon: <CopyOutlined />,
          onClick: () => {
            const url = getDownloadUrl(record)
            navigator.clipboard.writeText(url).then(() => {
              message.success('下载地址已复制')
            }).catch(() => {
              message.error('复制失败')
            })
          },
        })

        // 二维码
        actions.push({
          key: 'qrcode',
          label: '二维码',
          icon: <QrcodeOutlined />,
          onClick: () => setQrCodeVersion(record),
        })

        // 下载APK
        actions.push({
          key: 'download',
          label: '下载APK',
          icon: <DownloadOutlined />,
          onClick: () => {
            const url = getDownloadUrl(record)
            if (url) {
              window.open(url, '_blank')
            } else {
              message.warning('该版本没有下载地址')
            }
          },
        })

        actions.push({
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        })

        return actions
      },
      { width: 240 }
    ),
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 当前版本信息 */}
      {currentVersion && (
        <Card
          title="当前发布版本"
          style={{ marginBottom: 16 }}
          extra={
            <Tag color="green">已激活</Tag>
          }
        >
          <Row gutter={24} align="middle">
            <Col flex="none">
              <div
                style={{
                  width: 160,
                  height: 160,
                  background: '#fff',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #d9d9d9',
                }}
              >
                <QRCodeSVG
                  value={getDownloadUrl(currentVersion) || 'https://example.com'}
                  size={140}
                  level="M"
                />
              </div>
            </Col>
            <Col flex="auto">
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="版本号">
                  <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                    v{currentVersion.version}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="构建号">
                  {currentVersion.build_number}
                </Descriptions.Item>
                <Descriptions.Item label="平台">
                  <Tag>{currentVersion.platform}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="强制更新">
                  <Tag color={currentVersion.is_force_update ? 'red' : 'default'}>
                    {currentVersion.is_force_update ? '是' : '否'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="更新说明" span={2}>
                  {currentVersion.release_notes || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {dayjs(currentVersion.created_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="操作">
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      const url = getDownloadUrl(currentVersion)
                      if (url) window.open(url, '_blank')
                      else message.warning('该版本没有下载地址')
                    }}
                  >
                    下载APK
                  </Button>
                </Descriptions.Item>
              </Descriptions>
            </Col>
          </Row>
        </Card>
      )}

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索版本号/更新说明"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="平台"
            value={filters.platform}
            onChange={(value) => setFilters(prev => ({ ...prev, platform: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: 'iOS', value: 'ios' },
              { label: 'Android', value: 'android' },
              { label: 'Web', value: 'web' },
            ]}
          />
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '已发布', value: 'released' },
              { label: '已下架', value: 'revoked' },
              { label: '已失效', value: 'superseded' },
            ]}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      {/* 操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增版本
          </Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title="确认批量删除"
              description={`确定要删除选中的 ${selectedRowKeys.length} 个版本吗？`}
              onConfirm={handleBatchDelete}
              okText="确认"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadVersions} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 版本表格 */}
      <Table
        columns={columns}
        dataSource={versions}
        rowKey="id"
        loading={loading}
        pagination={tablePagination}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 'max-content' }}
      />

      {/* 版本表单弹窗 */}
      <Modal
        title={editingVersion ? '编辑版本' : '新增版本'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingVersion(null)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="platform"
            label="平台"
            rules={[{ required: true, message: '请选择平台' }]}
          >
            <Select
              placeholder="请选择平台"
              options={[
                { label: 'iOS', value: 'ios' },
                { label: 'Android', value: 'android' },
                { label: 'Web', value: 'web' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="version"
            label="版本号"
            rules={[{ required: true, message: '请输入版本号' }]}
          >
            <Input placeholder="如: 1.0.0" />
          </Form.Item>
          <Form.Item
            name="build_number"
            label="构建号"
            rules={[{ required: true, message: '请输入构建号' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="请输入构建号" min={0} />
          </Form.Item>
          <Form.Item
            name="release_notes"
            label="更新说明"
          >
            <Input.TextArea rows={4} placeholder="请输入更新说明" />
          </Form.Item>
          <Form.Item
            name="apk_url"
            label="APK下载地址"
          >
            <Input placeholder="请输入APK下载地址" />
          </Form.Item>
          <Form.Item
            name="file_name"
            label="文件名"
          >
            <Input placeholder="请输入文件名" />
          </Form.Item>
          <Form.Item
            name="apk_size"
            label="文件大小(字节)"
          >
            <InputNumber style={{ width: '100%' }} placeholder="请输入文件大小(字节)" min={0} />
          </Form.Item>
          <Form.Item
            name="checksum"
            label="校验值"
          >
            <Input placeholder="请输入校验值" />
          </Form.Item>
          <Form.Item
            name="is_force_update"
            label="强制更新"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

        </Form>
      </Modal>

      {/* 二维码弹窗 */}
      <Modal
        title="下载二维码"
        open={!!qrCodeVersion}
        onCancel={() => setQrCodeVersion(null)}
        footer={null}
        width={400}
        centered
      >
        {qrCodeVersion && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: 200,
                height: 200,
                margin: '0 auto 16px',
                background: '#fff',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #d9d9d9',
              }}
            >
              <QRCodeSVG
                value={getDownloadUrl(qrCodeVersion) || 'https://example.com'}
                size={180}
                level="M"
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text strong>v{qrCodeVersion.version}+{qrCodeVersion.build_number}</Text>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary">
                {getDownloadUrl(qrCodeVersion) || '暂无下载地址'}
              </Text>
            </div>
            {getDownloadUrl(qrCodeVersion) && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => {
                  window.open(getDownloadUrl(qrCodeVersion), '_blank')
                }}
              >
                下载APK
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default VersionManagement
