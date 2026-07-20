// Feedback 流转记录弹窗（从 Feedback.tsx 抽取，行为保持）
import { Modal, Button, Empty, Tag, Space, Timeline } from 'antd'
import { HistoryOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import { formatDateTime } from '../../utils/format'
import { useDictOptions, useDictColors } from '../../hooks/useDictOptions'
import { useMounted } from '../../hooks/useMounted'
import { FEEDBACK_STATUS_MAP } from '../../constants'
import { ACTION_TAG_MAP } from './actionMeta'
import type { FeedbackRecord, FlowRecord } from './types'

interface FlowHistoryModalProps {
  open: boolean
  record: FeedbackRecord | null
  onClose: () => void
}

export function FlowHistoryModal({ open, record, onClose }: FlowHistoryModalProps) {
  const mountedRef = useMounted()
  const [records, setRecords] = useState<FlowRecord[]>([])
  const [loading, setLoading] = useState(false)
  const { options: actionOptions } = useDictOptions('feedback_action', [])
  const { options: statusOptions } = useDictOptions('feedback_status', [])
  const { getColor: getActionColor } = useDictColors('feedback_action')
  const { getColor: getStatusColor } = useDictColors('feedback_status')

  const getStatusLabel = (status: string) => {
    const dictOpt = statusOptions.find(opt => opt.value === status)
    const fallback = FEEDBACK_STATUS_MAP[status]
    return dictOpt?.label || fallback?.label || status
  }
  const getStatusColorValue = (status: string) => {
    return getStatusColor(status) || FEEDBACK_STATUS_MAP[status]?.color || 'default'
  }

  useEffect(() => {
    if (open && record) {
      setLoading(true)
      supabase
        .from('feedback_flow_records')
        .select('id, feedback_id, action, remark, operator_id, operator_name, created_at')
        .eq('feedback_id', record.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) console.error('获取流转记录失败:', error)
          if (!mountedRef.current) return
          setRecords(data || [])
          setLoading(false)
        })
    }
  }, [open, record])

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          <span>流转记录</span>
          {record && <Tag color={getStatusColorValue(record.status)}>{getStatusLabel(record.status)}</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={560}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
      ) : records.length === 0 ? (
        <Empty description="暂无流转记录" />
      ) : (
        <Timeline
          items={records.map((r) => {
            const dictOpt = actionOptions.find(opt => opt.value === r.action)
            const fallback = ACTION_TAG_MAP[r.action]
            const config = {
              color: getActionColor(r.action) || fallback?.color || 'default',
              label: dictOpt?.label || fallback?.label || r.action,
              icon: fallback?.icon || null,
            }
            return {
              color: config.color,
              children: (
                <div key={r.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Tag color={config.color} style={{ margin: 0 }}>
                      {config.icon} {config.label}
                    </Tag>
                    <span style={{ color: '#999', fontSize: 12 }}>{formatDateTime(r.created_at)}</span>
                    {r.operator_name && (
                      <span style={{ color: '#666', fontSize: 12 }}>操作人: {r.operator_name}</span>
                    )}
                  </div>
                  {r.remark && (
                    <div style={{
                      background: '#f5f5f5', padding: '8px 12px', borderRadius: 6,
                      fontSize: 13, color: '#333', marginTop: 4
                    }}>
                      {r.remark}
                    </div>
                  )}
                </div>
              ),
            }
          })}
        />
      )}
    </Modal>
  )
}
