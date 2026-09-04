import React, { useEffect, useMemo, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Popconfirm,
  message,
  Space,
  Tag,
  Alert,
  Typography,
} from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { usePermission } from '../../hooks/usePermission'
import { gameAchievementService, gameDimensionService, gameService } from '../../services/gameService'
import type { Database, DbGameDimension } from '../../types/database'
import common from '../../styles/common.module.css'
import styles from './index.module.css'
import AchievementIcon from './AchievementIcon'
import AchievementFormModal from './AchievementFormModal'
import { condSummary, isV2ConditionOf } from './achievementMeta'

type DbGameAchievement = Database['public']['Tables']['game_achievements']['Row']

const { Text } = Typography

/**
 * 游戏成就配置（game_achievements）。
 *
 * 成就是**独立于「积分奖励配置」的独立体系**：独立建表、独立判定
 * （App 端通关结算时按 condition 评估）、同一成就终身只发一次
 * （user_game_achievements 唯一索引兜底）。v2 徽章化（q-0）后成就 =
 * 纯荣誉徽章，reward_points 全 0 仅解锁不发分；段位（mode_tier）由
 * App 端 GameBadgeService 评估解锁，后台仅维护定义（v2 条件类型只读保护）。
 *
 * 文件结构（游戏组模板）：index.tsx 容器 + AchievementIcon（图标渲染）
 * + AchievementFormModal（编辑弹窗）+ achievementMeta（条件常量/摘要）。
 */
