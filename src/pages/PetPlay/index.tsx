import React from 'react'
import { Tabs } from 'antd'
import PetQuests from '../PetQuests'
import PetAchievements from '../PetAchievements'
import PetEvents from '../PetEvents'
import PetAdventureSpots from '../PetAdventureSpots'
import PetCheckin from '../PetCheckin'

// ==================== 玩法内容（IA 整合：任务 / 成就 / 随机事件 / 游历地 收拢） ====================

const PetPlay: React.FC = () => (
  <Tabs
    defaultActiveKey="quests"
    destroyOnHidden={false}
    items={[
      { key: 'quests', label: '任务池', children: <PetQuests /> },
      { key: 'achievements', label: '成就配置', children: <PetAchievements /> },
      { key: 'events', label: '随机事件', children: <PetEvents /> },
      { key: 'spots', label: '游历地', children: <PetAdventureSpots /> },
      { key: 'checkin', label: '签到配置', children: <PetCheckin /> },
    ]}
  />
)

export default PetPlay
