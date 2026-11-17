// 全局游戏元数据缓存（games / modes / dimensions）。
//
// 用途：后台「道具管理 / 成绩看板 / 关卡 / 维度」等多页共用游戏名、
//       模式名、维度名映射，在此集中加载并缓存，避免各页重复请求以及
//       映射就绪前后的二次重查。
//
// 本模块用「模块级单例 Promise + 内存缓存」保证整个后台会话内只请求一次，
// 之后所有页面直接复用，不再重复调度接口。配置（非用户数据）适合此模式。
//
// 仅暴露只读映射；若配置确有变更，调用 refreshGameMeta() 主动失效重拉。
//
// 关卡表（game_levels 全量 1900+ 行）不进本缓存：仅成绩看板需要关卡名/
// 关卡 config，其余页只需 games/modes/dimensions。关卡改为按需加载——
// 成绩行自身的关卡由 DB 侧内嵌关联随分页返回，看板兜底只需各模式首关
// （见 useGameBaseLevels），避免为不需要的行付出全量拉取代价。

import { useEffect, useState } from 'react'
import { gameService, gameLevelService, gameDimensionService, gameModeService } from '../services/gameService'
import type { DbGame, DbGameLevel, DbGameDimension, DbGameMode } from '../types/database'

export interface GameMeta {
  games: DbGame[]
  modes: DbGameMode[]
  dimensions: DbGameDimension[]
  // 按 id（成绩看板用 game_id 关联）
  gameMapById: Record<string, DbGame>
  // 按 code（道具管理用 game_code 关联）
  gameMapByCode: Record<string, DbGame>
  // 按所属游戏分组（成绩看板模式筛选联动）
  modesByGameId: Record<string, DbGameMode[]>
  dimMap: Record<string, DbGameDimension>
}

let metaPromise: Promise<GameMeta> | null = null
let metaCache: GameMeta | null = null

// 订阅机制（2026-09-10 审查修复）：配置写操作后调用 refreshGameMeta() 失效重拉，
// 已挂载页面经 listeners 同步拿到新 meta——此前 refreshGameMeta 无人调用、
// useGameMeta 只在挂载时取值，配置变更后整个会话内映射永不更新。
const listeners = new Set<(m: GameMeta | null) => void>()

// 各表独立容错：单表失败只缺该表映射，不让整个 meta 变 null。
async function fetchMeta(): Promise<GameMeta> {
  const [gRes, mRes, dRes] = await Promise.all([
    gameService.findAll(),
    gameModeService.findAllModes(),
    gameDimensionService.findAll(),
  ])
  const games = (gRes.success ? (gRes.data as DbGame[] | null) : null) || []
  const modes = (mRes.success ? (mRes.data as DbGameMode[] | null) : null) || []
  const dimensions = (dRes.success ? (dRes.data as DbGameDimension[] | null) : null) || []

  const gameMapById: Record<string, DbGame> = {}
  const gameMapByCode: Record<string, DbGame> = {}
  games.forEach((g) => {
    gameMapById[g.id] = g
    gameMapByCode[g.code] = g
  })
  const dimMap: Record<string, DbGameDimension> = {}
  dimensions.forEach((d) => {
    dimMap[d.id] = d
  })

  const modesByGameId: Record<string, DbGameMode[]> = {}
  modes.forEach((m) => {
    ;(modesByGameId[m.game_id] ??= []).push(m)
  })

  return { games, modes, dimensions, gameMapById, gameMapByCode, modesByGameId, dimMap }
}

// 单例：首次调用触发请求，之后复用同一 Promise（StrictMode 双调用也不会重复请求）。
// 2026-09-10 审查修复：失败时把 metaPromise 置回 null，允许下次挂载重试——
// 此前 rejected Promise 会被永久复用，首次拉取失败后所有页面 meta 恒为 null。
export function getGameMeta(): Promise<GameMeta> {
  if (!metaPromise) {
    metaPromise = fetchMeta()
      .then((m) => {
        metaCache = m
        listeners.forEach((l) => l(m))
        return m
      })
      .catch((e) => {
        metaPromise = null
        throw e
      })
  }
  return metaPromise
}

