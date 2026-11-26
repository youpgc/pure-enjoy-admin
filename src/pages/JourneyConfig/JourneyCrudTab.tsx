import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { useJourneyFilters } from './useJourneyFilters'
import styles from './journey.module.css'
import common from '../../styles/common.module.css'
import {
  columnsFromSchema,
  journeyIconColumn,
  type JourneyFieldDef,
  type JourneyFilterDef,
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

/// 西行管理通用 CRUD Tab：按 schema 渲染过滤条 / 表格 / 结构化表单弹窗。
/// 表单字段与 journey_* 表列一一对应（类型化控件，无 JSON 编辑器）；
/// 各 Tab 仅在 journeySchemas.ts 声明差异，渲染逻辑收敛于此组件。
const JourneyCrudTab: React.FC<JourneyCrudTabProps> = ({ schema, lookups, lockedFilterValue }) => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  // 兼容旧的单 filter 配置：与 filters 合并为统一数组并按 field 去重（此处旧配置优先），
  // 避免同字段重复渲染控件；关卡抽屉锁定场景不渲染筛选。
  const filterDefs = useMemo<JourneyFilterDef[]>(() => {
    const merged = [...(schema.filter ? [schema.filter] : []), ...(schema.filters ?? [])]
    const seen = new Set<string>()
    return merged.filter((def) => {
      if (seen.has(def.field)) return false
      seen.add(def.field)
      return true
    })
  }, [schema.filter, schema.filters])
  const { values: filterValues, queryValues, setFilter } = useJourneyFilters(
    `journey_${schema.key}`,
    filterDefs,
    lockedFilterValue !== undefined,
  )
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(false)
  const pager = usePagination()

  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Record<string, any> | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      // 关卡抽屉（lockedFilterValue）固定按 level_id 锁定，忽略常规筛选；
      // 否则逐项叠加 filters：text 包含匹配（%值%），lookup/static 精确匹配。
      const lockedActive = lockedFilterValue !== undefined && lockedFilterValue !== ''
      const result = await schema.service.paginate(
        pager.pagination.current,
        pager.pagination.pageSize,
        (q) => {
          let query = q
          if (lockedActive) {
            query = query.eq('level_id', lockedFilterValue)
          } else {
            for (const def of filterDefs) {
              const value = queryValues[def.field]
              if (!value) continue
              if (def.kind === 'monsterTier') {
                // 档位是 monsters 表属性，逐怪参数表本身无该列：先解析出
                // 对应怪物 id 再按外键过滤，避免向 PostgREST 查不存在的列。
                const ids = lookups.monstersById
                  .filter((o) => o.tier === value)
                  .map((o) => o.value)
                query = query.in(def.targetField ?? def.field, ids.length > 0 ? ids : [''])
              } else {
                query = def.kind === 'text'
                  ? query.ilike(def.field, `%${value}%`)
                  : query.eq(def.field, value)
              }
            }
          }
          return query
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
  }, [schema, filterDefs, queryValues, lookups, lockedFilterValue, pager.pagination.current, pager.pagination.pageSize])

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
      if (f.type === 'switch') base[f.name] = f.defaultValue ?? false
      if (f.type === 'number') base[f.name] = f.min ?? 0
    }
    // level-scoped 表：新增时预填当前过滤的关卡（抽屉锁定场景同样预填）
    const lockedActive = lockedFilterValue !== undefined && lockedFilterValue !== ''
    if (lockedActive) {
      base.level_id = lockedFilterValue
    } else if (schema.prefillFromFilter) {
      for (const def of filterDefs) {
        // 虚拟筛选项（如怪物档位）不写入表单，避免保存时带上不存在的列
        if (queryValues[def.field] && schema.fields.some((f) => f.name === def.field)) {
          base[def.field] = queryValues[def.field]
        }
      }
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

  const filterControls = lockedFilterValue !== undefined ? null : filterDefs.map((def) => {
    // 档位与怪物筛选联动：档位限定怪物下拉选项；选怪物回填档位；
    // 改档位时若当前怪物不属于新档位则清空，避免两个条件互斥查空表。
    const onChange = (value: string) => {
      if (def.kind === 'monsterTier' && def.cascadeField) {
        const selected = filterValues[def.cascadeField]
        if (selected && value) {
          const linked = filterDefs.find((d) => d.field === def.cascadeField)
          const list = linked?.lookup ? lookups[linked.lookup] : []
          if (!list.some((o) => o.value === selected && o.tier === value)) {
            setFilter(def.cascadeField, '', false)
          }
        }
      } else if (def.tierField) {
        const list = def.lookup ? lookups[def.lookup] : []
        const hit = value ? list.find((o) => o.value === value) : null
        if (hit?.tier) setFilter(def.tierField, hit.tier, false)
      }
      setFilter(def.field, value, def.kind === 'text')
      pager.resetPage()
    }
    let options: { value: string; label: string }[] = def.options ?? []
    if (def.kind === 'lookup' && def.lookup) {
      const list = lookups[def.lookup]
      const tier = def.tierField ? filterValues[def.tierField] : ''
      options = tier ? list.filter((o) => o.tier === tier) : list
    }
    return def.kind === 'text' ? (
      <Input
        key={def.field}
        className={styles.sel280}
        allowClear
        aria-label={def.placeholder ?? def.field}
        placeholder={def.placeholder ?? '包含筛选'}
        value={filterValues[def.field] ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <Select
        key={def.field}
        className={styles.sel280}
        allowClear
        showSearch
        optionFilterProp="label"
        aria-label={def.placeholder ?? def.field}
        placeholder={def.placeholder ?? '全部'}
        value={filterValues[def.field] || undefined}
        onChange={(v) => onChange(v ?? '')}
        options={options}
      />
    )
  })

  return (
    <div>
      {schema.intro && (
        <Alert type="info" showIcon className={common.mb16} message={schema.intro} />
      )}
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            {filterControls}
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
