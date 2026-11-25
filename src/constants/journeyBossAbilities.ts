// 妖王能力→参数键映射：键=能力编码，值=该能力实际读取的逐怪参数键与 App 内置缺省值。
// 与 App journey_engine_boss_skills*.dart / damage.dart / monsters.dart 的 monsterParam 调用同源；
// 后台「妖王能力」页据此按能力分组展示与整包编辑，缺省值供对照（行缺失即回落该值）。
export interface BossAbilityParams {
  keys: string[]
  defaults: Record<string, number>
}

export const JOURNEY_BOSS_ABILITY_PARAMS: Record<string, BossAbilityParams> = {
  swift_wind: {
    keys: [
      'blind_sec',
      'swift_wind_period',
      'wind_push',
      'wind_shift_sec',
    ],
    defaults: {
      blind_sec: 2.5,
      swift_wind_period: 8,
      wind_push: 200,
      wind_shift_sec: 0.6,
    },
  },
  bone_split: {
    keys: [
      'bone_split_period',
      'form_blind',
      'form_ward',
    ],
    defaults: {
      bone_split_period: 12,
      form_blind: 2,
      form_ward: 0.5,
    },
  },
  gourd_pull: {
    keys: [
      'gourd_pull_period',
      'pull_dist',
      'pull_shift_sec',
    ],
    defaults: {
      gourd_pull_period: 10,
      pull_dist: 180,
      pull_shift_sec: 0.6,
    },
  },
  samadhi_fire: {
    keys: [
      'fire_first_delay',
      'fire_range',
      'fire_ratio',
      'fire_wave_gap',
      'fire_waves',
      'samadhi_fire_period',
      'smoke_blind',
    ],
    defaults: {
      fire_first_delay: 0.1,
      fire_range: 250,
      fire_ratio: 0.8,
      fire_wave_gap: 0.35,
      fire_waves: 3,
      samadhi_fire_period: 6,
      smoke_blind: 1.5,
    },
  },
  iron_horn: {
    keys: [
      'armor',
      'iron_horn_period',
      'steal_ward',
    ],
    defaults: {
      armor: 80,
      iron_horn_period: 12,
      steal_ward: 0.4,
    },
  },
  poison_mist: {
    keys: [
      'mist_range',
      'mist_ratio',
      'mist_sec',
      'mist_tick',
      'poison_block',
      'poison_mist_period',
      'sting_add',
    ],
    defaults: {
      mist_range: 120,
      mist_ratio: 0.1,
      mist_sec: 4,
      mist_tick: 1,
      poison_block: 3,
      poison_mist_period: 9,
      sting_add: 1,
    },
  },
  unmovable: {
    keys: [
      'giant_damage',
      'giant_hp',
      'unmovable_period',
    ],
    defaults: {
      giant_damage: 1.5,
      giant_hp: 1.3,
      unmovable_period: 14,
    },
  },
  blood_frenzy: {
    keys: [
      'blood_frenzy_period',
      'fang_count',
      'fang_life',
      'fang_radius',
      'fang_ratio',
      'fang_speed',
      'fang_spread',
      'frenzy_hp',
      'frenzy_mult',
    ],
    defaults: {
      blood_frenzy_period: 8,
      fang_count: 5,
      fang_life: 3,
      fang_radius: 12,
      fang_ratio: 0.5,
      fang_speed: 320,
      fang_spread: 0.9,
      frenzy_hp: 0.3,
      frenzy_mult: 1.5,
    },
  },
  spider_web: {
    keys: [
      'light_range',
      'light_root',
      'light_sec',
      'light_tick',
      'spider_web_period',
      'web_root',
    ],
    defaults: {
      light_range: 220,
      light_root: 0.6,
      light_sec: 5,
      light_tick: 0.8,
      spider_web_period: 10,
      web_root: 0.5,
    },
  },
  roc_speed: {
    keys: [
      'blade_range',
      'blade_sec',
      'blade_slow',
      'blade_tick',
      'bottle_range',
      'bottle_root',
      'roc_speed_period',
    ],
    defaults: {
      blade_range: 120,
      blade_sec: 3,
      blade_slow: 0.4,
      blade_tick: 0.6,
      bottle_range: 260,
      bottle_root: 1.6,
      roc_speed_period: 12,
    },
  },
  inner_core: {
    keys: [
      'core_life',
      'core_radius',
      'core_ratio',
      'core_root',
      'core_speed',
      'inner_core_period',
    ],
    defaults: {
      core_life: 4,
      core_radius: 14,
      core_ratio: 0.5,
      core_root: 1,
      core_speed: 260,
      inner_core_period: 7,
    },
  },
  fake_body: {
    keys: [
      'decoy_angle_jitter',
      'decoy_count',
      'decoy_hp',
      'decoy_ring',
      'decoy_ring_jitter',
      'decoy_sec',
      'decoy_ward',
      'fake_body_period',
    ],
    defaults: {
      decoy_angle_jitter: 0.4,
      decoy_count: 2,
      decoy_hp: 0.12,
      decoy_ring: 90,
      decoy_ring_jitter: 70,
      decoy_sec: 6,
      decoy_ward: 0.6,
      fake_body_period: 12,
    },
  },
  water_prison: {
    keys: [
      'prison_range',
      'prison_sec',
      'prison_slow',
      'prison_tick',
      'water_prison_period',
    ],
    defaults: {
      prison_range: 200,
      prison_sec: 5,
      prison_slow: 0.4,
      prison_tick: 0.5,
      water_prison_period: 9,
    },
  },
  five_thunder: {
    keys: [
      'five_thunder_period',
      'thunder_count',
      'thunder_delay',
      'thunder_gap',
      'thunder_range',
      'thunder_ratio',
      'thunder_spread',
    ],
    defaults: {
      five_thunder_period: 7,
      thunder_count: 2,
      thunder_delay: 0.9,
      thunder_gap: 0.18,
      thunder_range: 90,
      thunder_ratio: 1,
      thunder_spread: 260,
    },
  },
  ice_seal: {
    keys: [
      'ice_seal_period',
      'seal_armor_break',
      'seal_range',
      'seal_root',
      'seal_slow',
    ],
    defaults: {
      ice_seal_period: 9,
      seal_armor_break: 0.35,
      seal_range: 240,
      seal_root: 1.4,
      seal_slow: 0.3,
    },
  },
  mirror: {
    keys: [
      'mirror_per_lv',
      'mirror_period',
      'mirror_ward',
    ],
    defaults: {
      mirror_per_lv: 0.06,
      mirror_period: 12,
      mirror_ward: 0.5,
    },
  },
  root_bind: {
    keys: [
      'bind_range',
      'bind_root',
      'combat_regen',
      'root_bind_period',
      'thorn_range',
      'thorn_ratio',
      'thorn_sec',
      'thorn_tick',
    ],
    defaults: {
      bind_range: 230,
      bind_root: 1.2,
      combat_regen: 400,
      root_bind_period: 10,
      thorn_range: 150,
      thorn_ratio: 0.12,
      thorn_sec: 4,
      thorn_tick: 1,
    },
  },
  golden_bag: {
    keys: [
      'bag_pull',
      'bag_range',
      'cymbal_ward',
      'golden_bag_period',
    ],
    defaults: {
      bag_pull: 220,
      bag_range: 300,
      cymbal_ward: 0.8,
      golden_bag_period: 10,
    },
  },
  devour: {
    keys: [
      'devour_delay',
      'devour_period',
      'devour_pull',
      'devour_radius',
      'devour_range',
      'devour_ratio',
    ],
    defaults: {
      devour_delay: 0.6,
      devour_period: 9,
      devour_pull: 260,
      devour_radius: 100,
      devour_range: 220,
      devour_ratio: 1.4,
    },
  },
  three_bells: {
    keys: [
      'bell_blind',
      'bell_burn_ratio',
      'bell_range',
      'bell_sec',
      'bell_slow',
      'bell_tick',
      'three_bells_period',
    ],
    defaults: {
      bell_blind: 2.5,
      bell_burn_ratio: 0.15,
      bell_range: 180,
      bell_sec: 4,
      bell_slow: 0.4,
      bell_tick: 1,
      three_bells_period: 9,
    },
  },
  spear_thrust: {
    keys: [
      'spear_thrust_period',
      'thrust_dist',
      'thrust_ratio',
      'thrust_width',
      'thrust_windup',
    ],
    defaults: {
      spear_thrust_period: 8,
      thrust_dist: 180,
      thrust_ratio: 1.1,
      thrust_width: 46,
      thrust_windup: 0.45,
    },
  },
  earth_trap: {
    keys: [
      'earth_trap_period',
      'trap_range',
      'trap_root',
      'trap_sec',
      'trap_slow',
      'trap_tick',
    ],
    defaults: {
      earth_trap_period: 10,
      trap_range: 170,
      trap_root: 0.8,
      trap_sec: 4,
      trap_slow: 0.5,
      trap_tick: 0.8,
    },
  },
  plum_flower: {
    keys: [
      'ambush_ward',
      'decoy_angle_jitter',
      'decoy_count',
      'decoy_hp',
      'decoy_ring',
      'decoy_ring_jitter',
      'decoy_sec',
      'plum_flower_period',
    ],
    defaults: {
      ambush_ward: 0.5,
      decoy_angle_jitter: 0.4,
      decoy_count: 3,
      decoy_hp: 0.12,
      decoy_ring: 90,
      decoy_ring_jitter: 70,
      decoy_sec: 6,
      plum_flower_period: 12,
    },
  },
  nine_seize: {
    keys: [
      'nine_seize_period',
      'seize_pull',
      'seize_range',
      'seize_root',
    ],
    defaults: {
      nine_seize_period: 11,
      seize_pull: 400,
      seize_range: 460,
      seize_root: 1,
    },
  },
  ice_charge: {
    keys: [
      'frost_range',
      'frost_sec',
      'frost_slow',
      'frost_tick',
      'ice_charge_period',
    ],
    defaults: {
      frost_range: 180,
      frost_sec: 5,
      frost_slow: 0.45,
      frost_tick: 0.6,
      ice_charge_period: 10,
    },
  },
  moon_guard: {
    keys: [
      'moon_guard_period',
      'moon_ward',
      'slam_delay',
      'slam_range',
      'slam_ratio',
    ],
    defaults: {
      moon_guard_period: 9,
      moon_ward: 0.7,
      slam_delay: 1,
      slam_range: 130,
      slam_ratio: 1.5,
    },
  },
  tiger_pounce: {
    keys: [
      'pounce_delay',
      'pounce_knockback',
      'pounce_range',
      'pounce_ratio',
      'tiger_pounce_period',
    ],
    defaults: {
      pounce_delay: 0.8,
      pounce_knockback: 180,
      pounce_range: 120,
      pounce_ratio: 1,
      tiger_pounce_period: 8,
    },
  },
  black_wind: {
    keys: [
      'black_wind_period',
      'blind_sec',
      'wind_pull',
      'wind_range',
      'wind_sec',
      'wind_slow',
      'wind_tick',
    ],
    defaults: {
      black_wind_period: 10,
      blind_sec: 2.5,
      wind_pull: 120,
      wind_range: 200,
      wind_sec: 4,
      wind_slow: 0.3,
      wind_tick: 0.6,
    },
  },
  deer_belly: {
    keys: [
      'belly_armor_break',
      'belly_delay',
      'belly_range',
      'belly_ratio',
      'deer_belly_period',
    ],
    defaults: {
      belly_armor_break: 0.4,
      belly_delay: 0.9,
      belly_range: 180,
      belly_ratio: 1.1,
      deer_belly_period: 9,
    },
  },
  ram_oil: {
    keys: [
      'oil_blind',
      'oil_range',
      'oil_ratio',
      'oil_sec',
      'oil_tick',
      'ram_oil_period',
    ],
    defaults: {
      oil_blind: 2,
      oil_range: 200,
      oil_ratio: 0.18,
      oil_sec: 4,
      oil_tick: 0.6,
      ram_oil_period: 10,
    },
  },
}

/// 能力是否含周期技（<ability>_period 已计入 keys，供总览标注）。
export function bossAbilityParamCount(key: string): number {
  return JOURNEY_BOSS_ABILITY_PARAMS[key]?.keys.length ?? 0
}
