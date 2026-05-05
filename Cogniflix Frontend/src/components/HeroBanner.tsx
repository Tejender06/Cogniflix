/*
FILE: HeroBanner.tsx

PURPOSE:
Displays the featured movie/show banner at the top of main pages.

FLOW:
Component -> API Call -> Backend -> Response -> UI Render

USED BY:
DashboardPage.tsx, MoviesPage.tsx

NEXT FLOW:
UI Rendering

*/
import { useEffect, useState } from "react";
import type { Movie } from "../services/movieService";
import { useNavigate } from "react-router-dom";
import { postInteraction, fetchSavedMovies, deleteSavedInteraction } from "../services/movieService";
import { Play, Plus, Check } from "lucide-react";
import SkeletonLoader from "./SkeletonLoader";
import "./herobanner.css";

export default function HeroBanner({ movie }: { movie: Movie }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [bgUrl, setBgUrl] = useState<string>("");

  useEffect(() => {
    if (!movie) return;
    const checkSaved = async () => {
      try {
        const savedData = await fetchSavedMovies();
        setSaved(savedData.some(m => m.id === movie.id));
      } catch (err) {
        console.error(err);
      }
    };
    checkSaved();
    
    // Determine high quality background URL
    let url = movie.backdrop_url;
    if (!url && movie.poster_url) {
       url = movie.poster_url;
    }
    if (!url) {
       url = "https://via.placeholder.com/1200x800?text=No+Background";
    }
    
    setBgUrl(url);

    // Preload image
    setImageLoaded(false);
    const img = new Image();
    img.src = url;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(true); // render anyway if it fails
    
  }, [movie]);

  if (!movie) return null;

  const handleAddToList = async () => {
    try {
      setLoading(true);
      if (saved) {
        await deleteSavedInteraction(movie.id);
        setSaved(false);
      } else {
        await postInteraction(movie.id, 'save');
        setSaved(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!imageLoaded) {
    return (
      <div style={{ paddingTop: '70px', minHeight: '80vh', backgroundColor: 'var(--bg-primary)' }}>
        <SkeletonLoader type="banner" />
      </div>
    );
  }

  const isBackdrop = !!movie.backdrop_url;

  return (
    <div className="hero" id="hero-banner" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Layer 1: Blurred Background (Always at the bottom) */}
      <div 
        className="hero-bg-blur"
        style={{ 
          backgroundImage: `url('${bgUrl}')`,
          zIndex: 0,
          filter: 'blur(20px) brightness(0.4)',
        }}
      ></div>

      {/* If it is a cinematic backdrop, the image goes UNDER the overlay so text is readable */}
      {isBackdrop && (
        <div 
          className="hero-bg-image"
          style={{ 
            backgroundImage: `url('${bgUrl}')`,
            backgroundSize: 'cover',
            zIndex: 1,
          }}
        ></div>
      )}

      {/* Layer 2: Gradient Overlay (Dims the left side) */}
      <div 
        className="hero-overlay"
        style={{ zIndex: 2 }}
      ></div>

      {/* If it is a poster, the image goes ON TOP of the overlay so it remains fully bright and pops out */}
      {!isBackdrop && (
        <div 
          className="hero-bg-image"
          style={{ 
            backgroundImage: `url('${bgUrl}')`,
            backgroundSize: 'contain',
            zIndex: 3,
          }}
        ></div>
      )}

      {/* Layer 3: Content (Always at the very top) */}
      <div 
        className="hero-content"
        style={{ zIndex: 10, position: 'relative', pointerEvents: 'auto' }}
      >
        <h1 className="hero-title" style={{ color: '#ffffff', opacity: 1 }}>{movie.title}</h1>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          {movie.match_percentage && (
            <span style={{ color: '#46d369', fontWeight: 'bold' }}>{movie.match_percentage}% Match</span>
          )}
          {movie.emotion_name && (
            <span style={{ border: '1px solid rgba(255,255,255,0.4)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
              {movie.emotion_name}
            </span>
          )}
          {movie.language && (
            <span style={{ color: '#aaa', fontSize: '14px' }}>{movie.language}</span>
          )}
          {movie.region && (
            <span style={{ color: '#aaa', fontSize: '14px' }}>• {movie.region}</span>
          )}
        </div>

        <p className="hero-description" style={{ color: '#d1d1d1', opacity: 1 }}>{movie.description || "Top recommended movie based on your interests."}</p>
        <div className="buttons">
          <button className="play" onClick={() => navigate(`/movie/${movie.id}`, { state: { movie } })} style={{ zIndex: 20 }}>
            <Play size={20} fill="currentColor" /> Play
          </button>
          <button className="list" onClick={handleAddToList} disabled={loading} style={{ zIndex: 20 }}>
            {saved ? <Check size={20} /> : <Plus size={20} />} {saved ? 'Remove from List' : 'Add to List'}
          </button>
        </div>
      </div>
    </div>
  );
}