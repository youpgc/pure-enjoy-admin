import React from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  Modal,
  Form,
  Select,
  Popconfirm,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useNotifications } from './notifications/useNotifications'
import { NOTIFICATION_TYPE_OPTIONS } from '../constants'

const Notifications: React.FC = () => {
  const {
    notifications,
    loading,
    filters,
    setFilters,
    selectedRowKeys,
    setSelectedRowKeys,
    modalVisible,
    setModalVisible,
    editingNotification,
    setEditingNotification,
    form,
    saving,
    tablePagination,
    loadNotifications,
    handleSearch,
    handleReset,
    handleAdd,
    handleBatchDelete,
    handleSave,
    columns,
  } = useNotifications()

  return (
    <div style={{ padding: 24 }}>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder='搜索标题/内容'
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder='类型'
            value={filters.type}
            onChange={(value) => setFilters((prev) => ({ ...prev, type: value }))}
            style={{ width: 120 }}
            allowClear
            options={NOTIFICATION_TYPE_OPTIONS}
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
          <Button type='primary' icon={<PlusOutlined />} onClick={handleAdd}>
            新增通知
          </Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title='确认批量删除'
              description={`确定要删除选中的 ${selectedRowKeys.length} 条通知吗？`}
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
        <Button icon={<ReloadOutlined />} onClick={loadNotifications} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 通知表格 */}
      <Table
        columns={columns}
        dataSource={notifications}
        rowKey='id'
        loading={loading}
        pagination={tablePagination}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 'max-content' }}
      />

      {/* 通知表单弹窗 */}
      <Modal
        title={editingNotification ? '编辑通知' : '新增通知'}
        open={modalVisible}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => {
          setModalVisible(false)
          setEditingNotification(null)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='title' label='标题' rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder='请输入标题' />
          </Form.Item>
          <Form.Item name='body' label='内容' rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={4} placeholder='请输入内容' />
          </Form.Item>
          <Form.Item name='type' label='类型' rules={[{ required: true, message: '请选择类型' }]}>
            <Select placeholder='请选择类型' options={NOTIFICATION_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name='user_id' label='用户ID' tooltip='不填则为全局通知，发送给所有用户'>
            <Input placeholder='留空则为全局通知' allowClear />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Notifications
