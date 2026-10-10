import React, { useEffect, useRef, useState } from 'react'
import { petBendForm } from '../../../constants/petAnim/petBendManifest'
import { CORE, FRAME_NAMES, GRID, IDLE, IDLE_FRAMES } from '../../../constants/petAnim/petBendIdle'
import { glsl } from '../../../constants/petAnim/petWarpGlsl'
import { createWarpRenderer, poseOf, warpUniforms } from './warpCore'

// ==================== 分层弯曲待机预览（WebGL） ====================
//
// 把沙盒已验收的 2D 分层弯曲渲染器放进后台：同一份素材、同一段着色器原文、
// 同一套 uniform 算式，所以后台看到的弯带＝样片看到的弯带。
//
// 三条口径：
// · **只放 idle**：后台预览要的是「这只宠物平时怎么动」，其余 7 档的动作编排留在沙盒/App。
// · **查不到形态就交回调用方**（`return null`）——没有弯曲素材的种属仍走静态图，不是错误。
// · **GL 不可用/素材缺帧一律回退首帧静图并说明原因**：渲染器不可用时「后台全绿」
//   不能记在弯曲路径名下（同冻结件的 `#glmode` 判据）。

/** public 前缀：必须带 BASE_URL，本工程 vite base 为 /pure-enjoy-admin/（清单里的 dir 已含 pet-anim/）。 */
const PUB_BASE = import.meta.env.BASE_URL

interface Props {
  /** 后台行编码（阶形态带 `_s<阶>` 后缀） */
  speciesCode: string
  /** 显示边长（CSS px）；画布内部分辨率恒为 GRID.CW，缩放只做在样式上 */
  size?: number
}

type Status = 'loading' | 'ready' | 'failed'

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const im = new Image()
    im.onload = () => resolve(im)
    im.onerror = () => reject(new Error(`帧加载失败 ${src}`))
    im.src = src
  })

/**
 * 素材加 64px 透明垫边（与沙盒 `padOf` 同一件事）：
 * 弯带把行推到画布外时，靠这圈垫边保证采样坐标仍落在纹理内。
 */
const padFrame = (im: HTMLImageElement): HTMLCanvasElement => {
  const cv = document.createElement('canvas')
  cv.width = GRID.SIDE + 2 * GRID.PG
  cv.height = GRID.SIDE + 2 * GRID.PG
  cv.getContext('2d')!.drawImage(im, GRID.PG, GRID.PG)
  return cv
}

const PetBendPreview: React.FC<Props> = ({ speciesCode, size = 260 }) => {
  const form = petBendForm(speciesCode)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [note, setNote] = useState('')
  // 失败原因只算一次，避免每次渲染都改 state
  const poster = `${PUB_BASE}${form?.dir ?? ''}/c1_neutral.png`

  useEffect(() => {
    if (!form) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let raf = 0
    let disposed = false
    let ctx: WebGLRenderingContext | null = null

    const run = async (): Promise<void> => {
      const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true })
      if (!gl) {
        setStatus('failed')
        setNote('WebGL 不可用')
        return
      }
      ctx = gl
      const made = createWarpRenderer(gl, glsl, GRID)
      if ('err' in made) {
        setStatus('failed')
        setNote(made.err)
        return
      }

      // 三档表情帧：尺寸必须是 SIDE，否则垫边量与整套几何就对不上
      const imgs = await Promise.all(
        IDLE_FRAMES.map((name) => loadImage(`${PUB_BASE}${form.dir}/${name}.png`)),
      )
      if (disposed) return
      const wrong = imgs.find((im) => im.naturalWidth !== GRID.SIDE || im.naturalHeight !== GRID.SIDE)
      if (wrong) {
        setStatus('failed')
        setNote(`素材边长非 ${GRID.SIDE}，弯曲几何不适用`)
        return
      }
      const texs = imgs.map((im) => {
        const t = made.newTexture()
        made.upload(t, padFrame(im))
        return t
      })

      setStatus('ready')
      const start = performance.now()
      const step = (): void => {
        const t = (performance.now() - start) / 1000
        const pose = poseOf(IDLE, t, { side: GRID.SIDE })
        // expr 点名的下标是全局帧序（c1…c6），后台只放了其中 3 档 ⇒ 先换算本地槽位
        const slot = (IDLE_FRAMES as readonly string[]).indexOf(FRAME_NAMES[pose.fi] ?? '')
        made.draw(texs[slot >= 0 ? slot : 0]!, warpUniforms(pose, form.geo, GRID, CORE))
        raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }

    // 帧加载失败会 reject：必须落到「回退静图」，不能卡在加载态（卡住＝后台看起来永远在转）
    void run().catch((e: unknown) => {
      if (disposed) return
      setStatus('failed')
      setNote(e instanceof Error ? e.message : String(e))
    })

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      // 浏览器对 WebGL 上下文数有上限，关弹窗必须主动释放
      ctx?.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [form])

  if (!form) return null

  return (
    <div style={{ width: size, height: size, margin: '0 auto' }}>
      <canvas
        ref={canvasRef}
        width={GRID.CW}
        height={GRID.CW}
        style={{ width: size, height: size, display: status === 'ready' ? 'block' : 'none' }}
        aria-label={`${form.cn} 待机动画预览`}
      />
      {status !== 'ready' ? (
        status === 'failed' ? (
          <div style={{ width: size, height: size, textAlign: 'center' }}>
            <img
              alt={`${form.cn} 待机首帧`}
              src={poster}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
            <div style={{ fontSize: 12, color: '#999' }}>弯曲预览不可用（{note}）</div>
          </div>
        ) : (
          <div
            style={{
              width: size,
              height: size,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: 12,
            }}
          >
            加载动画帧…
          </div>
        )
      ) : null}
    </div>
  )
}

export default PetBendPreview
