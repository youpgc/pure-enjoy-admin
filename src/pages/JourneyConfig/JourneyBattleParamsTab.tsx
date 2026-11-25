import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Form, InputNumber, Modal, Popconfirm, Row, Space, Spin, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import { usePermission } from '../../hooks/usePermission'
import { journeyBattleParamService, type DbJourneyBattleParam } from '../../services/journeyConfigService'
import {
  JOURNEY_BATTLE_PARAM_GROUPS,
  JOURNEY_BATTLE_PARAM_SUBGROUPS,
  type BattleParamDef,
  type BattleParamGroupDef,
  type BattleParamSubGroupDef,
} from '../../constants/journeyBattleParams'
import common from '../../styles/common.module.css'

const { Text } = Typography

interface JourneyBattleParamsTabProps {
  /// 当前二级 tab 对应的分组码；组件只管理该组参数
  groupCode: string
}

interface ParamRow {
  key: string
  code: string
  label: string
  def: BattleParamDef
  /// 已落库的行（null=未配置，回落默认）
  record: DbJourneyBattleParam | null
  value: number | null
}

/// 整组编辑表单里每项的值：数值留空即回落默认值。
interface EditField {
  value?: number
}

/// 通用战斗参数编辑器：分组内按子分类聚合信息卡，每张卡只读展示该子分类参数，
/// 卡片右上「编辑」打开整组表单一次保存本组变更（差异项 upsert/回落默认），
/// 「重置」删除本组全部落库行回落默认值（需删除权限+二次确认）。
const JourneyBattleParamsTab: React.FC<JourneyBattleParamsTabProps> = ({ groupCode }) => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const group = useMemo<BattleParamGroupDef | undefined>(
    () => JOURNEY_BATTLE_PARAM_GROUPS.find((g) => g.code === groupCode),
    [groupCode],
  )

  const [rows, setRows] = useState<DbJourneyBattleParam[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<BattleParamSubGroupDef | null>(null)
  const [saving, setSaving] = useState(false)
  /// 正在重置的子分类码（null=无重置任务），用于逐卡禁用按钮防重复点击
  const [resettingSub, setResettingSub] = useState<string | null>(null)
  /// 表单值随弹窗重挂载注入，避免未挂载时回显丢失
  const [formKey, setFormKey] = useState(0)
  const [formInitial, setFormInitial] = useState<Record<string, EditField>>({})

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await journeyBattleParamService.findAll((q) =>
        q.eq('group_code', groupCode),
      )
      if (!res.success) {
        handleApiError(res.errorMessage, `JourneyConfig-战斗参数-${groupCode}-加载`)
        return
      }
      if (mountedRef.current) setRows(res.data ?? [])
    } catch (error) {
      handleApiError(error, `JourneyConfig-战斗参数-${groupCode}-加载`)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [groupCode, mountedRef])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const byCode = useMemo(() => {
    const map: Record<string, DbJourneyBattleParam> = {}
    for (const r of rows) map[r.param_code] = r
    return map
  }, [rows])

  const rowsByCode = useMemo(() => {
    const map: Record<string, ParamRow> = {}
    for (const def of group?.params ?? []) {
      const record = byCode[def.code] ?? null
      map[def.code] = {
        key: `${groupCode}.${def.code}`,
        code: def.code,
        label: def.label,
        def,
        record,
        /// 停用的历史行按未配置口径展示（App 加载同样跳过回落默认），避免卡片显示不生效的旧值
        value: record && record.enabled !== false ? record.value_num : null,
      }
    }
    return map
  }, [group, groupCode, byCode])

  /// 已配置口径：仅统计注册项内、已落库、未停用且填了值的项；
  /// 与下方卡片保持一致，排除已下线残留行与停用行。
  const configuredCount = useMemo(
    () => Object.values(rowsByCode).filter((r) => r.value !== null).length,
    [rowsByCode],
  )

  const subGroups = useMemo<BattleParamSubGroupDef[]>(
    () =>
      JOURNEY_BATTLE_PARAM_SUBGROUPS[groupCode] ??
      (group ? [{ code: 'all', label: group.label, params: group.params.map((p) => p.code) }] : []),
    [groupCode, group],
  )

  /// 打开整组编辑：本组每项当前值作为初值，未配置项用默认值占位（留空=回落默认）。
  const openEdit = (sub: BattleParamSubGroupDef) => {
    const initial: Record<string, EditField> = {}
    for (const code of sub.params) {
      const row = rowsByCode[code]
      if (!row) continue
      initial[code] = {
        value: row.value ?? undefined,
      }
    }
    setEditingSub(sub)
    setFormInitial(initial)
    setFormKey((k) => k + 1)
    setModalOpen(true)
  }

  /// 重置整组：删除该子分类所有已落库行，全部参数回落 App 默认值。
  const handleResetSub = async (sub: BattleParamSubGroupDef) => {
    if (!canDelete || resettingSub) return
    const records = sub.params
      .map((code) => rowsByCode[code]?.record)
      .filter((r): r is DbJourneyBattleParam => !!r)
    if (records.length === 0) {
      message.info('本组没有已配置的参数')
      return
    }
    setResettingSub(sub.code)
    try {
      let deleted = 0
      for (const record of records) {
        const res = await journeyBattleParamService.delete(record.id)
        if (res.success) {
          deleted++
        } else {
          handleApiError(res.errorMessage, `JourneyConfig-战斗参数-重置-${record.param_code}`)
        }
      }
      if (deleted > 0) {
        message.success(`已重置「${sub.label}」${deleted} 项，回落默认值`)
        await loadRows()
      }
    } catch (error) {
      handleApiError(error, 'JourneyConfig-战斗参数-重置')
    } finally {
      setResettingSub(null)
    }
  }

  /// 保存整组：填值按原样落库（含等于默认值），留空才删行回落默认。
  /// 配置行恒为启用（App 一律采纳），停用的历史行在编辑保存时一并恢复启用。
  const handleSave = async () => {
    if (saving || !editingSub) return
    let values: Record<string, EditField>
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setSaving(true)
    let changed = 0
    const failedCodes: string[] = []
    try {
      for (const code of editingSub.params) {
        const row = rowsByCode[code]
        if (!row) continue
        const field = values[code] ?? {}
        const valueNum = field.value
        let res
        if (valueNum === undefined || valueNum === null) {
          // 留空=回落默认：仅已有配置行需要删除
          if (!row.record) continue
          res = await journeyBattleParamService.delete(row.record.id)
        } else {
          // 显式填值一律落库，默认值只是参考与重置口径，不参与保存覆盖判定
          // 已有同值启用行无需重复写；停用的历史行即使同值也恢复启用
          if (row.record && row.value === valueNum && row.record.enabled !== false) continue
          if (row.record) {
            res = await journeyBattleParamService.update(row.record.id, {
              value_num: valueNum,
              enabled: true,
            })
          } else {
            res = await journeyBattleParamService.create({
              group_code: groupCode,
              param_code: code,
              value_num: valueNum,
              value_text: null,
              enabled: true,
              remark: null,
            })
          }
        }
        if (!res.success) {
          failedCodes.push(code)
          handleApiError(res.errorMessage, `JourneyConfig-战斗参数-保存-${code}`)
          continue
        }
        changed++
      }
      /// 部分失败时保留弹窗，让运营看到失败项并重试，避免误判为全部保存成功。
      const failedLabels = failedCodes.map((code) => rowsByCode[code]?.label ?? code)
      if (failedCodes.length > 0) {
        message.warning(
          `已保存 ${changed} 项，${failedCodes.length} 项失败：${failedLabels.join('、')}。请重试失败项。`,
        )
        await loadRows()
        return
      }
      if (changed > 0) {
        message.success(`已保存 ${changed} 项变更`)
        setModalOpen(false)
        setEditingSub(null)
        await loadRows()
      } else {
        message.info('没有变更')
      }
    } catch (error) {
      handleApiError(error, 'JourneyConfig-战斗参数-保存')
    } finally {
      setSaving(false)
    }
  }

  /// 卡片只读信息表：参数 / 当前值 / 默认值。
  const columns: ColumnsType<ParamRow> = [
    {
      title: '参数',
      dataIndex: 'label',
      width: 170,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text>{row.label}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{row.code}</Text>
        </Space>
      ),
    },
    {
      title: '当前值',
      key: 'value',
      width: 120,
      render: (_, row) =>
        row.value === null ? (
          <Text type="secondary">默认 {row.def.default}</Text>
        ) : (
          <Text strong>{row.value}</Text>
        ),
    },
    {
      title: '默认值',
      key: 'default',
      width: 80,
      render: (_, row) => <Text type="secondary">{row.def.default}</Text>,
    },
  ]

  /// 弹窗整组编辑表：参数列只读，数值为表单项，name 用 [code, 字段] 嵌套路径。
  const editColumns: ColumnsType<ParamRow> = [
    {
      title: '参数',
      dataIndex: 'label',
      width: 190,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text>{row.label}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>默认 {row.def.default}</Text>
        </Space>
      ),
    },
    {
      title: '数值',
      key: 'value',
      width: 150,
      render: (_, row) => (
        <Form.Item name={[row.code, 'value']} noStyle>
          <InputNumber
            className={common.fullWidth}
            min={row.def.min}
            max={row.def.max}
            step={row.def.step}
            placeholder={String(row.def.default)}
          />
        </Form.Item>
      ),
    },
  ]

  const editRows = useMemo<ParamRow[]>(
    () => (editingSub?.params ?? []).map((code) => rowsByCode[code]).filter((r): r is ParamRow => !!r),
    [editingSub, rowsByCode],
  )

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message={group?.label ?? '战斗参数'}
        description={group?.intro}
      />
      <Card size="small" className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={loadRows} loading={loading}>刷新</Button>
            <Text type="secondary">
              已配置 {configuredCount} / {group?.params.length ?? 0} 项 · 未配置项回落 App 默认值
            </Text>
          </Space>
        </div>
      </Card>
      {loading ? (
        <div className={common.flexCenter} style={{ padding: '80px 0' }}>
          <Spin tip="加载战斗参数…" />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {subGroups.map((sub) => {
            const subRows = sub.params.map((code) => rowsByCode[code]).filter((r): r is ParamRow => !!r)
            const configured = subRows.filter((r) => r.record).length
            return (
              <Col key={sub.code} xs={24} xl={12}>
                <Card
                  size="small"
                  title={
                    <Space size={6} wrap>
                      <Text>{sub.label}</Text>
                      <Tag color="blue">{configured}/{subRows.length} 已配置</Tag>
                    </Space>
                  }
                  extra={
                    <Space size={4}>
                      <Popconfirm
                        title="重置本组参数？"
                        description={`「${sub.label}」下已配置的 ${configured} 项将删除并回落 App 默认值`}
                        okText="确认重置"
                        okButtonProps={{ danger: true, loading: resettingSub === sub.code }}
                        cancelText="取消"
                        disabled={!canDelete || configured === 0}
                        onConfirm={() => handleResetSub(sub)}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<ReloadOutlined />}
                          disabled={!canDelete || configured === 0 || resettingSub !== null}
                          loading={resettingSub === sub.code}
                        >
                          重置
                        </Button>
                      </Popconfirm>
                      <Button
                        size="small"
                        type="link"
                        icon={<EditOutlined />}
                        disabled={!canWrite || resettingSub !== null}
                        onClick={() => openEdit(sub)}
                      >
                        编辑
                      </Button>
                    </Space>
                  }
                >
                  {sub.intro && <Text type="secondary" style={{ fontSize: 12 }}>{sub.intro}</Text>}
                  <Table
                    className={common.mt8}
                    rowKey="key"
                    size="small"
                    tableLayout="fixed"
                    columns={columns}
                    dataSource={subRows}
                    pagination={false}
                  />
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
      <Modal
        title={`编辑 · ${editingSub?.label ?? ''}`}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => {
          setModalOpen(false)
          setEditingSub(null)
        }}
        destroyOnHidden
        width={720}
      >
        <Alert
          type="info"
          showIcon
          className={common.mb16}
          message="填写的值按原样保存（含与默认值相同的值）；只有留空才回落默认值。保存只提交发生变更的项。"
        />
        <Form key={formKey} form={form} layout="vertical" preserve={false} initialValues={formInitial}>
          <Table
            rowKey="key"
            size="small"
            tableLayout="fixed"
            columns={editColumns}
            dataSource={editRows}
            pagination={false}
          />
        </Form>
      </Modal>
    </div>
  )
}

export default JourneyBattleParamsTab
