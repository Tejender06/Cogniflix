/*
FILE: MainLayout.tsx

PURPOSE:
Provides standard layout structure including Navbar for all main pages.

FLOW:
Router -> MainLayout -> Render Children

USED BY:
AppRoutes.tsx

NEXT FLOW:
Page Components

*/
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
function MainLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "block"
      }}
    >
      <Navbar />

      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}

export default MainLayout;