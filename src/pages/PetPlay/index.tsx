import React from 'react'
import { Tabs } from 'antd'
import PetQuests from '../PetQuests'
import PetAchievements from '../PetAchievements'
import PetEvents from '../PetEvents'
import PetAdventureSpots from '../PetAdventureSpots'

// ==================== 玩法内容（IA 整合：任务 / 成就 / 随机事件 / 历险地 收拢） ====================

const PetPlay: React.FC = () => (
  <Tabs
    defaultActiveKey="quests"
    destroyOnHidden={false}
    items={[
      { key: 'quests', label: '任务池', children: <PetQuests /> },
      { key: 'achievements', label: '成就配置', children: <PetAchievements /> },
      { key: 'events', label: '随机事件', children: <PetEvents /> },
      { key: 'spots', label: '历险地', children: <PetAdventureSpots /> },
    ]}
  />
)

export default PetPlay
