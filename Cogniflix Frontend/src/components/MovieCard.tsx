/*
FILE: MovieCard.tsx

PURPOSE:
Displays an individual movie thumbnail and handles click interactions.

FLOW:
Component -> Click Event -> Navigation/Modal

USED BY:
MovieRow.tsx, MovieGrid.tsx

NEXT FLOW:
MovieInfoPage.tsx

*/
import { useNavigate } from "react-router-dom";
import { useState } from "react";
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/movie/${movie.id}`, { state: { movie } });
  };

  return (
    <motion.div 
      className="movie-card-container"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ scale: 1 }}
      whileHover={{ scale: 1.15, zIndex: 50 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div 
        className="movie-card" 
        onClick={handleClick}
      >
        <img 
          src={movie.poster_url || movie.backdrop_url || "https://via.placeholder.com/300x450?text=No+Poster"} 
          alt={movie.title} 
          loading="lazy"
          className="movie-card-image"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';
          }}
        />
        
        <AnimatePresence>
          {isHovered && (
            <motion.div 
              className="movie-hover-details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
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
                <span className="age-rating">U/A 13+</span>
                <span>2h 15m</span>
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