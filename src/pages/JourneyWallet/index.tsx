import React from 'react'
import { Alert, Tabs } from 'antd'
import common from '../../styles/common.module.css'
import { MeritRecordsTab } from './MeritRecordsTab'
import { RunsTab } from './RunsTab'
import { ProgressTab } from './ProgressTab'

// ==================== 西行钱包（journey_merit_records / journey_runs / journey_progress） ====================
// 功德为西行独立货币：流水 append-only 只读，余额见 balance_after 快照列；
// 对局流水一场一条；进度快照一行=一个用户。表 DDL 尚未执行时查询报错属预期（提示条已说明）。
// 时间列（created_at/updated_at）统一经 utils/format 的 formatDateTime 展示
// （dayjs.tz('Asia/Shanghai') 固定 UTC+8 北京口径，不依赖浏览器时区）。

const JourneyWallet: React.FC = () => (
  <div>
    <Alert
      type="info"
      showIcon
      className={common.mb16}
      message="西行钱包说明"
      description="功德为西行（journey）独立货币，与宠物金币/积分互不通用；流水 append-only 只读，变动后余额见「余额快照」列（balance_after）。来源五类：对局结算 / 天赋升级 / 角色解锁 / 还魂丹复活 / 统一解锁。「进度快照」读 journey_progress（一行=一个用户）。journey_merit_records、journey_runs、journey_progress 表 SQL 尚未执行时本页查询报错属预期，执行后即可正常查看。"
    />
    <Tabs
      defaultActiveKey="merit"
      destroyInactiveTabPane
      items={[
        { key: 'merit', label: '功德流水', children: <MeritRecordsTab /> },
        { key: 'runs', label: '西行记录', children: <RunsTab /> },
        { key: 'progress', label: '进度快照', children: <ProgressTab /> },
      ]}
    />
  </div>
)

export default JourneyWallet
