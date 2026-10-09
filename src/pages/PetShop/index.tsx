import React from 'react'
import { Tabs } from 'antd'
import PetItems from '../PetItems'
import PetEggPools from '../PetEggPools'
import PetScenes from '../PetScenes'

// ==================== 商品目录（IA 整合：道具 / 蛋池 / 场景 收拢） ====================

const PetShop: React.FC = () => (
  <Tabs
    defaultActiveKey="items"
    destroyOnHidden={false}
    items={[
      { key: 'items', label: '道具目录', children: <PetItems /> },
      { key: 'egg_pools', label: '蛋池与概率', children: <PetEggPools /> },
      { key: 'scenes', label: '场景管理', children: <PetScenes /> },
    ]}
  />
)

export default PetShop
