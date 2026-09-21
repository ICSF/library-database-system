import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';

export function PortalLayout() {
  return (
    <div className="site-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="main">
          <Outlet />
        </div>
      </div>
    </div>
  );
}