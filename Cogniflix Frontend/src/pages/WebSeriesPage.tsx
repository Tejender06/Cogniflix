/*
FILE: WebSeriesPage.tsx

PURPOSE:
Displays the main Web Series browsing catalog.

FLOW:
Component -> API Call -> Backend -> Response -> UI Render

USED BY:
AppRoutes.tsx

NEXT FLOW:
movieService.ts, MovieGrid/Row components

*/
import { useEffect, useState } from "react";
import { fetchWebSeries } from "../services/movieService";
import type { Movie } from "../services/movieService";
import MovieCard from "../components/MovieCard";
import "./dashboard.css";

import SkeletonLoader from "../components/SkeletonLoader";

export default function WebSeriesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await fetchWebSeries(1, 100);
        setMovies(res.data || []);
        // fetchWebSeries response is just { data: Movie[], totalPages: number }
        setHasMore(1 < res.totalPages);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const res = await fetchWebSeries(nextPage, 100);
      setMovies(prev => {
        // Filter out duplicates
        const existingIds = new Set(prev.map(m => m.id));
        const newMovies = res.data.filter(m => !existingIds.has(m.id));
        return [...prev, ...newMovies];
      });
      setPage(nextPage);
      setHasMore(nextPage < res.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content" style={{ marginTop: '100px' }}>
          <SkeletonLoader type="title" style={{ padding: '0 4%' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px', padding: '0 4%' }}>
            {[...Array(12)].map((_, i) => <SkeletonLoader key={i} type="card" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content" style={{ marginTop: '100px' }}>
        <h1 style={{ color: 'white', marginBottom: '20px', padding: '0 4%' }}>Web Series</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', padding: '0 4%' }}>
          {movies.map(movie => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
        {hasMore && (
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <button 
              onClick={handleLoadMore} 
              disabled={loadingMore}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: 'rgba(229, 9, 20, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loadingMore ? 'not-allowed' : 'pointer',
                opacity: loadingMore ? 0.7 : 1,
                transition: 'background-color 0.2s'
              }}
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
