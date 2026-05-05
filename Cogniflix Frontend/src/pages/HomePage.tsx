import { useEffect, useState } from "react";
import HeroBanner from "../components/HeroBanner";
import MovieRow from "../components/MovieRow";
import { fetchMovies, fetchTrendingMovies, fetchRecommendations } from "../services/movieService";
import type { Movie } from "../services/movieService";
import { useMovieContext } from "../context/MovieContext";
import SkeletonLoader from "../components/SkeletonLoader";
import api from "../services/api";

export default function HomePage() {
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [moodBased, setMoodBased] = useState<Movie[]>([]);
  const [popular, setPopular] = useState<Movie[]>([]);
  
  const [loading, setLoading] = useState(true);
  const { heroMovie, setHeroMovie } = useMovieContext();

  useEffect(() => {
    const loadData = async () => {
      try {
        const moodRes = await api.get<{data: Movie[]}>("/api/movies", { params: { emotion: "Joy", limit: 20 } }).catch(() => ({ data: { data: [] } }));
        
        const [recData, trendData, popData] = await Promise.all([
          fetchRecommendations().catch(() => []),
          fetchTrendingMovies().catch(() => []),
          fetchMovies(undefined, undefined, 1, 20).then(res => res.data).catch(() => [])
        ]);

        setRecommendations(recData || []);
        setTrending(trendData || []);
        setMoodBased(moodRes.data.data || []);
        setPopular(popData || []);
        
        if (!heroMovie) {
          if (trendData && trendData.length > 0) {
            setHeroMovie(trendData[0]);
          } else if (popData && popData.length > 0) {
            setHeroMovie(popData[0]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [heroMovie, setHeroMovie]);

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

  const defaultMovie = heroMovie || trending[0] || popular[0];

  return (
    <div className="dashboard-container">
      {defaultMovie && <HeroBanner movie={defaultMovie} />}

      <div className="dashboard-content">
        {recommendations.length > 0 && <MovieRow title="Because You Watched" movies={recommendations} />}
        {trending.length > 0 && <MovieRow title="Trending" movies={trending} />}
        {moodBased.length > 0 && <MovieRow title="Mood-Based (Joy)" movies={moodBased} />}
        {popular.length > 0 && <MovieRow title="Popular Now" movies={popular} />}
      </div>
    </div>
  );
}
