import React, { useState } from 'react'
import { Alert, Tabs } from 'antd'
import ChainsTab, { type ChainOption } from './ChainsTab'
import StagesTab from './StagesTab'
import common from '../../styles/common.module.css'

// ==================== 进化链管理（pet_evo_chains + pet_evo_stages） ====================
//
// 挂载关系：种属管理表的「进化链」列指向本链 id，宠物按自身 stage+1 在本链取候选阶段行。
// 需求口径：进化不可逆；目标形态种属须启用（灰度开关）；条件全过才扣金币/道具（同事务）。

const PetEvoChains: React.FC = () => {
  const [chains, setChains] = useState<ChainOption[]>([])
  const [activeKey, setActiveKey] = useState('chains')
  const [chainId, setChainId] = useState('')

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="进化链说明"
        description="一条链 = 一个形态的进化路线（阶段行按「阶段号 + 目标形态」配置，同阶段多行即多分支）。进化在服务端结算：宠物当前阶段 +1 找候选行，唯一候选直接进化；多分支时「加权随机」按权重自动选、「玩家抉择」需 App 弹窗回传目标形态。进化条件全部满足才扣金币/道具，任一不满足整单不生效。"
      />
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          {
            key: 'chains',
            label: '进化链',
            children: (
              <ChainsTab
                onRowsChange={setChains}
                onConfigureStages={(id) => {
                  setChainId(id)
                  setActiveKey('stages')
                }}
              />
            ),
          },
          {
            key: 'stages',
            label: '阶段与条件',
            children: <StagesTab chains={chains} chainId={chainId} onChainChange={setChainId} />,
          },
        ]}
      />
    </div>
  )
}

export default PetEvoChains
