import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config(); // Assuming it runs from root where .env is or handled by app.js

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function fetchTMDB(endpoint, params = {}, retries = 3) {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB_API_KEY is missing from environment variables');
  }

  const url = `${TMDB_BASE_URL}${endpoint}`;
  const queryParams = { api_key: TMDB_API_KEY, ...params };
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
         params: queryParams,
         headers: { 'Accept-Encoding': 'gzip,deflate,compress' }
      });
      return response.data;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`Retry ${i + 1} for ${endpoint} due to ${err.message}`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

export let movieGenreMap = {};
let genresInitialized = false;

export async function initGenres() {
  if (genresInitialized) return;
  try {
    const movieRes = await fetchTMDB('/genre/movie/list');
    if (movieRes && movieRes.genres) {
      movieRes.genres.forEach(g => { movieGenreMap[g.id] = g.name.toLowerCase(); });
    }
    genresInitialized = true;
  } catch (err) {
    console.error("Failed to initialize genres from TMDB:", err);
  }
}

export function getMovieGenres(genreIds) {
  return genreIds.map(id => movieGenreMap[id]).filter(Boolean);
}

export const langRegionMap = {
  'kn': { langName: 'Kannada', region: 'Karnataka' },
  'mr': { langName: 'Marathi', region: 'Maharashtra' },
  'ta': { langName: 'Tamil', region: 'Tamil Nadu' },
  'te': { langName: 'Telugu', region: 'Andhra Pradesh' },
  'ml': { langName: 'Malayalam', region: 'Kerala' },
  'hi': { langName: 'Hindi', region: 'India' },
  'en': { langName: 'English', region: 'USA' },
  'es': { langName: 'Spanish', region: 'Spain' },
  'ko': { langName: 'Korean', region: 'Korea' },
  'ja': { langName: 'Japanese', region: 'Japan' },
  'fr': { langName: 'French', region: 'France' },
  'de': { langName: 'German', region: 'Germany' },
  'it': { langName: 'Italian', region: 'Italy' },
  'zh': { langName: 'Chinese', region: 'China' },
  'cn': { langName: 'Chinese', region: 'China' }
};
