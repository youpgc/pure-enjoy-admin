import React, { useState } from 'react'
import { Tabs } from 'antd'
import PetItems from '../PetItems'
import PetEggPools from '../PetEggPools'
import PetScenes from '../PetScenes'
import ReservedGroupCard from '../../components/form/pet/ReservedGroupCard'
import { usePermission } from '../../hooks/usePermission'

// ==================== 商品目录（IA 整合：道具 / 蛋池 / 礼盒 / 场景 收拢） ====================

const PetShop: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  // 礼盒页签每次激活重挂参数卡：配置取数即最新（其他页签数据由本页维护，无此需求）
  const [lotteryTick, setLotteryTick] = useState(0)

  return (
    <Tabs
      defaultActiveKey="items"
      destroyOnHidden={false}
      onChange={(k) => {
        if (k === 'lottery') setLotteryTick((t) => t + 1)
      }}
      items={[
        { key: 'items', label: '道具目录', children: <PetItems /> },
        { key: 'egg_pools', label: '蛋池与概率', children: <PetEggPools /> },
        {
          key: 'lottery',
          label: '幸运蛋礼盒',
          children: (
            <ReservedGroupCard
              key={lotteryTick}
              canWrite={canWrite}
              groups={[
                {
                  title: '幸运蛋礼盒',
                  description:
                    '概率表在「蛋池与概率」页签的礼盒池维护（当前 N13% / R35% / SR50% / SSR2%）；SSR 保底＝连续抽未出 SSR 达阈值，下一抽必出 SSR。',
                  fields: [
                    { path: ['reserved', 'lottery', 'price'], label: '单价（金币）', desc: '每次抽取消耗的金币', min: 0 },
                    { path: ['reserved', 'lottery', 'limit_total'], label: '终身限购（次）', desc: '每个账号累计可抽取次数', min: 0 },
                    { path: ['reserved', 'lottery', 'limit_window_hours'], label: '时段窗口（小时）', desc: '滚动窗口时长，与窗口限购组成时段限购', min: 1 },
                    { path: ['reserved', 'lottery', 'limit_per_window'], label: '窗口内限购（次）', desc: '窗口内最多可抽取次数', min: 0 },
                    { path: ['reserved', 'lottery', 'ssr_pity_at'], label: 'SSR 保底（次）', desc: '连续未出 SSR 达此值，下一抽必出 SSR（出即清零）', min: 1 },
                  ],
                },
              ]}
            />
          ),
        },
        { key: 'scenes', label: '场景管理', children: <PetScenes /> },
      ]}
    />
  )
}

export default PetShop
