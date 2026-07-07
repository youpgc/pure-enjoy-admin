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
  Popconfirm,
  InputNumber,
  Switch,
  Typography,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'
import { useMounted } from '../hooks/useMounted'

const { Text } = Typography

// ==================== 类型定义 ====================

interface DictType {
  id: string
  code: string
  name: string
  description: string
  sort_order: number
  is_system: boolean
  status: string
  is_active: boolean
  type_code: string | null
  type_name: string | null
  created_at: string
  updated_at: string
}

interface DictItem {
  id: string
  type_id: string
  code: string
  label: string
  value: string
  extra: Record<string, any>
  sort_order: number
  is_default: boolean
  status: string
  is_active: boolean
  extra_data: Record<string, any> | null
  created_at: string
  updated_at: string
}

// ==================== 组件 ====================

const DictManagement: React.FC = () => {
  const mountedRef = useMounted()
  // 字典类型状态
  const [dictTypes, setDictTypes] = useState<DictType[]>([])
  const [typeLoading, setTypeLoading] = useState(false)
  const [typeSearchKeyword, setTypeSearchKeyword] = useState('')
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const { pagination: typePagination, resetPage: resetTypePage, setTotal: setTypeTotal, tablePagination: typeTablePagination } = usePagination()

  // 字典类型弹窗状态
  const [typeModalVisible, setTypeModalVisible] = useState(false)
  const [editingType, setEditingType] = useState<DictType | null>(null)
  const [typeForm] = Form.useForm()
  const [savingType, setSavingType] = useState(false)

  // 字典项状态
  const [dictItems, setDictItems] = useState<DictItem[]>([])
  const [itemLoading, setItemLoading] = useState(false)
  const [itemSearchKeyword, setItemSearchKeyword] = useState('')
  const { pagination: itemPagination, resetPage: resetItemPage, setTotal: setItemTotal, tablePagination: itemTablePagination } = usePagination()

  // 字典项弹窗状态
  const [itemModalVisible, setItemModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<DictItem | null>(null)
  const [itemForm] = Form.useForm()
  const [savingItem, setSavingItem] = useState(false)

  // 使用 useMemo 缓存 Service 实例，避免每次渲染重新创建导致 useEffect 无限循环
  const typeService = React.useMemo(
    () => new BaseService<DictType>('dict_types', {
      defaultOrder: { column: 'sort_order', ascending: true },
    }),
    []
  )
  const itemService = React.useMemo(
    () => new BaseService<DictItem>('dict_items', {
      defaultOrder: { column: 'sort_order', ascending: true },
    }),
    []
  )

  // ==================== 字典类型操作 ====================

  const loadDictTypes = useCallback(async () => {
    setTypeLoading(true)
    try {
      const result = await typeService.paginate(typePagination.current, typePagination.pageSize, (q) => {
        if (typeSearchKeyword) {
          return q.or(`code.ilike.%${typeSearchKeyword}%,name.ilike.%${typeSearchKeyword}%`)
        }
        return q
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'DictManagement-加载字典类型')
        return
      }
      const types = result.data?.data || []
      if (!mountedRef.current) return
      setDictTypes(types)
      setTypeTotal(result.data?.total || 0)
      // 如果没有选中类型，默认选中第一个
      if (!selectedTypeId && types.length > 0 && types[0]) {
        setSelectedTypeId(types[0].id)
      }
      // 如果选中的类型已被删除，切换到第一个
      if (selectedTypeId && types.length > 0 && !types.find(t => t.id === selectedTypeId) && types[0]) {
        setSelectedTypeId(types[0].id)
      }
      // 如果所有类型都被删除
      if (types.length === 0) {
        setSelectedTypeId(null)
      }
    } catch (error) {
      handleApiError(error, 'DictManagement-加载字典类型')
    } finally {
      setTypeLoading(false)
    }
  }, [typeSearchKeyword, selectedTypeId, typePagination.current, typePagination.pageSize, typeService, setTypeTotal])

  // 加载字典项
  const loadDictItems = useCallback(async () => {
    if (!selectedTypeId) {
      setDictItems([])
      return
    }
    setItemLoading(true)
    try {
      const result = await itemService.paginate(itemPagination.current, itemPagination.pageSize, (q) => {
        let filtered = q.eq('type_id', selectedTypeId)
        if (itemSearchKeyword) {
          filtered = filtered.or(`code.ilike.%${itemSearchKeyword}%,label.ilike.%${itemSearchKeyword}%`)
        }
        return filtered
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'DictManagement-加载字典项')
        return
      }
      if (!mountedRef.current) return
      setDictItems(result.data?.data || [])
      setItemTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'DictManagement-加载字典项')
    } finally {
      setItemLoading(false)
    }
  }, [selectedTypeId, itemSearchKeyword, itemPagination.current, itemPagination.pageSize, itemService, setItemTotal])

  useEffect(() => {
    loadDictTypes()
  }, [loadDictTypes])

  useEffect(() => {
    loadDictItems()
  }, [loadDictItems])

  // 类型搜索
  const handleTypeSearch = () => {
    resetTypePage()
    loadDictTypes()
  }

  // 字典项搜索
  const handleItemSearch = () => {
    resetItemPage()
    loadDictItems()
  }

  // 选中类型行
  const handleSelectType = (record: DictType) => {
    setSelectedTypeId(record.id)
    setItemSearchKeyword('')
    resetItemPage()
  }

  // 打开新增类型弹窗
  const handleAddType = () => {
    setEditingType(null)
    typeForm.resetFields()
    typeForm.setFieldsValue({ sort_order: 0, is_active: true })
    setTypeModalVisible(true)
  }

  // 打开编辑类型弹窗
  const handleEditType = (record: DictType) => {
    setEditingType(record)
    typeForm.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description,
      sort_order: record.sort_order,
      is_active: record.is_active,
    })
    setTypeModalVisible(true)
  }

  // 删除类型
  const handleDeleteType = async (id: string) => {
    try {
      const result = await typeService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'DictManagement-删除字典类型')
        return
      }
      message.success('删除成功')
      loadDictTypes()
    } catch (error) {
      handleApiError(error, 'DictManagement-删除字典类型')
    }
  }

  // 保存类型
  const handleSaveType = async () => {
    if (savingType) return
    try {
      setSavingType(true)
      const values = await typeForm.validateFields()
      if (editingType) {
        const result = await typeService.update(editingType.id, {
          ...values,
          updated_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'DictManagement-更新字典类型')
          return
        }
        message.success('更新成功')
      } else {
        const result = await typeService.create({
          ...values,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'DictManagement-创建字典类型')
          return
        }
        message.success('创建成功')
      }
      setTypeModalVisible(false)
      setEditingType(null)
      typeForm.resetFields()
      loadDictTypes()
    } catch (error) {
      handleApiError(error, 'DictManagement-保存字典类型')
    } finally {
      setSavingType(false)
    }
  }

  // ==================== 字典项操作 ====================

  // 打开新增字典项弹窗
  const handleAddItem = () => {
    if (!selectedTypeId) {
      message.warning('请先选择一个字典类型')
      return
    }
    setEditingItem(null)
    itemForm.resetFields()
    itemForm.setFieldsValue({
      type_id: selectedTypeId,
      sort_order: 0,
      is_default: false,
      is_active: true,
    })
    setItemModalVisible(true)
  }

  // 打开编辑字典项弹窗
  const handleEditItem = (record: DictItem) => {
    setEditingItem(record)
    itemForm.setFieldsValue({
      code: record.code,
      label: record.label,
      value: record.value,
      sort_order: record.sort_order,
      is_default: record.is_default,
      is_active: record.is_active,
    })
    setItemModalVisible(true)
  }

  // 删除字典项
  const handleDeleteItem = async (id: string) => {
    try {
      const result = await itemService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'DictManagement-删除字典项')
        return
      }
      message.success('删除成功')
      loadDictItems()
    } catch (error) {
      handleApiError(error, 'DictManagement-删除字典项')
    }
  }

  // 保存字典项
  const handleSaveItem = async () => {
    if (savingItem) return
    try {
      setSavingItem(true)
      const values = await itemForm.validateFields()
      if (editingItem) {
        const result = await itemService.update(editingItem.id, {
          ...values,
          updated_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'DictManagement-更新字典项')
          return
        }
        message.success('更新成功')
      } else {
        const result = await itemService.create({
          ...values,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'DictManagement-创建字典项')
          return
        }
        message.success('创建成功')
      }
      setItemModalVisible(false)
      setEditingItem(null)
      itemForm.resetFields()
      resetItemPage()
      loadDictItems()
    } catch (error) {
      handleApiError(error, 'DictManagement-保存字典项')
    } finally {
      setSavingItem(false)
    }
  }

  // ==================== 表格列定义 ====================

  const selectedTypeName = dictTypes.find(t => t.id === selectedTypeId)?.name

  const typeColumns: ColumnsType<DictType> = [
    {
      title: '类型编码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: '类型名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => handleEditType(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除类型后，该类型下的所有字典项也将无法使用"
            onConfirm={() => handleDeleteType(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const itemColumns: ColumnsType<DictItem> = [
    {
      title: '编码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: '标签',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
    {
      title: '默认',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 80,
      render: (isDefault: boolean) => (
        <Tag color={isDefault ? 'blue' : 'default'}>{isDefault ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => handleEditItem(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            onConfirm={() => handleDeleteItem(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ==================== 渲染 ====================

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
              value={typeSearchKeyword}
              onChange={(e) => setTypeSearchKeyword(e.target.value)}
              onPressEnter={handleTypeSearch}
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              allowClear
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleTypeSearch}>
              搜索
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadDictTypes} loading={typeLoading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddType}>
              新增类型
            </Button>
          </Space>
        </div>

        {/* 类型表格 */}
        <Table
          columns={typeColumns}
          dataSource={dictTypes}
          rowKey="id"
          loading={typeLoading}
          size="middle"
          pagination={typeTablePagination}
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onClick: () => handleSelectType(record),
            style: {
              cursor: 'pointer',
              background: record.id === selectedTypeId ? '#e6f7ff' : undefined,
            },
          })}
        />
      </Card>

      {/* ==================== 字典项区域 ==================== */}
      <Card
        title={
          <Space>
            <UnorderedListOutlined />
            <span>字典项{selectedTypeName ? ` - ${selectedTypeName}` : ''}</span>
          </Space>
        }
      >
        {/* 字典项筛选栏 */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="搜索字典项编码/标签"
              value={itemSearchKeyword}
              onChange={(e) => setItemSearchKeyword(e.target.value)}
              onPressEnter={handleItemSearch}
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              allowClear
              disabled={!selectedTypeId}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleItemSearch}
              disabled={!selectedTypeId}
            >
              搜索
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadDictItems}
              loading={itemLoading}
              disabled={!selectedTypeId}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddItem}
              disabled={!selectedTypeId}
            >
              新增字典项
            </Button>
          </Space>
        </div>

        {/* 字典项表格 */}
        <Table
          columns={itemColumns}
          dataSource={dictItems}
          rowKey="id"
          loading={itemLoading}
          pagination={itemTablePagination}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: selectedTypeId
              ? '暂无字典项数据'
              : '请先在上方选择一个字典类型',
          }}
        />
      </Card>

      {/* ==================== 字典类型表单弹窗 ==================== */}
      <Modal
        title={editingType ? '编辑字典类型' : '新增字典类型'}
        open={typeModalVisible}
        onOk={handleSaveType}
        confirmLoading={savingType}
        onCancel={() => {
          setTypeModalVisible(false)
          setEditingType(null)
          typeForm.resetFields()
        }}
        width={500}
      >
        <Form form={typeForm} layout="vertical">
          <Form.Item
            name="code"
            label="类型编码"
            rules={[{ required: true, message: '请输入类型编码' }]}
          >
            <Input placeholder="请输入类型编码" disabled={!!editingType} />
          </Form.Item>
          <Form.Item
            name="name"
            label="类型名称"
            rules={[{ required: true, message: '请输入类型名称' }]}
          >
            <Input placeholder="请输入类型名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item
            name="sort_order"
            label="排序"
          >
            <InputNumber style={{ width: '100%' }} placeholder="请输入排序" min={0} />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ==================== 字典项表单弹窗 ==================== */}
      <Modal
        title={editingItem ? '编辑字典项' : '新增字典项'}
        open={itemModalVisible}
        onOk={handleSaveItem}
        confirmLoading={savingItem}
        onCancel={() => {
          setItemModalVisible(false)
          setEditingItem(null)
          itemForm.resetFields()
        }}
        width={500}
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item
            name="type_id"
            label="所属类型"
            hidden
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="code"
            label="编码"
            rules={[{ required: true, message: '请输入编码' }]}
          >
            <Input placeholder="请输入编码" disabled={!!editingItem} />
          </Form.Item>
          <Form.Item
            name="label"
            label="标签"
            rules={[{ required: true, message: '请输入标签' }]}
          >
            <Input placeholder="请输入标签" />
          </Form.Item>
          <Form.Item
            name="value"
            label="值"
          >
            <Input placeholder="请输入值" />
          </Form.Item>
          <Form.Item
            name="sort_order"
            label="排序"
          >
            <InputNumber style={{ width: '100%' }} placeholder="请输入排序" min={0} />
          </Form.Item>
          <Form.Item
            name="is_default"
            label="是否默认"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DictManagement
