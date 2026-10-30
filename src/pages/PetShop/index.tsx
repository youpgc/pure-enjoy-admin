import { Tabs } from 'antd'
import PetItems from '../PetItems'
import PetEggPools from '../PetEggPools'
import PetScenes from '../PetScenes'
import LotteryRecords from './LotteryRecords'

// ==================== 商品目录（IA 整合：道具 / 蛋池 / 礼盒 / 场景 收拢） ====================
// 礼盒页签 = 抽取记录审计（用户/时间/结果/相关数据）；礼盒定价与限购配置在
// 「全局参数 → 幸运蛋礼盒」（20261030 定版：配置卡迁全局参数，本页只看记录）。

const PetShop: React.FC = () => {
  return (
    <Tabs
      defaultActiveKey="items"
      destroyOnHidden={false}
      items={[
        { key: 'items', label: '道具目录', children: <PetItems /> },
        { key: 'egg_pools', label: '蛋池与概率', children: <PetEggPools /> },
        { key: 'lottery', label: '幸运蛋礼盒', children: <LotteryRecords /> },
        { key: 'scenes', label: '场景管理', children: <PetScenes /> },
      ]}
    />
  )
}

export default PetShop