// 主动失效并重拉（游戏/模式/关卡/维度写操作成功后调用），已挂载页面同步刷新。
export function refreshGameMeta(): Promise<GameMeta> {
  metaPromise = null
  metaCache = null
  return getGameMeta()
}

// React hook：组件挂载即拿到已缓存的 meta（可能为 null，加载完成后自动更新）；
// 订阅变更：其他页面写配置触发 refreshGameMeta 后，本页自动拿到新映射。
export function useGameMeta(): GameMeta | null {
  const [meta, setMeta] = useState<GameMeta | null>(metaCache)
  useEffect(() => {
    let cancelled = false
    const listener = (m: GameMeta | null) => {
      if (!cancelled) setMeta(m)
    }
    listeners.add(listener)
    getGameMeta()
      .then((m) => {
        if (!cancelled) setMeta(m)
      })
      .catch(() => {
        // 失败保持 null，交由页面空态兜底；下次挂载经 getGameMeta 重试
      })
    return () => {
      cancelled = true
      listeners.delete(listener)
    }
  }, [])
  return meta
}

// ==================== 模式首关（按需加载，不进共享 meta） ====================
//
// 成绩看板「通关条件」列在成绩行无 level_id 时（无尽会话 / 合成关），
// 需用所属模式的首关（level_no = 1）config/target 兜底推导条件。
// 只需每个模式这一档关卡，不必拉全量关卡表（1900+ 行，含 config/target
// 两个 jsonb，单次请求体积近 250KB）。
//
// 成绩行自身引用的关卡（关卡名 / 条件）由 DB 侧内嵌关联随分页返回，
// 见 GameScoreService.paginateWithLevels。

let baseLevelsPromise: Promise<DbGameLevel[]> | null = null
let baseLevelsCache: DbGameLevel[] | null = null

// 关卡变更后失效重拉（关卡页增删改成功后调用）。
export function refreshGameBaseLevels(): Promise<DbGameLevel[]> {
  baseLevelsPromise = null
  baseLevelsCache = null
  return getGameBaseLevels()
}

async function fetchBaseLevels(): Promise<DbGameLevel[]> {
  const res = await gameLevelService.findBaseLevels()
  if (!res.success) {
    throw new Error(res.errorMessage ?? 'game_levels 首关拉取失败')
  }
  return (res.data as DbGameLevel[] | null) || []
}

// 单例：首次调用触发请求，之后复用（StrictMode 双调用不重复请求）。
// 失败时置回 null 允许下次重试，避免 rejected Promise 被永久复用。
export function getGameBaseLevels(): Promise<DbGameLevel[]> {
  if (!baseLevelsPromise) {
    baseLevelsPromise = fetchBaseLevels()
      .then((rows) => {
        baseLevelsCache = rows
        return rows
      })
      .catch((e) => {
        baseLevelsPromise = null
        throw e
      })
  }
  return baseLevelsPromise
}

// React hook：挂载即按需拉取模式首关（返回 { baseLevels, loading }）。
// 仅成绩看板需要，其余页不触发该请求。
export function useGameBaseLevels(): {
  baseLevels: DbGameLevel[]
  loading: boolean
} {
  const [baseLevels, setBaseLevels] = useState<DbGameLevel[]>(baseLevelsCache ?? [])
  const [loading, setLoading] = useState(baseLevelsCache === null)
  useEffect(() => {
    let cancelled = false
    getGameBaseLevels()
      .then((rows) => {
        if (cancelled) return
        setBaseLevels(rows)
        setLoading(false)
      })
      .catch(() => {
        // 失败保持空数组，交由页面空态兜底；下次挂载经 getGameBaseLevels 重试
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return { baseLevels, loading }
}
