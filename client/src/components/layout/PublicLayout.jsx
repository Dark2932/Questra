import { Outlet } from 'react-router-dom';
import SiteFooter from '../SiteFooter';

export default function PublicLayout({ site }) {
  return <div className="public-page-layout">
    <div className="public-page-content"><Outlet /></div>
    <SiteFooter site={site} />
  </div>;
}
