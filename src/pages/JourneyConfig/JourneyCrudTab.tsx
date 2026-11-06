import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  InputNumber,
  Space,
  Select,
  Card,
  message,
  Modal,
  Form,
  Switch,
  Typography,
  Alert,
} from 'antd'
import {
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { loadTabFilters, usePersistTabFilters } from '../../utils/tabFilterCache'
import styles from './journey.module.css'
import common from '../../styles/common.module.css'
import {
  columnsFromSchema,
  journeyIconColumn,
  type JourneyFieldDef,
  type JourneyLookups,
  type JourneyTabSchema,
} from './journeyTabSchema'

const { Text } = Typography

interface JourneyCrudTabProps {
  schema: JourneyTabSchema
  lookups: JourneyLookups
  /// 锁定过滤值（关卡配置抽屉场景）：固定按该值过滤并隐藏过滤条
  lockedFilterValue?: string
}

/// 西行配置通用 CRUD Tab：按 schema 渲染过滤条 / 表格 / 结构化表单弹窗。
/// 表单字段与 journey_* 表列一一对应（类型化控件，无 JSON 编辑器）；
/// 各 Tab 仅在 journeySchemas.ts 声明差异，渲染逻辑收敛于此组件。
const JourneyCrudTab: React.FC<JourneyCrudTabProps> = ({ schema, lookups, lockedFilterValue }) => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const restoredFilters = lockedFilterValue !== undefined
    ? null
    : loadTabFilters(`journey_${schema.key}`)
  const [filterValue, setFilterValue] = useState<string>(
    lockedFilterValue ?? (restoredFilters?.filterValue as string) ?? ''
  )
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(false)
  const pager = usePagination()
  usePersistTabFilters(`journey_${schema.key}`, lockedFilterValue !== undefined ? {} : { filterValue })

  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Record<string, any> | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      // 生效过滤：关卡配置抽屉（lockedFilterValue）固定按 level_id 锁定，
      // 与 schema.filter 有无无关（修复抽屉展示全量数据的问题）
      const lockedActive = lockedFilterValue !== undefined && lockedFilterValue !== ''
      const effectiveField = lockedActive ? 'level_id' : schema.filter?.field
      const effectiveValue = lockedActive ? lockedFilterValue : filterValue
      const result = await schema.service.paginate(
        pager.pagination.current,
        pager.pagination.pageSize,
        (q) => {
          if (effectiveField && effectiveValue) {
            return schema.filter?.kind === 'text' && !lockedActive
              ? q.ilike(effectiveField, `${effectiveValue}%`)
              : q.eq(effectiveField, effectiveValue)
          }
          return q
        }
      )
      if (!result.success) {
        handleApiError(result.errorMessage, `JourneyConfig-${schema.label}-加载`)
        return
      }
      if (!mountedRef.current) return
      setRows(result.data?.data || [])
      pager.setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, `JourneyConfig-${schema.label}-加载`)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, filterValue, pager.pagination.current, pager.pagination.pageSize])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const openAdd = () => {
    setEditing(null)
    setModalVisible(true)
  }

  const openEdit = (record: Record<string, any>) => {
    setEditing(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    const result = await schema.service.delete(id)
    if (!result.success) {
      handleApiError(result.errorMessage, `JourneyConfig-${schema.label}-删除`)
      return
    }
    message.success('删除成功')
    loadRows()
  }

  const handleSave = async () => {
    if (saving) return
    // 校验失败（reject {errorFields}）走行内红字，不误报为 API 错误
    let values: Record<string, any>
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    try {
      setSaving(true)
      if (editing) {
        const result = await schema.service.update(editing.id, values)
        if (!result.success) {
          handleApiError(result.errorMessage, `JourneyConfig-${schema.label}-更新`)
          return
        }
        message.success('更新成功')
      } else {
        const result = await schema.service.create(values)
        if (!result.success) {
          handleApiError(result.errorMessage, `JourneyConfig-${schema.label}-创建`)
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditing(null)
      form.resetFields()
      loadRows()
    } catch (error) {
      handleApiError(error, `JourneyConfig-${schema.label}-保存`)
    } finally {
      setSaving(false)
    }
  }

  const formInitialValues = (): Record<string, any> => {
    if (editing) return { ...editing }
    const base: Record<string, any> = {}
    for (const f of schema.fields) {
      if (f.type === 'switch') base[f.name] = false
      if (f.type === 'number') base[f.name] = f.min ?? 0
    }
    // level-scoped 表：新增时预填当前过滤的关卡（抽屉锁定场景同样预填）
    const lockedActive = lockedFilterValue !== undefined && lockedFilterValue !== ''
    if (lockedActive) {
      base.level_id = lockedFilterValue
    } else if (schema.filter && schema.prefillFromFilter && filterValue) {
      base[schema.filter.field] = filterValue
    }
    return base
  }

  const renderField = (f: JourneyFieldDef) => {
    switch (f.type) {
      case 'number':
        return (
          <InputNumber
            className={common.fullWidth}
            min={f.min}
            max={f.max}
            step={f.step}
            placeholder={f.placeholder}
          />
        )
      case 'select':
        return (
          <Select
            showSearch
            optionFilterProp="label"
            options={
              f.optionsFrom ? lookups[f.optionsFrom] : f.options ?? []
            }
            placeholder={f.placeholder}
          />
        )
      case 'switch':
        return <Switch checkedChildren="是" unCheckedChildren="否" />
      case 'textarea':
        return <Input.TextArea rows={2} placeholder={f.placeholder} />
      default:
        return <Input placeholder={f.placeholder} />
    }
  }

  const filterControl = lockedFilterValue !== undefined ? null : schema.filter && (
    schema.filter.kind === 'text' ? (
      <Input
        className={styles.sel280}
        allowClear
        placeholder={schema.filter.placeholder ?? '前缀筛选'}
        value={filterValue}
        onChange={(e) => {
          setFilterValue(e.target.value)
          pager.resetPage()
        }}
      />
    ) : (
      <Select
        className={styles.sel280}
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder={schema.filter.placeholder ?? '全部'}
        value={filterValue || undefined}
        onChange={(v) => {
          setFilterValue(v ?? '')
          pager.resetPage()
        }}
        options={
          schema.filter.kind === 'lookup' && schema.filter.lookup
            ? lookups[schema.filter.lookup]
            : schema.filter.options ?? []
        }
      />
    )
  )

  return (
    <div>
      {schema.intro && (
        <Alert type="info" showIcon className={common.mb16} message={schema.intro} />
      )}
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            {filterControl}
            <Button icon={<ReloadOutlined />} onClick={loadRows} loading={loading}>
              刷新
            </Button>
            <Text type="secondary">共 {pager.pagination.total} 行</Text>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite} onClick={openAdd}>
            新增
          </Button>
        </div>
      </Card>

      <Table
        columns={[
          // 精灵图列（schema.iconPrefix 非空时首列展示 App 端同源 SVG 图标）
          ...(journeyIconColumn(schema) ? [journeyIconColumn(schema)!] : []),
          ...columnsFromSchema(schema.fields, lookups),
          getActionColumn<Record<string, any>>((record) => [
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              disabled: !canWrite,
              onClick: () => openEdit(record),
            },
            {
              key: 'delete',
              label: '删除',
              icon: <DeleteOutlined />,
              danger: true,
              disabled: !canDelete,
              confirm: '确认删除',
              onClick: () => handleDelete(record.id),
            },
          ], { width: 130 }),
        ]}
        dataSource={rows}
        rowKey={schema.rowKey ?? 'id'}
        loading={loading}
        pagination={pager.tablePagination}
        scroll={{ x: 'max-content' }}
        size="small"
      />

      <Modal
        title={`${editing ? '编辑' : '新增'}·${schema.label}`}
        open={modalVisible}
        onOk={handleSave}
        confirmLoading={saving}
        afterOpenChange={(open) => {
          if (open) {
            form.resetFields()
            form.setFieldsValue(formInitialValues())
          }
        }}
        onCancel={() => {
          setModalVisible(false)
          setEditing(null)
          form.resetFields()
        }}
        width={640}
      >
        <Form form={form} layout="vertical">
          {schema.fields
            .filter((f) => !f.hideInForm)
            .map((f) => (
              <Form.Item
                key={f.name}
                name={f.name}
                label={f.label}
                rules={f.required ? [{ required: true, message: `请填写${f.label}` }] : undefined}
              >
                {renderField(f)}
              </Form.Item>
            ))}
        </Form>
      </Modal>
    </div>
  )
}

export default JourneyCrudTab
