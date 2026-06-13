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
  Badge,
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
} from '@ant-design/icons'
import { QRCodeSVG } from 'qrcode.react'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { getActionColumn } from '../components/ActionColumn'
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
  download_url?: string
  file_size?: number
  checksum?: string
  file_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface VersionFilters {
  keyword: string
  platform: string | undefined
  isActive: boolean | undefined
}

// ==================== 组件 ====================

const VersionManagement: React.FC = () => {
  const [versions, setVersions] = useState<AppVersion[]>([])
  const [loading, setLoading] = useState(false)
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [filters, setFilters] = useState<VersionFilters>({
    keyword: '',
    platform: undefined,
    isActive: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingVersion, setEditingVersion] = useState<AppVersion | null>(null)
  const [form] = Form.useForm()
  const [currentVersion, setCurrentVersion] = useState<AppVersion | null>(null)
  const [qrCodeVersion, setQrCodeVersion] = useState<AppVersion | null>(null)
  const { isAdmin: _isAdmin } = usePermission()

  const versionService = new BaseService<AppVersion>('app_versions', { defaultOrder: { column: 'created_at', ascending: false } })

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
        if (filters.isActive !== undefined) {
          query = query.eq('is_active', filters.isActive)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'VersionManagement-加载版本')
        return
      }

      setVersions(result.data?.data || [])
      setTotal(result.data?.total || 0)

      // 获取当前激活版本（is_active=true 的最新版本）
      const activeRes = await versionService.findAll((q: any) =>
        q.eq('is_active', true).order('created_at', { ascending: false }).limit(1)
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
      isActive: undefined,
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
      ...record,
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

  // 保存版本
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
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

  // 获取下载链接（映射）
  const getDownloadUrl = (record: AppVersion) => record.download_url || record.apk_url || ''

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
      title: '强制更新',
      dataIndex: 'is_force_update',
      key: 'is_force_update',
      width: 100,
      render: (force: boolean) => (
        <Tag color={force ? 'red' : 'default'}>{force ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '激活',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Badge status={isActive ? 'success' : 'default'} text={isActive ? '是' : '否'} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    getActionColumn<AppVersion>(
      (record) => [
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          type: 'primary',
          onClick: () => handleEdit(record),
        },
        {
          key: 'qrcode',
          label: '二维码',
          icon: <QrcodeOutlined />,
          onClick: () => setQrCodeVersion(record),
        },
        {
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
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        },
      ],
      { width: 280, maxVisible: 3 }
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
                  {dayjs(currentVersion.created_at).format('YYYY-MM-DD HH:mm')}
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
            value={filters.isActive}
            onChange={(value) => setFilters(prev => ({ ...prev, isActive: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '激活', value: true },
              { label: '停用', value: false },
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
            name="download_url"
            label="下载地址"
          >
            <Input placeholder="请输入下载地址" />
          </Form.Item>
          <Form.Item
            name="file_name"
            label="文件名"
          >
            <Input placeholder="请输入文件名" />
          </Form.Item>
          <Form.Item
            name="file_size"
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
          <Form.Item
            name="is_active"
            label="激活状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="激活" unCheckedChildren="停用" />
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
