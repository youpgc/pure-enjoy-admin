// 全局游戏元数据缓存（games / levels / dimensions）。
//
// 用途：后台「道具管理 / 成绩看板 / 关卡 / 维度」等多页都会用到游戏名、关卡名、
//       维度名等映射。此前各页在挂载时各自拉取 games / levels / dimensions，
//       成绩看板还因 meta 就绪触发二次重查，造成多接口缝合、看板闪烁。
//
// 本模块用「模块级单例 Promise + 内存缓存」保证整个后台会话内只请求一次，
// 之后所有页面直接复用，不再重复调度接口。配置（非用户数据）适合此模式。
//
// 仅暴露只读映射；若配置确有变更，调用 refreshGameMeta() 主动失效重拉。

import { useEffect, useState } from 'react'
import { gameService, gameLevelService, gameDimensionService, gameModeService } from '../services/gameService'
import type { DbGame, DbGameLevel, DbGameDimension, DbGameMode } from '../types/database'

export interface GameMeta {
  games: DbGame[]
  modes: DbGameMode[]
  levels: DbGameLevel[]
  dimensions: DbGameDimension[]
  // 按 id（成绩看板用 game_id 关联）
  gameMapById: Record<string, DbGame>
  // 按 code（道具管理用 game_code 关联）
  gameMapByCode: Record<string, DbGame>
  // 按所属游戏分组（成绩看板模式筛选联动）
  modesByGameId: Record<string, DbGameMode[]>
  levelMap: Record<string, DbGameLevel>
  dimMap: Record<string, DbGameDimension>
}

let metaPromise: Promise<GameMeta> | null = null
let metaCache: GameMeta | null = null

// 订阅机制（2026-09-10 审查修复）：配置写操作后调用 refreshGameMeta() 失效重拉，
// 已挂载页面经 listeners 同步拿到新 meta——此前 refreshGameMeta 无人调用、
// useGameMeta 只在挂载时取值，配置变更后整个会话内映射永不更新。
const listeners = new Set<(m: GameMeta | null) => void>()

// game_levels 全量 1200 行（12 模式 × 100 关），单请求会被 PostgREST
// db-max-rows=1000 静默钳制（成绩看板 L84+ 关卡/通关条件不展示的根因），
// 必须按 1000/页 offset 循环拉全。
async function fetchAllLevels(): Promise<DbGameLevel[]> {
  const all: DbGameLevel[] = []
  const pageSize = 1000
  for (let page = 1; ; page++) {
    const res = await gameLevelService.paginate(page, pageSize)
    if (!res.success) {
      throw new Error(res.errorMessage ?? 'game_levels 拉取失败')
    }
    const rows = (res.data?.data as DbGameLevel[] | null) || []
    all.push(...rows)
    const total = res.data?.total ?? all.length
    if (all.length >= total || rows.length < pageSize) break
  }
  return all
}

async function fetchMeta(): Promise<GameMeta> {
  const [gRes, mRes, levels, dRes] = await Promise.all([
    gameService.findAll(),
    gameModeService.findAllModes(),
    fetchAllLevels(),
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
  const levelMap: Record<string, DbGameLevel> = {}
  levels.forEach((l) => {
    levelMap[l.id] = l
  })
  const dimMap: Record<string, DbGameDimension> = {}
  dimensions.forEach((d) => {
    dimMap[d.id] = d
  })

  const modesByGameId: Record<string, DbGameMode[]> = {}
  modes.forEach((m) => {
    ;(modesByGameId[m.game_id] ??= []).push(m)
  })

  return { games, modes, levels, dimensions, gameMapById, gameMapByCode, modesByGameId, levelMap, dimMap }
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
