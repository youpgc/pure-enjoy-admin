import React, { useEffect, useState } from 'react'
import { Alert, Empty, Select, Space, Tabs, Typography } from 'antd'
import JourneyCrudTab from './JourneyCrudTab'
import { JOURNEY_LEVEL_SCOPED_SCHEMAS } from './journeySchemas'
import type { JourneyLookups } from './journeyTabSchema'
import common from '../../styles/common.module.css'

const { Text } = Typography

/// 关卡细节：按 game_levels 行锁定 level_id，编辑波次/密度热区/地图参照物。
/// 这三张表的 schema 定义仍在本页 journeySchemas，入口统一收归西行管理。
const JourneyLevelScopedTab: React.FC<{ lookups: JourneyLookups }> = ({ lookups }) => {
  const [levelId, setLevelId] = useState<string>('')

  useEffect(() => {
    if (!levelId && lookups.levels.length > 0) {
      setLevelId(lookups.levels[0]?.value ?? '')
    }
  }, [levelId, lookups.levels])

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="按关卡编辑波次、密度热区与地图参照物"
        description="坐标均为关卡世界坐标；波次按 start_sec 时间轴刷怪，循环层持续刷至怪量上限。"
      />
      <Space wrap className={common.mb16}>
        <Text>当前关卡</Text>
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: 300 }}
          value={levelId || undefined}
          placeholder="选择西行关卡"
          options={lookups.levels}
          onChange={(v) => setLevelId(v ?? '')}
        />
      </Space>
      {!levelId ? (
        <Empty description="暂无西行关卡，请先在「关卡配置」页创建" />
      ) : (
        <Tabs
          destroyInactiveTabPane
          items={JOURNEY_LEVEL_SCOPED_SCHEMAS.map((schema) => ({
            key: schema.key,
            label: schema.label,
            children: <JourneyCrudTab schema={schema} lookups={lookups} lockedFilterValue={levelId} />,
          }))}
        />
      )}
    </div>
  )
}

export default JourneyLevelScopedTab
