import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase";

export function ProtectedRoute({ children, redirectTo = "/login" }: { children: ReactNode; redirectTo?: string }) {
  const [user, loading] = useAuthState(auth);
  const location = useLocation();
  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
