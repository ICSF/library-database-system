import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Login } from './pages/Login';

import './App.css';

function Layout() {
  const { session, signOut } = useAuth();

  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Library database home">
          Library Database
        </Link>
        <span className="tagline">Imperial Sci-fi Fantasy Society</span>
      </header>

      <div className="site-layout">
        <aside className="menubar">
          <nav aria-label="Main navigation">
            {session ? (
              <>
                <Link to="/portal">Committee portal</Link>
                <button type="button" onClick={() => void signOut()}>
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login">Log in</Link>
            )}
          </nav>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PortalHome() {
  const { session } = useAuth();
  return (
    <>
      <h1>Welcome to the ICSF Library Database</h1>
      <p>Signed in as {session?.user.email}</p>
    </>
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
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route index element={<PortalHome />} />
          {/* more protected /portal/* routes go here as the app grows */}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App
