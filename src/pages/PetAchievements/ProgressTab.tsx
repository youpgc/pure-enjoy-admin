import React, { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input, Select, Space, Table } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { PetAchievementProgressRow } from '../../types/pet'
import { petAchievementProgressService } from '../../services/petService'
import { userService } from '../../services/userService'
import { useUsernames } from '../../hooks/useUsernames'
import { buildProgressColumns } from './progressColumns'
import common from '../../styles/common.module.css'

// ==================== 用户成就进度查询（Tab 2，只读） ====================

const PAGE_SIZE = 20

const ProgressTab: React.FC<{
  achievements: Array<{ id: string; code: string; title: string }>
}> = ({ achievements }) => {
  const [rows, setRows] = useState<PetAchievementProgressRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [achievementFilter, setAchievementFilter] = useState('')
  const [searchText, setSearchText] = useState('')

  const loadRows = useCallback(async (targetPage: number, achId: string, keyword: string) => {
    setLoading(true)
    let userIds: string[] | undefined
    if (keyword.trim()) {
      const ids = await userService.findUserIdsByKeyword(keyword.trim())
      setLoading(false)
      if (!ids.success) return
      userIds = ids.data ?? []
      if (userIds.length === 0) {
        setRows([])
        setTotal(0)
        return
      }
    }
    const res = await petAchievementProgressService.paginateProgress(targetPage, PAGE_SIZE, {
      achievementId: achId || undefined,
      userIds,
    })
    setLoading(false)
    if (!res.success || !res.data) return
    setRows(res.data.data)
    setTotal(res.data.total)
  }, [])

  useEffect(() => {
    loadRows(page, achievementFilter, searchText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, achievementFilter, searchText])

  const userMap = useUsernames(rows.map((r) => r.user_id))
  const columns = buildProgressColumns(userMap)

  return (
    <>
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Select
              style={{ width: 260 }}
              value={achievementFilter}
              allowClear
              options={[
                { value: '', label: '全部成就' },
                ...achievements.map((a) => ({ value: a.id, label: `${a.title}（${a.code}）` })),
              ]}
              onChange={(v) => {
                setAchievementFilter(v ?? '')
                setPage(1)
              }}
            />
            <Input.Search
              placeholder="按用户名/昵称筛选"
              allowClear
              style={{ width: 220 }}
              onSearch={(v) => {
                setSearchText(v)
                setPage(1)
              }}
            />
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => loadRows(page, achievementFilter, searchText)}
            >
              刷新
            </Button>
          </Space>
        </div>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
        size="middle"
        scroll={{ x: 1000 }}
      />
    </>
  )
}

export default ProgressTab
