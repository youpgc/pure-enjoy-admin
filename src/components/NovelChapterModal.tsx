import React from 'react'
import { Modal, Table, Button, Input, InputNumber, Form } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useChapterManager } from './novelChapterModal/useChapterManager'

const NovelChapterModal: React.FC<{
  open: boolean
  novelId: string
  onClose: () => void
}> = ({ open, novelId, onClose }) => {
  const {
    chapters,
    loading,
    editModalOpen,
    editingChapter,
    form,
    saving,
    tablePagination,
    loadChapters,
    handleAdd,
    handleSave,
    closeEditModal,
    columns,
  } = useChapterManager({ open, novelId })

  return (
    <>
      <Modal title='章节管理' open={open} onCancel={onClose} footer={null} width={900}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Button type='primary' icon={<PlusOutlined />} onClick={handleAdd}>
            新增章节
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadChapters} loading={loading}>
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={chapters}
          rowKey='id'
          loading={loading}
          pagination={tablePagination}
          size='small'
        />
      </Modal>

      {/* 章节编辑弹窗 */}
      <Modal
        title={editingChapter ? '编辑章节' : '新增章节'}
        open={editModalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={closeEditModal}
        width={700}
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='chapter_num' label='章节号' rules={[{ required: true, message: '请输入章节号' }]}>
            <InputNumber style={{ width: '100%' }} placeholder='请输入章节号' min={1} />
          </Form.Item>
          <Form.Item name='title' label='标题' rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder='请输入标题' />
          </Form.Item>
          <Form.Item name='content' label='内容' rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={10} placeholder='请输入章节内容' />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default NovelChapterModal
