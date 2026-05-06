/*
FILE: movieService.ts

PURPOSE:
Frontend API service layer abstracting all interactions with backend movie/recommendation endpoints.

FLOW:
Components/Pages -> movieService.ts -> api.ts (Axios)

USED BY:
All Pages & Components requiring data

NEXT FLOW:
api.ts / Backend Endpoints

*/
import api from "./api";

export type Movie = {
  id: string;
  title: string;
  poster_url: string;
  backdrop_url?: string;
  popularity_score?: number;
  genre?: string;
  language?: string;
  description?: string;
  emotion_name?: string;
  region?: string;
  match_percentage?: number;
  content_type?: string;
  debug_scores?: Record<string, unknown>;
};


export const fetchMovieById = async (id: string): Promise<Movie> => {
  const res = await api.get<{movie: Movie}>(`/api/movies/${id}`);
  return res.data.movie;
};

export const fetchGenres = async (): Promise<string[]> => {
  const res = await api.get<{genres: string[]}>("/api/movies/genres");
  return res.data.genres;
};

export const fetchMovies = async (
  genre?: string,
  search?: string,
  page = 1,
  limit = 100,
  sort?: string
): Promise<{ data: Movie[]; total: number; page: number; totalPages: number }> => {
  const params: Record<string, string | number> = { page, limit };
  if (genre) params.genre = genre;
  if (search) params.search = search;
  if (sort) params.sort = sort;
  const res = await api.get<{ data: Movie[]; total: number; page: number; totalPages: number }>(
    "/api/movies",
    { params }
  );
  return res.data;
};

export const searchMovies = async (query: string): Promise<{ results: Movie[] }> => {
  const res = await api.get<{ results: Movie[] }>("/api/search", { params: { query } });
  if (!res.data.results) {
     return { results: [] };
  }
  return res.data;
};

export const fetchWebSeries = async (
  genre?: string,
  search?: string,
  page = 1,
  limit = 100,
  sort?: string
): Promise<{ data: Movie[]; total: number; page: number; totalPages: number }> => {
  const params: Record<string, string | number> = { page, limit };
  if (genre) params.genre = genre;
  if (search) params.search = search;
  if (sort) params.sort = sort;
  const res = await api.get<{data: Movie[]; total: number; page: number; totalPages: number}>("/api/webseries", { params });
  return res.data;
};

export const fetchTrendingMovies = async (): Promise<Movie[]> => {
  const res = await api.get<{movies: Movie[]}>("/api/movies/trending");
  return res.data.movies;
};

export const fetchRecommendations = async (mood?: string[], language?: string[], region?: string[], content_type?: string, emotion?: string[]): Promise<Movie[]> => {
  const params: Record<string, string> = {};
  if (mood && mood.length > 0) params.mood = mood.join(',');
  if (language && language.length > 0) params.language = language.join(',');
  if (region && region.length > 0) params.region = region.join(',');
  if (content_type) params.content_type = content_type;
  if (emotion && emotion.length > 0) params.emotion = emotion.join(',');
  const res = await api.get<{data: Movie[]}>("/api/recommendations", { params });
  return res.data.data;
};

export interface DashboardData {
  heroMovie?: Movie;
  similarityMovies?: Movie[];
  similarityWebSeries?: Movie[];
  regionMovies?: Movie[];
  regionWebSeries?: Movie[];
  timeMovies?: Movie[];
  timeWebSeries?: Movie[];
  moodMovies?: Movie[];
  moodWebSeries?: Movie[];
  indiaMovies?: Movie[];
  indiaWebSeries?: Movie[];
  popularMovies?: Movie[];
  popularWebSeries?: Movie[];
  movieRecs?: Movie[];
  tvRecs?: Movie[];
}

export const fetchDashboardRecommendations = async (mood?: string[], language?: string[], region?: string[], emotion?: string[]): Promise<DashboardData> => {
  const params: Record<string, string> = {};
  if (mood && mood.length > 0) params.mood = mood.join(',');
  if (language && language.length > 0) params.language = language.join(',');
  if (region && region.length > 0) params.region = region.join(',');
  if (emotion && emotion.length > 0) params.emotion = emotion.join(',');
  const res = await api.get<{data: DashboardData}>("/api/recommendations/dashboard", { params });
  return res.data.data;
};

export const fetchHistory = async (): Promise<Movie[]> => {
  const res = await api.get<{data: Movie[]}>("/api/interactions/history");
  return res.data.data;
};

export const fetchSavedMovies = async (): Promise<Movie[]> => {
  const res = await api.get<{data: Movie[]}>("/api/interactions/saved");
  return res.data.data;
};

export const fetchSimilarMovies = async (id: string): Promise<Movie[]> => {
  const res = await api.get<{movies: Movie[]}>(`/api/movies/${id}/similar`);
  return res.data.movies;
};

export const postInteraction = async (content_id: string, interaction_type: 'watch' | 'like' | 'dislike' | 'rate' | 'save', score?: number, watch_time?: number) => {
  const res = await api.post("/api/interactions", { content_id, interaction_type, score, watch_time });
  return res.data;
};

export const deleteSavedInteraction = async (content_id: string) => {
  const res = await api.delete(`/api/interactions/saved/${content_id}`);
  return res.data;
};

export const deleteInteraction = async (content_id: string, interaction_type: string) => {
  const res = await api.delete(`/api/interactions/${interaction_type}/${content_id}`);
  return res.data;
};