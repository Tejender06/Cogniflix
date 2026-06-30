/*
FILE: MovieGrid.tsx

PURPOSE:
Displays a grid layout of movie cards for browsing.

FLOW:
Component -> UI Render

USED BY:
MyListPage.tsx, MoviesPage.tsx

NEXT FLOW:
MovieCard.tsx

*/
import type { Movie } from "../services/movieService";
import MovieCard from "./MovieCard";
import "./moviegrid.css";

export default function MovieGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className="movie-grid-container">
      <h2>Trending Now</h2>
      <div className="grid">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}