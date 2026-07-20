import React from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Card,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { useDictManagement } from './dict/useDictManagement'
import { buildTypeColumns, buildItemColumns } from './dict/columns'
import { DictTypeFormModal } from './dict/DictTypeFormModal'
import { DictItemFormModal } from './dict/DictItemFormModal'
import type { DictType, DictItem } from './dict/types'

// ==================== 主组件 ====================
const DictManagement: React.FC = () => {
  const d = useDictManagement()

  const typeColumns = buildTypeColumns({
    onEdit: d.handleEditType,
    onDelete: d.handleDeleteType,
  })
  const itemColumns = buildItemColumns({
    onEdit: d.handleEditItem,
    onDelete: d.handleDeleteItem,
  })

  return (
    <div style={{ padding: 24 }}>
      {/* ==================== 字典类型区域 ==================== */}
      <Card
        title={
          <Space>
            <AppstoreOutlined />
            <span>字典类型</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {/* 类型筛选栏 */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="搜索类型编码/名称"
              value={d.typeSearchKeyword}
              onChange={(e) => d.setTypeSearchKeyword(e.target.value)}
              onPressEnter={d.handleTypeSearch}
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              allowClear
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={d.handleTypeSearch}>
              搜索
            </Button>
            <Button icon={<ReloadOutlined />} onClick={d.loadDictTypes} loading={d.typeLoading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={d.handleAddType}>
              新增类型
            </Button>
          </Space>
        </div>

        {/* 类型表格 */}
        <Table<DictType>
          columns={typeColumns}
          dataSource={d.dictTypes}
          rowKey="id"
          loading={d.typeLoading}
          size="middle"
          pagination={d.typeTablePagination}
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onClick: () => d.handleSelectType(record),
            style: {
              cursor: 'pointer',
              background: record.id === d.selectedTypeId ? '#e6f7ff' : undefined,
            },
          })}
        />
      </Card>

      {/* ==================== 字典项区域 ==================== */}
      <Card
        title={
          <Space>
            <UnorderedListOutlined />
            <span>字典项{d.selectedTypeName ? ` - ${d.selectedTypeName}` : ''}</span>
          </Space>
        }
      >
        {/* 字典项筛选栏 */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="搜索字典项编码/标签"
              value={d.itemSearchKeyword}
              onChange={(e) => d.setItemSearchKeyword(e.target.value)}
              onPressEnter={d.handleItemSearch}
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              allowClear
              disabled={!d.selectedTypeId}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={d.handleItemSearch}
              disabled={!d.selectedTypeId}
            >
              搜索
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={d.loadDictItems}
              loading={d.itemLoading}
              disabled={!d.selectedTypeId}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={d.handleAddItem}
              disabled={!d.selectedTypeId}
            >
              新增字典项
            </Button>
          </Space>
        </div>

        {/* 字典项表格 */}
        <Table<DictItem>
          columns={itemColumns}
          dataSource={d.dictItems}
          rowKey="id"
          loading={d.itemLoading}
          pagination={d.itemTablePagination}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: d.selectedTypeId
              ? '暂无字典项数据'
              : '请先在上方选择一个字典类型',
          }}
        />
      </Card>

      {/* ==================== 字典类型表单弹窗 ==================== */}
      <DictTypeFormModal
        open={d.typeModalVisible}
        editingType={d.editingType}
        saving={d.savingType}
        form={d.typeForm}
        onOk={d.handleSaveType}
        onCancel={() => {
          d.setTypeModalVisible(false)
          d.setEditingType(null)
          d.typeForm.resetFields()
        }}
      />

      {/* ==================== 字典项表单弹窗 ==================== */}
      <DictItemFormModal
        open={d.itemModalVisible}
        editingItem={d.editingItem}
        saving={d.savingItem}
        form={d.itemForm}
        onOk={d.handleSaveItem}
        onCancel={() => {
          d.setItemModalVisible(false)
          d.setEditingItem(null)
          d.itemForm.resetFields()
        }}
      />
    </div>
  )
}

export default DictManagement
