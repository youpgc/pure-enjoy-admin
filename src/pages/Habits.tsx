import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  Switch,
  Progress,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Avatar,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FireOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { supabase } from '../utils/supabase';
import dayjs from 'dayjs';

interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: 'daily' | 'weekly';
  target_days: number;
  current_streak: number;
  max_streak: number;
  total_checkins: number;
  color: string;
  is_active: boolean;
  created_at: string;
  username?: string;
}

interface HabitCheckin {
  id: string;
  habit_id: string;
  checkin_at: string;
}

const colorOptions = [
  { value: 'red', label: '红色', color: '#f5222d' },
  { value: 'orange', label: '橙色', color: '#fa8c16' },
  { value: 'yellow', label: '黄色', color: '#fadb14' },
  { value: 'green', label: '绿色', color: '#52c41a' },
  { value: 'cyan', label: '青色', color: '#13c2c2' },
  { value: 'blue', label: '蓝色', color: '#1890ff' },
  { value: 'purple', label: '紫色', color: '#722ed1' },
  { value: 'pink', label: '粉色', color: '#eb2f96' },
];

const Habits: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Record<string, HabitCheckin[]>>({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalCheckins: 0,
    avgStreak: 0,
  });

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    setLoading(true);
    try {
      const { data: habitsData, error: habitsError } = await supabase
        .from('user_habits')
        .select(`
          *,
          users:user_id (nickname)
        `)
        .order('created_at', { ascending: false });

      if (habitsError) throw habitsError;

      const formattedHabits = (habitsData || []).map((item: any) => ({
        ...item,
        username: item.users?.nickname || '未知用户',
      }));

      setHabits(formattedHabits);

      // 获取打卡记录
      const checkinsMap: Record<string, HabitCheckin[]> = {};
      for (const habit of formattedHabits) {
        const { data: checkinData } = await supabase
          .from('habit_checkins')
          .select('*')
          .eq('habit_id', habit.id)
          .order('checkin_at', { ascending: false });
        checkinsMap[habit.id] = checkinData || [];
      }
      setCheckins(checkinsMap);

      calculateStats(formattedHabits, checkinsMap);
    } catch (error) {
      message.error('获取习惯列表失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (habitsData: Habit[], checkinsMap: Record<string, HabitCheckin[]>) => {
    const totalCheckins = Object.values(checkinsMap).reduce((sum, arr) => sum + arr.length, 0);
    const avgStreak = habitsData.length > 0
      ? Math.round(habitsData.reduce((sum, h) => sum + h.current_streak, 0) / habitsData.length)
      : 0;

    setStats({
      total: habitsData.length,
      active: habitsData.filter((h) => h.is_active).length,
      totalCheckins,
      avgStreak,
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingHabit) {
        const { error } = await supabase
          .from('user_habits')
          .update(values)
          .eq('id', editingHabit.id);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase.from('user_habits').insert([values]);
        if (error) throw error;
        message.success('创建成功');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingHabit(null);
      fetchHabits();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('user_habits').delete().eq('id', id);
      if (error) throw error;
      message.success('删除成功');
      fetchHabits();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const toggleActive = async (record: Habit) => {
    try {
      const { error } = await supabase
        .from('user_habits')
        .update({ is_active: !record.is_active })
        .eq('id', record.id);
      if (error) throw error;
      message.success(record.is_active ? '已暂停' : '已激活');
      fetchHabits();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const openModal = (record?: Habit) => {
    if (record) {
      setEditingHabit(record);
      form.setFieldsValue(record);
    } else {
      setEditingHabit(null);
      form.resetFields();
      form.setFieldsValue({
        frequency: 'daily',
        target_days: 21,
        color: 'blue',
        is_active: true,
        current_streak: 0,
        max_streak: 0,
        total_checkins: 0,
      });
    }
    setModalVisible(true);
  };

  const filteredHabits = habits.filter(
    (item) =>
      !searchText ||
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchText.toLowerCase())
  );

  const getTodayCheckins = (habitId: string) => {
    const habitCheckins = checkins[habitId] || [];
    const today = dayjs().format('YYYY-MM-DD');
    return habitCheckins.filter((c) => dayjs(c.checkin_at).format('YYYY-MM-DD') === today).length;
  };

  const columns = [
    {
      title: '习惯',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Habit) => (
        <Space>
          <Avatar style={{ backgroundColor: colorOptions.find((c) => c.value === record.color)?.color }}>
            <FireOutlined />
          </Avatar>
          <span>{text}</span>
          {!record.is_active && <Tag color="default">已暂停</Tag>}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '频率',
      dataIndex: 'frequency',
      key: 'frequency',
      render: (freq: string) => freq === 'daily' ? '每天' : '每周',
    },
    {
      title: '进度',
      key: 'progress',
      render: (_: any, record: Habit) => {
        const percent = Math.min(100, Math.round((record.current_streak / record.target_days) * 100));
        return (
          <Tooltip title={`${record.current_streak}/${record.target_days} 天`}>
            <Progress percent={percent} size="small" style={{ width: 100 }} />
          </Tooltip>
        );
      },
    },
    {
      title: '连续打卡',
      key: 'streak',
      render: (_: any, record: Habit) => (
        <Space>
          <Tag icon={<FireOutlined />} color="orange">
            当前: {record.current_streak}
          </Tag>
          <Tag icon={<TrophyOutlined />} color="gold">
            最高: {record.max_streak}
          </Tag>
        </Space>
      ),
    },
    {
      title: '总打卡',
      dataIndex: 'total_checkins',
      key: 'total_checkins',
      render: (total: number, record: Habit) => (
        <Space>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <span>{total} 次</span>
          {getTodayCheckins(record.id) > 0 && (
            <Tag color="success">今日已打卡</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Habit) => (
        <Space>
          <Button onClick={() => toggleActive(record)}>
            {record.is_active ? '暂停' : '激活'}
          </Button>
          <Button icon={<EditOutlined />} onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总习惯数" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="进行中" value={stats.active} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总打卡次数" value={stats.totalCheckins} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平均连续天数" value={stats.avgStreak} suffix="天" />
          </Card>
        </Col>
      </Row>

      <Card
        title="习惯打卡管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            添加习惯
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索习惯名称"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={filteredHabits}
          loading={loading}
          rowKey="id"
          expandable={{
            expandedRowRender: (record: Habit) => {
              const habitCheckins = checkins[record.id] || [];
              const recentCheckins = habitCheckins.slice(0, 10);
              return (
                <div style={{ padding: '16px 0' }}>
                  <h4>最近打卡记录</h4>
                  {recentCheckins.length > 0 ? (
                    <Space wrap>
                      {recentCheckins.map((c) => (
                        <Tag key={c.id} icon={<CalendarOutlined />}>
                          {dayjs(c.checkin_at).format('MM-DD HH:mm')}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <span style={{ color: '#999' }}>暂无打卡记录</span>
                  )}
                </div>
              );
            },
          }}
        />
      </Card>

      <Modal
        title={editingHabit ? '编辑习惯' : '添加习惯'}
        open={modalVisible}
        onOk={form.submit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="user_id"
            label="用户ID"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <Input placeholder="请输入用户ID" />
          </Form.Item>
          <Form.Item
            name="name"
            label="习惯名称"
            rules={[{ required: true, message: '请输入习惯名称' }]}
          >
            <Input placeholder="例如：早起、阅读、运动" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item name="frequency" label="频率" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '每天', value: 'daily' },
                { label: '每周', value: 'weekly' },
              ]}
            />
          </Form.Item>
          <Form.Item name="target_days" label="目标天数" rules={[{ required: true }]}>
            <Input type="number" placeholder="例如：21" />
          </Form.Item>
          <Form.Item name="color" label="颜色" rules={[{ required: true }]}>
            <Select>
              {colorOptions.map((c) => (
                <Select.Option key={c.value} value={c.value}>
                  <span style={{ color: c.color }}>●</span> {c.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="is_active" label="激活状态" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Habits;
