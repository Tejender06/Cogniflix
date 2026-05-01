import axios from 'axios';
import pool from '../config/db.js';
import * as emotionMap from '../utils/emotionMap.js';
const { mapToEmotion } = emotionMap;

console.log("movie.service.js loaded");

function generatePseudoEmbedding(title, genre, language) {
  const seed = (title || '') + (genre || '') + (language || '');
  const dims = 1536;
  const genreMap = {
    action: 0.80,      adventure: 0.70,  animation: 0.50,
    comedy: 0.30,      crime: -0.50,     documentary: 0.10,
    drama: 0.20,       family: 0.35,     fantasy: 0.65,
    history: 0.15,     horror: -0.60,    music: 0.45,
    mystery: -0.30,    romance: 0.40,    'sci-fi': 0.60,
    thriller: -0.40,   war: -0.70,       western: -0.20,
    general: 0.00
  };
  const firstGenre = (genre || 'general').split(',')[0].toLowerCase().trim();
  const genreBase = genreMap[firstGenre] !== undefined ? genreMap[firstGenre] : 0.0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const vec = new Array(dims);
  for (let i = 0; i < dims; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) | 0;
    const noise = (h >>> 0) / 0xFFFFFFFF;
    vec[i] = genreBase * 0.3 + (noise - 0.5) * 0.7;
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return mag === 0 ? vec : vec.map(v => v / mag);
}