const GameAchievements: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const [items, setItems] = useState<DbGameAchievement[]>([])
  const [games, setGames] = useState<{ id: string; code: string; name: string }[]>([])
  const [gameNameMap, setGameNameMap] = useState<Record<string, string>>({})
  const [dims, setDims] = useState<DbGameDimension[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DbGameAchievement | null>(null)
  const [saving, setSaving] = useState(false)

  // 列表筛选与分页
  const [nameFilter, setNameFilter] = useState('')
  const [gameFilter, setGameFilter] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadItems = async () => {
    setLoading(true)
    try {
      // 经 BaseService（列清单在 service 构造器统一维护）
      const res = await gameAchievementService.findAll()
      if (!res.success) {
        message.error('加载成就失败：' + (res.errorMessage ?? '未知错误'))
        return
      }
      setItems(res.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  const loadGames = async () => {
    const res = await gameService.findAll((q) => q.eq('enabled', true))
    if (res.success && res.data) {
      const list = res.data.map((g) => ({ id: g.id, code: g.code, name: g.name }))
      setGames(list)
      const map: Record<string, string> = {}
      list.forEach((g) => (map[g.id] = `${g.name}（${g.code}）`))
      setGameNameMap(map)
    }
  }

  const loadDims = async () => {
    const res = await gameDimensionService.findAll()
    if (res.success && res.data) setDims(res.data)
  }

  useEffect(() => {
    loadItems()
    loadGames()
    loadDims()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (record: DbGameAchievement) => {
    setEditing(record)
    setModalOpen(true)
  }

  // 按条件类型组装 condition（与 App 端解析口径一致）；
  // v2 徽章条件（mode_tier 等）暂不支持编辑，原样保留防破坏。
  const handleSave = async (values: Record<string, any>) => {
    setSaving(true)
    try {
      let condition: Record<string, any> = {}
      if (isV2ConditionOf(editing?.condition) && editing) {
        condition = (editing.condition as Record<string, any>) ?? {}
      } else if (values.condType === 'score') {
        condition = { type: 'score', dimension: values.condDimension, gte: Number(values.condValue) }
      } else if (values.condType === 'level') {
        condition = { type: 'level', min_level_no: Number(values.condValue) }
      } else {
        condition = { type: 'first_clear' }
      }
      const payload = {
        game_id: values.game_id,
        code: values.code,
        name: values.name,
        description: values.description || null,
        icon: values.icon || null,
        condition,
        reward_points: Number(values.reward_points) || 0,
        enabled: !!values.enabled,
        sort_order: Number(values.sort_order) || 0,
      }
      // 写操作经 BaseService（统一审计/错误处理）；
      // Database 类型未生成 Relationships 键，payload cast any（与 utils/supabase.ts 同口径）。
      const res = editing
        ? await gameAchievementService.update(editing.id, {
            ...payload,
            updated_at: new Date().toISOString(),
          } as any)
        : await gameAchievementService.create({
            ...payload,
            updated_at: new Date().toISOString(),
          } as any)
      if (!res.success) return // service 已统一弹窗 + 记日志
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadItems()
    } catch (e: any) {
      message.error('保存失败：' + (e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await gameAchievementService.delete(id)
    if (!res.success) return // service 已统一弹窗 + 记日志
    message.success('已删除')
    await loadItems()
  }

  const gameOptions = useMemo(
    () => games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` })),
    [games]
  )

  // 客户端筛选：名称模糊匹配 + 游戏（含「全局」）
  const filteredItems = useMemo(() => {
    const kw = nameFilter.trim().toLowerCase()
    return items.filter((it) => {
      if (kw && !(it.name ?? '').toLowerCase().includes(kw)) return false
      if (gameFilter === 'global') {
        if (it.game_id) return false
      } else if (gameFilter) {
        if (it.game_id !== gameFilter) return false
      }
      return true
    })
  }, [items, nameFilter, gameFilter])

  const columns: ColumnsType<DbGameAchievement> = [
    {
      title: '游戏',
      dataIndex: 'game_id',
      width: 140,
      render: (v: string | null) => (v ? (gameNameMap[v] ?? v) : <Tag>全局</Tag>),
    },
    { title: '编码', dataIndex: 'code', width: 140, render: (v: string) => <Tag>{v}</Tag> },
    { title: '名称', dataIndex: 'name', width: 220, ellipsis: true },
    {
      title: '图标',
      dataIndex: 'icon',
      width: 90,
      // 图标按 game_achievements.icon 令牌渲染（元素模板 + 进阶等级上色），与 App 端一致。
      render: (_: unknown, record: DbGameAchievement) =>
        record.icon ? (
          <AchievementIcon icon={record.icon} size={30} />
        ) : (
          '-'
        ),
    },
    {
      title: '达成条件',
      key: 'condition',
      render: (_: unknown, record: DbGameAchievement) =>
        condSummary((record.condition ?? {}) as Record<string, any>),
    },
    {
      title: '奖励积分',
      dataIndex: 'reward_points',
      width: 90,
      render: (v: number) => (v > 0 ? <Tag color="gold">+{v}分</Tag> : <Text type="secondary">仅解锁</Text>),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: DbGameAchievement) => (
        <Space>
          <Button size="small" disabled={!canWrite} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该成就？"
            onConfirm={() => handleDelete(record.id)}
            disabled={!canDelete}
          >
            <Button size="small" danger disabled={!canDelete}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="游戏成就配置说明"
        description={
          <div className={styles.alertDesc}>
            <p className={styles.para}>
              <b>与「积分奖励配置」的关系：</b>成就是独立于积分奖励规则的独立体系——独立建表、独立判定、独立维护。
              App 端通关结算时按下方条件自动评估是否达成；同一成就<b>终身只发一次</b>（用户解锁记录唯一索引兜底）。
            </p>
            <div className={styles.para}>
              <b>如何配置：</b>选择所属游戏 → 填写成就编码（唯一，如 first_win）与名称 → 选择达成条件类型 →
              填写奖励积分 → 启用即生效，无需重启 App。
              <ul className={styles.bulletList}>
                <li><b>任意通关</b>：通关任意一关即达成；适合「首胜」类成就。</li>
                <li><b>维度分数达到</b>：选择维度（来自「游戏与维度配置」的维度编码，如 score）与阈值，通关时该维度值 ≥ 阈值即达成；适合「单局得分 2048」类成就。</li>
                <li><b>通关关卡号达到</b>：通关的关卡号 ≥ N 即达成；适合「通过第 5 关」类进阶成就。</li>
              </ul>
            </div>
            <p className={styles.para}>
              <b>奖励积分：</b>达成时发放的积分；填 0 表示仅解锁成就、不发积分。
            </p>
          </div>
        }
      />
      <div
        className={styles.toolbar}
      >
        <Space wrap>
          <Input.Search
            placeholder="模糊搜索成就名称"
            allowClear
            value={nameFilter}
            onChange={(e) => {
              setNameFilter(e.target.value)
              setPage(1)
            }}
            className={styles.searchInput}
          />
          <Select
            placeholder="按游戏筛选"
            allowClear
            value={gameFilter}
            onChange={(v) => {
              setGameFilter(v)
              setPage(1)
            }}
            options={[{ value: 'global', label: '全局（无所属游戏）' }, ...gameOptions]}
            className={styles.gameSelect}
            showSearch
            optionFilterProp="label"
          />
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => loadItems()}
          >
            刷新
          </Button>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!canWrite}
          onClick={openCreate}
        >
          新增成就
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filteredItems}
        pagination={{
          current: page,
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p: number, ps: number) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
        size="middle"
        scroll={{ x: 'max-content' }}
      />

      <AchievementFormModal
        open={modalOpen}
        editing={editing}
        gameOptions={gameOptions}
        dims={dims}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default GameAchievements
