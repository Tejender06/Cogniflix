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
  limit = 100
): Promise<{ data: Movie[]; total: number; page: number; totalPages: number }> => {
  const params: Record<string, string | number> = { page, limit };
  if (genre) params.genre = genre;
  if (search) params.search = search;
  const res = await api.get<{ data: Movie[]; total: number; page: number; totalPages: number }>(
    "/api/movies",
    { params }
  );
  return res.data;
};

export const searchMovies = async (query: string): Promise<{ movie: Movie | null, similar: Movie[] }> => {
  const res = await api.get<{ movie: Movie | null, similar: Movie[], message?: string }>("/api/search", { params: { query } });
  if (res.data.message) {
     return { movie: null, similar: [] };
  }
  return res.data;
};

export const fetchWebSeries = async (page = 1, limit = 100): Promise<{ data: Movie[]; totalPages: number }> => {
  const res = await api.get<{data: Movie[]; totalPages: number}>("/api/webseries", { params: { page, limit }});
  return res.data;
};

export const fetchTrendingMovies = async (): Promise<Movie[]> => {
  const res = await api.get<{movies: Movie[]}>("/api/movies/trending");
  return res.data.movies;
};

export const fetchRecommendations = async (mood?: string, language?: string, region?: string, content_type?: string): Promise<Movie[]> => {
  const params: Record<string, string> = {};
  if (mood) params.mood = mood;
  if (language) params.language = language;
  if (region) params.region = region;
  if (content_type) params.content_type = content_type;
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

export const fetchDashboardRecommendations = async (mood?: string, language?: string, region?: string): Promise<DashboardData> => {
  const params: Record<string, string> = {};
  if (mood) params.mood = mood;
  if (language) params.language = language;
  if (region) params.region = region;
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