const genreIdMap = {
  28: "action",
  12: "adventure",
  16: "animation",
  35: "comedy",
  80: "crime",
  99: "documentary",
  18: "drama",
  10751: "family",
  14: "fantasy",
  36: "history",
  27: "horror",
  10402: "music",
  9648: "mystery",
  10749: "romance",
  878: "sci-fi",
  10770: "tv-movie",
  53: "thriller",
  10752: "war",
  37: "western",
  10759: "action-adventure",
  10765: "sci-fi-fantasy",
  10768: "war-politics",
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function fetchKeywords(movieId, API_KEY) {
  const res = await axios.get(
    `https://api.themoviedb.org/3/movie/${movieId}/keywords`,
    {
      params: { api_key: API_KEY },
      timeout: 15000,
    },
  );
  return (res.data.keywords || []).map((k) => k.name);
}

async function fetchTvKeywords(tvId, API_KEY) {
  const res = await axios.get(
    `https://api.themoviedb.org/3/tv/${tvId}/keywords`,
    {
      params: { api_key: API_KEY },
      timeout: 15000,
    },
  );
  return (res.data.results || []).map((k) => k.name);
}

async function getOrCreateEmotion(name) {
  const existing = await pool.query(
    "SELECT id FROM emotion_tags WHERE name = $1",
    [name],
  );

  if (existing.rows.length) return existing.rows[0].id;

  const res = await pool.query(
    "INSERT INTO emotion_tags (name, weight_multiplier) VALUES ($1, 1.0) RETURNING id",
    [name],
  );

  return res.rows[0].id;
}

/*
  Fix existing movies that still have "unknown" genre
*/
async function fixUnknownMovies(API_KEY) {
  const res = await pool.query(
    "SELECT title FROM items WHERE LOWER(genre) = 'unknown'",
  );

  const unknownMovies = res.rows;
  console.log(`Fixing ${unknownMovies.length} unknown movies`);

  for (let row of unknownMovies) {
    try {
      const search = await axios.get(
        "https://api.themoviedb.org/3/search/movie",
        {
          params: {
            api_key: API_KEY,
            query: row.title,
          },
          timeout: 15000,
        },
      );

      const movie = search.data.results[0];
      if (!movie) continue;

      let keywords = [];
      try {
        keywords = await fetchKeywords(movie.id, API_KEY);
      } catch {}

      let genres = movie.genre_ids.map((id) => genreIdMap[id]).filter(Boolean);

      const emotion = mapToEmotion(genres, keywords);
      const emotionId = await getOrCreateEmotion(emotion);

      const finalGenre = genres.length ? genres.join(",") : "general";

      await pool.query(
        `
        UPDATE items
        SET genre = $1,
            emotion_tag_id = $2
        WHERE title = $3
        `,
        [finalGenre, emotionId, row.title],
      );

      await delay(400);
    } catch {
      console.log(`Failed to fix: ${row.title}`);
    }
  }
}

/*
  Main ingestion
*/
const fetchAndStoreMovies = async () => {
  try {
    console.log("Fetching movies...");

    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) throw new Error("TMDB_API_KEY is missing");

    let allMovies = [];

    // Fetch movies with retry
    for (let page = 1; page <= 10; page++) {
      let retries = 3;

      while (retries > 0) {
        try {
          const res = await axios.get(
            "https://api.themoviedb.org/3/movie/popular",
            {
              params: { api_key: API_KEY, page },
              timeout: 15000,
            },
          );

          allMovies.push(...res.data.results);
          break;
        } catch {
          retries--;
          await delay(1500);
        }
      }

      await delay(700);
    }

    console.log(`${allMovies.length} movies fetched`);

    // Batch processing for speed
    const BATCH_SIZE = 5;

    for (let i = 0; i < allMovies.length; i += BATCH_SIZE) {
      const batch = allMovies.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (movie) => {
          try {
            let keywords = [];
            let retries = 2;

            while (retries > 0) {
              try {
                keywords = await fetchKeywords(movie.id, API_KEY);
                break;
              } catch {
                retries--;
                await delay(500);
              }
            }

            let genres = movie.genre_ids
              .map((id) => genreIdMap[id])
              .filter(Boolean);

            if (genres.length === 0) {
              const keywordGenres = keywords
                .map((k) => k.toLowerCase())
                .filter((k) =>
                  [
                    "action",
                    "comedy",
                    "drama",
                    "romance",
                    "thriller",
                    "horror",
                    "adventure",
                    "crime",
                    "mystery",
                    "family",
                  ].includes(k),
                );

              if (keywordGenres.length) {
                genres = keywordGenres;
              }
            }

            let finalGenre;

            if (genres.length) {
              finalGenre = genres.join(",");
            } else {
              if (movie.original_language === "hi") {
                finalGenre = "drama";
              } else if (movie.original_language === "ja") {
                finalGenre = "animation";
              } else {
                finalGenre = "general";
              }
            }
            
            const embeddingVec = generatePseudoEmbedding(movie.title, finalGenre, movie.original_language);
            const embeddingPg = '[' + embeddingVec.join(',') + ']';

            const emotion = mapToEmotion(genres, keywords);
            const emotionId = await getOrCreateEmotion(emotion);

            const posterUrl = movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : "https://via.placeholder.com/500x750?text=No+Poster";

            const backdropUrl = movie.backdrop_path
              ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
              : null;

            await pool.query(
              `
              INSERT INTO items 
              (title, description, language, region, genre, emotion_tag_id, popularity_score, poster_url, backdrop_url, embedding)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
              ON CONFLICT (title) 
              DO UPDATE SET 
                description = EXCLUDED.description,
                language = EXCLUDED.language,
                popularity_score = EXCLUDED.popularity_score,
                poster_url = EXCLUDED.poster_url,
                backdrop_url = EXCLUDED.backdrop_url,
                genre = EXCLUDED.genre,
                emotion_tag_id = EXCLUDED.emotion_tag_id,
                embedding = EXCLUDED.embedding
              `,
              [
                movie.title,
                movie.overview,
                movie.original_language,
                "Global",
                finalGenre,
                emotionId,
                movie.vote_average || 0,
                posterUrl,
                backdropUrl,
                embeddingPg
              ],
            );
          } catch {
            console.log(`Skipped: ${movie.title}`);
          }
        }),
      );

      await delay(800);
    }

    console.log("Movies stored successfully");

    // Fix old unknown data
    await fixUnknownMovies(API_KEY);

    console.log("Unknown movies fixed");
  } catch (err) {
    console.error("Ingestion failed");
    throw err;
  }
};

