import React from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Card,
  message,
  Popconfirm,
  Row,
  Col,
  Select,
  Typography,
  Descriptions,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { QRCodeSVG } from 'qrcode.react'
import dayjs from 'dayjs'
import { VERSION_STATUS_OPTIONS, VERSION_PLATFORM_OPTIONS } from '../constants'
import { useVersions } from './versions/useVersions'
import { buildVersionColumns } from './versions/columns'
import { VersionFormModal } from './versions/VersionFormModal'
import { VersionQrModal } from './versions/VersionQrModal'
import type { AppVersion } from './versions/types'

const { Text } = Typography

// ==================== 主组件 ====================
const VersionManagement: React.FC = () => {
  const v = useVersions()
  const currentVersion = v.currentVersion

  // 复制/下载地址处理器
  const handleCopyUrl = (record: AppVersion) => {
    const url = v.getDownloadUrl(record)
    navigator.clipboard.writeText(url).then(() => {
      message.success('下载地址已复制')
    }).catch(() => {
      message.error('复制失败')
    })
  }
  const handleDownload = (record: AppVersion) => {
    const url = v.getDownloadUrl(record)
    if (url) {
      window.open(url, '_blank')
    } else {
      message.warning('该版本没有下载地址')
    }
  }

  // 表格列定义
  const columns = buildVersionColumns({
    onEdit: v.handleEdit,
    onDelete: v.handleDelete,
    onRollback: v.handleRollback,
    onForceUpdate: v.handleForceUpdate,
    onCopyUrl: handleCopyUrl,
    onDownload: handleDownload,
    onShowQr: (record) => v.setQrCodeVersion(record),
  })

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
                  value={v.getDownloadUrl(currentVersion) || 'https://example.com'}
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
                      const url = v.getDownloadUrl(currentVersion)
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
            value={v.filters.keyword}
            onChange={(e) => v.setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={v.handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="平台"
            value={v.filters.platform}
            onChange={(value) => v.setFilters(prev => ({ ...prev, platform: value }))}
            style={{ width: 120 }}
            allowClear
            options={VERSION_PLATFORM_OPTIONS}
          />
          <Select
            placeholder="状态"
            value={v.filters.status}
            onChange={(value) => v.setFilters(prev => ({ ...prev, status: value }))}
            style={{ width: 120 }}
            allowClear
            options={VERSION_STATUS_OPTIONS}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={v.handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={v.handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      {/* 操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={v.handleAdd}>
            新增版本
          </Button>
          {v.selectedRowKeys.length > 0 && (
            <Popconfirm
              title="确认批量删除"
              description={`确定要删除选中的 ${v.selectedRowKeys.length} 个版本吗？`}
              onConfirm={v.handleBatchDelete}
              okText="确认"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({v.selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
        <Button icon={<ReloadOutlined />} onClick={v.loadVersions} loading={v.loading}>
          刷新
        </Button>
      </div>

      {/* 版本表格 */}
      <Table
        columns={columns}
        dataSource={v.versions}
        rowKey="id"
        loading={v.loading}
        pagination={v.tablePagination}
        rowSelection={{
          selectedRowKeys: v.selectedRowKeys,
          onChange: v.setSelectedRowKeys,
        }}
        scroll={{ x: 'max-content' }}
      />

      {/* 版本表单弹窗 */}
      <VersionFormModal
        open={v.modalVisible}
        editingVersion={v.editingVersion}
        saving={v.saving}
        form={v.form}
        onOk={v.handleSave}
        onCancel={() => {
          v.setModalVisible(false)
          v.setEditingVersion(null)
          v.form.resetFields()
        }}
      />

      {/* 二维码弹窗 */}
      <VersionQrModal
        version={v.qrCodeVersion}
        onClose={() => v.setQrCodeVersion(null)}
      />
    </div>
  )
}

export default VersionManagement
