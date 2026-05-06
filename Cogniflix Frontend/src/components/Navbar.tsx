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
import MultiSelectDropdown from "./MultiSelectDropdown";
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
  const { mood, setMood, emotion, setEmotion, language, setLanguage, region, setRegion } = useMovieContext();

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
            <MultiSelectDropdown 
              label="Genres"
              options={['Action', 'Adventure', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller']}
              selected={mood}
              onChange={setMood}
            />
            <MultiSelectDropdown 
              label="Mood"
              options={['Happy', 'Dark', 'Intense', 'Romantic', 'Fear', 'Curious', 'Emotional', 'Exciting', 'Mind-Bending', 'Calm']}
              selected={emotion}
              onChange={setEmotion}
            />
            <MultiSelectDropdown 
              label="Languages"
              options={['English', 'Hindi', 'Kannada', 'Marathi', 'Tamil', 'Malayalam', 'Telugu', 'Spanish', 'Korean']}
              selected={language}
              onChange={setLanguage}
            />
            <MultiSelectDropdown 
              label="Region"
              options={['USA', 'India', 'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'UK', 'Korea']}
              selected={region}
              onChange={setRegion}
            />
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