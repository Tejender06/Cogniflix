import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { searchMovies } from "../services/movieService";
import type { Movie } from "../services/movieService";
import { Search } from "lucide-react";

export default function SearchFeature() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // eslint-disable-next-line
    setSearchQuery("");
    setSearchResults([]);
    setIsExpanded(false);
  }, [location.pathname]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        try {
          const res = await searchMovies(searchQuery);
          const results = [];
          if (res.movie) results.push(res.movie);
          if (res.similar && res.similar.length > 0) {
            results.push(...res.similar);
          }
          setSearchResults(results.slice(0, 5));
        } catch (error) {
          console.error("Search error:", error);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleResultClick = (id: string) => {
    setSearchQuery("");
    setSearchResults([]);
    setIsExpanded(false);
    navigate(`/movie/${id}`);
  };

  return (
    <div 
      className="navbar-search-container" 
      onMouseEnter={() => setIsExpanded(true)} 
      onMouseLeave={() => !searchQuery && setIsExpanded(false)}
    >
      <Search 
        className="search-icon" 
        size={20} 
        onClick={() => setIsExpanded(true)} 
        style={{ cursor: 'pointer' }}
      />
      <input 
        type="text" 
        placeholder="Titles, people, genres" 
        className={`navbar-search ${isExpanded || searchQuery ? 'active' : ''}`}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setIsExpanded(true)}
        onBlur={() => !searchQuery && setIsExpanded(false)}
      />
      {searchResults.length > 0 && (
        <div className="search-dropdown">
          {searchResults.map((movie: Movie) => (
            <div key={movie.id} className="search-result-item" onClick={() => handleResultClick(movie.id)}>
              <img src={movie.poster_url || "https://via.placeholder.com/40x60"} alt={movie.title} />
              <span>{movie.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
