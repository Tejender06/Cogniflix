import { useEffect, useState } from "react";
import { fetchWebSeries, fetchRecommendations, fetchHistory } from "../services/movieService";
import { useMovieContext } from "../context/MovieContext";
import type { Movie } from "../services/movieService";
import HeroBanner from "../components/HeroBanner";
import MovieRow from "../components/MovieRow";
import SkeletonLoader from "../components/SkeletonLoader";
import "./dashboard.css";

export default function WebSeriesPage() {
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);
  const [popular, setPopular] = useState<Movie[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Movie[]>([]);
  const [action, setAction] = useState<Movie[]>([]);
  const [comedy, setComedy] = useState<Movie[]>([]);
  const [sciFi, setSciFi] = useState<Movie[]>([]);
  const [drama, setDrama] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const { mood, emotion, language, region } = useMovieContext();
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [
          trendRes,
          popularRes,
          histRes,
          recentRes,
          recRes,
          actionRes,
          comedyRes,
          scifiRes,
          dramaRes
        ] = await Promise.all([
          fetchWebSeries(undefined, undefined, 1, 20).catch(() => ({ data: [] })),
          fetchWebSeries(undefined, undefined, 1, 20, 'popularity.desc').catch(() => ({ data: [] })),
          fetchHistory().catch(() => []),
          fetchWebSeries(undefined, undefined, 1, 20, 'recent').catch(() => ({ data: [] })),
          fetchRecommendations(mood, language, region, 'web_series', emotion).catch(() => []),
          fetchWebSeries('action', undefined, 1, 20).catch(() => ({ data: [] })),
          fetchWebSeries('comedy', undefined, 1, 20).catch(() => ({ data: [] })),
          fetchWebSeries('sci-fi', undefined, 1, 20).catch(() => ({ data: [] })),
          fetchWebSeries('drama', undefined, 1, 20).catch(() => ({ data: [] }))
        ]);

        const trendingSeries = trendRes.data || [];
        setTrending(trendingSeries);
        
        // Find a hero series that has a backdrop
        const heroCandidate = trendingSeries.find(m => m.backdrop_url) || trendingSeries[0];
        if (heroCandidate) setHeroMovie(heroCandidate);
        
        setPopular(popularRes.data || []);
        setContinueWatching((histRes || []).filter(m => m.content_type === 'web_series'));
        setRecentlyAdded(recentRes.data || []);
        setRecommendations(recRes || []);
        setAction(actionRes.data || []);
        setComedy(comedyRes.data || []);
        setSciFi(scifiRes.data || []);
        setDrama(dramaRes.data || []);
      } catch (err) {
        console.error("Failed to load web series page data", err);
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
          <div style={{ display: 'flex', gap: '0.4vw', overflow: 'hidden', marginBottom: '40px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonLoader key={i} type="card" />)}
          </div>
          <SkeletonLoader type="title" />
          <div style={{ display: 'flex', gap: '0.4vw', overflow: 'hidden' }}>
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
        {continueWatching.length > 0 && <MovieRow title="Continue Watching" movies={continueWatching} />}
        {recommendations.length > 0 && <MovieRow title={emotion.length > 0 && mood.length > 0 ? `Top ${emotion.join(', ')} ${mood.join(', ')} Picks For You` : emotion.length > 0 ? `Top ${emotion.join(', ')} Picks For You` : mood.length > 0 ? `Top ${mood.join(', ')} Picks For You` : "Top Picks For You"} movies={recommendations} />}
        {trending.length > 0 && <MovieRow title="Trending Row" movies={trending} />}
        {popular.length > 0 && <MovieRow title="Popular Row" movies={popular} />}
        
        {recentlyAdded.length > 0 && <MovieRow title="Recently Added" movies={recentlyAdded} />}
        {action.length > 0 && <MovieRow title="Action & Adventure Series" movies={action} />}
        {comedy.length > 0 && <MovieRow title="Comedy Series" movies={comedy} />}
        {sciFi.length > 0 && <MovieRow title="Sci-Fi & Fantasy Series" movies={sciFi} />}
        {drama.length > 0 && <MovieRow title="Drama Series" movies={drama} />}
      </div>
    </div>
  );
}
