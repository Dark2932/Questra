import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { LayoutDashboard, HelpCircle, FileStack } from 'lucide-react';
import { api } from '../../api';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: '仪表盘', end: true },
  { to: '/admin/questions', icon: HelpCircle, label: '问题池' },
  { to: '/admin/surveys', icon: FileStack, label: '问卷 / 考试' },
];

export default function AdminLayout({ token, onLogout }) {
  const [siteName, setSiteName] = useState('Questra');
  const navigate = useNavigate();
  const verified = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate('/unauthorized', { replace: true });
      return;
    }
    if (verified.current) return;
    verified.current = true;

    api.getConfig().then((d) => setSiteName(d.siteName)).catch(() => {});
    api.getDashboard().catch((err) => {
      if (String(err.message).includes('401') || String(err.message).includes('Token')) {
        onLogout();
        navigate('/unauthorized', { replace: true });
      }
    });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50/60 gradient-mesh">
      <header className="sticky top-0 z-50 h-16 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-[1200px] mx-auto h-full px-6 flex items-center justify-between gap-8">
          <Link to="/admin" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
              Q
            </div>
            <span className="font-bold text-gray-900 hidden sm:inline">{siteName}</span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'text-accent bg-accent/10 shadow-sm shadow-accent/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/70'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8 pb-20">
        <Outlet />
      </main>
    </div>
  );
}
