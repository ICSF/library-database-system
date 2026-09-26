import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Login } from './pages/Login';
import { Portal } from './pages/Portal';
import { AddMember } from './pages/members/AddMember';
import { EditMember } from './pages/members/EditMember';
import { MemberSearch } from './pages/members/MemberSearch';
import { ItemSearch } from './pages/items/ItemSearch';
import { ViewItem } from './pages/items/ViewItem';

import './App.css';
import {PortalLayout} from './layouts/PortalLayout';

function Layout() {
  const { session } = useAuth();

  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Library database home">
          Library Database
        </Link>
        <span className="tagline">Imperial Sci-fi Fantasy Society</span>
      </header>

      {session ? (
        <Outlet />
      ) : (
        <div className="site-layout">
          <aside className="menubar">
            <nav aria-label="Main navigation">
              <Link to="/login">Log in</Link>
            </nav>
          </aside>

          <main className="main-content">
            <Outlet />
          </main>
        </div>
      )}
    </div>
  );
}

// Route table - The /portal branch is nested within its own index route so that
// future pages become covered under it and by the one ProtectedRoute
function App() {

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="login" element={<Login />} />
        <Route
          path="portal"
          element={
            <ProtectedRoute>
              <PortalLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Portal />} />
          <Route path="members/add" element={<AddMember />} />
          <Route path="members/search" element={<MemberSearch />} />
          <Route path="members/edit/:memberId" element={<EditMember />} />
          <Route path="items/search" element={<ItemSearch />} />
          <Route path="items/view/:itemId" element={<ViewItem />} />
          {/* more protected /portal/* routes go here as the app grows */}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App
