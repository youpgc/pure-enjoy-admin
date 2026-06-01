import React, { useState, useCallback, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Popconfirm,
  message,
  Switch,
  Modal,
  Form,
  Select,
  Typography,
  Tooltip,
  Badge,
  Tabs,
  Divider,
  Row,
  Col,
  Statistic,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import DataFormModal, { FormField } from '../components/DataFormModal'
import FilterBar, { FilterField } from '../components/FilterBar'
import { supabase, logOperation } from '../utils/supabase'
import { getActionColumn } from '../components/ActionColumn'

const { Text } = Typography
const { TextArea } = Input

// ==================== 类型定义 ====================

interface SensitiveWord {
  id: string
  word: string
  category: 'novel' | 'system'
  level: 'block' | 'replace' | 'warn'
  replace_word: string | null
  description: string | null
  match_mode: 'exact' | 'contains' | 'regex'
  is_active: boolean
  hit_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

interface CategorySwitch {
  key: string
  label: string
  description: string
  enabled: boolean
}

// ==================== 常量 ====================

const CATEGORY_OPTIONS = [
  { label: '小说敏感词', value: 'novel' },
  { label: '系统敏感词', value: 'system' },
]

const LEVEL_OPTIONS = [
  { label: '屏蔽', value: 'block' },
  { label: '替换', value: 'replace' },
  { label: '警告', value: 'warn' },
]

const MATCH_MODE_OPTIONS = [
  { label: '精确匹配', value: 'exact' },
  { label: '包含匹配', value: 'contains' },
  { label: '正则匹配', value: 'regex' },
]

const LEVEL_COLORS: Record<string, string> = {
  block: 'red',
  replace: 'orange',
  warn: 'blue',
}

const LEVEL_LABELS: Record<string, string> = {
  block: '屏蔽',
  replace: '替换',
  warn: '警告',
}

const MATCH_MODE_LABELS: Record<string, string> = {
  exact: '精确',
  contains: '包含',
  regex: '正则',
}

const CATEGORY_LABELS: Record<string, string> = {
  novel: '小说',
  system: '系统',
}

// ==================== 组件 ====================

const SensitiveWords: React.FC = () => {
  const [data, setData] = useState<SensitiveWord[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<SensitiveWord | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [searchText, setSearchText] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({})
  const [activeTab, setActiveTab] = useState<string>('all')

  // 分类开关状态
  const [switches, setSwitches] = useState<CategorySwitch[]>([
    { key: 'sensitive_word_novel_enabled', label: '小说敏感词拦截', description: '开启后将对小说内容进行敏感词检测', enabled: false },
    { key: 'sensitive_word_system_enabled', label: '系统敏感词拦截', description: '开启后将对用户交流内容进行敏感词检测', enabled: false },
  ])
  const [switchLoading, setSwitchLoading] = useState(false)

  // 统计数据
  const [stats, setStats] = useState({ total: 0, novelCount: 0, systemCount: 0, activeCount: 0 })

  // ==================== 数据加载 ====================

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('sensitive_words')
        .select('*')
        .order('created_at', { ascending: false })

      // Tab 筛选
      if (activeTab === 'novel') {
        query = query.eq('category', 'novel')
      } else if (activeTab === 'system') {
        query = query.eq('category', 'system')
      }

      const { data: words, error } = await query

      if (error) throw error
      setData(words || [])

      // 计算统计
      const all = words || []
      setStats({
        total: all.length,
        novelCount: all.filter(w => w.category === 'novel').length,
        systemCount: all.filter(w => w.category === 'system').length,
        activeCount: all.filter(w => w.is_active).length,
      })
    } catch (error: any) {
      message.error('加载敏感词失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  // 加载开关状态
  const fetchSwitches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sensitive_word_configs')
        .select('config_key, config_value')

      if (error) throw error

      setSwitches(prev => prev.map(sw => {
        const config = data?.find((d: any) => d.config_key === sw.key)
        return { ...sw, enabled: config?.config_value === 'true' }
      }))
    } catch (error: any) {
      console.error('加载开关状态失败:', error)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchSwitches()
  }, [fetchData, fetchSwitches])

  // ==================== 筛选逻辑 ====================

  const filteredData = (() => {
    let result = [...data]

    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase()
      result = result.filter(item =>
        item.word.toLowerCase().includes(keyword) ||
        (item.description && item.description.toLowerCase().includes(keyword))
      )
    }

    if (filterValues.category) {
      result = result.filter(item => item.category === filterValues.category)
    }
    if (filterValues.level) {
      result = result.filter(item => item.level === filterValues.level)
    }
    if (filterValues.match_mode) {
      result = result.filter(item => item.match_mode === filterValues.match_mode)
    }
    if (filterValues.is_active !== undefined) {
      result = result.filter(item => item.is_active === filterValues.is_active)
    }

    return result
  })()

  // ==================== CRUD 操作 ====================

  const handleSave = useCallback(async (values: Record<string, unknown>) => {
    setSaving(true)
    try {
      const saveData: Record<string, any> = {
        word: values.word,
        category: values.category || 'novel',
        level: values.level || 'block',
        replace_word: values.level === 'replace' ? (values.replace_word || '***') : null,
        description: values.description || null,
        match_mode: values.match_mode || 'exact',
        is_active: values.is_active !== undefined ? values.is_active : true,
        updated_at: new Date().toISOString(),
      }

      if (editingRecord) {
        const { error } = await supabase
          .from('sensitive_words')
          .update(saveData)
          .eq('id', editingRecord.id)
        if (error) throw error
        message.success('更新敏感词成功')
        logOperation({ action: 'update', module: 'sensitive_words', detail: `更新敏感词: ${saveData.word}` })
      } else {
        saveData.created_by = 'admin'
        saveData.hit_count = 0
        saveData.created_at = new Date().toISOString()
        const { error } = await supabase
          .from('sensitive_words')
          .insert(saveData)
        if (error) throw error
        message.success('添加敏感词成功')
        logOperation({ action: 'create', module: 'sensitive_words', detail: `添加敏感词: ${saveData.word}` })
      }

      setModalOpen(false)
      setEditingRecord(null)
      fetchData()
    } catch (error: any) {
      message.error('保存失败: ' + error.message)
    } finally {
      setSaving(false)
    }
  }, [editingRecord, fetchData])

  const handleDelete = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('sensitive_words')
        .delete()
        .in('id', ids)
      if (error) throw error
      message.success(`成功删除 ${ids.length} 条敏感词`)
      for (const id of ids) {
        logOperation({ action: 'delete', module: 'sensitive_words', detail: `删除敏感词 ID: ${id}` })
      }
      setSelectedRowKeys([])
      fetchData()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }, [fetchData])

  // 切换单条启用/禁用
  const handleToggleActive = useCallback(async (record: SensitiveWord) => {
    try {
      const { error } = await supabase
        .from('sensitive_words')
        .update({ is_active: !record.is_active, updated_at: new Date().toISOString() })
        .eq('id', record.id)
      if (error) throw error
      message.success(record.is_active ? '已禁用' : '已启用')
      fetchData()
    } catch (error: any) {
      message.error('操作失败: ' + error.message)
    }
  }, [fetchData])

  // 切换分类开关
  const handleToggleSwitch = useCallback(async (sw: CategorySwitch) => {
    setSwitchLoading(true)
    try {
      const newValue = !sw.enabled
      const { error } = await supabase
        .from('sensitive_word_configs')
        .update({ config_value: String(newValue), updated_at: new Date().toISOString() })
        .eq('config_key', sw.key)
      if (error) throw error

      setSwitches(prev => prev.map(s => s.key === sw.key ? { ...s, enabled: newValue } : s))
      message.success(`${sw.label} 已${newValue ? '开启' : '关闭'}`)
      logOperation({
        action: 'update',
        module: 'sensitive_words',
        detail: `${sw.label} 开关: ${newValue ? '开启' : '关闭'}`,
      })
    } catch (error: any) {
      message.error('切换开关失败: ' + error.message)
    } finally {
      setSwitchLoading(false)
    }
  }, [])

  // ==================== 批量导入弹窗 ====================

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importCategory, setImportCategory] = useState<'novel' | 'system'>('novel')
  const [importing, setImporting] = useState(false)

  const handleBatchImport = useCallback(async () => {
    if (!importText.trim()) {
      message.warning('请输入敏感词内容')
      return
    }

    setImporting(true)
    try {
      // 按行分割，支持逗号、换行、顿号分隔
      const words = importText
        .split(/[\n,，、;；\t]+/)
        .map(w => w.trim())
        .filter(w => w.length > 0)

      if (words.length === 0) {
        message.warning('未检测到有效敏感词')
        return
      }

      if (words.length > 500) {
        message.warning('单次导入不能超过 500 条')
        return
      }

      const records = words.map(word => ({
        word,
        category: importCategory,
        level: 'block',
        replace_word: null,
        description: `批量导入`,
        match_mode: 'contains',
        is_active: true,
        hit_count: 0,
        created_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase.from('sensitive_words').insert(records)
      if (error) throw error

      message.success(`成功导入 ${words.length} 条敏感词`)
      logOperation({
        action: 'create',
        module: 'sensitive_words',
        detail: `批量导入 ${words.length} 条${importCategory === 'novel' ? '小说' : '系统'}敏感词`,
      })

      setImportModalOpen(false)
      setImportText('')
      fetchData()
    } catch (error: any) {
      message.error('导入失败: ' + error.message)
    } finally {
      setImporting(false)
    }
  }, [importText, importCategory, fetchData])

  // ==================== 表单字段配置 ====================

  const formFields: FormField[] = [
    {
      name: 'word',
      label: '敏感词',
      type: 'text',
      required: true,
      placeholder: '请输入敏感词或词组',
      span: 24,
    },
    {
      name: 'category',
      label: '分类',
      type: 'select',
      required: true,
      options: CATEGORY_OPTIONS,
      defaultValue: activeTab === 'novel' || activeTab === 'system' ? activeTab : 'novel',
      span: 12,
    },
    {
      name: 'level',
      label: '处理级别',
      type: 'select',
      required: true,
      options: LEVEL_OPTIONS,
      defaultValue: 'block',
      span: 12,
    },
    {
      name: 'replace_word',
      label: '替换词',
      type: 'text',
      placeholder: '处理级别为"替换"时生效，默认 ***',
      span: 12,
      dependencies: ['level'],
      tooltip: '仅当处理级别为"替换"时生效',
    },
    {
      name: 'match_mode',
      label: '匹配模式',
      type: 'select',
      required: true,
      options: MATCH_MODE_OPTIONS,
      defaultValue: 'contains',
      span: 12,
      tooltip: '精确: 完全匹配; 包含: 文本中包含即命中; 正则: 使用正则表达式匹配',
    },
    {
      name: 'description',
      label: '备注',
      type: 'textarea',
      placeholder: '可选，添加备注说明',
      rows: 2,
      span: 24,
    },
    {
      name: 'is_active',
      label: '启用',
      type: 'switch',
      defaultValue: true,
      span: 24,
    },
  ]

  // ==================== 表格列定义 ====================

  const columns: ColumnsType<SensitiveWord> = [
    {
      title: '敏感词',
      dataIndex: 'word',
      key: 'word',
      width: 200,
      ellipsis: true,
      render: (word: string) => (
        <Tooltip title={word}>
          <Text strong style={{ color: '#ff4d4f' }}>{word}</Text>
        </Tooltip>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color={category === 'novel' ? 'purple' : 'cyan'}>
          {CATEGORY_LABELS[category] || category}
        </Tag>
      ),
    },
    {
      title: '处理级别',
      dataIndex: 'level',
      key: 'level',
      width: 90,
      render: (level: string) => (
        <Tag color={LEVEL_COLORS[level]}>{LEVEL_LABELS[level] || level}</Tag>
      ),
    },
    {
      title: '替换词',
      dataIndex: 'replace_word',
      key: 'replace_word',
      width: 100,
      render: (word: string | null) => word || <Text type="secondary">-</Text>,
    },
    {
      title: '匹配模式',
      dataIndex: 'match_mode',
      key: 'match_mode',
      width: 90,
      render: (mode: string) => MATCH_MODE_LABELS[mode] || mode,
    },
    {
      title: '命中次数',
      dataIndex: 'hit_count',
      key: 'hit_count',
      width: 90,
      sorter: (a, b) => a.hit_count - b.hit_count,
      render: (count: number) => (
        <Badge count={count} showZero style={{ backgroundColor: count > 0 ? '#ff4d4f' : '#d9d9d9' }} />
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active: boolean, record) => (
        <Switch
          checked={active}
          size="small"
          onChange={() => handleToggleActive(record)}
        />
      ),
    },
    {
      title: '备注',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      ellipsis: true,
      render: (desc: string | null) => desc || <Text type="secondary">-</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    getActionColumn<SensitiveWord>(
      (record) => [
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          onClick: () => {
            setEditingRecord(record)
            setModalOpen(true)
          },
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete([record.id]),
        },
      ],
      { width: 240, maxVisible: 2 }
    ),
  ]

  // ==================== 筛选字段 ====================

  const filterFields: FilterField[] = [
    { name: 'category', label: '分类', type: 'select', options: CATEGORY_OPTIONS },
    { name: 'level', label: '处理级别', type: 'select', options: LEVEL_OPTIONS },
    { name: 'match_mode', label: '匹配模式', type: 'select', options: MATCH_MODE_OPTIONS },
  ]

  // ==================== 渲染 ====================

  return (
    <div>
      {/* 分类开关卡片 */}
      <Card
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <SettingOutlined />
            <span>拦截开关</span>
          </Space>
        }
        size="small"
      >
        <Row gutter={24}>
          {switches.map(sw => (
            <Col span={12} key={sw.key}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 8,
                background: sw.enabled ? '#f6ffed' : '#fff2f0',
                border: `1px solid ${sw.enabled ? '#b7eb8f' : '#ffccc7'}`,
              }}>
                <div>
                  <Text strong>{sw.label}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{sw.description}</Text>
                </div>
                <Switch
                  checked={sw.enabled}
                  loading={switchLoading}
                  onChange={() => handleToggleSwitch(sw)}
                  checkedChildren="开"
                  unCheckedChildren="关"
                />
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="敏感词总数" value={stats.total} prefix={<SafetyCertificateOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="小说敏感词" value={stats.novelCount} valueStyle={{ color: '#722ed1' }} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="系统敏感词" value={stats.systemCount} valueStyle={{ color: '#13c2c2' }} prefix={<ExclamationCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已启用" value={stats.activeCount} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      {/* 主内容区 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'all', label: '全部' },
            { key: 'novel', label: '小说敏感词' },
            { key: 'system', label: '系统敏感词' },
          ]}
          tabBarExtraContent={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchData}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          }
        />

        <FilterBar
          fields={filterFields}
          values={filterValues}
          onChange={setFilterValues}
          searchText={searchText}
          onSearchTextChange={setSearchText}
        />

        <Divider style={{ margin: '12px 0 16px' }} />

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingRecord(null)
                setModalOpen(true)
              }}
            >
              添加敏感词
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setImportModalOpen(true)}
            >
              批量导入
            </Button>
          </Space>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`确定删除选中的 ${selectedRowKeys.length} 条敏感词？`}
              onConfirm={() => handleDelete(selectedRowKeys.map(String))}
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </div>

        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            defaultPageSize: 20,
            pageSizeOptions: ['10', '20', '50', '100'],
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          size="middle"
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <DataFormModal
        open={modalOpen}
        title={editingRecord ? '编辑敏感词' : '添加敏感词'}
        mode={editingRecord ? 'edit' : 'create'}
        fields={formFields}
        initialValues={editingRecord ? { ...editingRecord } : undefined}
        onOk={handleSave}
        onCancel={() => {
          setModalOpen(false)
          setEditingRecord(null)
        }}
        confirmLoading={saving}
        width={600}
      />

      {/* 批量导入弹窗 */}
      <Modal
        title="批量导入敏感词"
        open={importModalOpen}
        onOk={handleBatchImport}
        onCancel={() => {
          setImportModalOpen(false)
          setImportText('')
        }}
        confirmLoading={importing}
        okText="导入"
        width={500}
      >
        <Form layout="vertical">
          <Form.Item label="分类">
            <Select
              value={importCategory}
              onChange={setImportCategory}
              options={CATEGORY_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            label="敏感词列表"
            extra="每行一个敏感词，也支持用逗号、顿号分隔。单次最多导入 500 条。"
          >
            <TextArea
              rows={10}
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={`示例：\n敏感词1\n敏感词2\n敏感词3\n或：敏感词1,敏感词2,敏感词3`}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SensitiveWords
