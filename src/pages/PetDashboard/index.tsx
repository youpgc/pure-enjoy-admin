import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Progress, Row, Statistic, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { supabase } from '../../utils/supabase'
import common from '../../styles/common.module.css'

// ==================== 宠物数据看板（rpc_pet_admin_dashboard，运营工具第 4 签） ====================
//
// 全模块运营指标聚合（服务端一次返回；is_admin() 闸门）。
// 结构化指标用统计卡，分布类用进度条——不做图表库依赖（按需后续引入）。

interface DashboardData {
  generated_at: string
  pets: {
    total: number
    rearing: number
    fostered: number
    adventuring: number
    breeding: number
    released: number
    by_rarity: Record<string, number>
    avg_level: number
    max_level: number
  }
  users_with_pets: number
  eggs: { unopened: number; waiting: number; ready: number; hatched: number }
  adventures: { ongoing: number; awaiting_rescue: number; today_claimed: number }
  wallet_today: { earned: number; spent: number }
  wallet_by_source: Record<string, number>
  quests_today: { total: number; claimed: number }
  events_today: { rolls: number; choices: number }
  timeline_total: number
}

const RARITY_META: Record<string, { label: string; color: string }> = {
  N: { label: 'N 普通', color: '#8c8c8c' },
  R: { label: 'R 稀有', color: '#4A90D9' },
  SR: { label: 'SR 史诗', color: '#9B59D0' },
  SSR: { label: 'SSR 传说', color: '#D9A441' },
}

const SOURCE_LABELS: Record<string, string> = {
  pet_shop_buy: '商城消费',
  pet_system_reward: '系统发放',
  pet_achievement: '成就发放',
  pet_exchange: '积分兑换',
  pet_admin_grant: '客服调整',
  pet_adventure_penalty: '历险惩罚',
  pet_feature_spend: '功能消耗',
}

const PetDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data: res, error: err } = await supabase.rpc('rpc_pet_admin_dashboard')
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setData(res as unknown as DashboardData)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="看板加载失败"
        description={error}
        action={
          <Button size="small" onClick={load}>
            重试
          </Button>
        }
      />
    )
  }

  const p = data?.pets
  const rarityEntries = p ? Object.entries(p.by_rarity) : []

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="宠物数据看板"
        description="全模块运营指标即时聚合（非缓存）。金币流水为累计口径，「今日」按北京自然日。"
        action={
          <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={load}>
            刷新
          </Button>
        }
      />

      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="宠物总数" value={p?.total ?? '-'} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="在养中" value={p?.rearing ?? '-'} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="拥有宠物用户" value={data?.users_with_pets ?? '-'} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="等级"
              value={p ? `平均 ${p.avg_level} · 最高 ${p.max_level}` : '-'}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} md={12}>
          <Card size="small" title="评级分布">
            {rarityEntries.length === 0 ? (
              '暂无数据'
            ) : (
              <>
                {rarityEntries.map(([code, n]) => {
                  const meta = RARITY_META[code] ?? { label: code, color: '#8c8c8c' }
                  const pct = p && p.total > 0 ? Math.round((n * 100) / p.total) : 0
                  return (
                    <div key={code} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{meta.label}</span>
                        <span>
                          {n}（{pct}%）
                        </span>
                      </div>
                      <Progress
                        percent={pct}
                        showInfo={false}
                        strokeColor={meta.color}
                        size="small"
                      />
                    </div>
                  )
                })}
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" title="状态分布">
            {p ? (
              <>
                <div style={{ marginBottom: 6 }}>
                  <Tag color="green">养育 {p.rearing}</Tag>
                  <Tag color="blue">历险 {p.adventuring}</Tag>
                  <Tag color="purple">繁育 {p.breeding}</Tag>
                  <Tag color="orange">寄养 {p.fostered}</Tag>
                  <Tag>已放生 {p.released}</Tag>
                </div>
                <Statistic
                  title="时间线累计"
                  value={data?.timeline_total ?? '-'}
                  suffix="条"
                />
              </>
            ) : (
              '-'
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} md={8}>
          <Card size="small" title="蛋状态">
            {data ? (
              <>
                <div>未开启 {data.eggs.unopened}</div>
                <div>孵化中 {data.eggs.waiting}</div>
                <div>可领取 {data.eggs.ready}</div>
                <div>已孵化 {data.eggs.hatched}</div>
              </>
            ) : (
              '-'
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title="历险">
            {data ? (
              <>
                <div>进行中 {data.adventures.ongoing}</div>
                <div>待救助 {data.adventures.awaiting_rescue}</div>
                <div>今日已领取 {data.adventures.today_claimed}</div>
              </>
            ) : (
              '-'
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title="今日（北京日）">
            {data ? (
              <>
                <div>金币收入 {data.wallet_today.earned}</div>
                <div>金币支出 {data.wallet_today.spent}</div>
                <div>任务领取 {data.quests_today.claimed}/{data.quests_today.total}</div>
                <div>事件触发 {data.events_today.rolls} · 选择 {data.events_today.choices}</div>
              </>
            ) : (
              '-'
            )}
          </Card>
        </Col>
      </Row>

      <Card size="small" title="金币流水累计（按来源）" style={{ marginTop: 12 }}>
        {data && Object.keys(data.wallet_by_source).length > 0 ? (
          Object.entries(data.wallet_by_source).map(([src, sum]) => (
            <div key={src} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{SOURCE_LABELS[src] ?? src}</span>
              <span style={{ color: (sum as number) < 0 ? '#cf1322' : undefined }}>
                {(sum as number) > 0 ? '+' : ''}
                {sum as number}
              </span>
            </div>
          ))
        ) : (
          '-'
        )}
      </Card>
    </div>
  )
}

export default PetDashboard
