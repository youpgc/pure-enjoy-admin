import React from 'react'
import {
  Card, Table, Tabs, Button, Space, Input,
  Spin, Empty, Statistic, Row, Col, DatePicker,
  theme,
} from 'antd'
import {
  MessageOutlined, DeleteOutlined, ReloadOutlined,
  SearchOutlined, WarningOutlined, ExportOutlined,
  RiseOutlined, LineChartOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAnnotations } from './useAnnotations'
import { buildAnnotationColumns, buildReviewColumns } from './columns'
import { ColorDot } from './constants'

const Annotations: React.FC = () => {
  const { token } = theme.useToken()
  const {
    activeTab,
    setActiveTab,
    loading,
    data,
    userMap,
    filtered,
    searchUser,
    setSearchUser,
    searchNovel,
    setSearchNovel,
    dateRange,
    setDateRange,
    selectedIds,
    setSelectedIds,
    trendData,
    tablePagination,
    resetPage,
    fetchData,
    handleBatchDelete,
    handleExport,
    reviewData,
    totalUsers,
    thisWeek,
    maxTrendCount,
    renderActions,
    renderReviewActions,
  } = useAnnotations()

  const columns = buildAnnotationColumns({ userMap, renderActions })
  const reviewColumns = buildReviewColumns({ userMap, renderReviewActions })

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'list', label: '批注列表' },
          { key: 'review', label: `待审核${reviewData.length > 0 ? ` (${reviewData.length})` : ''}` },
          { key: 'stats', label: '统计报表' },
        ]}
      />

      {activeTab === 'list' && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Space wrap>
              <Input
                placeholder='用户ID'
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                style={{ width: 160 }}
                prefix={<SearchOutlined />}
              />
              <Input
                placeholder='小说ID'
                value={searchNovel}
                onChange={(e) => setSearchNovel(e.target.value)}
                style={{ width: 160 }}
              />
              <DatePicker.RangePicker value={dateRange} onChange={(dates) => setDateRange(dates || [null, null])} />
              <Button type='primary' icon={<SearchOutlined />} onClick={() => { resetPage(); fetchData() }}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
              <Button icon={<ExportOutlined />} onClick={handleExport}>导出CSV</Button>
              <Button danger onClick={handleBatchDelete} disabled={selectedIds.length === 0}>
                <DeleteOutlined /> 批量删除 ({selectedIds.length})
              </Button>
            </Space>
          </Card>
          <Card>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 80 }}><Spin size='large' /></div>
            ) : (
              <Table
                columns={columns}
                dataSource={filtered}
                rowKey='id'
                rowSelection={{ selectedRowKeys: selectedIds, onChange: setSelectedIds }}
                scroll={{ x: 1100 }}
                pagination={tablePagination}
                size='small'
                bordered
              />
            )}
          </Card>
        </>
      )}

      {activeTab === 'review' && (
        <Card>
          {reviewData.length === 0 ? (
            <Empty description='暂无待审核批注' />
          ) : (
            <Table columns={reviewColumns} dataSource={reviewData} rowKey='id' pagination={{ pageSize: 20 }} size='small' bordered />
          )}
        </Card>
      )}

      {activeTab === 'stats' && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title='总批注数' value={data.length} prefix={<MessageOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title='批注用户数' value={totalUsers} prefix={<MessageOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title='本周新增' value={thisWeek.length} prefix={<RiseOutlined />} valueStyle={{ color: token.colorSuccess }} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title='日均新增' value={trendData.length > 0 ? (data.length / 30).toFixed(1) : '0'} prefix={<LineChartOutlined />} /></Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title='近30天批注趋势'>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : trendData.length === 0 ? (
                  <Empty description='暂无趋势数据' />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 4, padding: '0 8px' }}>
                    {trendData.map((item, index) => {
                      const height = maxTrendCount > 0 ? (item.count / maxTrendCount) * 180 : 0
                      return (
                        <div key={item.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <div style={{ fontSize: 10, color: token.colorTextTertiary, marginBottom: 4 }}>{item.count}</div>
                          <div
                            style={{
                              width: '100%',
                              height: `${height}px`,
                              background: index % 7 === 6 ? token.colorPrimary : token.colorPrimaryBg,
                              borderRadius: '2px 2px 0 0',
                              minHeight: item.count > 0 ? 4 : 0,
                            }}
                            title={`${item.date}: ${item.count} 条`}
                          />
                          <div style={{ fontSize: 10, color: token.colorTextTertiary, marginTop: 4, transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap' }}>
                            {dayjs(item.date).format('MM-DD')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </Col>
            <Col span={24}>
              <Card title='颜色分布'>
                <Space size='large'>
                  {['yellow', 'green', 'blue', 'red'].map((c) => {
                    const count = data.filter((d) => d.color === c).length
                    return (
                      <Space key={c}>
                        <ColorDot color={c} />
                        <span>
                          {c === 'yellow' ? '黄色' : c === 'green' ? '绿色' : c === 'blue' ? '蓝色' : '红色'}: <b>{count}</b>
                        </span>
                      </Space>
                    )
                  })}
                </Space>
              </Card>
            </Col>
            <Col span={24}>
              <Card title={`待审核批注: ${reviewData.length} 条`}>
                {reviewData.length > 0 && (
                  <Space>
                    <WarningOutlined style={{ color: token.colorError }} />
                    <span style={{ color: token.colorError }}>发现 {reviewData.length} 条含敏感词的批注，请尽快审核</span>
                  </Space>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}

export default Annotations
