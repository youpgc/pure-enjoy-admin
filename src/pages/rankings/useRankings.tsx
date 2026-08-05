// 排行榜状态与业务逻辑（从 Rankings.tsx 抽离，审查 P1 膨胀）
// 页面只负责组合渲染，所有状态/数据/处理器集中此处。
import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import dayjs from 'dayjs'
import { usePagination } from '../../hooks/usePagination'
import { apiQuery, apiExecute, handleApiError } from '../../utils/apiClient'
import { supabase } from '../../utils/supabase'
import { rankingService } from '../../services/rankingService'
import { useMounted } from '../../hooks/useMounted'
import { usePermission } from '../../hooks/usePermission'
import { PushpinOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import { type ActionButton } from '../../components/ActionColumn'
import type { RankingItem, RankingType, Intervention, RankingRules } from './types'
import { DEFAULT_RULES } from './types'

export const useRankings = () => {
  const mountedRef = useMounted()
  const [loading, setLoading] = useState(false)
  const [rankingType, setRankingType] = useState<RankingType>('weekly_reads')
  const [data, setData] = useState<RankingItem[]>([])
  const [lastRefresh, setLastRefresh] = useState<string>('-')
  const [intervention, setIntervention] = useState<Intervention>({ pin_ids: [], block_ids: [] })
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'pin' | 'block'>('pin')
  const [rulesModalOpen, setRulesModalOpen] = useState(false)
  const [rules, setRules] = useState<RankingRules>(DEFAULT_RULES)
  const { setTotal, tablePagination } = usePagination(20)

  // 写操作按钮级权限门控（与 feature_admin_permissions.sql 注册的权限码对应）
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('rankings:write')

  // 从服务端加载运营干预与规则配置（替代原 localStorage 持久化）
  useEffect(() => {
    (async () => {
      const [iv, rl] = await Promise.all([
        rankingService.getInterventions(),
        rankingService.getRules(),
      ])
      if (!mountedRef.current) return
      setIntervention(iv)
      if (rl) setRules(rl)
    })()
  }, [])

  const fetchRankings = useCallback(async () => {
    setLoading(true)
    try {
      const result = await apiQuery<RankingItem[]>(
        () =>
          supabase
            .from('mv_novel_rankings')
            .select(
              'novel_id, title, author, cover_url, category, status, total_reads, total_collects, avg_rating, rating_count, daily_reads, daily_collects, weekly_reads, weekly_collects, monthly_reads, monthly_collects, created_at, computed_at',
            )
            .order(rankingType, { ascending: false }),
        'Rankings-查询榜单',
      )
      if (result.success && result.data) {
        let list = result.data.filter((r) => !intervention.block_ids.includes(r.novel_id))

        // 应用榜单规则过滤
        if (rankingType === 'avg_rating') {
          list = list.filter((r) => r.rating_count >= rules.rating_min_count)
        }
        if (rankingType === 'new_books') {
          const thresholdDate = dayjs().subtract(rules.new_book_days_threshold, 'day')
          list = list.filter((r) => dayjs(r.created_at).isAfter(thresholdDate))
          list.sort(
            (a, b) => b.weekly_reads + b.weekly_collects - (a.weekly_reads + a.weekly_collects),
          )
        }

        // 置顶优先
        list.sort((a, b) => {
          const aPinned = intervention.pin_ids.includes(a.novel_id) ? 1 : 0
          const bPinned = intervention.pin_ids.includes(b.novel_id) ? 1 : 0
          return bPinned - aPinned
        })
        if (!mountedRef.current) return
        setData(list)
        setTotal(list.length)
      }
      setLastRefresh(dayjs().format('YYYY-MM-DD HH:mm:ss'))
    } catch (error) {
      handleApiError(error, 'Rankings-加载榜单')
    } finally {
      setLoading(false)
    }
  }, [
    rankingType,
    intervention.block_ids,
    intervention.pin_ids,
    rules.rating_min_count,
    rules.new_book_days_threshold,
    setTotal,
  ])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  const handleRefresh = async () => {
    try {
      await apiExecute(() => supabase.rpc('fn_refresh_rankings'), 'Rankings-刷新物化视图')
      message.success('榜单数据已刷新')
      fetchRankings()
    } catch (error) {
      handleApiError(error, 'Rankings-刷新物化视图')
    }
  }

  const handleExport = () => {
    const headers = ['排名', '小说ID', '小说名称', '作者', '分类', '阅读量', '收藏量', '评分', '评分人数']
    const rows = data.map((r, i) => [
      i + 1,
      r.novel_id,
      r.title,
      r.author || '-',
      r.category || '-',
      r.total_reads,
      r.total_collects,
      r.avg_rating,
      r.rating_count,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${c}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `排行榜_${rankingType}_${dayjs().format('YYYYMMDD')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const saveIntervention = async (type: 'pin' | 'block', ids: string[]) => {
    const key = type === 'pin' ? 'pin_ids' : 'block_ids'
    const newIntervention = { ...intervention, [key]: ids }
    setIntervention(newIntervention)
    const ok = await rankingService.saveInterventions(newIntervention.pin_ids, newIntervention.block_ids)
    if (ok) message.success(type === 'pin' ? '置顶已更新' : '屏蔽已更新')
    fetchRankings()
  }

  const saveRules = async (newRules: RankingRules) => {
    setRules(newRules)
    const ok = await rankingService.saveRules(newRules)
    if (ok) message.success('榜单规则已保存')
    fetchRankings()
  }

  const renderActions = (record: RankingItem): ActionButton[] => {
    const isPinned = intervention.pin_ids.includes(record.novel_id)
    const actions: ActionButton[] = []
    if (canWrite) {
      actions.push({
        key: 'pin',
        label: isPinned ? '取消置顶' : '置顶',
        icon: <PushpinOutlined />,
        type: isPinned ? ('primary' as const) : ('default' as const),
        onClick: () => {
          const ids = isPinned
            ? intervention.pin_ids.filter((id) => id !== record.novel_id)
            : [...intervention.pin_ids, record.novel_id]
          saveIntervention('pin', ids)
        },
      })
      actions.push({
        key: 'block',
        label: '屏蔽',
        icon: <EyeInvisibleOutlined />,
        danger: true,
        onClick: () => {
          if (!intervention.block_ids.includes(record.novel_id)) {
            saveIntervention('block', [...intervention.block_ids, record.novel_id])
          }
        },
      })
    }
    return actions
  }

  return {
    loading,
    rankingType,
    setRankingType,
    data,
    lastRefresh,
    intervention,
    modalOpen,
    setModalOpen,
    modalType,
    setModalType,
    rulesModalOpen,
    setRulesModalOpen,
    rules,
    setRules,
    tablePagination,
    canWrite,
    fetchRankings,
    handleRefresh,
    handleExport,
    saveIntervention,
    saveRules,
    renderActions,
  }
}
