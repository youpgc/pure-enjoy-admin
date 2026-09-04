import React, { useEffect, useMemo, useState } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Popconfirm,
  message,
  Space,
  Tag,
  Alert,
  Typography,
} from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase } from '../../utils/supabase'
import type { Database } from '../../types/database'
import { usePermission } from '../../hooks/usePermission'
import { gameDimensionService } from '../../services/gameService'
import type { DbGameDimension } from '../../types/database'
import {
  ACHIEVEMENT_SHARED_ICON_BASE,
  ACHIEVEMENT_ICON_OPTIONS,
} from '../../constants/game'
import common from '../../styles/common.module.css'
import styles from './GameAchievements.module.css'

type DbGameAchievement = Database['public']['Tables']['game_achievements']['Row']

const { Text } = Typography

// 成就图标：按 game_achievements.icon 令牌渲染（元素模板 + 进阶等级上色）
const ACH_ADV_COLORS: Record<number, string> = {
  1: '#90caf9', 2: '#4fc3f7', 3: '#4dd0e1', 4: '#81c784', 5: '#ffd54f', 6: '#ff8a65', 7: '#e57373',
}
const _svgCache = new Map<string, string>()
async function _loadSvg(url: string): Promise<string> {
  if (_svgCache.has(url)) return _svgCache.get(url)!
  const res = await fetch(url)
  const text = await res.text()
  _svgCache.set(url, text)
  return text
}
function AchievementIcon({ icon, size = 36 }: { icon?: string | null; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    if (!icon) { setSrc(null); return }
    let file = ''
    let color: string | null = null
    if (icon.startsWith('badge_') || icon.startsWith('ach_global_')) {
      file = `${icon}.svg`
    } else {
      const m = /^ach_([a-z0-9]+)_c(\d+)$/.exec(icon)
      if (m) {
        file = `ach_${m[1]}.svg`
        const rank = parseInt(m[2] ?? '1', 10) || 1
        color = ACH_ADV_COLORS[rank] ?? ACH_ADV_COLORS[1] ?? '#90caf9'
      }
    }
    if (!file) { setSrc(null); return }
    _loadSvg(`${ACHIEVEMENT_SHARED_ICON_BASE}/${file}`).then((raw) => {
      if (cancelled) return
      const svg = color ? raw.replace(/#ICON_MAIN/g, color) : raw
      setSrc(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`)
    })
    return () => { cancelled = true }
  }, [icon])
  if (!src) return <span style={{ width: size, height: size, display: 'inline-block' }} />
  return <img src={src} width={size} height={size} alt={icon ?? ''} />
}

// 条件类型（与 App 端 GameRewardService._meetsAchievement 的解析口径一致）
const COND_OPTIONS = [
  { value: 'first_clear', label: '任意通关（通关任意一关即达成）' },
  { value: 'score', label: '维度分数达到（通关时某维度值 ≥ 阈值）' },
  { value: 'level', label: '通关关卡号达到（通关第 N 关及以上）' },
]

// 成就图标改为独立 SVG 资产（与游戏图标分离）：文件即取值，后台经
// /game-achievements/<name>.svg 引用，与 App 端 assets/games/achievements 同一套文件。
// 选项来自 constants/game.ts 的 ACHIEVEMENT_ICON_OPTIONS。

/// 把 condition JSON 渲染成中文摘要（与 App 端解析口径一致）
function condSummary(cond: Record<string, any>): string {
  const type = cond?.type ?? 'first_clear'
  if (type === 'score') {
    return `${cond?.dimension ?? '?'} ≥ ${cond?.gte ?? '?'}`
  }
  if (type === 'level') {
    return `通关第 ${cond?.min_level_no ?? '?'} 关及以上`
  }
  return '任意通关'
}

/**
 * 游戏成就配置（game_achievements）。
 *
 * 成就是**独立于「积分奖励配置」的独立体系**：独立建表、独立判定
 * （App 端通关结算时按 condition 评估）、同一成就终身只发一次
 * （user_game_achievements 唯一索引兜底）；发放积分走 game_earn 流水，
 * 仍受单日上限（daily_limit）约束。积分奖励配置里的 achievement 枚举
 * 仅保留兼容旧数据，不再新增。
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
  const [form] = Form.useForm()

  // 列表筛选与分页
  const [nameFilter, setNameFilter] = useState('')
  const [gameFilter, setGameFilter] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadItems = async () => {
    setLoading(true)
    try {
      // 显式列（列名以 /d/workspace/sql/feature_create_games.sql 的建表 DDL 为准）
      const { data, error } = await supabase
        .from('game_achievements')
        .select(
          'id,game_id,code,name,description,icon,condition,reward_points,enabled,sort_order,created_at,updated_at'
        )
        .order('sort_order', { ascending: true })
      if (error) throw error
      setItems((data as DbGameAchievement[]) ?? [])
    } catch (e: any) {
      message.error('加载成就失败：' + (e?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('id,code,name')
        .eq('enabled', true)
      if (!error && data) {
        const list = data as { id: string; code: string; name: string }[]
        setGames(list)
        const map: Record<string, string> = {}
        list.forEach((g) => (map[g.id] = `${g.name}（${g.code}）`))
        setGameNameMap(map)
      }
    } catch {
      // 忽略：下拉仅辅助
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
  }, [])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (record: DbGameAchievement) => {
    setEditing(record)
    setModalOpen(true)
  }

  // condition JSON → 表单三个字段（类型 / 维度 / 阈值）
  const initialCond = useMemo(() => {
    const cond = (editing?.condition ?? {}) as Record<string, any>
    const type = cond?.type ?? 'first_clear'
    return {
      condType: type as string,
      condDimension: type === 'score' ? String(cond?.dimension ?? 'score') : undefined,
      condValue: type === 'score' ? (cond?.gte as number) : type === 'level' ? (cond?.min_level_no as number) : undefined,
    }
  }, [editing])

  // 表单初始值（弹窗真正打开后由 afterOpenChange 回显，避免 Modal 惰性挂载导致 setFieldsValue 无效）
  const formInitialValues = (): Record<string, any> => {
    if (editing) {
      return {
        game_id: editing.game_id ?? undefined,
        code: editing.code,
        name: editing.name,
        description: editing.description ?? '',
        icon: editing.icon ?? undefined,
        reward_points: editing.reward_points,
        enabled: editing.enabled,
        sort_order: editing.sort_order,
        ...initialCond,
      }
    }
    return { condType: 'first_clear', reward_points: 5, enabled: true, sort_order: 0 }
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      // 按条件类型组装 condition（与 App 端解析口径一致）
      let condition: Record<string, any> = {}
      if (values.condType === 'score') {
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
      // 写操作 cast any：项目 Database 类型未生成 Relationships 键，
      // supabase-js 会把 insert/update 参数推断为 never（与 utils/supabase.ts 同口径）。
      if (editing) {
        const { error } = await (supabase.from('game_achievements') as any)
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editing.id)
        if (error) throw error
        message.success('已更新')
      } else {
        const { error } = await (supabase.from('game_achievements') as any)
          .insert({ ...payload, updated_at: new Date().toISOString() })
        if (error) throw error
        message.success('已新增')
      }
      setModalOpen(false)
      await loadItems()
    } catch (e: any) {
      message.error('保存失败：' + (e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase.from('game_achievements') as any)
        .delete()
        .eq('id', id)
      if (error) throw error
      message.success('已删除')
      await loadItems()
    } catch (e: any) {
      message.error('删除失败：' + (e?.message ?? e))
    }
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
              App 端通关结算时按下方条件自动评估是否达成；同一成就<b>终身只发一次</b>（用户解锁记录唯一索引兜底）；
              奖励积分走 game_earn 流水，仍受「积分奖励配置」里的<b>单日上限</b>约束。
              积分奖励配置中的「成就达成」枚举仅兼容旧数据，请勿在其中新增。
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

      <Modal
        title={editing ? '编辑成就' : '新增成就'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        afterOpenChange={(open) => {
          // 修复编辑/新增弹窗表单串数据：Form.useForm 为单例，Modal 惰性挂载使 open 前
          // setFieldsValue 无效；弹窗真正打开（子组件已挂载）后重置并回显最新值。
          if (open) {
            form.resetFields()
            form.setFieldsValue(formInitialValues())
          }
        }}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          key={editing?.id ?? 'create'}
          initialValues={
            editing
              ? {
                  game_id: editing.game_id ?? undefined,
                  code: editing.code,
                  name: editing.name,
                  description: editing.description ?? '',
                  icon: editing.icon ?? undefined,
                  reward_points: editing.reward_points,
                  enabled: editing.enabled,
                  sort_order: editing.sort_order,
                  ...initialCond,
                }
              : { condType: 'first_clear', reward_points: 5, enabled: true, sort_order: 0 }
          }
        >
          <Form.Item
            name="game_id"
            label="所属游戏"
            rules={[{ required: true, message: '请选择游戏' }]}
          >
            <Select placeholder="选择游戏" options={gameOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item
            name="code"
            label="成就编码"
            rules={[{ required: true, message: '请输入编码' }]}
            tooltip="唯一标识，如 first_win / score_2048 / level_5；创建后建议不再修改"
          >
            <Input placeholder="如 first_win" />
          </Form.Item>
          <Form.Item name="name" label="成就名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如 首次获胜" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="成就说明，展示给玩家" />
          </Form.Item>
          <Form.Item name="icon" label="成就图标" tooltip="成就 SVG 文件名；与游戏图标分目录存放，未设置则展示默认图标">
            <Select
              placeholder="选择成就图标"
              options={ACHIEVEMENT_ICON_OPTIONS}
              allowClear
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="condType" label="达成条件类型" rules={[{ required: true, message: '请选择条件类型' }]}>
            <Select options={COND_OPTIONS} />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) =>
              prev.condType !== cur.condType || prev.game_id !== cur.game_id
            }
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('condType')
              if (type === 'score') {
                const gameId = getFieldValue('game_id')
                const dimOptions = dims
                  .filter((d) => !gameId || d.game_id === gameId)
                  .map((d) => ({ value: d.code, label: `${d.name}（${d.code}）` }))
                return (
                  <>
                    <Form.Item
                      name="condDimension"
                      label="达成维度"
                      rules={[{ required: true, message: '请选择维度' }]}
                    >
                      <Select
                        placeholder="选择维度"
                        options={dimOptions.length > 0 ? dimOptions : [{ value: 'score', label: 'score' }]}
                      />
                    </Form.Item>
                    <Form.Item
                      name="condValue"
                      label="达到阈值"
                      rules={[{ required: true, message: '请输入阈值' }]}
                    >
                      <InputNumber min={0} className={common.fullWidth} placeholder="如 2048" />
                    </Form.Item>
                  </>
                )
              }
              if (type === 'level') {
                return (
                  <Form.Item
                    name="condValue"
                    label="达到关卡号"
                    rules={[{ required: true, message: '请输入关卡号' }]}
                  >
                    <InputNumber min={1} className={common.fullWidth} placeholder="如 5" />
                  </Form.Item>
                )
              }
              return null
            }}
          </Form.Item>
          <Form.Item
            name="reward_points"
            label="奖励积分"
            tooltip="达成时发放；0 表示仅解锁不发分"
            rules={[{ required: true, message: '请输入奖励积分' }]}
          >
            <InputNumber min={0} className={common.fullWidth} addonAfter="分" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序号">
            <InputNumber min={0} className={common.fullWidth} />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default GameAchievements