/*
  TV Shows ingestion
*/
const fetchAndStoreTvShows = async () => {
  try {
    console.log("Fetching TV Shows...");

    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) throw new Error("TMDB_API_KEY is missing");

    let allShows = [];

    // Fetch shows with retry
    for (let page = 1; page <= 5; page++) {
      let retries = 3;
      while (retries > 0) {
        try {
          const res = await axios.get(
            "https://api.themoviedb.org/3/tv/popular",
            {
              params: { api_key: API_KEY, page },
              timeout: 15000,
            },
          );
          allShows.push(...res.data.results);
          break;
        } catch {
          retries--;
          await delay(1500);
        }
      }
      await delay(700);
    }

    console.log(`${allShows.length} TV Shows fetched`);
    const BATCH_SIZE = 5;

    for (let i = 0; i < allShows.length; i += BATCH_SIZE) {
      const batch = allShows.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (show) => {
          try {
            let keywords = [];
            let retries = 2;
            while (retries > 0) {
              try {
                keywords = await fetchTvKeywords(show.id, API_KEY);
                break;
              } catch {
                retries--;
                await delay(500);
              }
            }

            let genres = (show.genre_ids || [])
              .map((id) => genreIdMap[id])
              .filter(Boolean);

            if (genres.length === 0) {
              const keywordGenres = keywords
                .map((k) => k.toLowerCase())
                .filter((k) =>
                  [
                    "action",
                    "comedy",
                    "drama",
                    "romance",
                    "thriller",
                    "horror",
                    "adventure",
                    "crime",
                    "mystery",
                    "family",
                  ].includes(k),
                );

              if (keywordGenres.length) {
                genres = keywordGenres;
              }
            }

            let finalGenre = genres.length ? genres.join(",") : "general";
            
            const embeddingVec = generatePseudoEmbedding(show.name, finalGenre, show.original_language);
            const embeddingPg = '[' + embeddingVec.join(',') + ']';

            const emotion = mapToEmotion(genres, keywords);
            const emotionId = await getOrCreateEmotion(emotion);

            const posterUrl = show.poster_path
              ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
              : "https://via.placeholder.com/500x750?text=No+Poster";

            const backdropUrl = show.backdrop_path
              ? `https://image.tmdb.org/t/p/original${show.backdrop_path}`
              : null;

            await pool.query(
              `
              INSERT INTO items 
              (title, description, language, region, genre, emotion_tag_id, popularity_score, poster_url, backdrop_url, content_type, embedding)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
              ON CONFLICT (title) 
              DO UPDATE SET 
                description = EXCLUDED.description,
                language = EXCLUDED.language,
                popularity_score = EXCLUDED.popularity_score,
                poster_url = EXCLUDED.poster_url,
                backdrop_url = EXCLUDED.backdrop_url,
                genre = EXCLUDED.genre,
                emotion_tag_id = EXCLUDED.emotion_tag_id,
                content_type = EXCLUDED.content_type,
                embedding = EXCLUDED.embedding
              `,
              [
                show.name, // TV shows use 'name' instead of 'title'
                show.overview,
                show.original_language,
                "Global",
                finalGenre,
                emotionId,
                show.vote_average || 0,
                posterUrl,
                backdropUrl,
                'tv',
                embeddingPg
              ],
            );
          } catch (e) {
            console.log(`Skipped: ${show.name}`, e.message);
          }
        }),
      );

      await delay(800);
    }

    console.log("TV Shows stored successfully");
  } catch (err) {
    console.error("TV Ingestion failed", err);
    throw err;
  }
};

export { fetchAndStoreMovies, fetchAndStoreTvShows };
