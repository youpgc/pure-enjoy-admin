import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Input, Select, Switch, Space, message, Tabs, Badge, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { supabase, logOperation } from '../utils/supabase'
import { getActionColumn } from '../components/ActionColumn'

const { TabPane } = Tabs
const { Option } = Select
const { TextArea } = Input

// 字典类型接口
interface DictType {
  id: string
  code: string
  name: string
  description?: string
  sort_order: number
  is_system: boolean
  status: string
  created_at: string
}

// 字典项接口
interface DictItem {
  id: string
  type_id: string
  code: string
  label: string
  value?: string
  extra_data?: Record<string, any>
  sort_order: number
  is_default: boolean
  status: string
  created_at: string
}

const DictManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('types')
  const [types, setTypes] = useState<DictType[]>([])
  const [items, setItems] = useState<DictItem[]>([])
  const [loading, setLoading] = useState(false)
  const [typeModalVisible, setTypeModalVisible] = useState(false)
  const [itemModalVisible, setItemModalVisible] = useState(false)
  const [editingType, setEditingType] = useState<DictType | null>(null)
  const [editingItem, setEditingItem] = useState<DictItem | null>(null)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [itemForm] = Form.useForm()

  // 加载字典类型
  const loadTypes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('dict_types')
        .select('*')
        .order('sort_order', { ascending: true })
      
      if (error) throw error
      setTypes(data || [])
    } catch (error: any) {
      message.error('加载字典类型失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 加载字典项
  const loadItems = async (typeId?: string) => {
    setLoading(true)
    try {
      let query = supabase
        .from('dict_items')
        .select('*, dict_types!inner(code, name)')
        .order('sort_order', { ascending: true })
      
      if (typeId) {
        query = query.eq('type_id', typeId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setItems(data || [])
    } catch (error: any) {
      message.error('加载字典项失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTypes()
    loadItems()
  }, [])

  // 打开类型编辑弹窗
  const openTypeModal = (type?: DictType) => {
    setEditingType(type || null)
    if (type) {
      form.setFieldsValue(type)
    } else {
      form.resetFields()
      form.setFieldsValue({ status: 'active', sort_order: 0, is_system: false })
    }
    setTypeModalVisible(true)
  }

  // 打开字典项编辑弹窗
  const openItemModal = (item?: DictItem) => {
    setEditingItem(item || null)
    if (item) {
      itemForm.setFieldsValue({
        ...item,
        extra: item.extra_data ? JSON.stringify(item.extra_data, null, 2) : ''
      })
    } else {
      itemForm.resetFields()
      itemForm.setFieldsValue({ 
        status: 'active', 
        sort_order: 0, 
        is_default: false,
        type_id: selectedTypeId 
      })
    }
    setItemModalVisible(true)
  }

  // 保存字典类型
  const saveType = async (values: any) => {
    try {
      if (editingType) {
        const { error } = await supabase
          .from('dict_types')
          .update(values)
          .eq('id', editingType.id)
        
        if (error) throw error
        message.success('更新字典类型成功')
        logOperation({ action: 'update', module: 'dict_types', detail: `更新字典类型: ${values.name}` })
      } else {
        const { error } = await supabase
          .from('dict_types')
          .insert(values)
        
        if (error) throw error
        message.success('创建字典类型成功')
        logOperation({ action: 'create', module: 'dict_types', detail: `创建字典类型: ${values.name}` })
      }
      
      setTypeModalVisible(false)
      loadTypes()
    } catch (error: any) {
      message.error('保存失败: ' + error.message)
    }
  }

  // 保存字典项
  const saveItem = async (values: any) => {
    try {
      const data: any = { ...values }
      
      // 解析 extra_data JSON
      if (data.extra) {
        try {
          data.extra_data = JSON.parse(data.extra)
          delete data.extra
        } catch {
          message.error('扩展字段 JSON 格式错误')
          return
        }
      }

      if (editingItem) {
        const { error } = await supabase
          .from('dict_items')
          .update(data)
          .eq('id', editingItem.id)
        
        if (error) throw error
        message.success('更新字典项成功')
        logOperation({ action: 'update', module: 'dict_items', detail: `更新字典项: ${data.label}` })
      } else {
        const { error } = await supabase
          .from('dict_items')
          .insert(data)
        
        if (error) throw error
        message.success('创建字典项成功')
        logOperation({ action: 'create', module: 'dict_items', detail: `创建字典项: ${data.label}` })
      }
      
      setItemModalVisible(false)
      loadItems()
    } catch (error: any) {
      message.error('保存失败: ' + error.message)
    }
  }

  // 删除字典类型
  const deleteType = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('dict_types')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      message.success('删除字典类型成功')
      logOperation({ action: 'delete', module: 'dict_types', detail: `删除字典类型: ${name}` })
      loadTypes()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }

  // 删除字典项
  const deleteItem = async (id: string, label: string) => {
    try {
      const { error } = await supabase
        .from('dict_items')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      message.success('删除字典项成功')
      logOperation({ action: 'delete', module: 'dict_items', detail: `删除字典项: ${label}` })
      loadItems()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }

  // 字典类型表格列
  const typeColumns = [
    { title: '编码', dataIndex: 'code', key: 'code', width: 150 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { 
      title: '系统内置', 
      dataIndex: 'is_system', 
      key: 'is_system',
      width: 100,
      render: (isSystem: boolean) => isSystem ? <Tag color="red">是</Tag> : <Tag>否</Tag>
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge status={status === 'active' ? 'success' : 'default'} text={status === 'active' ? '启用' : '禁用'} />
      )
    },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    getActionColumn<any>(
      (record) => {
        const actions: import('../components/ActionColumn').ActionButton[] = [
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => openTypeModal(record),
          },
        ]
        if (!record.is_system) {
          actions.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => deleteType(record.id, record.name),
          })
        }
        return actions
      },
      { width: 240, maxVisible: 2 }
    ),
  ]

  // 字典项表格列
  const itemColumns = [
    { 
      title: '所属类型', 
      dataIndex: ['dict_types', 'name'], 
      key: 'type_name',
      width: 120,
      render: (name: string) => <Tag color="blue">{name}</Tag>
    },
    { title: '编码', dataIndex: 'code', key: 'code', width: 120 },
    { title: '显示名称', dataIndex: 'label', key: 'label', width: 120 },
    { title: '值', dataIndex: 'value', key: 'value', ellipsis: true },
    { 
      title: '扩展', 
      dataIndex: 'extra', 
      key: 'extra',
      ellipsis: true,
      render: (extra: any) => extra ? JSON.stringify(extra).substring(0, 50) : '-'
    },
    { 
      title: '默认', 
      dataIndex: 'is_default', 
      key: 'is_default',
      width: 80,
      render: (isDefault: boolean) => isDefault ? <Tag color="green">是</Tag> : <Tag>否</Tag>
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge status={status === 'active' ? 'success' : 'default'} text={status === 'active' ? '启用' : '禁用'} />
      )
    },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    getActionColumn<any>(
      (record) => [
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          onClick: () => openItemModal(record),
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => deleteItem(record.id, record.label),
        },
      ],
      { width: 240, maxVisible: 2 }
    ),
  ]

  return (
    <Card>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="字典类型" key="types">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openTypeModal()}>
              新增字典类型
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadTypes}>
              刷新
            </Button>
          </div>
          <Table
            columns={typeColumns}
            dataSource={types}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              onClick: () => {
                setSelectedTypeId(record.id)
                setActiveTab('items')
                loadItems(record.id)
              },
              style: { cursor: 'pointer' }
            })}
          />
        </TabPane>
        
        <TabPane tab="字典项" key="items">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openItemModal()}>
                新增字典项
              </Button>
              <Select
                placeholder="筛选类型"
                allowClear
                style={{ width: 200 }}
                onChange={(value) => {
                  setSelectedTypeId(value)
                  loadItems(value)
                }}
                value={selectedTypeId}
              >
                {types.map(type => (
                  <Option key={type.id} value={type.id}>{type.name}</Option>
                ))}
              </Select>
            </Space>
            <Button icon={<ReloadOutlined />} onClick={() => loadItems(selectedTypeId || undefined)}>
              刷新
            </Button>
          </div>
          <Table
            columns={itemColumns}
            dataSource={items}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
      </Tabs>

      {/* 字典类型编辑弹窗 */}
      <Modal
        title={editingType ? '编辑字典类型' : '新增字典类型'}
        open={typeModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setTypeModalVisible(false)}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveType}
        >
          <Form.Item
            name="code"
            label="编码"
            rules={[{ required: true, message: '请输入编码' }]}
          >
            <Input placeholder="如: expense_category" disabled={!!editingType} />
          </Form.Item>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如: 消费分类" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="描述信息" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序" initialValue={0}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="is_system" label="系统内置" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="active">
            <Select>
              <Option value="active">启用</Option>
              <Option value="disabled">禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 字典项编辑弹窗 */}
      <Modal
        title={editingItem ? '编辑字典项' : '新增字典项'}
        open={itemModalVisible}
        onOk={() => itemForm.submit()}
        onCancel={() => setItemModalVisible(false)}
        width={600}
      >
        <Form
          form={itemForm}
          layout="vertical"
          onFinish={saveItem}
        >
          <Form.Item
            name="type_id"
            label="所属类型"
            rules={[{ required: true, message: '请选择所属类型' }]}
          >
            <Select placeholder="选择字典类型">
              {types.map(type => (
                <Option key={type.id} value={type.id}>{type.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="code"
            label="编码"
            rules={[{ required: true, message: '请输入编码' }]}
          >
            <Input placeholder="如: food" />
          </Form.Item>
          <Form.Item
            name="label"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="如: 餐饮" />
          </Form.Item>
          <Form.Item name="value" label="值">
            <Input placeholder="可选，存储实际值" />
          </Form.Item>
          <Form.Item name="extra" label="扩展字段 (JSON)">
            <TextArea 
              rows={4} 
              placeholder='{"icon": "restaurant", "color": 4294967043}'
            />
          </Form.Item>
          <Form.Item name="sort_order" label="排序" initialValue={0}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="is_default" label="默认选项" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="active">
            <Select>
              <Option value="active">启用</Option>
              <Option value="disabled">禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default DictManagement
