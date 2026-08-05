import React from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  Modal,
  Upload,
  Popconfirm,
  Select,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  UploadOutlined,
  DeleteOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import { useFileManagement } from './fileManagement/useFileManagement'

const { Dragger } = Upload

const FileManagement: React.FC = () => {
  const {
    files,
    loading,
    filters,
    setFilters,
    selectedRowKeys,
    setSelectedRowKeys,
    uploadModalOpen,
    setUploadModalOpen,
    tablePagination,
    loadFiles,
    handleSearch,
    handleReset,
    handleBatchDelete,
    handleUpload,
    columns,
  } = useFileManagement()

  return (
    <div style={{ padding: 24 }}>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder='搜索文件名'
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder='存储桶'
            value={filters.bucket}
            onChange={(value) => setFilters((prev) => ({ ...prev, bucket: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: 'public', value: 'public' },
              { label: 'private', value: 'private' },
            ]}
          />
          <Button type='primary' icon={<SearchOutlined />} onClick={handleSearch}>
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
          <Button type='primary' icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>
            上传文件
          </Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title='确认批量删除'
              description={`确定要删除选中的 ${selectedRowKeys.length} 个文件吗？`}
              onConfirm={handleBatchDelete}
              okText='确认'
              cancelText='取消'
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadFiles} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 文件表格 */}
      <Table
        columns={columns}
        dataSource={files}
        rowKey='id'
        loading={loading}
        pagination={tablePagination}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 'max-content' }}
      />

      {/* 上传弹窗 */}
      <Modal
        title='上传文件'
        open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        footer={null}
        width={500}
      >
        <Dragger beforeUpload={handleUpload} showUploadList={false} multiple>
          <p className='ant-upload-drag-icon'>
            <InboxOutlined />
          </p>
          <p className='ant-upload-text'>点击或拖拽文件到此区域上传</p>
          <p className='ant-upload-hint'>支持单个或批量上传</p>
        </Dragger>
      </Modal>
    </div>
  )
}

export default FileManagement
