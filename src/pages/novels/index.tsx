import React from 'react'
import { Table, Button, Input, Select, Modal, Form, Space, Card, Popconfirm } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { usePermission } from '../../hooks/usePermission'
import NovelChapterModal from '../../components/NovelChapterModal'
import {
  NOVEL_CATEGORY_OPTIONS,
  NOVEL_STATUS_OPTIONS,
  NOVEL_SOURCE_OPTIONS,
} from '../../constants'
import { buildNovelColumns } from './columns'
import { useNovels } from './useNovels'

const Novels: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('novels:write')
  const canDelete = hasPermission('novels:delete')

  const {
    novels,
    loading,
    tablePagination,
    filters,
    setFilters,
    selectedRowKeys,
    setSelectedRowKeys,
    modalVisible,
    editingNovel,
    form,
    chapterModalOpen,
    selectedNovelId,
    loadNovels,
    handleSearch,
    handleReset,
    handleAdd,
    handleEdit,
    handleDelete,
    handleBatchDelete,
    handleModalSubmit,
    handleManageChapters,
    closeModal,
    closeChapterModal,
  } = useNovels()

  const columns = buildNovelColumns({
    canWrite,
    canDelete,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onManageChapters: handleManageChapters,
  })

  return (
    <div style={{ padding: 24 }}>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索书名/作者"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="分类"
            value={filters.category}
            onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            style={{ width: 120 }}
            allowClear
            options={NOVEL_CATEGORY_OPTIONS}
          />
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            style={{ width: 120 }}
            allowClear
            options={NOVEL_STATUS_OPTIONS}
          />
          <Select
            placeholder="聚合来源"
            value={filters.source}
            onChange={(value) => setFilters(prev => ({ ...prev, source: value }))}
            style={{ width: 120 }}
            allowClear
            options={NOVEL_SOURCE_OPTIONS}
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
          <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite} onClick={handleAdd}>
            新增小说
          </Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title="确认批量删除"
              description={`确定要删除选中的 ${selectedRowKeys.length} 本小说吗？`}
              onConfirm={handleBatchDelete}
              okText="确认"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />} disabled={!canDelete}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadNovels} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 小说表格 */}
      <Table
        columns={columns}
        dataSource={novels}
        rowKey="id"
        loading={loading}
        pagination={tablePagination}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 'max-content' }}
      />

      {/* 小说表单弹窗 */}
      <Modal
        title={editingNovel ? '编辑小说' : '新增小说'}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={closeModal}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="书名"
            rules={[{ required: true, message: '请输入书名' }]}
          >
            <Input placeholder="请输入书名" />
          </Form.Item>
          <Form.Item
            name="author"
            label="作者"
            rules={[{ required: true, message: '请输入作者' }]}
          >
            <Input placeholder="请输入作者" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select
              placeholder="请选择分类"
              options={NOVEL_CATEGORY_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="简介"
          >
            <Input.TextArea rows={4} placeholder="请输入简介" />
          </Form.Item>
          <Form.Item
            name="cover_url"
            label="封面URL"
          >
            <Input placeholder="请输入封面图片URL" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              placeholder="请选择状态"
              options={NOVEL_STATUS_OPTIONS}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 章节管理弹窗 */}
      <NovelChapterModal
        open={chapterModalOpen}
        novelId={selectedNovelId}
        onClose={closeChapterModal}
      />
    </div>
  )
}

export default Novels
