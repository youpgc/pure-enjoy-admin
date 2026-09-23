import React, { useState } from 'react'
import { Alert, Tabs } from 'antd'
import AchievementsTab, { type AchievementOption } from './AchievementsTab'
import ProgressTab from './ProgressTab'
import common from '../../styles/common.module.css'

// ==================== 成就管理（pet_achievements + pet_achievement_progress） ====================
//
// 判定与发放在服务端：rpc_pet_achievement_check 重算进度（只增不减）、
// rpc_pet_achievement_claim 领奖（背包满整单回滚）。后台只配规则、看进度。

const PetAchievements: React.FC = () => {
  const [achievements, setAchievements] = useState<AchievementOption[]>([])

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="成就说明"
        description="成就进度由服务端按真实流水重算（只增不减，宠物放归不倒退），App 打开宠物页时触发。condition_type 必须取自下拉白名单——白名单外的取值不报错但进度恒为 0。奖励包 schema 与每日/每周任务一致（金币 / 积分 / 道具，传说蛋以道具形式配置）。"
      />
      <Tabs
        defaultActiveKey="config"
        items={[
          {
            key: 'config',
            label: '成就配置',
            children: <AchievementsTab onRowsChange={setAchievements} />,
          },
          { key: 'progress', label: '用户进度', children: <ProgressTab achievements={achievements} /> },
        ]}
      />
    </div>
  )
}

export default PetAchievements
