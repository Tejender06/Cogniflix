/*
FILE: DashboardPage.tsx
*/
import { useEffect, useState } from "react";
import HeroBanner from "../components/HeroBanner";
import MovieRow from "../components/MovieRow";
import { fetchHistory, fetchDashboardRecommendations } from "../services/movieService";
import type { Movie } from "../services/movieService";
import { useMovieContext } from "../context/MovieContext";
import SkeletonLoader from "../components/SkeletonLoader";
import "./dashboard.css";

export default function DashboardPage() {
  const [history, setHistory] = useState<Movie[]>([]);
  
  const [similarityMovies, setSimilarityMovies] = useState<Movie[]>([]);
  const [similarityWebSeries, setSimilarityWebSeries] = useState<Movie[]>([]);
  const [regionMovies, setRegionMovies] = useState<Movie[]>([]);
  const [regionWebSeries, setRegionWebSeries] = useState<Movie[]>([]);
  const [moodMovies, setMoodMovies] = useState<Movie[]>([]);
  const [moodWebSeries, setMoodWebSeries] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [popularWebSeries, setPopularWebSeries] = useState<Movie[]>([]);
  const [indiaMovies, setIndiaMovies] = useState<Movie[]>([]);
  const [indiaWebSeries, setIndiaWebSeries] = useState<Movie[]>([]);
  const [movieRecs, setMovieRecs] = useState<Movie[]>([]);
  const [tvRecs, setTvRecs] = useState<Movie[]>([]);

  const [loading, setLoading] = useState(true);
  const { heroMovie, setHeroMovie, mood, emotion, language, region } = useMovieContext();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashboardData, histData] = await Promise.all([
          fetchDashboardRecommendations(mood, language, region, emotion),
          fetchHistory()
        ]);

        setHistory(histData || []);

        if (dashboardData) {
          if (dashboardData.heroMovie) setHeroMovie(dashboardData.heroMovie);
          
          setSimilarityMovies(dashboardData.similarityMovies || []);
          setSimilarityWebSeries(dashboardData.similarityWebSeries || []);
          setRegionMovies(dashboardData.regionMovies || []);
          setRegionWebSeries(dashboardData.regionWebSeries || []);
          setMoodMovies(dashboardData.moodMovies || []);
          setMoodWebSeries(dashboardData.moodWebSeries || []);
          setIndiaMovies(dashboardData.indiaMovies || []);
          setIndiaWebSeries(dashboardData.indiaWebSeries || []);
          setPopularMovies(dashboardData.popularMovies || []);
          setPopularWebSeries(dashboardData.popularWebSeries || []);
          setMovieRecs(dashboardData.movieRecs || []);
          setTvRecs(dashboardData.tvRecs || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [mood, emotion, language, region, setHeroMovie]); 

  if (loading) {
    return (
      <div className="dashboard-container">
        <SkeletonLoader type="banner" />
        <div className="dashboard-content" style={{ marginTop: '-50px' }}>
          {[1, 2, 3].map(row => (
            <div key={row} style={{ marginBottom: '40px' }}>
              <SkeletonLoader type="title" />
              <div style={{ display: 'flex', gap: '0.4vw', overflow: 'hidden' }}>
                {[1, 2, 3, 4, 5, 6].map(i => <SkeletonLoader key={i} type="card" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const defaultMovie = heroMovie || similarityMovies[0] || popularMovies[0];
  const regionName = region.length > 0 ? region.join(', ') : "";
  const moodName = mood.length > 0 ? mood.join(', ') : "";

  return (
    <div className="dashboard-container">
      {defaultMovie && <HeroBanner movie={defaultMovie} />}

      <div className="dashboard-content">
        {history.length > 0 && <MovieRow title="Continue Watching" movies={history} />}
        
        {movieRecs.length > 0 && <MovieRow title={moodName ? `Top ${moodName} Movies For You` : "Recommended Movies"} movies={movieRecs} exploreUrl="/movies" />}
        {tvRecs.length > 0 && <MovieRow title={moodName ? `Top ${moodName} Web Series For You` : "Recommended Web Series"} movies={tvRecs} exploreUrl="/tv" />}
        
        {similarityMovies.length > 0 && <MovieRow title="Because You Watched" movies={similarityMovies} />}
        
        {moodMovies.length > 0 && <MovieRow title={moodName ? `${moodName} Movies` : "Top Genre Movies"} movies={moodMovies} />}
        
        {indiaMovies.length > 0 && <MovieRow title="Trending Now" movies={indiaMovies} />}
        
        {region.length > 0 && regionMovies.length > 0 && (
          <MovieRow title={`Trending in ${regionName}`} movies={regionMovies} />
        )}

        {popularMovies.length > 0 && <MovieRow title="Popular on Cogniflix" movies={popularMovies} />}
        {popularWebSeries.length > 0 && <MovieRow title="Binge-Worthy Series" movies={popularWebSeries} />}
      </div>
    </div>
  );
}