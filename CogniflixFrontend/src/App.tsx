/*
FILE: App.tsx

PURPOSE:
Root application component wrapping providers and global layout.
*/
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "./layouts/MainLayout";
import DashboardPage from "./pages/DashboardPage";
import MoviesPage from "./pages/MoviesPage";
import WebSeriesPage from "./pages/WebSeriesPage";
import NewAndPopularPage from "./pages/NewAndPopularPage";
import MyListPage from "./pages/MyListPage";
import MovieInfoPage from "./pages/MovieInfoPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { MovieProvider } from "./context/MovieContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { wakeUpBackend } from "./services/authService";
import { AnimatePresence } from "framer-motion";
import AnimatedPage from "./components/AnimatedPage";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Unauthenticated Routes */}
        <Route path="/login" element={<AnimatedPage><LoginPage /></AnimatedPage>} />
        <Route path="/signup" element={<AnimatedPage><SignupPage /></AnimatedPage>} />
        
        {/* Authenticated Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<AnimatedPage><DashboardPage /></AnimatedPage>} />
            <Route path="movies" element={<AnimatedPage><MoviesPage /></AnimatedPage>} />
            <Route path="web-series" element={<AnimatedPage><WebSeriesPage /></AnimatedPage>} />
            <Route path="new" element={<AnimatedPage><NewAndPopularPage /></AnimatedPage>} />
            <Route path="my-list" element={<AnimatedPage><MyListPage /></AnimatedPage>} />
            <Route path="movie/:id" element={<AnimatedPage><MovieInfoPage /></AnimatedPage>} />
          </Route>
        </Route>

        {/* Catch-all route to prevent blank pages or loops */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    wakeUpBackend();
  }, []);

  return (
    <AuthProvider>
      <MovieProvider>
        <Router>
          <AnimatedRoutes />
        </Router>
      </MovieProvider>
    </AuthProvider>
  );
}

export default App;