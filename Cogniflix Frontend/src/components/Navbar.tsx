/*
FILE: Navbar.tsx

PURPOSE:
Main navigation bar for routing and user actions.

FLOW:
Component -> User Interaction -> Route Change

USED BY:
MainLayout.tsx

NEXT FLOW:
AppRoutes

*/
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMovieContext } from "../context/MovieContext";
import { logoutUser } from "../services/authService";
import { LogOut } from "lucide-react";
import SearchFeature from "./SearchFeature";
import "./navbar.css";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    logout();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;
  const { mood, setMood, language, setLanguage, region, setRegion } = useMovieContext();

  return (
    <header className={`navbar ${isScrolled ? "scrolled" : ""}`}>
      <div className="navbar-main">
        <div className="navbar-left">
          <div className="logo" onClick={() => navigate('/dashboard')}>COGNIFLIX</div>
          <ul className="navbar-links">
            <li className={isActive('/dashboard') ? 'active' : ''} onClick={() => navigate('/dashboard')}>Home</li>
            <li className={isActive('/movies') ? 'active' : ''} onClick={() => navigate('/movies')}>Movies</li>
            <li className={isActive('/web-series') ? 'active' : ''} onClick={() => navigate('/web-series')}>Web Series</li>
            <li className={isActive('/my-list') ? 'active' : ''} onClick={() => navigate('/my-list')}>My List</li>
          </ul>
        </div>
        
        <div className="navbar-right">
          <div className="navbar-filters">
            <select 
              value={mood} 
              onChange={(e) => setMood(e.target.value)}
              className="netflix-select"
            >
              <option value="">Genres</option>
              {['Action', 'Adventure', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="netflix-select"
            >
              <option value="">Languages</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Kannada">Kannada</option>
              <option value="Marathi">Marathi</option>
              <option value="Tamil">Tamil</option>
              <option value="Malayalam">Malayalam</option>
              <option value="Telugu">Telugu</option>
              <option value="Spanish">Spanish</option>
              <option value="Korean">Korean</option>
            </select>
            <select 
              value={region} 
              onChange={(e) => setRegion(e.target.value)}
              className="netflix-select"
            >
              <option value="">Region</option>
              <option value="USA">USA</option>
              <option value="India">India</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Kerala">Kerala</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="UK">UK</option>
              <option value="Korea">Korea</option>
            </select>
          </div>

          <SearchFeature />
          {user && (
            <div className="profile-menu">
              <span className="profile-name">{user.name || "User"}</span>
              <LogOut className="logout-icon" size={20} onClick={handleLogout} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}