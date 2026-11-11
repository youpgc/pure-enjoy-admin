import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Alert, Button, Card, Col, Row, Space, Spin, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import { usePermission } from '../../hooks/usePermission'
import { journeyGlobalsService } from '../../services/gameService'
import type { DbJourneyGlobals } from '../../types/database'
import common from '../../styles/common.module.css'
import { JOURNEY_GLOBALS_GROUPS, type JourneyGlobalsGroup } from './journeyGlobalsGroups'
import JourneyGlobalsFormModal from './JourneyGlobalsFormModal'

const { Text } = Typography

/// 未填值统一占位，避免把 null 渲染成字符串。
const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

/// 信息卡只读三列：参数 / 当前值 / 说明。
const valueColumns: ColumnsType<Record<string, any>> = [
  { title: '参数', dataIndex: 'label', width: 170 },
  { title: '当前值', dataIndex: 'value', width: 110 },
  { title: '说明', dataIndex: 'desc', ellipsis: true },
]

/// 全局参数单行表：按分组展示只读信息卡，每组独立弹窗编辑，只提交本组字段。
const JourneyGlobalsTab: React.FC = () => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const [row, setRow] = useState<DbJourneyGlobals | null>(null)
  const [loading, setLoading] = useState(false)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadRow = useCallback(async () => {
    setLoading(true)
    try {
      const data = await journeyGlobalsService.findSingleton()
      if (mountedRef.current) setRow(data)
    } catch (error) {
      handleApiError(error, 'JourneyConfig-全局参数-加载')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [mountedRef])

  useEffect(() => {
    loadRow()
  }, [loadRow])

  const source = (row ?? {}) as unknown as Record<string, any>
  const editGroup = JOURNEY_GLOBALS_GROUPS.find((g) => g.key === editKey) ?? null
  const totalFields = JOURNEY_GLOBALS_GROUPS.reduce((sum, g) => sum + g.fields.length, 0)

  const editInitialValues = useMemo(() => {
    const values: Record<string, any> = {}
    for (const { field } of editGroup?.fields ?? []) {
      values[field.name] = source[field.name] ?? undefined
    }
    return values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editGroup, row])

  const handleSave = async (values: Record<string, any>) => {
    if (saving || !row) return
    setSaving(true)
    try {
      const result = await journeyGlobalsService.update(row.id, values as Partial<DbJourneyGlobals>)
      if (!result.success) {
        handleApiError(result.errorMessage, 'JourneyConfig-全局参数-更新')
        return
      }
      message.success(`「${editGroup?.title ?? '全局参数'}」已保存`)
      setEditKey(null)
      // 局部刷新：只合并本组字段，其余分组不闪动、不被整行覆盖
      setRow((prev) => (prev ? { ...prev, ...(values as Partial<DbJourneyGlobals>) } : prev))
    } catch (error) {
      handleApiError(error, 'JourneyConfig-全局参数-保存')
    } finally {
      setSaving(false)
    }
  }

  const rowsOf = (group: JourneyGlobalsGroup) =>
    group.fields.map(({ field, desc }) => ({
      key: field.name,
      label: field.label,
      value: displayValue(source[field.name]),
      desc,
    }))

  if (loading) {
    return (
      <div className={common.flexCenter} style={{ padding: '80px 0' }}>
        <Spin tip="加载全局参数…" />
      </div>
    )
  }

  if (!row) {
    return (
      <Alert
        type="warning"
        showIcon
        message="未找到全局参数行（journey_globals id=1）"
        description="请确认西行建表与种子 SQL 已执行。"
        action={<Button size="small" onClick={loadRow}>重新加载</Button>}
      />
    )
  }

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="全局参数说明"
        description="按分组查看只读信息卡，点击卡片右上角「编辑」修改本组参数；保存只提交本组字段。该表为单行配置，不提供新增与删除。"
      />
      <Card size="small" className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={loadRow} loading={loading}>刷新</Button>
            <Text type="secondary">共 {totalFields} 项参数 · 单行配置（id = 1）</Text>
          </Space>
        </div>
      </Card>
      <Row gutter={[16, 16]}>
        {JOURNEY_GLOBALS_GROUPS.map((group) => (
          <Col key={group.key} xs={24} xl={12}>
            <Card
              size="small"
              title={group.title}
              extra={
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  disabled={!canWrite}
                  onClick={() => setEditKey(group.key)}
                >
                  编辑
                </Button>
              }
            >
              <Text type="secondary" style={{ fontSize: 12 }}>{group.description}</Text>
              <Table
                className={common.mt8}
                rowKey="key"
                size="small"
                tableLayout="fixed"
                columns={valueColumns}
                dataSource={rowsOf(group)}
                pagination={false}
              />
            </Card>
          </Col>
        ))}
      </Row>
      <JourneyGlobalsFormModal
        open={editKey !== null}
        group={editGroup}
        initialValues={editInitialValues}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setEditKey(null)}
      />
    </div>
  )
}

export default JourneyGlobalsTab
