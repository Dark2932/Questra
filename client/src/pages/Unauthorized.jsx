import { Result, Button } from 'antd';
import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Result
        status="403"
        title="需要管理授权"
        subTitle="请通过带有 ?token= 参数的链接访问管理后台，或确认 Token 未过期。"
        extra={<Link to="/admin"><Button type="primary">返回首页</Button></Link>}
      />
    </div>
  );
}