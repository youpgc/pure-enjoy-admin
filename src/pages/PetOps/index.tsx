import React from 'react'
import { Tabs } from 'antd'
import PetPets from '../PetPets'
import PetWallets from '../PetWallets'
import PetBagAdjust from '../PetBagAdjust'
import PetDashboard from '../PetDashboard'

// ==================== 运营工具（IA 整合：宠物个体 / 金币流水 / 客服调整 收拢） ====================

const PetOps: React.FC = () => (
  <Tabs
    defaultActiveKey="pets"
    destroyOnHidden={false}
    items={[
      { key: 'pets', label: '宠物个体', children: <PetPets /> },
      { key: 'wallets', label: '金币流水', children: <PetWallets /> },
      { key: 'adjust', label: '客服调整', children: <PetBagAdjust /> },
      { key: 'dashboard', label: '数据看板', children: <PetDashboard /> },
    ]}
  />
)

export default PetOps
