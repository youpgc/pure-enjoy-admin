import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Card,
  message,
  Modal,
  Form,
  Select,
  Popconfirm,
  Tooltip,
  Badge,
  Typography,
  Row,
  Col,
  Statistic,
  Switch,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { getActionColumn } from '../components/ActionColumn'
import { BaseService, apiQuery, handleApiError } from '../utils/apiClient'

const { Text } = Typography

// ==================== 枚举映射 ====================

const VERSION_STATUS_MAP: Record<string, string> = {
  released: '已发布',
  revoked: '已撤回',
  draft: '草稿',
}

const VERSION_STATUS_OPTIONS = Object.entries(VERSION_STATUS_MAP).map(([code, label]) => ({ label, value: code }))

const RELEASE_TYPE_MAP: Record<string, string> = {
  feature: '功能更新',
  hotfix: '热修复',
  release: '正式发布',
}

const RELEASE_TYPE_OPTIONS = Object.entries(RELEASE_TYPE_MAP).map(([code, label]) => ({ label, value: code }))

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
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<VersionFilters>({
    keyword: '',
    platform: undefined,
    isActive: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingVersion, setEditingVersion] = useState<AppVersion | null>(null)
  const [form] = Form.useForm()
  const { isAdmin } = usePermission()

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
      setPagination(prev => ({ ...prev, total: result.data?.total || 0 }))
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
    setPagination(prev => ({ ...prev, current: 1 }))
    loadVersions()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      platform: undefined,
      isActive: undefined,
    })
    setPagination(prev => ({ ...prev, current: 1 }))
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

  // 切换激活状态
  const handleToggleActive = async (record: AppVersion) => {
    try {
      const result = await versionService.update(record.id, {
        is_active: !record.is_active,
        updated_at: new Date().toISOString(),
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'VersionManagement-切换状态')
        return
      }
      message.success(`版本已${!record.is_active ? '激活' : '停用'}`)
      loadVersions()
    } catch (error) {
      handleApiError(error, 'VersionManagement-切换状态')
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

  // 表格列定义
  const columns: ColumnsType<AppVersion> = [
    {
      title: '版本信息',
      key: 'version_info',
      width: 250,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>版本: {record.version} (Build {record.build_number})</div>
          {record.release_type && <Text type="secondary" style={{ fontSize: 12 }}>类型: {RELEASE_TYPE_MAP[record.release_type] || record.release_type}</Text>}
          {record.file_name && <div><Text type="secondary" style={{ fontSize: 12 }}>{record.file_name}</Text></div>}
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
      title: '强制更新',
      dataIndex: 'is_force_update',
      key: 'is_force_update',
      width: 100,
      render: (force: boolean) => (
        <Tag color={force ? 'red' : 'default'}>{force ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusColorMap: Record<string, string> = {
          released: 'green',
          revoked: 'red',
          draft: 'default',
        }
        const color = statusColorMap[status] || 'default'
        const label = VERSION_STATUS_MAP[status] || status || '未知'
        return <Tag color={color}>{label}</Tag>
      },
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
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size: number) => size ? `${(size / 1024 / 1024).toFixed(2)} MB` : '-',
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
          key: 'toggle',
          label: record.is_active ? '停用' : '激活',
          icon: record.is_active ? <CloseCircleOutlined /> : <CheckCircleOutlined />,
          onClick: () => handleToggleActive(record),
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        },
      ],
      { width: 240, maxVisible: 3 }
    ),
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总版本数"
              value={pagination.total}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="激活版本"
              value={versions.filter(v => v.is_active).length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="强制更新"
              value={versions.filter(v => v.is_force_update).length}
              prefix={<CloudUploadOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

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
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 20 }))
          },
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 1000 }}
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
            <Input type="number" placeholder="请输入构建号" />
          </Form.Item>
          <Form.Item
            name="release_type"
            label="发布类型"
          >
            <Select
              placeholder="请选择发布类型"
              allowClear
              options={RELEASE_TYPE_OPTIONS}
            />
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
            <Input type="number" placeholder="请输入文件大小(字节)" />
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
    </div>
  )
}

export default VersionManagement
