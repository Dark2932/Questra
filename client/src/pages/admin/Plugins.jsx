import { Link } from 'react-router-dom';
import { AppstoreOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Space, Typography } from 'antd';

export default function Plugins() {
  return <Space direction="vertical" size={24} style={{ width: '100%' }}>
    <div>
      <Typography.Text type="secondary">PLUGINS</Typography.Text>
      <Typography.Title level={3} style={{ marginTop: 4, marginBottom: 0 }}>插件</Typography.Title>
    </div>
    <Card>
      <Empty
        image={<AppstoreOutlined style={{ fontSize: 52, color: 'var(--ant-color-text-tertiary)' }} />}
        description={<Space direction="vertical" size={4}><Typography.Text strong>暂无插件</Typography.Text><Typography.Text type="secondary">当前站点尚未安装任何插件。</Typography.Text></Space>}
      >
        <Link to="/admin/settings?tab=plugins"><Button icon={<SettingOutlined />}>前往插件设置</Button></Link>
      </Empty>
    </Card>
  </Space>;
}
