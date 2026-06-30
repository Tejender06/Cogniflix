/*
FILE: AppRoutes.tsx

PURPOSE:
Defines the application's routing map and component rendering logic.

FLOW:
Router Setup -> Path Match -> Render Component

USED BY:
App.tsx

NEXT FLOW:
Page Components

*/
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;