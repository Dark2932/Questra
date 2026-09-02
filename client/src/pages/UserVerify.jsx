import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Card, Result, Spin } from 'antd';
import { api } from '../api';

export default function UserVerify() {
  const location = useLocation(); const navigate = useNavigate(); const [state, setState] = useState({ loading: true, error: '' });
  useEffect(() => { const params = new URLSearchParams(location.search); const token = params.get('token'); const returnTo = params.get('returnTo'); if (!token) return setState({ loading: false, error: '验证链接缺少 Token' }); api.userVerify(token).then(() => { setState({ loading: false, error: '' }); setTimeout(() => navigate(returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/user/login'), 800); }).catch((e) => setState({ loading: false, error: e.message })); }, [location.search, navigate]);
  if (state.loading) return <div className="auth-shell"><Spin size="large" /></div>;
  if (state.error) return <div className="auth-shell"><Card className="auth-card"><Alert type="error" showIcon message={state.error} /><Link to="/user/login">返回登录</Link></Card></div>;
  return <div className="auth-shell"><Result status="success" title="邮箱验证成功" subTitle="即将返回首页" /></div>;
}
