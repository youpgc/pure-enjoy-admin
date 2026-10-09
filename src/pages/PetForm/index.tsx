import React from 'react'
import { Tabs } from 'antd'
import PetSpecies from '../PetSpecies'
import PetEvoChains from '../PetEvoChains'
import PetRarities from '../PetRarities'
import PetTraits from '../PetTraits'
import PetPersonalities from '../PetPersonalities'

// ==================== 形态体系（2026-10-09 IA 整合：5 页收拢为 1 个 Tab 容器） ====================
//
// 种属 / 进化链 / 评级 / 特性 / 性格 同属「物种定义」域，修改频率低、互相独立，
// 合并为一页五签：侧边栏宠物管理 16 项 → 5 项。子页保持原组件原样嵌入
// （各自取数、互不依赖），Tabs 懒挂载 + 激活后保活，与页签 keepalive 体验一致。

const PetForm: React.FC = () => (
  <Tabs
    defaultActiveKey="species"
    destroyOnHidden={false}
    items={[
      { key: 'species', label: '种属管理', children: <PetSpecies /> },
      { key: 'evo_chains', label: '进化链', children: <PetEvoChains /> },
      { key: 'rarities', label: '评级字典', children: <PetRarities /> },
      { key: 'traits', label: '特性池', children: <PetTraits /> },
      { key: 'personalities', label: '性格字典', children: <PetPersonalities /> },
    ]}
  />
)

export default PetForm
