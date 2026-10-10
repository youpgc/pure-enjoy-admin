/**
 * 2D 分层弯曲渲染核心（Admin 预览用，与沙盒 `pet_warp_core.mjs` 同源）。
 *
 * 三条硬口径（改这里之前先读）：
 * 1. **算式与判据一字未动**：几何、核选择、uniform 打包全部来自用户已验收冻结的
 *    `cat_gl_warp.mjs`，一致性由沙盒 `render/check_portable.mjs` 逐字符/逐位对拍。
 * 2. **档位走 uniform**（uGeo.w 横向核、uRes.w 竖向档），不在文本里拼分支、不重编译。
 * 3. `6.283185`／`12.56637` 是样片里的**字面量**，不是笔误：换成 `Math.PI * 2` 会让呼吸项
 *    偏 2e-6px，对拍就不逐位等了。禁「修」。
 *
 * 纹理约定同冻结件：NEAREST＋CLAMP_TO_EDGE（混合完全由着色器的两抽头权重做，
 * 不让硬件掺一次双线性），上传 `UNPACK_PREMULTIPLY_ALPHA_WEBGL=true`。
 */
import type { PetBendGeo } from '../../../constants/petAnim/petBendManifest'
import type { PetChannels } from '../../../constants/petAnim/petBendIdle'

/** 生产栅格（SIDE 素材边、FOOT 钉脚行、CW 画布边＝SIDE+2×PAD、PG 纹理垫边）。 */
export interface WarpGrid {
  readonly SIDE: number
  readonly FOOT: number
  readonly PAD: number
  readonly PG: number
  readonly CW: number
}

/** 定版档位：横向 0＝线性两抽头、竖向 0＝亚像素两抽头（其余档已由门禁判死）。 */
export interface WarpCore {
  readonly SOFT: number
  readonly VMODE: number
  readonly DROOP_RAMP: number
  readonly DROOP_RAMP_MIN: number
}

/** 某一时刻的位姿通道（th 弧度；A/dx/dy 单位＝生产栅格 px；sx/sy 倍率、原点＝脚底中心）。 */
export interface Pose {
  th: number
  A: number
  dx: number
  dy: number
  sx: number
  sy: number
  /** 表情档帧下标（对全局帧名序列取用） */
  fi: number
}

export interface Uniforms {
  uPose: number[]
  uGeo: number[]
  uXf: number[]
  uRes: number[]
}

export type NumKeys = ReadonlyArray<readonly [number, number]>

export interface PoseOpt {
  /** 摆角档（样片评审页的滑条；出货与门禁口径一律 1） */
  tk?: number
  /** 呼吸档，同上 */
  bk?: number
  side?: number
}

export interface WarpOpt {
  grid?: Partial<WarpGrid>
  soft?: number
  vmode?: number
}

export const smoothstep = (u: number): number =>
  (u >= 1 ? 1 : u <= 0 ? 0 : u * u * (3 - 2 * u))

/** 通道取值：相位在 [0,1] 循环，段内 smoothstep（两端留平，天然缓入缓出）。 */
export function ch(keys: NumKeys, u: number): number {
  const n = keys.length
  if (n === 1) return keys[0]![1]
  if (u <= keys[0]![0]) return keys[0]![1]
  if (u >= keys[n - 1]![0]) return keys[n - 1]![1]
  let i = n - 1
  while (i > 0 && u < keys[i]![0]) i--
  const p = keys[i]!
  const q = keys[Math.min(i + 1, n - 1)]!
  const k = q[0] > p[0] ? smoothstep((u - p[0]) / (q[0] - p[0])) : 0
  return p[1] + (q[1] - p[1]) * k
}

/**
 * 表情档：hold 硬切。
 * 不同 AI 帧之间 RGB 差铺满 15~19% 画面，任何混合都会全身重影。
 */
export function faceAt(act: PetChannels, u: number): number {
  const e = act.expr.length ? act.expr : [[0, 0]] as const
  let i = e.length - 1
  while (i > 0 && u < e[i]![0]) i--
  return e[i]![1]
}

/** 该时刻的位姿（与冻结件 `poseOf` 逐式相同）。 */
export function poseOf(act: PetChannels, t: number, opt: PoseOpt = {}): Pose {
  const tk = opt.tk ?? 1
  const bk = opt.bk ?? 1
  const side = opt.side ?? 384
  const per = act.per
  const u = (((t % per) + per) % per) / per
  const o: Pose = {
    th: (ch(act.th, u) * Math.PI) / 180 * tk,
    A: ch(act.A, u),
    dx: ch(act.dx, u),
    dy: ch(act.dy, u),
    sx: ch(act.sx, u),
    sy: ch(act.sy, u),
    fi: faceAt(act, u),
  }
  const b = act.breath
  if (b) {
    const a = b.amp / 100 * bk
    const br = Math.sin(6.283185 * t / b.per)
    o.sx *= 1 - a * 0.6 * br
    o.sy *= 1 + a * br
    o.dx += 0.6 * a * side * Math.sin(6.283185 * t / (b.per * 1.2))
    o.dy += 0.1 * a * side - 0.2 * a * side * (1 - Math.cos(12.56637 * t / (b.per * 1.2)))
  }
  return o
}

