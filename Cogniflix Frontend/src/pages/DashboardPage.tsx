/*
FILE: DashboardPage.tsx

PURPOSE:
Main landing page for authenticated users showing personalized content.

FLOW:
Component -> API Call -> Backend -> Response -> UI Render

USED BY:
AppRoutes.tsx

NEXT FLOW:
recommendation API call, MovieRow components

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
  
  // Specific Rows
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
  
  const [loading, setLoading] = useState(true);
  
  const { heroMovie, setHeroMovie, mood, language, region } = useMovieContext();

  const [movieRecs, setMovieRecs] = useState<Movie[]>([]);
  const [tvRecs, setTvRecs] = useState<Movie[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashboardData, histData] = await Promise.all([
          fetchDashboardRecommendations(mood, language, region),
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
  }, [mood, language, region, setHeroMovie]); 

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

  const defaultMovie = heroMovie || similarityMovies[0] || popularMovies[0];
  
  const regionName = region ? region.charAt(0).toUpperCase() + region.slice(1) : "";

  return (
    <div className="dashboard-container">
      {defaultMovie && <HeroBanner movie={defaultMovie} />}

      <div className="dashboard-content">
        {history.length > 0 && <MovieRow title="Continue Watching" movies={history} />}
        
        {popularMovies.length > 0 && <MovieRow title="Global Trending Movies" movies={popularMovies} />}
        {popularWebSeries.length > 0 && <MovieRow title="Global Trending Web Series" movies={popularWebSeries} />}
        
        {indiaMovies.length > 0 && <MovieRow title="Trending Movies in India" movies={indiaMovies} />}
        {indiaWebSeries.length > 0 && <MovieRow title="Trending Web Series in India" movies={indiaWebSeries} />}

        {region && regionMovies.length > 0 && (
          <MovieRow title={`Top Movies for ${regionName}`} movies={regionMovies} />
        )}
        {region && regionWebSeries.length > 0 && (
          <MovieRow title={`Top Web Series for ${regionName}`} movies={regionWebSeries} />
        )}

        {moodMovies.length > 0 && <MovieRow title={mood ? `${mood} Movies` : "Top Genre Movies"} movies={moodMovies} />}
        {moodWebSeries.length > 0 && <MovieRow title={mood ? `${mood} Web Series` : "Top Genre Web Series"} movies={moodWebSeries} />}
        
        {movieRecs.length > 0 && <MovieRow title="Recommended Movies" movies={movieRecs} exploreUrl="/movies" />}
        {tvRecs.length > 0 && <MovieRow title="Recommended Web Series" movies={tvRecs} exploreUrl="/tv" />}
        
        {similarityMovies.length > 0 && <MovieRow title="Because You Watched (Movies)" movies={similarityMovies} />}
        {similarityWebSeries.length > 0 && <MovieRow title="Because You Watched (Web Series)" movies={similarityWebSeries} />}
      </div>
    </div>
  );
}