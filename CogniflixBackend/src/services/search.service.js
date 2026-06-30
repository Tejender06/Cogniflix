import itemRepository from '../repositories/item.repository.js';
import { fetchTMDB, initGenres, getMovieGenres, langRegionMap } from '../utils/tmdb.js';
import { generatePseudoEmbedding } from '../utils/embedding.js';
import { mapToEmotion } from '../utils/emotionMap.js';
import pool from '../config/db.js';

const searchCache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getFromCache(query) {
  const cached = searchCache.get(query.toLowerCase());
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }
  return null;
}

function setToCache(query, data) {
  searchCache.set(query.toLowerCase(), { data, timestamp: Date.now() });
}

async function getOrCreateEmotion(name) {
  const existing = await pool.query("SELECT id FROM emotion_tags WHERE name = $1", [name]);
  if (existing.rows.length) return existing.rows[0].id;
  const res = await pool.query("INSERT INTO emotion_tags (name, weight_multiplier) VALUES ($1, 1.0) RETURNING id", [name]);
  return res.rows[0].id;
}

const explicitRegex = /\b(sex|porn|porno|hentai|erotica|erotic|adult|lustful|lust|sensual|naked|prostitute|prostitutes|seduction|sexual|sexually|cuckold|perverted|stepdad|stepdaddy|stepmom|impregnates|incest)\b/i;

export async function processItem(item) {
  if (!item.poster_path || !item.overview) return null;
  if (item.adult === true) return null;
  
  const title = item.title || item.name;
  const originalLang = item.original_language;
  const genreIds = item.genre_ids || [];
  
  const tLower = title.toLowerCase();
  const descLower = item.overview ? item.overview.toLowerCase() : '';
  if (explicitRegex.test(tLower) || explicitRegex.test(descLower)) return null;

  // Filter out News (10763), Reality (10764), Soap (10766), Talk (10767)
  if (genreIds.some(id => [10763, 10764, 10766, 10767].includes(id))) return null;

  const tvSerialRegex = /\b(idol|roadies|bigg boss|splitsvilla|khatron ke khiladi|sa re ga ma pa|dance india dance|kapil sharma|masterchef|kbc|kaun banega crorepati|kaisa ye|rangrasiya|kumkum|kyunki|kahaani|kasautii|naagin|yeh rishta|tarak mehta|taarak mehta|cid|savdhaan|crime patrol)\b/i;
  if (tvSerialRegex.test(tLower)) return null;

  const genres = getMovieGenres(genreIds);
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
    content_type: item.media_type === 'tv' ? 'web_series' : 'movie'
  };
}

export async function searchMovie(query) {
  const cachedResult = getFromCache(query);
  if (cachedResult) return cachedResult;

  // STEP 1: LOCAL FUZZY SEARCH (Multi-match)
  let localMovies = await itemRepository.searchByTitleFuzzy(query, 10);
  
  if (localMovies && localMovies.length > 0) {
    const result = { source: "db", results: localMovies };
    setToCache(query, result);
    return result;
  }

  // STEP 2: TMDB FALLBACK
  await initGenres();
  const searchData = await fetchTMDB('/search/multi', { query, page: 1 }).catch(() => null);
  
  if (searchData && searchData.results && searchData.results.length > 0) {
    const topResults = searchData.results.slice(0, 5); // Take top 5
    const processedMovies = [];
    
    for (const result of topResults) {
      if (!result.media_type) {
         result.media_type = result.title ? 'movie' : 'tv';
      }
      const processed = await processItem(result);
      if (processed) {
        processedMovies.push(processed);
      }
    }
    
    if (processedMovies.length > 0) {
      // Insert all processed movies into the database
      const insertedMovies = await itemRepository.bulkInsertMovies(processedMovies);
      const finalResults = insertedMovies.length > 0 ? insertedMovies : processedMovies;
      
      const response = { source: "tmdb", results: finalResults };
      setToCache(query, response);
      return response;
    }
  }

  const result = { source: "db", results: [] };
  setToCache(query, result);
  return result;
}

export async function searchAndIngest(query, contentType = 'movie') {
  if (!process.env.TMDB_API_KEY) {
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

    const topResults = searchData.results.slice(0, 3);
    let ingestedAny = false;

    for (const result of topResults) {
      result.media_type = tmdbType;
      const item = await processItem(result);
      if (item) {
        const inserted = await itemRepository.insertMovie(item);
        if (inserted) ingestedAny = true;

        try {
          const similarData = await fetchTMDB(`/${tmdbType}/${result.id}/similar`, { page: 1 });
          if (similarData && similarData.results) {
            const topSimilar = similarData.results.slice(0, 5);
            for (const simResult of topSimilar) {
              simResult.media_type = tmdbType;
              const simItem = await processItem(simResult);
              if (simItem) {
                await itemRepository.insertMovie(simItem);
              }
            }
          }
        } catch (simErr) {
          console.warn(`Failed to fetch similar items for ID ${result.id}`);
        }
      }
    }
    
    return ingestedAny;
  } catch (err) {
    console.error("Error in searchAndIngest:", err);
    return false;
  }
}
