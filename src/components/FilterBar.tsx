import React, { useState, useCallback } from 'react'
import {
  Input,
  Select,
  DatePicker,
  Button,
  Row,
  Col,
  Space,
  Tag,
  InputNumber,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
  FilterOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

// ==================== 类型定义 ====================

export type FilterFieldType = 'input' | 'select' | 'dateRange' | 'numberRange'

export interface FilterField {
  name: string
  label: string
  type: FilterFieldType
  options?: { label: string; value: string | number }[]
  placeholder?: string
  span?: number // 栅格占位，默认 6
}

export interface FilterBarProps {
  fields: FilterField[]
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  onReset?: () => void
  onSearch?: () => void
  searchPlaceholder?: string
  showSearch?: boolean
  searchText?: string
  onSearchTextChange?: (text: string) => void
  defaultCollapsed?: boolean
  loading?: boolean
}

// ==================== 主组件 ====================

const FilterBar: React.FC<FilterBarProps> = ({
  fields,
  values,
  onChange,
  onReset,
  onSearch,
  searchPlaceholder = '搜索关键词...',
  showSearch = true,
  searchText = '',
  onSearchTextChange,
  defaultCollapsed = true,
  loading = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  // 处理字段值变化
  const handleFieldChange = useCallback(
    (name: string, value: unknown) => {
      onChange({ ...values, [name]: value })
    },
    [values, onChange]
  )

  // 处理日期范围变化
  const handleDateRangeChange = useCallback(
    (name: string, dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
      if (dates && dates[0] && dates[1]) {
        onChange({
          ...values,
          [name]: [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')],
        })
      } else {
        const newValues = { ...values }
        delete newValues[name]
        onChange(newValues)
      }
    },
    [values, onChange]
  )

  // 处理数字范围变化
  const handleNumberRangeChange = useCallback(
    (name: string, type: 'min' | 'max', value: number | null) => {
      const currentRange = (values[name] as [number | null, number | null]) || [null, null]
      const newRange: [number | null, number | null] = [...currentRange]
      if (type === 'min') {
        newRange[0] = value
      } else {
        newRange[1] = value
      }
      onChange({ ...values, [name]: newRange })
    },
    [values, onChange]
  )

  // 重置所有筛选
  const handleReset = useCallback(() => {
    onChange({})
    onSearchTextChange?.('')
    onReset?.()
  }, [onChange, onSearchTextChange, onReset])

  // 计算激活的筛选数量
  const activeFilterCount = Object.values(values).filter((v) => {
    if (v === undefined || v === null || v === '') return false
    if (Array.isArray(v)) {
      return v.some((item) => item !== null && item !== undefined && item !== '')
    }
    return true
  }).length

  // 渲染筛选字段
  const renderField = (field: FilterField) => {
    const value = values[field.name]

    switch (field.type) {
      case 'input':
        return (
          <Input
            placeholder={field.placeholder || field.label}
            value={(value as string) || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            allowClear
          />
        )

      case 'select':
        return (
          <Select
            placeholder={field.placeholder || `请选择${field.label}`}
            value={(value as string | number) || undefined}
            onChange={(val) => handleFieldChange(field.name, val)}
            options={field.options}
            allowClear
            style={{ width: '100%' }}
          />
        )

      case 'dateRange':
        return (
          <RangePicker
            style={{ width: '100%' }}
            value={
              value && Array.isArray(value) && value[0] && value[1]
                ? [dayjs(value[0] as string), dayjs(value[1] as string)]
                : null
            }
            onChange={(dates) => handleDateRangeChange(field.name, dates)}
            format="YYYY-MM-DD"
            placeholder={['开始日期', '结束日期']}
          />
        )

      case 'numberRange':
        const rangeValue = (value as [number | null, number | null]) || [null, null]
        return (
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              placeholder="最小值"
              value={rangeValue[0]}
              onChange={(val) => handleNumberRangeChange(field.name, 'min', val)}
              style={{ width: '50%' }}
              min={0}
            />
            <Input
              style={{ width: 30, textAlign: 'center', pointerEvents: 'none' }}
              placeholder="~"
              readOnly
            />
            <InputNumber
              placeholder="最大值"
              value={rangeValue[1]}
              onChange={(val) => handleNumberRangeChange(field.name, 'max', val)}
              style={{ width: '50%' }}
              min={0}
            />
          </Space.Compact>
        )

      default:
        return null
    }
  }

  // 显示的字段（折叠时只显示前3个）
  const visibleFields = collapsed ? fields.slice(0, 3) : fields
  const hasMoreFields = fields.length > 3

  return (
    <div style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        {/* 搜索框 */}
        {showSearch && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder={searchPlaceholder}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => onSearchTextChange?.(e.target.value)}
              allowClear
              onPressEnter={onSearch}
            />
          </Col>
        )}

        {/* 筛选字段 */}
        {visibleFields.map((field) => (
          <Col
            xs={24}
            sm={12}
            md={8}
            lg={field.span || 6}
            key={field.name}
          >
            {renderField(field)}
          </Col>
        ))}

        {/* 操作按钮 */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Space>
            {onSearch && (
              <Button type="primary" icon={<SearchOutlined />} onClick={onSearch} loading={loading}>
                搜索
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={loading}>
              重置
            </Button>
            {hasMoreFields && (
              <Button
                type="text"
                onClick={() => setCollapsed(!collapsed)}
                icon={
                  <>
                    <FilterOutlined />
                    {activeFilterCount > 0 && (
                      <Tag color="blue" style={{ marginLeft: 4 }}>
                        {activeFilterCount}
                      </Tag>
                    )}
                    {collapsed ? <DownOutlined /> : <UpOutlined />}
                  </>
                }
              >
                {collapsed ? '展开' : '收起'}
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </div>
  )
}

export default FilterBar
