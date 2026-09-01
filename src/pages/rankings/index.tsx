import React from 'react'
import {
  Card, Table, Button, Space, Select, Tag, Statistic, Row, Col,
  Input, Modal, Form, Spin, Empty, InputNumber, Slider, Divider,
} from 'antd'
import {
  TrophyOutlined, ReloadOutlined, ExportOutlined,
  PushpinOutlined, EyeInvisibleOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useRankings } from './useRankings'
import { buildRankingColumns } from './columns'
import { RANKING_OPTIONS, DEFAULT_RULES } from './types'

const Rankings: React.FC = () => {
  const {
    loading,
    rankingType,
    setRankingType,
    data,
    lastRefresh,
    intervention,
    modalOpen,
    setModalOpen,
    modalType,
    setModalType,
    rulesModalOpen,
    setRulesModalOpen,
    rules,
    setRules,
    tablePagination,
    canWrite,
    fetchRankings,
    handleRefresh,
    handleExport,
    saveIntervention,
    saveRules,
    renderActions,
  } = useRankings()

  const columns = buildRankingColumns({ intervention, renderActions })

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title='总小说数' value={data.length} prefix={<TrophyOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title='已完结' value={data.filter((d) => d.status === 'completed').length} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title='置顶数' value={intervention.pin_ids.length} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title='屏蔽数' value={intervention.block_ids.length} /></Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Select
              value={rankingType}
              options={RANKING_OPTIONS}
              style={{ width: 140 }}
              onChange={setRankingType}
            />
            <Button type='primary' onClick={fetchRankings} loading={loading}>查询</Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>刷新榜单</Button>
          </Space>
          <Space>
            <Button icon={<ExportOutlined />} onClick={handleExport}>导出CSV</Button>
            <Button icon={<SettingOutlined />} disabled={!canWrite} onClick={() => setRulesModalOpen(true)}>
              规则配置
            </Button>
            <Button disabled={!canWrite} onClick={() => { setModalType('pin'); setModalOpen(true) }}>
              <PushpinOutlined /> 置顶管理
            </Button>
            <Button danger disabled={!canWrite} onClick={() => { setModalType('block'); setModalOpen(true) }}>
              <EyeInvisibleOutlined /> 屏蔽管理
            </Button>
          </Space>
        </Space>
        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
          上次刷新：{lastRefresh}
          {rankingType === 'avg_rating' && (
            <Tag style={{ marginLeft: 8, fontSize: 12 }} color='blue'>
              评分门槛 ≥ {rules.rating_min_count} 人
            </Tag>
          )}
          {rankingType === 'new_books' && (
            <Tag style={{ marginLeft: 8, fontSize: 12 }} color='green'>
              近 {rules.new_book_days_threshold} 天上架
            </Tag>
          )}
        </div>
      </Card>

      {/* 数据表格 */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Spin size='large' /></div>
        ) : data.length === 0 ? (
          <Empty description='暂无榜单数据' />
        ) : (
          <Table
            columns={columns}
            dataSource={data}
            rowKey='novel_id'
            scroll={{ x: 1300 }}
            pagination={tablePagination}
            size='small'
            bordered
          />
        )}
      </Card>

      {/* 干预弹窗 */}
      <Modal
        title={modalType === 'pin' ? '置顶小说管理' : '屏蔽小说管理'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form layout='vertical'>
          <Form.Item label={modalType === 'pin' ? '置顶小说ID（逗号分隔）' : '屏蔽小说ID（逗号分隔）'}>
            <Input.TextArea
              rows={4}
              defaultValue={(modalType === 'pin' ? intervention.pin_ids : intervention.block_ids).join(', ')}
              placeholder='输入小说UUID，多个用逗号分隔'
            />
          </Form.Item>
          <Button
            type='primary'
            onClick={() => {
              const textarea = document.querySelector('.ant-modal textarea') as HTMLTextAreaElement
              const ids = textarea.value.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
              saveIntervention(modalType, ids)
              setModalOpen(false)
            }}
          >
            保存
          </Button>
        </Form>
      </Modal>

      {/* 规则配置弹窗 */}
      <Modal
        title='榜单规则配置'
        open={rulesModalOpen}
        onCancel={() => setRulesModalOpen(false)}
        footer={null}
        width={520}
      >
        <Form layout='vertical' initialValues={rules}>
          <Divider orientation='left' plain>参与门槛</Divider>
          <Form.Item label='评分榜最少评分人数' name='rating_min_count'>
            <InputNumber
              min={1}
              max={1000}
              style={{ width: '100%' }}
              placeholder='默认 10 人'
              onChange={(v) => setRules((prev) => ({ ...prev, rating_min_count: v ?? DEFAULT_RULES.rating_min_count }))}
            />
          </Form.Item>
          <Form.Item label='新书榜天数阈值' name='new_book_days_threshold'>
            <InputNumber
              min={1}
              max={365}
              style={{ width: '100%' }}
              placeholder='默认 30 天'
              onChange={(v) => setRules((prev) => ({ ...prev, new_book_days_threshold: v ?? DEFAULT_RULES.new_book_days_threshold }))}
            />
          </Form.Item>

          <Divider orientation='left' plain>算法权重</Divider>
          <Form.Item label={`阅读量权重 (${rules.read_weight}x)`}>
            <Slider
              min={0}
              max={5}
              step={0.1}
              value={rules.read_weight}
              onChange={(v) => setRules((prev) => ({ ...prev, read_weight: v }))}
            />
          </Form.Item>
          <Form.Item label={`收藏量权重 (${rules.collect_weight}x)`}>
            <Slider
              min={0}
              max={5}
              step={0.1}
              value={rules.collect_weight}
              onChange={(v) => setRules((prev) => ({ ...prev, collect_weight: v }))}
            />
          </Form.Item>
          <Form.Item label={`评分权重 (${rules.rating_weight}x)`}>
            <Slider
              min={0}
              max={5}
              step={0.1}
              value={rules.rating_weight}
              onChange={(v) => setRules((prev) => ({ ...prev, rating_weight: v }))}
            />
          </Form.Item>

          <Space style={{ marginTop: 16 }}>
            <Button type='primary' onClick={() => { saveRules(rules); setRulesModalOpen(false) }}>
              保存并应用
            </Button>
            <Button onClick={() => { setRules(DEFAULT_RULES); saveRules(DEFAULT_RULES) }}>
              恢复默认
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  )
}

export default Rankings
