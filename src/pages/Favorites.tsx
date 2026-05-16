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
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  PushpinOutlined,
  PushpinFilled,
} from '@ant-design/icons';
import { supabase } from '../services/supabase';

interface Favorite {
  id: string;
  user_id: string;
  title: string;
  url: string | null;
  category: string;
  tags: string[] | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  username?: string;
}

const categories = [
  { label: '文章', value: 'article' },
  { label: '视频', value: 'video' },
  { label: '音乐', value: 'music' },
  { label: '图片', value: 'image' },
  { label: '工具', value: 'tool' },
  { label: '其他', value: 'other' },
];

const Favorites: React.FC = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState<Favorite | null>(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>();
  const [form] = Form.useForm();
  const [stats, setStats] = useState({
    total: 0,
    pinned: 0,
    byCategory: {} as Record<string, number>,
  });

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          *,
          users:user_id (username)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        ...item,
        username: item.users?.username || '未知用户',
      }));

      setFavorites(formattedData);
      calculateStats(formattedData);
    } catch (error) {
      message.error('获取收藏列表失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Favorite[]) => {
    const byCategory: Record<string, number> = {};
    data.forEach((item) => {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    });

    setStats({
      total: data.length,
      pinned: data.filter((i) => i.is_pinned).length,
      byCategory,
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()) : null,
      };

      if (editingFavorite) {
        const { error } = await supabase
          .from('user_favorites')
          .update(payload)
          .eq('id', editingFavorite.id);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase.from('user_favorites').insert([payload]);
        if (error) throw error;
        message.success('创建成功');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingFavorite(null);
      fetchFavorites();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('user_favorites').delete().eq('id', id);
      if (error) throw error;
      message.success('删除成功');
      fetchFavorites();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const togglePin = async (record: Favorite) => {
    try {
      const { error } = await supabase
        .from('user_favorites')
        .update({ is_pinned: !record.is_pinned })
        .eq('id', record.id);
      if (error) throw error;
      message.success(record.is_pinned ? '取消置顶' : '置顶成功');
      fetchFavorites();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const openModal = (record?: Favorite) => {
    if (record) {
      setEditingFavorite(record);
      form.setFieldsValue({
        ...record,
        tags: record.tags?.join(', '),
      });
    } else {
      setEditingFavorite(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const filteredFavorites = favorites.filter((item) => {
    const matchSearch =
      !searchText ||
      item.title.toLowerCase().includes(searchText.toLowerCase()) ||
      item.tags?.some((t) => t.toLowerCase().includes(searchText.toLowerCase()));
    const matchCategory = !categoryFilter || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Favorite) => (
        <Space>
          {record.is_pinned && <PushpinFilled style={{ color: '#1890ff' }} />}
          <span>{text}</span>
          {record.url && <LinkOutlined style={{ color: '#52c41a' }} />}
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => {
        const cat = categories.find((c) => c.value === category);
        return <Tag>{cat?.label || category}</Tag>;
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[] | null) =>
        tags?.map((tag) => <Tag key={tag} color="blue">{tag}</Tag>),
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Favorite) => (
        <Space>
          <Button
            icon={record.is_pinned ? <PushpinFilled /> : <PushpinOutlined />}
            onClick={() => togglePin(record)}
            type={record.is_pinned ? 'primary' : 'default'}
          >
            {record.is_pinned ? '取消置顶' : '置顶'}
          </Button>
          <Button icon={<EditOutlined />} onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            onConfirm={() => handleDelete(record.id)}
          >
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
            <Statistic title="总收藏数" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="置顶收藏" value={stats.pinned} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="分类统计">
            <Space>
              {Object.entries(stats.byCategory).map(([cat, count]) => (
                <Tag key={cat} color="green">
                  {categories.find((c) => c.value === cat)?.label || cat}: {count}
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        title="收藏管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            添加收藏
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索标题或标签"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            placeholder="筛选分类"
            allowClear
            style={{ width: 120 }}
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categories}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={filteredFavorites}
          loading={loading}
          rowKey="id"
        />
      </Card>

      <Modal
        title={editingFavorite ? '编辑收藏' : '添加收藏'}
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
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入收藏标题" />
          </Form.Item>
          <Form.Item name="url" label="链接">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true }]}
            initialValue="other"
          >
            <Select options={categories} />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Input placeholder="用逗号分隔多个标签" />
          </Form.Item>
          <Form.Item name="is_pinned" label="置顶" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Favorites;
