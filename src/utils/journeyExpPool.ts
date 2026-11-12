/// 西行经验池曲线：按「每波该升几级」反推怪量，运营点击重算后由后台写库。
/// 这里是纯函数，不直接访问数据库；数值口径与 App 引擎兜底公式保持一致。

export interface EndlessRebuildRow {
  wave_no: number
  count: number
  elite_count: number
  buff_mult: number
}

/// 每波总量：50 起，每波 +0.7，封顶 120（对应「无尽」语义的怪量下限）。
/// 用整数算式取整，与线上 numeric ROUND 及 App 引擎兜底同口径：
/// 浮点累加在半整数边界会取整偏 1 只，整数算式不受表示误差影响。
export function endlessWaveCount(waveNo: number): number {
  return Math.min(120, Math.floor((505 + 7 * (waveNo - 1)) / 10))
}

/// 每波精英只数：2 起，每 8 波 +1，封顶 14；波内排在末尾施压。
export function endlessEliteCount(waveNo: number): number {
  return Math.min(14, 2 + Math.floor(waveNo / 8))
}

/// 强度倍率：1+0.03n，避开引擎 6.0 的乘区上限造成的虚高配置。
export function endlessBuff(waveNo: number): number {
  return Math.round((1 + 0.03 * waveNo) * 100) / 100
}

/// 99 波全量重算行；妖王波只改数量/精英/倍率，怪种沿用后台原配置。
export function buildEndlessRebuildRows(): EndlessRebuildRow[] {
  return Array.from({ length: 99 }, (_, i) => {
    const n = i + 1
    return {
      wave_no: n,
      count: endlessWaveCount(n),
      elite_count: endlessEliteCount(n),
      buff_mult: endlessBuff(n),
    }
  })
}

