/*
FILE: MovieRow.tsx
*/
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import MovieCard from "./MovieCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./movierow.css";
import type { Movie } from "../services/movieService";

interface MovieRowProps {
  title: string;
  movies: Movie[];
  exploreUrl?: string;
}

export default function MovieRow({ title, movies, exploreUrl }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  // const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      rowRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  return (
    <section className="mrow">
      <div className="mrow__header">
        <h2 className="mrow__title" onClick={() => exploreUrl && navigate(exploreUrl)}>
          {title}
        </h2>
        <button 
          className="mrow__see-all" 
          onClick={() => exploreUrl ? navigate(exploreUrl) : window.scrollTo({top: 0, behavior: 'smooth'})}
        >
          Explore All {'>'}
        </button>
      </div>

      <div className="mrow__track-wrap group">
        <button 
          className="slider-arrow left" 
          onClick={() => handleScroll("left")}
        >
          <ChevronLeft />
        </button>
        
        <div 
          className="mrow__track" 
          ref={rowRef}
        >
          {Array.isArray(movies) &&
            movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
        </div>

        <button 
          className="slider-arrow right" 
          onClick={() => handleScroll("right")}
        >
          <ChevronRight />
        </button>
      </div>
    </section>
  );
}