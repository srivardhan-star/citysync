// ============================================================
// CitySync — Government Route Protection Guard
// ============================================================

import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { getStoredSession } from '../config/authConfig';

interface RequireGovAuthProps {
  children?: React.ReactNode;
}

/**
 * Route guard that ensures the user has an active Government demo session.
 * If unauthenticated, redirects to the dedicated Government Login page (/login)
 * and preserves the target location in state for seamless post-login redirect.
 */
export default function RequireGovAuth({ children }: RequireGovAuthProps) {
  const session = getStoredSession();
  const location = useLocation();

  if (!session || !session.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
