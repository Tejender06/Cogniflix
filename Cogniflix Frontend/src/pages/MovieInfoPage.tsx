/*
FILE: MovieInfoPage.tsx

PURPOSE:
Displays detailed information and interactive actions for a specific movie.

FLOW:
Component -> API Call -> Backend -> Response -> UI Render

USED BY:
AppRoutes.tsx

NEXT FLOW:
movieService.ts

*/
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { fetchMovieById, postInteraction, fetchSimilarMovies, fetchSavedMovies, deleteSavedInteraction, deleteInteraction } from "../services/movieService";
import type { Movie } from "../services/movieService";
import { ChevronLeft, Play, ThumbsUp, ThumbsDown, Star, Plus, Check } from "lucide-react";
import MovieRow from "../components/MovieRow";
import SkeletonLoader from "../components/SkeletonLoader";
import "./movieinfo.css";

export default function MovieInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const passedMovie = location.state?.movie as Movie | undefined;
  
  const [movie, setMovie] = useState<Movie | null>(passedMovie || null);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(!passedMovie);
  const [actionLoading, setActionLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      try {
        setLoading(true);
        const [movieData, similarData, savedData] = await Promise.all([
          fetchMovieById(id),
          fetchSimilarMovies(id),
          fetchSavedMovies()
        ]);
        setMovie(movieData);
        setSimilarMovies(similarData);
        
        // Reset interaction states when movie changes
        setLiked(false);
        setDisliked(false);
        setSaved(savedData.some(m => m.id === movieData.id));
        setRating(0);
      } catch (err) {
        console.error("Failed to load movie data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleInteraction = async (type: 'watch' | 'like' | 'dislike' | 'rate' | 'save', score?: number) => {
    if (!movie) return;
    try {
      setActionLoading(true);

      if (type === 'save') {
        if (saved) {
          await deleteSavedInteraction(movie.id);
          setSaved(false);
        } else {
          await postInteraction(movie.id, type, score);
          setSaved(true);
        }
        return;
      }

      if (type === 'like') {
        if (liked) {
          await deleteInteraction(movie.id, 'like');
          setLiked(false);
        } else {
          await postInteraction(movie.id, 'like');
          setLiked(true);
          if (disliked) {
            await deleteInteraction(movie.id, 'dislike');
            setDisliked(false);
          }
        }
        return;
      }
      
      if (type === 'dislike') {
        if (disliked) {
          await deleteInteraction(movie.id, 'dislike');
          setDisliked(false);
        } else {
          await postInteraction(movie.id, 'dislike');
          setDisliked(true);
          if (liked) {
            await deleteInteraction(movie.id, 'like');
            setLiked(false);
          }
        }
        return;
      }

      if (type === 'rate') {
        if (score === rating) {
          await deleteInteraction(movie.id, 'rate');
          setRating(0);
        } else {
          await postInteraction(movie.id, 'rate', score);
          setRating(score!);
        }
        return;
      }

      let watchTime = undefined;
      if (type === 'watch') {
        watchTime = Math.floor(Math.random() * 120) + 10; // simulate 10 to 130 mins
        await postInteraction(movie.id, type, score, watchTime);
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="movie-info-page" style={{ paddingTop: '70px', paddingLeft: '4%', paddingRight: '4%' }}>
        <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>
          <SkeletonLoader type="card" width="300px" height="450px" />
          <div style={{ flex: 1 }}>
            <SkeletonLoader type="title" width="60%" height="40px" style={{ marginBottom: '20px' }} />
            <SkeletonLoader type="text" width="40%" style={{ marginBottom: '30px' }} />
            <SkeletonLoader type="text" width="100%" />
            <SkeletonLoader type="text" width="100%" />
            <SkeletonLoader type="text" width="80%" style={{ marginBottom: '40px' }} />
            <div style={{ display: 'flex', gap: '15px' }}>
              <SkeletonLoader type="text" width="120px" height="40px" />
              <SkeletonLoader type="text" width="120px" height="40px" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!movie) return <div className="loader" style={{ paddingTop: '100px', textAlign: 'center', color: 'var(--text-secondary)' }}>Movie not found.</div>;

  return (
    <div 
      className="movie-info-page"
    >
      <div className="movie-info-backdrop" style={{ backgroundImage: `url('${movie.backdrop_url || movie.poster_url?.replace('/w500', '/original')}')` }}>
        <div className="backdrop-vignette"></div>
        <div className="backdrop-gradient-bottom"></div>
      </div>

      <button className="back-btn" onClick={() => navigate(-1)}>
        <ChevronLeft size={30} />
      </button>

      <div className="movie-info-content">
        <div className="movie-info-details">
          <h1 className="movie-title">{movie.title}</h1>
          
          <div className="movie-meta">
            <span className="match-score">{movie.popularity_score ? Math.round(movie.popularity_score * 10) : 85}% Match</span>
            <span className="age-rating">U/A 13+</span>
            <span className="duration">2h 15m</span>
            <span className="quality-badge">HD</span>
          </div>

          <p className="movie-description">
            {movie.description || "No description available for this title."}
          </p>
          
          <div className="movie-cast">
            <span className="cast-label">Starring:</span> <span>Placeholder Actor 1, Placeholder Actor 2...</span><br/>
            {movie.genre && <><span className="cast-label">Genres:</span> <span>{movie.genre.split(',').join(', ')}</span></>}
          </div>

          <div className="movie-actions-large">
            <button 
              className="btn-primary" 
              disabled={actionLoading} 
              onClick={() => handleInteraction('watch')}
            >
              <Play size={24} fill="currentColor" /> Play
            </button>
            <button 
              className={`icon-action-btn ${liked ? 'active' : ''}`} 
              disabled={actionLoading} 
              onClick={() => handleInteraction('like')}
            >
              <ThumbsUp size={24} fill={liked ? "currentColor" : "none"} />
            </button>
            <button 
              className={`icon-action-btn ${disliked ? 'active' : ''}`} 
              disabled={actionLoading} 
              onClick={() => handleInteraction('dislike')}
            >
              <ThumbsDown size={24} fill={disliked ? "currentColor" : "none"} />
            </button>
            <button 
              className="icon-action-btn" 
              disabled={actionLoading} 
              onClick={() => handleInteraction('save')}
            >
              {saved ? <Check size={24} /> : <Plus size={24} />}
            </button>
          </div>

          <div className="rating-container">
            <p className="cast-label">Rate this title:</p>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star}
                  size={24}
                  className="star-icon"
                  fill={star <= rating ? "#ffcc00" : "none"}
                  color={star <= rating ? "#ffcc00" : "#666"}
                  onClick={() => handleInteraction('rate', star)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {similarMovies.length > 0 && (
        <div className="similar-movies-section">
          <MovieRow title="More Like This" movies={similarMovies} />
        </div>
      )}
    </div>
  );
}
