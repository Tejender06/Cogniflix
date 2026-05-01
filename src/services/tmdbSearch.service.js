import pool from '../config/db.js';
import { mapToEmotion } from '../utils/emotionMap.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' }); // Just in case, though app.js loads it

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function fetchTMDB(endpoint, params = {}, retries = 3) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url.toString(), {
         headers: {
            'Accept-Encoding': 'gzip,deflate,compress'
         }
      });
      if (!response.ok) {
        throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`Retry ${i + 1} for ${endpoint} due to ${err.message}`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

function generatePseudoEmbedding(title, genre, language) {
  const seed = (title || '') + (genre || '') + (language || '');
  const dims = 1536;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const vec = new Array(dims);
  for (let i = 0; i < dims; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) | 0;
    vec[i] = ((h >>> 0) / 0xFFFFFFFF) - 0.5;
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return mag === 0 ? vec : vec.map(v => v / mag);
}

async function getOrCreateEmotion(name) {
  const existing = await pool.query("SELECT id FROM emotion_tags WHERE name = $1", [name]);
  if (existing.rows.length) return existing.rows[0].id;
  const res = await pool.query("INSERT INTO emotion_tags (name, weight_multiplier) VALUES ($1, 1.0) RETURNING id", [name]);
  return res.rows[0].id;
}

const langRegionMap = {
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

let movieGenreMap = {};
let tvGenreMap = {};
let genresInitialized = false;

async function initGenres() {
  if (genresInitialized) return;
  try {
    const movieRes = await fetchTMDB('/genre/movie/list');
    if (movieRes && movieRes.genres) {
      movieRes.genres.forEach(g => { movieGenreMap[g.id] = g.name.toLowerCase(); });
    }
    
    const tvRes = await fetchTMDB('/genre/tv/list');
    if (tvRes && tvRes.genres) {
      tvRes.genres.forEach(g => { tvGenreMap[g.id] = g.name.toLowerCase(); });
    }
    genresInitialized = true;
  } catch (err) {
    console.error("Failed to initialize genres from TMDB:", err);
  }
}

async function processItem(item, type) {
  if (!item.poster_path || !item.overview) return null;
  if (item.adult === true) return null;
  
  const title = item.title || item.name;
  const originalLang = item.original_language;
  const genreIds = item.genre_ids || [];
  
  if (genreIds.includes(10766)) return null;
  
  const explicitRegex = /\b(sex|porn|porno|hentai|erotica|erotic|adult|lustful|lust|sensual|naked|prostitute|prostitutes|seduction|sexual|sexually|cuckold|perverted|stepdad|stepdaddy|stepmom|impregnates|incest)\b/i;
  const tLower = title.toLowerCase();
  const descLower = item.overview ? item.overview.toLowerCase() : '';
  if (explicitRegex.test(tLower) || explicitRegex.test(descLower)) return null;

  const genreMap = type === 'movie' ? movieGenreMap : tvGenreMap;
  const genres = genreIds.map(id => genreMap[id]).filter(Boolean);
  if (genres.length === 0) genres.push('general');
  
  const langConfig = langRegionMap[originalLang] || { langName: originalLang, region: 'Global' };
  
  const emotion = mapToEmotion(genres, []);
  const emotionId = await getOrCreateEmotion(emotion);

  const embeddingVec = generatePseudoEmbedding(title, genres.join(','), langConfig.langName);
  const embeddingPg = '[' + embeddingVec.join(',') + ']';

  const poster_url = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
  const backdrop_url = item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null;

  return {
    title,
    description: item.overview,
    language: langConfig.langName,
    region: langConfig.region,
    genre: genres.join(','),
    emotion_tag_id: emotionId,
    popularity_score: item.popularity || 0,
    poster_url,
    backdrop_url,
    embedding: embeddingPg,
    content_type: type === 'movie' ? 'movie' : 'web_series'
  };
}

async function insertItem(item) {
  try {
    await pool.query(
      `INSERT INTO items 
      (title, description, language, region, genre, emotion_tag_id, popularity_score, poster_url, backdrop_url, embedding, content_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (title) DO NOTHING`,
      [
        item.title, item.description, item.language, item.region, item.genre,
        item.emotion_tag_id, item.popularity_score, item.poster_url, item.backdrop_url,
        item.embedding, item.content_type
      ]
    );
    return true;
  } catch (err) {
    console.error(`Error inserting item ${item.title}:`, err.message);
    return false;
  }
}

/**
 * Searches TMDB for a query. If found, ingests it and its similar items into the database.
 * @param {string} query The search string
 * @param {string} contentType 'movie' or 'web_series'
 * @returns {boolean} true if data was ingested, false otherwise
 */
export async function searchAndIngest(query, contentType = 'movie') {
  if (!TMDB_API_KEY) {
    console.warn("TMDB_API_KEY missing, skipping dynamic ingest.");
    return false;
  }

  const tmdbType = contentType === 'movie' ? 'movie' : 'tv';
  
  await initGenres();

  try {
    const searchData = await fetchTMDB(`/search/${tmdbType}`, { query, page: 1 });
    if (!searchData || !searchData.results || searchData.results.length === 0) {
      return false;
    }

    // Take top 3 results to increase chance of finding what user wants and enriching DB
    const topResults = searchData.results.slice(0, 3);
    let ingestedAny = false;

    for (const result of topResults) {
      const item = await processItem(result, tmdbType);
      if (item) {
        const inserted = await insertItem(item);
        if (inserted) ingestedAny = true;

        // Fetch similar items for this result
        try {
          const similarData = await fetchTMDB(`/${tmdbType}/${result.id}/similar`, { page: 1 });
          if (similarData && similarData.results) {
            const topSimilar = similarData.results.slice(0, 5);
            for (const simResult of topSimilar) {
              const simItem = await processItem(simResult, tmdbType);
              if (simItem) {
                await insertItem(simItem);
              }
            }
          }
        } catch (simErr) {
          console.warn(`Failed to fetch similar items for ID ${result.id}`, simErr.message);
        }
      }
    }
    
    return ingestedAny;
  } catch (err) {
    console.error("Error in searchAndIngest:", err);
    return false;
  }
}
