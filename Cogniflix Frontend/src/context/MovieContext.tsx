/*
FILE: MovieContext.tsx

PURPOSE:
Provides global state for movie-related data (e.g., watch list).

FLOW:
Context -> Components -> UI Update based on data

USED BY:
App.tsx, MovieCard.tsx

NEXT FLOW:
None

*/
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from "react";
import type { Movie } from "../services/movieService";

interface MovieContextType {
  heroMovie: Movie | null;
  setHeroMovie: (movie: Movie) => void;
  mood: string;
  setMood: (mood: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  region: string;
  setRegion: (region: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const MovieContext = createContext<MovieContextType | undefined>(undefined);

export function MovieProvider({ children }: { children: React.ReactNode }) {
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);
  const [mood, setMood] = useState<string>('');
  const [language, setLanguage] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  return (
    <MovieContext.Provider value={{ heroMovie, setHeroMovie, mood, setMood, language, setLanguage, region, setRegion, searchQuery, setSearchQuery }}>
      {children}
    </MovieContext.Provider>
  );
}

export function useMovieContext() {
  const context = useContext(MovieContext);
  if (context === undefined) {
    throw new Error("useMovieContext must be used within a MovieProvider");
  }
  return context;
}
