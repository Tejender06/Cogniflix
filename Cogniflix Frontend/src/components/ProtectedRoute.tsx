/*
FILE: ProtectedRoute.tsx

PURPOSE:
Guards routes requiring authentication, redirecting if necessary.
*/
import { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import SkeletonLoader from "./SkeletonLoader";
import api from "../services/api";

export default function ProtectedRoute() {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsValidating(false);
        setIsAuthenticated(false);
        return;
      }

      try {
        await api.get("/api/auth/me");
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, []);

  if (isValidating) {
    return (
      <div style={{ paddingTop: '70px', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <SkeletonLoader type="banner" />
        <div style={{ padding: '0 4%' }}>
          <SkeletonLoader type="title" style={{ marginTop: '30px' }} />
          <div style={{ display: 'flex', gap: '10px', overflow: 'hidden' }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonLoader key={i} type="card" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
