import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Plus, ChevronDown } from "lucide-react";
import "./moviecard.css";
import { type Movie } from "../services/movieService";

interface Props {
  movie: Movie;
  onInteraction?: () => void;
}

export default function MovieCard({ movie }: Props) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/movie/${movie.id}`, { state: { movie } });
  };

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(true);
    }, 400); // Netflix delay to prevent accidental hovers
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
  };

  return (
    <motion.div 
      className="movie-card-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ scale: 1, zIndex: 1 }}
      animate={{ 
        scale: isHovered ? 1.2 : 1, 
        zIndex: isHovered ? 50 : 1,
        y: isHovered ? -20 : 0
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="movie-card" onClick={handleClick}>
        <img 
          src={movie.poster_url || movie.backdrop_url || "https://via.placeholder.com/300x450?text=No+Image"} 
          alt={movie.title} 
          loading="lazy"
          className="movie-card-image"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';
          }}
        />
        <div className="movie-card-title" style={{ opacity: isHovered ? 0 : 1 }}>{movie.title}</div>
        
        <AnimatePresence>
          {isHovered && (
            <motion.div 
              className="movie-hover-details"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="hover-actions">
                <div className="hover-actions-left">
                  <button className="icon-btn play-btn" onClick={(e) => { e.stopPropagation(); navigate(`/movie/${movie.id}`, { state: { movie } }); }}>
                    <Play size={14} fill="currentColor" />
                  </button>
                  <button className="icon-btn add-btn" onClick={(e) => e.stopPropagation()}>
                    <Plus size={16} />
                  </button>
                </div>
                <button className="icon-btn more-btn" onClick={handleClick}>
                  <ChevronDown size={16} />
                </button>
              </div>

              <div className="hover-metadata">
                {movie.match_percentage && (
                  <span className="match-text">{movie.match_percentage}% Match</span>
                )}
                <span className="age-rating">13+</span>
              </div>

              <div className="hover-genres">
                {movie.genre && movie.genre.split(',').slice(0, 3).map((g, i) => (
                  <span key={i} className="genre-tag">{g.trim()}</span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}