// Feedback 数据/操作逻辑 Hook（从 Feedback.tsx 抽取，行为保持）
import { useState, useCallback, useEffect } from 'react'
import { message } from 'antd'
import { HistoryOutlined, DeleteOutlined } from '@ant-design/icons'
import { usePermission } from '../../hooks/usePermission'
import { useMounted } from '../../hooks/useMounted'
import { usePagination } from '../../hooks/usePagination'
import { useDictOptions, useDictColors } from '../../hooks/useDictOptions'
import { feedbackService } from '../../services/feedbackService'
import { ACTION_TAG_MAP } from './actionMeta'
import {
  FEEDBACK_ACTION_DELETED,
  FEEDBACK_STATUS_ACTIONS,
} from '../../constants'
import type { ActionButton } from '../../components/ActionColumn'
import type { FeedbackRecord } from './types'

export function useFeedback() {
  const { hasPermission } = usePermission()
  const mountedRef = useMounted()

  // 列表数据
  const [data, setData] = useState<FeedbackRecord[]>([])
  const [loading, setLoading] = useState(false)
  const { pagination, setTotal, tablePagination, handlePageChange } = usePagination(20)

  // 字典查询
  const { options: statusOptions } = useDictOptions('feedback_status', [])
  const { options: categoryOptions } = useDictOptions('feedback_category', [])
  const { options: actionOptions } = useDictOptions('feedback_action', [])
  const { getColor: getStatusColor } = useDictColors('feedback_status')
  const { getColor: getCategoryColor } = useDictColors('feedback_category')
  const { getColor: getActionColor } = useDictColors('feedback_action')

  // 弹窗状态
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [flowModalOpen, setFlowModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<FeedbackRecord | null>(null)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // 加载数据
  const fetchData = useCallback(async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    try {
      const result = await feedbackService.paginateFeedback(page, pageSize)
      if (!result.success) {
        console.error('获取反馈列表失败:', result.errorMessage)
        message.error('获取反馈列表失败')
        return
      }
      if (!mountedRef.current) return
      setData(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      console.error('获取反馈列表失败:', error)
      message.error('获取反馈列表失败')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, setTotal])

  useEffect(() => {
    if (hasPermission('feedback:read')) fetchData()
  }, [hasPermission, fetchData])

  // 执行状态流转
  const handleAction = async (remark: string) => {
    if (!selectedRecord || !selectedAction) return

    // 删除操作不需要 remark（但弹窗中已设为必填）
    if (!remark.trim() && selectedAction !== FEEDBACK_ACTION_DELETED) {
      message.warning('请输入备注说明')
      return
    }

    setActionLoading(true)
    try {
      // 获取操作人信息
      const adminUserStr = localStorage.getItem('admin_user')
      const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null
      const operatorId = adminUser?.id || adminUser?.user_id || 'system'
      const operatorName = adminUser?.nickname || adminUser?.username || '管理员'

      let result
      if (selectedAction === FEEDBACK_ACTION_DELETED) {
        result = await feedbackService.softDelete(
          selectedRecord.id,
          remark.trim() || '删除反馈记录',
          operatorId,
          operatorName
        )
      } else {
        result = await feedbackService.updateStatus(
          selectedRecord.id,
          selectedAction,
          remark.trim(),
          operatorId,
          operatorName
        )
      }

      if (!result.success) {
        message.error(result.errorMessage || '操作失败')
        return
      }

      const actionLabel = (() => {
        const dictOpt = actionOptions.find(opt => opt.value === selectedAction)
        const fallback = ACTION_TAG_MAP[selectedAction]
        return dictOpt?.label || fallback?.label || selectedAction
      })()
      message.success(`${actionLabel}成功`)

      setActionModalOpen(false)
      setSelectedRecord(null)
      setSelectedAction(null)
      fetchData(pagination.current, pagination.pageSize)
    } catch (error: unknown) {
      console.error('操作失败:', error)
      const errMsg = error instanceof Error ? error.message : '未知错误'
      message.error(`操作失败: ${errMsg}`)
    } finally {
      setActionLoading(false)
    }
  }

  // 打开操作弹窗
  const openActionModal = (record: FeedbackRecord, action: string) => {
    if (!hasPermission('feedback:write')) {
      message.warning('您没有操作反馈的权限')
      return
    }
    setSelectedRecord(record)
    setSelectedAction(action)
    setActionModalOpen(true)
  }

  // 构建操作列按钮
  const buildActions = useCallback((record: FeedbackRecord): ActionButton[] => {
    const actions = FEEDBACK_STATUS_ACTIONS[record.status] || []
    const buttons: ActionButton[] = actions.map((action: string) => {
      const dictOpt = actionOptions.find(opt => opt.value === action)
      const fallback = ACTION_TAG_MAP[action]
      const config = {
        color: getActionColor(action) || fallback?.color || 'default',
        label: dictOpt?.label || fallback?.label || action,
        icon: fallback?.icon || null,
      }
      return {
        key: action,
        label: config.label,
        icon: config.icon,
        onClick: () => openActionModal(record, action),
      }
    })

    buttons.push({
      key: 'history',
      label: '流转记录',
      icon: <HistoryOutlined />,
      onClick: () => {
        setSelectedRecord(record)
        setFlowModalOpen(true)
      },
    })

    if (hasPermission('feedback:delete')) {
      buttons.push({
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => openActionModal(record, FEEDBACK_ACTION_DELETED),
      })
    }

    return buttons
  }, [hasPermission, actionOptions, getActionColor])

  const closeActionModal = useCallback(() => {
    setActionModalOpen(false)
    setSelectedRecord(null)
    setSelectedAction(null)
  }, [])

  const closeFlowModal = useCallback(() => {
    setFlowModalOpen(false)
    setSelectedRecord(null)
  }, [])

  return {
    data,
    loading,
    tablePagination,
    handlePageChange,
    statusOptions,
    categoryOptions,
    getStatusColor,
    getCategoryColor,
    selectedRecord,
    selectedAction,
    actionModalOpen,
    flowModalOpen,
    actionLoading,
    fetchData,
    handleAction,
    openActionModal,
    buildActions,
    closeActionModal,
    closeFlowModal,
  }
}