/**
 * 把位姿打包成四个 uniform（纯函数，与冻结件 `drawGL` 逐式相同）。
 * 三条不能混的：支点 `py = yn + (yn−headTop)/2`（归零线再往头顶半格）；
 * 低垂斜坡分母 `dn = max(droopRamp×(yn−headTop), droopRampMin)`（40px 下限防归零线被拖近时趋零断口）；
 * `uXf.zw` 里的 `+PAD` 是把生产栅格挪进画布垫边坐标系的一次平移。
 */
export function warpUniforms(
  pose: Pose,
  form: PetBendGeo,
  grid: WarpGrid,
  core: WarpCore,
  opt: WarpOpt = {},
): Uniforms {
  const g: WarpGrid = { ...grid, ...opt.grid }
  const headTop = form.HEAD_TOP
  const yn = form.YN
  const foot = form.FOOT ?? g.FOOT
  const dr = form.DROOP_RAMP ?? core.DROOP_RAMP
  const dm = form.DROOP_RAMP_MIN ?? core.DROOP_RAMP_MIN
  const soft = opt.soft ?? core.SOFT
  const vmode = opt.vmode ?? core.VMODE
  const dn = Math.max(dr * (yn - headTop), dm)
  return {
    uPose: [pose.th, pose.A, yn + (yn - headTop) / 2],
    uGeo: [yn, 1 / (yn - headTop), 1 / dn, soft],
    uXf: [pose.sx, pose.sy, g.SIDE / 2 + pose.dx - (g.SIDE / 2) * pose.sx + g.PAD,
      foot + pose.dy - foot * pose.sy + g.PAD],
    uRes: [g.CW, g.PG, 1 / (g.SIDE + 2 * g.PG), vmode],
  }
}

export interface WarpRenderer {
  gl: WebGLRenderingContext
  newTexture: () => WebGLTexture
  upload: (t: WebGLTexture, src: TexImageSource) => void
  draw: (t: WebGLTexture, u: Uniforms) => void
  grid: WarpGrid
}

/** 建渲染器失败＝只有 `{err}`；成功＝只有渲染器本体（调用方用 `'err' in` 分支）。 */
export type WarpResult = WarpRenderer | { err: string }

/**
 * 建渲染器。`gl`＝WebGL1 上下文（`alpha:true, premultipliedAlpha:true`）。
 * 失败返回 `{ err }` 且**不抛**——回退必须让调用方看得见，
 * 不能把「GL 全绿」记在回退路径名下。
 */
export function createWarpRenderer(
  gl: WebGLRenderingContext,
  shader: { vert: string; frag: string },
  grid: WarpGrid,
): WarpResult {
  const g: WarpGrid = grid
  const sh = (type: number, src: string): WebGLShader => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? '')
    return s
  }
  let pr: WebGLProgram
  try {
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    pr = gl.createProgram()!
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, shader.vert))
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, shader.frag))
    gl.linkProgram(pr)
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return { err: '链接失败 ' + (gl.getProgramInfoLog(pr) ?? '') }
    gl.useProgram(pr)
    gl.disable(gl.BLEND)
    const loc = gl.getAttribLocation(pr, 'ap')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  } catch (e) {
    return { err: e instanceof Error ? e.message : String(e) }
  }
  const U: Record<keyof Uniforms, WebGLUniformLocation | null> = {
    uPose: gl.getUniformLocation(pr, 'uPose'),
    uGeo: gl.getUniformLocation(pr, 'uGeo'),
    uXf: gl.getUniformLocation(pr, 'uXf'),
    uRes: gl.getUniformLocation(pr, 'uRes'),
  }
  const newTexture = (): WebGLTexture => {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }
  const upload = (t: WebGLTexture, src: TexImageSource): void => {
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
  }
  const draw = (t: WebGLTexture, u: Uniforms): void => {
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.viewport(0, 0, g.CW, g.CW)
    gl.uniform3f(U.uPose, u.uPose[0]!, u.uPose[1]!, u.uPose[2]!)
    gl.uniform4f(U.uGeo, u.uGeo[0]!, u.uGeo[1]!, u.uGeo[2]!, u.uGeo[3]!)
    gl.uniform4f(U.uXf, u.uXf[0]!, u.uXf[1]!, u.uXf[2]!, u.uXf[3]!)
    gl.uniform4f(U.uRes, u.uRes[0]!, u.uRes[1]!, u.uRes[2]!, u.uRes[3]!)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  return { gl, newTexture, upload, draw, grid: g }
}
