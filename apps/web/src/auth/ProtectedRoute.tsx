import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

// wrap any page that is only reachable by committee in a protected route
export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { session, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <p>Loading...</p>;
    }

    if (!session) {
        // this keeps the state of the location so that it can redirect back here
        return <Navigate to="/login" replace state={{ from: location.pathname }} />; 
    }

    return <>{children}</>;
}