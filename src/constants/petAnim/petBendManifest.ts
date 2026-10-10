/**
 * 宠物分层弯曲预览契约表（**生成物，勿手改、勿在别处再抄一份**）。
 * 生成：`node pet_anim_demo/tools/export_admin_preview.mjs --yes`
 * 源：`pet_anim_demo/export/pet_render_manifest.json`（已由 `render/check_portable.mjs`
 *     与盘上素材逐位对拍），只取渲染器实际消费的字段。
 *
 * 键＝后台 `pet_species.species_code`：阶形态在库里是独立行、编码带 `_s<阶>` 后缀
 * （基础形不带）。查不到＝该形态没有弯曲素材，调用方回退静态图。
 */

/** 弯曲渲染需要的装配期几何（其余实测项如眼框/支点不进这张表：预览组件不消费）。 */
export interface PetBendGeo {
  readonly HEAD_TOP: number;
  readonly YN: number;
  readonly FOOT: number;
  readonly DROOP_RAMP: number;
  readonly DROOP_RAMP_MIN: number;
}

export interface PetBendForm {
  readonly code: string;
  readonly cn: string;
  readonly tier: string;
  readonly stage: number;
  /** 相对 public 的帧目录（不以 / 开头），帧文件名＝idle 三档加 .png */
  readonly dir: string;
  readonly geo: PetBendGeo;
}

const b = (
  code: string,
  cn: string,
  tier: string,
  stage: number,
  dir: string,
  geo: PetBendGeo,
): PetBendForm => ({ code, cn, tier, stage, dir, geo });

export const kPetBendForms: Readonly<Record<string, PetBendForm>> = {
  "cat_n1": b("cat_n1", "团子", "n", 0, "pet-anim/n/cat_n1/s0", { HEAD_TOP: 87, YN: 288, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "cat_n2": b("cat_n2", "煤球", "n", 0, "pet-anim/n/cat_n2/s0", { HEAD_TOP: 87, YN: 288, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "cat_n3": b("cat_n3", "奶酪", "n", 0, "pet-anim/n/cat_n3/s0", { HEAD_TOP: 85, YN: 288, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "cat_n4": b("cat_n4", "雾雾", "n", 0, "pet-anim/n/cat_n4/s0", { HEAD_TOP: 85, YN: 288, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "cat_r1": b("cat_r1", "虎斑仔", "r", 0, "pet-anim/r/cat_r1/s0", { HEAD_TOP: 91, YN: 290, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "cat_r2": b("cat_r2", "三花", "r", 0, "pet-anim/r/cat_r2/s0", { HEAD_TOP: 84, YN: 287, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "cat_r3": b("cat_r3", "蓝宝", "r", 0, "pet-anim/r/cat_r3/s0", { HEAD_TOP: 85, YN: 288, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "cat_sr1": b("cat_sr1", "暹罗", "sr", 0, "pet-anim/sr/cat_sr1/s0", { HEAD_TOP: 85, YN: 288, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "cat_sr2": b("cat_sr2", "狸花", "sr", 0, "pet-anim/sr/cat_sr2/s0", { HEAD_TOP: 85, YN: 288, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "cat_ssr1": b("cat_ssr1", "月萤", "ssr", 0, "pet-anim/ssr/cat_ssr1/s0", { HEAD_TOP: 86, YN: 288, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "cat_ssr1_s1": b("cat_ssr1_s1", "月华猫", "ssr", 1, "pet-anim/ssr/cat_ssr1_s1/s1", { HEAD_TOP: 61, YN: 280, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "cat_ssr1_s2": b("cat_ssr1_s2", "望月神君", "ssr", 2, "pet-anim/ssr/cat_ssr1_s2/s2", { HEAD_TOP: 0, YN: 260, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "dog_n1": b("dog_n1", "豆豆", "n", 0, "pet-anim/n/dog_n1/s0", { HEAD_TOP: 84, YN: 287, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "dog_n2": b("dog_n2", "汤圆", "n", 0, "pet-anim/n/dog_n2/s0", { HEAD_TOP: 120, YN: 299, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "dog_n3": b("dog_n3", "阿黄", "n", 0, "pet-anim/n/dog_n3/s0", { HEAD_TOP: 99, YN: 292, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "dog_n4": b("dog_n4", "小灰", "n", 0, "pet-anim/n/dog_n4/s0", { HEAD_TOP: 129, YN: 302, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "dog_r1": b("dog_r1", "哈奇", "r", 0, "pet-anim/r/dog_r1/s0", { HEAD_TOP: 84, YN: 287, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "dog_r2": b("dog_r2", "卷卷", "r", 0, "pet-anim/r/dog_r2/s0", { HEAD_TOP: 114, YN: 297, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "dog_r3": b("dog_r3", "柴柴", "r", 0, "pet-anim/r/dog_r3/s0", { HEAD_TOP: 108, YN: 295, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "dog_sr1": b("dog_sr1", "金金", "sr", 0, "pet-anim/sr/dog_sr1/s0", { HEAD_TOP: 84, YN: 287, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "dog_sr2": b("dog_sr2", "墨墨", "sr", 0, "pet-anim/sr/dog_sr2/s0", { HEAD_TOP: 96, YN: 291, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "mouse_n1": b("mouse_n1", "布丁", "n", 0, "pet-anim/n/mouse_n1/s0", { HEAD_TOP: 168, YN: 314, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 }),
  "rabbit_n1": b("rabbit_n1", "糯米", "n", 0, "pet-anim/n/rabbit_n1/s0", { HEAD_TOP: 114, YN: 297, FOOT: 383, DROOP_RAMP: 0.25, DROOP_RAMP_MIN: 40 })
};

/** 后台 species_code → 弯曲形态；未登记返回 undefined。 */
export const petBendForm = (speciesCode: string): PetBendForm | undefined =>
  kPetBendForms[speciesCode];
