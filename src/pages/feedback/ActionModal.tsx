// Feedback 状态流转弹窗（从 Feedback.tsx 抽取，行为保持）
import { Modal, Input, Tag, Space } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { useDictOptions, useDictColors } from '../../hooks/useDictOptions'
import { FEEDBACK_STATUS_MAP, FEEDBACK_ACTION_DELETED } from '../../constants'
import { ACTION_TAG_MAP } from './actionMeta'
import type { FeedbackRecord } from './types'

interface ActionModalProps {
  open: boolean
  record: FeedbackRecord | null
  action: string | null
  onClose: () => void
  onConfirm: (remark: string) => void
  loading: boolean
}

export function ActionModal({ open, record, action, onClose, onConfirm, loading }: ActionModalProps) {
  const [remark, setRemark] = useState('')
  const { options: actionOptions } = useDictOptions('feedback_action', [])
  const { options: statusOptions } = useDictOptions('feedback_status', [])
  const { getColor: getActionColor } = useDictColors('feedback_action')
  const { getColor: getStatusColor } = useDictColors('feedback_status')
  const actionConfig = action
    ? (() => {
        const dictOpt = actionOptions.find(opt => opt.value === action)
        const fallback = ACTION_TAG_MAP[action]
        if (!dictOpt && !fallback) return null
        return {
          color: getActionColor(action) || fallback?.color || 'default',
          label: dictOpt?.label || fallback?.label || action,
          icon: fallback?.icon || null,
        }
      })()
    : null

  const getStatusLabel = (status: string) => {
    const dictOpt = statusOptions.find(opt => opt.value === status)
    const fallback = FEEDBACK_STATUS_MAP[status]
    return dictOpt?.label || fallback?.label || status
  }
  const getStatusColorValue = (status: string) => {
    return getStatusColor(status) || FEEDBACK_STATUS_MAP[status]?.color || 'default'
  }

  useEffect(() => {
    if (open) setRemark('')
  }, [open])

  if (!record || !action || !actionConfig) return null

  return (
    <Modal
      title={
        <Space>
          {actionConfig.icon}
          <span>{actionConfig.label}反馈</span>
          <Tag color={getStatusColorValue(record.status)}>
            {getStatusLabel(record.status)}
          </Tag>
          <span style={{ color: '#999' }}>→</span>
          <Tag color={action === FEEDBACK_ACTION_DELETED ? getStatusColorValue(record.status) : getStatusColorValue(action)}>
            {action === FEEDBACK_ACTION_DELETED ? '删除' : getStatusLabel(action)}
          </Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={() => onConfirm(remark)}
      confirmLoading={loading}
      okText="确认"
      cancelText="取消"
      width={480}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{record.title}</div>
        {record.description && (
          <div style={{ color: '#666', fontSize: 13 }}>{record.description}</div>
        )}
      </div>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>
        <ExclamationCircleOutlined style={{ marginRight: 4, color: '#faad14' }} />
        备注说明（必填）
      </div>
      <Input.TextArea
        rows={3}
        placeholder={`请输入${actionConfig.label}原因/备注...`}
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        maxLength={500}
        showCount
      />
    </Modal>
  )
}
