/*
FILE: MyListPage.tsx

PURPOSE:
Displays the user's saved list of movies/shows.

FLOW:
Component -> API Call -> Backend -> Response -> UI Render

USED BY:
AppRoutes.tsx

NEXT FLOW:
interaction API call, MovieGrid.tsx

*/
import { useEffect, useState } from "react";
import { fetchSavedMovies } from "../services/movieService";
import type { Movie } from "../services/movieService";
import MovieCard from "../components/MovieCard";
import "./dashboard.css";

import SkeletonLoader from "../components/SkeletonLoader";

export default function MyListPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchSavedMovies();
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
        <h1 style={{ color: 'white', marginBottom: '20px', padding: '0 4%' }}>My List</h1>
        {movies.length === 0 ? (
          <p style={{ color: '#888', padding: '0 4%' }}>You haven't saved any movies yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', padding: '0 4%' }}>
            {movies.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
