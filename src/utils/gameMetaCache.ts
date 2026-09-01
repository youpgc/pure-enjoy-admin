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
import { gameService, gameLevelService, gameDimensionService } from '../services/gameService'
import type { DbGame, DbGameLevel, DbGameDimension } from '../types/database'

export interface GameMeta {
  games: DbGame[]
  levels: DbGameLevel[]
  dimensions: DbGameDimension[]
  // 按 id（成绩看板用 game_id 关联）
  gameMapById: Record<string, DbGame>
  // 按 code（道具管理用 game_code 关联）
  gameMapByCode: Record<string, DbGame>
  levelMap: Record<string, DbGameLevel>
  dimMap: Record<string, DbGameDimension>
}

let metaPromise: Promise<GameMeta> | null = null
let metaCache: GameMeta | null = null

async function fetchMeta(): Promise<GameMeta> {
  const [gRes, lRes, dRes] = await Promise.all([
    gameService.findAll(),
    gameLevelService.findAll(),
    gameDimensionService.findAll(),
  ])
  const games = (gRes.success ? (gRes.data as DbGame[] | null) : null) || []
  const levels = (lRes.success ? (lRes.data as DbGameLevel[] | null) : null) || []
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

  return { games, levels, dimensions, gameMapById, gameMapByCode, levelMap, dimMap }
}

// 单例：首次调用触发请求，之后复用同一 Promise（StrictMode 双调用也不会重复请求）。
export function getGameMeta(): Promise<GameMeta> {
  if (!metaPromise) {
    metaPromise = fetchMeta().then((m) => {
      metaCache = m
      return m
    })
  }
  return metaPromise
}

// 主动失效并重拉（如后台配置变更后需刷新看板映射）。
export function refreshGameMeta(): Promise<GameMeta> {
  metaPromise = null
  metaCache = null
  return getGameMeta()
}

// React hook：组件挂载即拿到已缓存的 meta（可能为 null，加载完成后自动更新）。
export function useGameMeta(): GameMeta | null {
  const [meta, setMeta] = useState<GameMeta | null>(metaCache)
  useEffect(() => {
    let cancelled = false
    getGameMeta().then((m) => {
      if (!cancelled) setMeta(m)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return meta
}
