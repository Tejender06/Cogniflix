/*
FILE: NewAndPopularPage.tsx

PURPOSE:
Displays newly added and currently popular content.

FLOW:
Component -> API Call -> Backend -> Response -> UI Render

USED BY:
AppRoutes.tsx

NEXT FLOW:
movieService.ts

*/
import { useEffect, useState } from "react";
import { fetchTrendingMovies } from "../services/movieService";
import type { Movie } from "../services/movieService";
import MovieCard from "../components/MovieCard";
import "./dashboard.css";

import SkeletonLoader from "../components/SkeletonLoader";

export default function NewAndPopularPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchTrendingMovies();
        setMovies(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
        <h1 style={{ color: 'white', marginBottom: '20px', padding: '0 4%' }}>New & Popular</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', padding: '0 4%' }}>
          {movies.map(movie => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </div>
    </div>
  );
}
