/**
 * 待机（idle）编排与生产栅格常量（**生成物，勿手改**）。
 * 生成：`node pet_anim_demo/tools/export_admin_preview.mjs --yes`
 * 源：`pet_anim_demo/export/pet_actions.json`（冻结件 `idle_rig_action_defs.mjs` 的导出）。
 *
 * 后台预览只放 idle，故只落 idle 一档；`idleFrames` 是它的 expr 通道点名的 3 档表情帧，
 * 也是 `public/pet-anim/**` 里唯一的文件——其余 3 档（耳动/视下/睁大）随包在 App，不进后台。
 */

/* 生产栅格：SIDE 素材边、FOOT 钉脚行、CW 画布边＝SIDE+2×PAD、PG 纹理垫边。
   PAD 与 PG 当前同值但职责不同（画布内偏移 vs 纹理内偏移），故不合并。 */
export const GRID = {"SIDE":384,"FOOT":383,"PAD":64,"PG":64,"CW":512};

/* 定版档位：横向核 0＝线性两抽头（Catmull-Rom/Lanczos2 已由门禁⑤ 判死）、
   竖向 0＝亚像素两抽头（取整已由门禁⑥ 判死）。换核走 uniform，不重编译着色器。 */
export const CORE = {"SOFT":0,"VMODE":0,"DROOP_RAMP":0.25,"DROOP_RAMP_MIN":40};

/** idle 采样的三档表情帧名（下标即着色器 uPose 之外的帧序）。 */
export const IDLE_FRAMES = ["c1_neutral","c3_lid_half","c4_lid_closed"] as const;

/** 全局帧序（编排 expr 的下标按它点名）；`IDLE_FRAMES.indexOf(FRAME_NAMES[fi])`＝后台本地槽位。 */
export const FRAME_NAMES = ["c1_neutral","c2_ear","c3_lid_half","c4_lid_closed","c5_look_down","c6_wide","s2_reveal"] as const;

export interface PetChannels {
  readonly per: number;
  /** 表情档：hold 硬切（帧间 RGB 差铺满画面，混合必全身重影） */
  readonly expr: ReadonlyArray<readonly [number, number]>;
  /** 摆角（度） */
  readonly th: ReadonlyArray<readonly [number, number]>;
  /** 低垂幅度（px） */
  readonly A: ReadonlyArray<readonly [number, number]>;
  readonly dx: ReadonlyArray<readonly [number, number]>;
  readonly dy: ReadonlyArray<readonly [number, number]>;
  readonly sx: ReadonlyArray<readonly [number, number]>;
  readonly sy: ReadonlyArray<readonly [number, number]>;
  readonly breath?: { readonly amp: number; readonly per: number };
}

export const IDLE: PetChannels = {
  per: 3.4,
  expr: [[0, 0], [0.63, 2], [0.65, 3], [0.68, 2], [0.7, 0]],
  th: [[0, 0], [0.28, 0], [0.33, 0.6], [0.37, 1], [0.44, -0.4], [0.52, 0], [1, 0]],
  A: [[0, 0]],
  dx: [[0, 0]],
  dy: [[0, 0]],
  sx: [[0, 1]],
  sy: [[0, 1]],
  breath: { amp: 0.6, per: 2.6 },
};
