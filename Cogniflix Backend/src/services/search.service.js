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

  // STEP 1: LOCAL EXACT SEARCH
  let localMovie = await itemRepository.findByTitleExact(query);
  if (localMovie) {
    let similar = [];
    if (localMovie.embedding) {
      similar = await itemRepository.findSimilarByVector(localMovie.embedding, 10, localMovie.id);
    }
    const result = { source: "db", movie: localMovie, similar };
    setToCache(query, result);
    return result;
  }

  // STEP 2: TMDB FALLBACK
  await initGenres();
  const searchData = await fetchTMDB('/search/multi', { query, page: 1 }).catch(() => null);
  let topResult = null;
  let processedMovie = null;
  
  if (searchData && searchData.results && searchData.results.length > 0) {
    // Prefer exact title match from TMDB results, otherwise take first
    topResult = searchData.results.find(r => (r.title || r.name).toLowerCase() === query.toLowerCase());
    if (!topResult) topResult = searchData.results[0];

    processedMovie = await processItem(topResult);

    // If top result is explicitly filtered, try next ones
    if (!processedMovie) {
      for (let i = 1; i < Math.min(3, searchData.results.length); i++) {
        processedMovie = await processItem(searchData.results[i]);
        if (processedMovie) {
          topResult = searchData.results[i];
          break;
        }
      }
    }
  }

  if (processedMovie) {
    // STEP 3: Check if TMDB resolved movie is already in DB
    let existingMovie = await itemRepository.findByTitleExact(processedMovie.title);
    if (existingMovie) {
       let similar = [];
       if (existingMovie.embedding) {
         similar = await itemRepository.findSimilarByVector(existingMovie.embedding, 10, existingMovie.id);
       }
       const result = { source: "db", movie: existingMovie, similar };
       setToCache(query, result);
       return result;
    }

    // STEP 4: INSERT INTO DB
    const insertedMovie = await itemRepository.insertMovie(processedMovie) || processedMovie;

    // STEP 5: FETCH AND INSERT SIMILAR MOVIES
    const tmdbId = topResult.id;
    const mediaType = topResult.media_type === 'tv' ? 'tv' : 'movie';
    const rawSimilarData = await fetchTMDB(`/${mediaType}/${tmdbId}/similar`, { page: 1 }).catch(() => null);
    
    let dbSimilarMovies = [];
    if (rawSimilarData && rawSimilarData.results) {
      const topSimilar = rawSimilarData.results.slice(0, 10);
      const similarToInsert = [];
      for (const simResult of topSimilar) {
          simResult.media_type = mediaType;
          const simItem = await processItem(simResult);
          if (simItem) similarToInsert.push(simItem);
      }
      if (similarToInsert.length > 0) {
         dbSimilarMovies = await itemRepository.bulkInsertMovies(similarToInsert);
      }
    }

    // STEP 7: RETURN RESPONSE WITH VALID IDs
    const result = {
      source: "tmdb",
      movie: insertedMovie,
      similar: dbSimilarMovies
    };
    setToCache(query, result);
    return result;
  }

  // STEP 8: IF TMDB FAILS, TRY LOCAL PARTIAL MATCH
  localMovie = await itemRepository.findByTitlePartial(query);
  if (localMovie) {
    let similar = [];
    if (localMovie.embedding) {
      similar = await itemRepository.findSimilarByVector(localMovie.embedding, 10, localMovie.id);
    }
    const result = { source: "db", movie: localMovie, similar };
    setToCache(query, result);
    return result;
  }

  const result = { message: "No results found" };
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
