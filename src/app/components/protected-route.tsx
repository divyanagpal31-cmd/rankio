import { Navigate, useLocation } from "react-router";
import { ReactNode } from "react";
import { useAuth } from "../providers/auth-provider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading account...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
