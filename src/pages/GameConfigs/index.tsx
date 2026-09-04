import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  message,
  Select,
  Typography,
  Tabs,
  Empty,
} from 'antd'
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons'
import { handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { usePermission } from '../../hooks/usePermission'
import { gameService, gameDimensionService } from '../../services/gameService'
import type { DbGame, DbGameDimension } from '../../types/database'
import styles from './index.module.css'
import common from '../../styles/common.module.css'
import { buildGameColumns, buildDimColumns } from './columns'
import ConfigFormModal from './ConfigFormModal'

const { Text } = Typography

/**
 * 游戏与维度配置（games + game_dimensions，双 Tab）。
 *
 * 文件结构（游戏组模板）：index.tsx 容器（状态/加载/保存）
 * + columns.tsx（两 Tab 列定义）+ ConfigFormModal.tsx（双模式编辑弹窗）。
 */
const GameConfigs: React.FC = () => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const [activeTab, setActiveTab] = useState<'games' | 'dimensions'>('games')

  // ---- 游戏（Tab1） ----
  const [games, setGames] = useState<DbGame[]>([])
  const [gameSearch, setGameSearch] = useState('')
  const gamePager = usePagination()

  // ---- 维度（Tab2） ----
  const [dimensions, setDimensions] = useState<DbGameDimension[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const dimPager = usePagination()

  // ---- 公共 ----
  const [loading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<DbGame | DbGameDimension | null>(null)
  const [saving, setSaving] = useState(false)

  // ========== 加载游戏列表（Tab1 + Tab2 选择器公共数据） ==========
  const loadGames = useCallback(async () => {
    try {
      const result = await gameService.paginate(gamePager.pagination.current, gamePager.pagination.pageSize, (q) => {
        if (gameSearch) {
          return q.or(`code.ilike.%${gameSearch}%,name.ilike.%${gameSearch}%`)
        }
        return q
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'GameConfigs-加载游戏')
        return
      }
      if (!mountedRef.current) return
      setGames(result.data?.data || [])
      gamePager.setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'GameConfigs-加载游戏')
    }
  }, [gameSearch, gamePager.pagination.current, gamePager.pagination.pageSize, gamePager.setTotal])

  // ========== 加载维度列表（Tab2，按所选游戏） ==========
  const loadDimensions = useCallback(async () => {
    if (!selectedGameId) {
      setDimensions([])
      return
    }
    try {
      const result = await gameDimensionService.paginateByGame(
        selectedGameId,
        dimPager.pagination.current,
        dimPager.pagination.pageSize
      )
      if (!result.success) {
        handleApiError(result.errorMessage, 'GameConfigs-加载维度')
        return
      }
      if (!mountedRef.current) return
      setDimensions(result.data?.data || [])
      dimPager.setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'GameConfigs-加载维度')
    }
  }, [selectedGameId, dimPager.pagination.current, dimPager.pagination.pageSize, dimPager.setTotal])

  // Tab1 数据随搜索/分页刷新
  useEffect(() => {
    if (activeTab === 'games') {
      loadGames()
    }
  }, [activeTab, loadGames])

  // 进入 Tab2 或切换游戏时刷新维度
  useEffect(() => {
    if (activeTab === 'dimensions') {
      loadDimensions()
    }
  }, [activeTab, loadDimensions])

  // 首次进入即拉一份游戏清单（供 Tab2 选择器），不覆盖 Tab1 分页
  useEffect(() => {
    let cancelled = false
    gameService.findAll((q) => q.eq('enabled', true)).then((res) => {
      if (!cancelled && res.success && res.data && res.data.length > 0 && !selectedGameId) {
        const firstId = res.data[0]?.id
        if (firstId) setSelectedGameId(firstId)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const refreshCurrent = () => {
    if (activeTab === 'games') loadGames()
    else loadDimensions()
  }

  // ========== 弹窗 ==========
  const openAdd = () => {
    setEditing(null)
    setModalVisible(true)
  }

  const openEdit = (record: DbGame | DbGameDimension) => {
    setEditing(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const service = activeTab === 'games' ? gameService : gameDimensionService
      const result = await service.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'GameConfigs-删除')
        return
      }
      message.success('删除成功')
      refreshCurrent()
    } catch (error) {
      handleApiError(error, 'GameConfigs-删除')
    }
  }

  const handleSave = async (values: Record<string, any>) => {
    if (saving) return
    try {
      setSaving(true)
      if (activeTab === 'games') {
        const payload: Record<string, any> = { ...values }
        // config 为 jsonb：把文本框 JSON 字符串解析为对象
        try {
          payload.config = values.config ? JSON.parse(values.config) : {}
        } catch {
          message.error('配置(config)不是合法 JSON')
          setSaving(false)
          return
        }
        const result = editing
          ? await gameService.update(editing.id, payload)
          : await gameService.create(payload as any)
        if (!result.success) {
          handleApiError(result.errorMessage, editing ? 'GameConfigs-更新游戏' : 'GameConfigs-创建游戏')
          return
        }
        message.success('保存成功')
      } else {
        const result = editing
          ? await gameDimensionService.update(editing.id, values)
          : await gameDimensionService.create(values as any)
        if (!result.success) {
          handleApiError(result.errorMessage, editing ? 'GameConfigs-更新维度' : 'GameConfigs-创建维度')
          return
        }
        message.success('保存成功')
      }
      setModalVisible(false)
      setEditing(null)
      refreshCurrent()
    } catch (error) {
      handleApiError(error, 'GameConfigs-保存')
    } finally {
      setSaving(false)
    }
  }

  // 行内启停（游戏 Tab 状态列）
  const handleToggleEnabled = async (record: DbGame, next: boolean) => {
    const r = await gameService.update(record.id, { enabled: next })
    if (!r.success) handleApiError(r.errorMessage, 'GameConfigs-切换状态')
    else loadGames()
  }

  const columnsOps = {
    canWrite,
    canDelete,
    onEdit: openEdit,
    onDelete: handleDelete,
    onToggleEnabled: handleToggleEnabled,
  }

  return (
    <div className={common.p24}>
      <Card className={common.mb16}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'games' | 'dimensions')}
          items={[
            { key: 'games', label: '游戏配置' },
            { key: 'dimensions', label: '成绩维度配置' },
          ]}
        />
      </Card>

      {activeTab === 'games' ? (
        <>
          <Card className={common.mb16}>
            <Space wrap>
              <Input
                placeholder="搜索编码/名称"
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                onPressEnter={() => {
                  gamePager.resetPage()
                  loadGames()
                }}
                prefix={<SearchOutlined />}
                className={styles.sel300}
                allowClear
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={() => { gamePager.resetPage(); loadGames() }}>
                搜索
              </Button>
            </Space>
          </Card>
          <div className={styles.toolbar}>
            <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite} onClick={openAdd}>
              新增游戏
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadGames} loading={loading}>
              刷新
            </Button>
          </div>
          <Table
            columns={buildGameColumns(columnsOps)}
            dataSource={games}
            rowKey="id"
            loading={loading}
            pagination={gamePager.tablePagination}
            scroll={{ x: 'max-content' }}
          />
        </>
      ) : (
        <>
          <Card className={common.mb16}>
            <Space wrap>
              <Text>选择游戏：</Text>
              <Select
                className={styles.sel240}
                placeholder="请选择游戏"
                value={selectedGameId || undefined}
                onChange={(v) => {
                  setSelectedGameId(v)
                  dimPager.resetPage()
                  loadDimensions()
                }}
                options={games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
              />
            </Space>
          </Card>
          {selectedGameId ? (
            <>
              <div className={styles.toolbar}>
                <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite} onClick={openAdd}>
                  新增维度
                </Button>
                <Button icon={<ReloadOutlined />} onClick={loadDimensions} loading={loading}>
                  刷新
                </Button>
              </div>
              <Table
                columns={buildDimColumns(columnsOps)}
                dataSource={dimensions}
                rowKey="id"
                loading={loading}
                pagination={dimPager.tablePagination}
                scroll={{ x: 'max-content' }}
              />
            </>
          ) : (
            <Empty description="请先创建游戏后再配置维度" />
          )}
        </>
      )}

      <ConfigFormModal
        open={modalVisible}
        activeTab={activeTab}
        editing={editing as Record<string, any> | null}
        games={games}
        selectedGameId={selectedGameId}
        saving={saving}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

export default GameConfigs
