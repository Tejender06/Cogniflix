import { useEffect, useState } from "react";
import { fetchWebSeries } from "../services/movieService";
import type { Movie } from "../services/movieService";
import HeroBanner from "../components/HeroBanner";
import MovieRow from "../components/MovieRow";
import SkeletonLoader from "../components/SkeletonLoader";
import "./dashboard.css";

export default function WebSeriesPage() {
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Movie[]>([]);
  const [action, setAction] = useState<Movie[]>([]);
  const [comedy, setComedy] = useState<Movie[]>([]);
  const [sciFi, setSciFi] = useState<Movie[]>([]);
  const [drama, setDrama] = useState<Movie[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [
          trendRes,
          recentRes,
          actionRes,
          comedyRes,
          scifiRes,
          dramaRes
        ] = await Promise.all([
          fetchWebSeries(undefined, undefined, 1, 20).catch(() => ({ data: [] })),
          fetchWebSeries(undefined, undefined, 1, 20, 'recent').catch(() => ({ data: [] })),
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
        
        setRecentlyAdded(recentRes.data || []);
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
  }, []);

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
        {recentlyAdded.length > 0 && <MovieRow title="Recently Added" movies={recentlyAdded} />}
        {trending.length > 0 && <MovieRow title="Trending Web Series" movies={trending} />}
        {action.length > 0 && <MovieRow title="Action & Adventure Series" movies={action} />}
        {comedy.length > 0 && <MovieRow title="Comedy Series" movies={comedy} />}
        {sciFi.length > 0 && <MovieRow title="Sci-Fi & Fantasy Series" movies={sciFi} />}
        {drama.length > 0 && <MovieRow title="Drama Series" movies={drama} />}
      </div>
    </div>
  );
}
