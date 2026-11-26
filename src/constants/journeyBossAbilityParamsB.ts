// 妖王能力→参数键映射（后半）。键=能力编码，值=实际读取的逐怪参数键与 App 内置缺省值。
import type { BossAbilityParams } from './journeyBossAbilityTypes'

export const BOSS_ABILITY_PARAMS_B: Record<string, BossAbilityParams> = {
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
  shield_break: {
    keys: [
      'reflect_mult',
      'shield_break_period',
      'shield_break_ratio',
      'shield_break_raw',
      'shield_damage_bonus',
    ],
    defaults: {
      reflect_mult: 0.5,
      shield_break_period: 9,
      shield_break_ratio: 0.6,
      shield_break_raw: 1,
      shield_damage_bonus: 0.25,
    },
  },
  execute: {
    keys: ['execute_hp_ratio'],
    defaults: {
      execute_hp_ratio: 0.1,
    },
  },
  sleeve_cosmos: {
    keys: ['cosmos_range', 'cosmos_pull', 'cosmos_root', 'cosmos_ward', 'sleeve_cosmos_period'],
    defaults: {
      cosmos_range: 520, cosmos_pull: 380, cosmos_root: 3.2, cosmos_ward: 0.9, sleeve_cosmos_period: 14,
    },
  },
  heavenly_eye: {
    keys: ['eye_range', 'eye_delay', 'eye_ratio', 'eye_armor_break', 'eye_blind', 'heavenly_eye_period'],
    defaults: {
      eye_range: 110, eye_delay: 0.7, eye_ratio: 1.4, eye_armor_break: 0.5, eye_blind: 3.5, heavenly_eye_period: 11,
    },
  },
  banana_storm: {
    keys: ['storm_range', 'storm_push', 'storm_radius', 'storm_delay', 'storm_ratio', 'banana_storm_period'],
    defaults: {
      storm_range: 420, storm_push: 320, storm_radius: 170, storm_delay: 0.9, storm_ratio: 1.2, banana_storm_period: 11,
    },
  },
  five_mountain: {
    keys: ['mountain_range', 'mountain_delay', 'mountain_ratio', 'mountain_root', 'mountain_sec', 'mountain_tick', 'mountain_press', 'five_mountain_period'],
    defaults: {
      mountain_range: 200, mountain_delay: 1.2, mountain_ratio: 1.6, mountain_root: 4, mountain_sec: 5, mountain_tick: 0.8, mountain_press: 0.5, five_mountain_period: 16,
    },
  },
  golden_bell: {
    keys: ['cymbal_root', 'cymbal_range', 'cymbal_sec', 'cymbal_tick', 'cymbal_ratio', 'golden_bell_period'],
    defaults: {
      cymbal_root: 3, cymbal_range: 150, cymbal_sec: 4, cymbal_tick: 0.8, cymbal_ratio: 0.14, golden_bell_period: 12,
    },
  },
  silk_fate: {
    keys: ['silk_speed', 'silk_radius', 'silk_life', 'silk_ratio', 'silk_add', 'silk_max', 'silk_window', 'silk_root', 'silk_fate_period'],
    defaults: {
      silk_speed: 240, silk_radius: 12, silk_life: 4, silk_ratio: 0.3, silk_add: 1, silk_max: 4, silk_window: 6, silk_root: 1.6, silk_fate_period: 10,
    },
  },
  trunk_coil: {
    keys: ['coil_range', 'coil_pull', 'coil_radius', 'coil_sec', 'coil_tick', 'coil_ratio', 'coil_throw', 'coil_throw_delay', 'trunk_coil_period'],
    defaults: {
      coil_range: 220, coil_pull: 160, coil_radius: 120, coil_sec: 3, coil_tick: 0.7, coil_ratio: 0.18, coil_throw: 260, coil_throw_delay: 1.4, trunk_coil_period: 11,
    },
  },
  swallow_sky: {
    keys: ['sky_range', 'sky_width', 'sky_delay', 'sky_ratio', 'sky_execute_ratio', 'swallow_sky_period'],
    defaults: {
      sky_range: 200, sky_width: 120, sky_delay: 0.6, sky_ratio: 1.8, sky_execute_ratio: 0.12, swallow_sky_period: 9,
    },
  },
  pure_dew: {
    keys: ['dew_clean', 'dew_heal', 'pure_dew_period'],
    defaults: {
      dew_clean: 4, dew_heal: 2, pure_dew_period: 15,
    },
  },
  lotus_guard: {
    keys: ['lotus_ward', 'lotus_thorns', 'lotus_guard_period'],
    defaults: {
      lotus_ward: 0.8, lotus_thorns: 0.3, lotus_guard_period: 12,
    },
  },
  ghost_fog: {
    keys: ['fog_range', 'fog_blind', 'fog_slow', 'fog_slow_sec', 'fog_ratio', 'sting_max', 'sting_window', 'sting_burst_ratio', 'ghost_fog_period'],
    defaults: {
      fog_range: 260, fog_blind: 2.5, fog_slow: 0.35, fog_slow_sec: 3, fog_ratio: 1, sting_max: 3, sting_window: 6, sting_burst_ratio: 1.2, ghost_fog_period: 10,
    },
  },
  divine_fire: {
    keys: ['divine_range', 'divine_sec', 'divine_tick', 'divine_ratio', 'sting_add', 'sting_max', 'sting_window', 'sting_burst_ratio', 'divine_fire_period'],
    defaults: {
      divine_range: 190, divine_sec: 5, divine_tick: 0.6, divine_ratio: 0.16, sting_add: 1, sting_max: 3, sting_window: 6, sting_burst_ratio: 1.2, divine_fire_period: 10,
    },
  },
}
