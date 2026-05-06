import { useEffect, useState } from "react";
import { fetchMovies, fetchTrendingMovies, fetchRecommendations } from "../services/movieService";
import { useMovieContext } from "../context/MovieContext";
import type { Movie } from "../services/movieService";
import HeroBanner from "../components/HeroBanner";
import MovieRow from "../components/MovieRow";
import SkeletonLoader from "../components/SkeletonLoader";
import "./dashboard.css";

export default function MoviesPage() {
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Movie[]>([]);
  const [action, setAction] = useState<Movie[]>([]);
  const [comedy, setComedy] = useState<Movie[]>([]);
  const [sciFi, setSciFi] = useState<Movie[]>([]);
  const [horror, setHorror] = useState<Movie[]>([]);
  const [romance, setRomance] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const { mood, emotion, language, region } = useMovieContext();
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [
          trendRes,
          recentRes,
          recRes,
          actionRes,
          comedyRes,
          scifiRes,
          horrorRes,
          romanceRes
        ] = await Promise.all([
          fetchTrendingMovies().catch(() => []),
          fetchMovies(undefined, undefined, 1, 20, 'recent').catch(() => ({ data: [] })),
          fetchRecommendations(mood, language, region, 'movie', emotion).catch(() => []),
          fetchMovies('action', undefined, 1, 20).catch(() => ({ data: [] })),
          fetchMovies('comedy', undefined, 1, 20).catch(() => ({ data: [] })),
          fetchMovies('sci-fi', undefined, 1, 20).catch(() => ({ data: [] })),
          fetchMovies('horror', undefined, 1, 20).catch(() => ({ data: [] })),
          fetchMovies('romance', undefined, 1, 20).catch(() => ({ data: [] }))
        ]);

        const trendingMovies = trendRes || [];
        setTrending(trendingMovies);
        
        // Find a hero movie that has a backdrop
        const heroCandidate = trendingMovies.find(m => m.backdrop_url) || trendingMovies[0];
        if (heroCandidate) setHeroMovie(heroCandidate);
        
        setRecentlyAdded(recentRes.data || []);
        setRecommendations(recRes || []);
        setAction(actionRes.data || []);
        setComedy(comedyRes.data || []);
        setSciFi(scifiRes.data || []);
        setHorror(horrorRes.data || []);
        setRomance(romanceRes.data || []);
      } catch (err) {
        console.error("Failed to load movies page data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [mood, emotion, language, region]);

  if (loading) {
    return (
      <div className="dashboard-container" style={{ paddingTop: '70px' }}>
        <SkeletonLoader type="banner" />
        <div className="dashboard-content" style={{ padding: '0 4%' }}>
          <SkeletonLoader type="title" style={{ marginTop: '30px' }} />
          <div style={{ display: 'flex', gap: '10px', overflow: 'hidden', marginBottom: '40px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonLoader key={i} type="card" />)}
          </div>
          <SkeletonLoader type="title" />
          <div style={{ display: 'flex', gap: '10px', overflow: 'hidden' }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonLoader key={i} type="card" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {heroMovie && <HeroBanner movie={heroMovie} />}
      <div className="dashboard-content">
        {recommendations.length > 0 && <MovieRow title={emotion && mood ? `Top ${emotion} ${mood} Picks For You` : emotion ? `Top ${emotion} Picks For You` : mood ? `Top ${mood} Picks For You` : "Top Picks For You"} movies={recommendations} />}
        {recentlyAdded.length > 0 && <MovieRow title="Recently Added" movies={recentlyAdded} />}
        {trending.length > 0 && <MovieRow title="Trending Movies" movies={trending} />}
        {action.length > 0 && <MovieRow title="Action & Adventure" movies={action} />}
        {comedy.length > 0 && <MovieRow title="Comedies" movies={comedy} />}
        {sciFi.length > 0 && <MovieRow title="Sci-Fi & Fantasy" movies={sciFi} />}
        {horror.length > 0 && <MovieRow title="Horror" movies={horror} />}
        {romance.length > 0 && <MovieRow title="Romance" movies={romance} />}
      </div>
    </div>
  );
}
