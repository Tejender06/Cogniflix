import db from '../config/db.js';
import { mapToEmotion } from '../utils/emotionMap.js';
import { fetchTMDB, langRegionMap, movieGenreMap, initGenres } from '../utils/tmdb.js';
import { processItem } from './search.service.js';
import itemRepository from '../repositories/item.repository.js';

const getBucket = (hour) => {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 21) return 'evening';
  return 'night';
};

const REGION_LANGUAGE_MAP = {
  karnataka: 'kannada',
  maharashtra: 'marathi',
  tamilnadu: 'tamil',
  kerala: 'malayalam',
  andhra: 'telugu',
};

async function dynamicFetch(mood, language, contentType, requiredCount) {
  await initGenres();
  
  let langCode = null;
  if (language) {
    const entry = Object.entries(langRegionMap).find(([k, v]) => v.langName.toLowerCase() === language.toLowerCase());
    if (entry) langCode = entry[0];
  }

  let genreId = null;
  if (mood) {
    const moodLower = mood.toLowerCase() === 'sci-fi' ? 'science fiction' : mood.toLowerCase();
    const gEntry = Object.entries(movieGenreMap).find(([k, v]) => v.toLowerCase() === moodLower || v.toLowerCase().includes(moodLower));
    if (gEntry) genreId = gEntry[0];
  }

  const endpoint = contentType === 'movie' ? '/discover/movie' : '/discover/tv';
  const params = {
    sort_by: 'popularity.desc'
  };
  if (langCode) params.with_original_language = langCode;
  if (genreId) params.with_genres = genreId;

  // We only fetch if there's actually a filter applied to avoid generic excessive fetching
  if (!langCode && !genreId) return;

  let insertedCount = 0;
  for (let page = 1; page <= 3; page++) {
    params.page = page;
    const res = await fetchTMDB(endpoint, params).catch(() => null);
    if (res && res.results && res.results.length > 0) {
      const itemsToInsert = [];
      for (const item of res.results) {
        item.media_type = contentType === 'movie' ? 'movie' : 'tv';
        const processed = await processItem(item);
        if (processed) itemsToInsert.push(processed);
      }
      if (itemsToInsert.length > 0) {
        await itemRepository.bulkInsertMovies(itemsToInsert);
        insertedCount += itemsToInsert.length;
      }
    }
    // If TMDB returns no more pages or we hit required count
    if (!res || !res.results || res.results.length === 0) break;
    if (insertedCount >= requiredCount) break;
  }
}

async function getFallback(topK, mood, language, region) {
  let query = `SELECT id, title, description, genre, language, region,
            poster_url, backdrop_url, popularity_score, content_type
     FROM items 
     WHERE genre NOT ILIKE '%soap%' 
       AND genre NOT ILIKE '%talk show%' 
       AND genre NOT ILIKE '%reality%' 
       AND genre NOT ILIKE '%adult%'`;
  let params = [];
  
  if (language) {
    params.push(language);
    query += ` AND LOWER(language) = LOWER($${params.length})`;
  }
  if (region) {
    params.push(region);
    query += ` AND LOWER(region) = LOWER($${params.length})`;
  }
  if (mood) {
    if (mood.toLowerCase() === 'sci-fi') {
      query += ` AND (genre ILIKE '%Science Fiction%' OR genre ILIKE '%Sci-Fi%')`;
    } else {
      params.push(mood);
      query += ` AND genre ILIKE '%' || $${params.length} || '%'`;
    }
  }

  params.push(topK);
  query += ` ORDER BY popularity_score DESC NULLS LAST LIMIT $${params.length}`;

  let result = await db.query(query, params);
  
  if (result.rows.length < 20 && (language || mood)) {
    // If fallback (global trending for the filter) has less than 20 items, fetch from TMDB
    await dynamicFetch(mood, language, 'movie', 40 - result.rows.length);
    await dynamicFetch(mood, language, 'web_series', 40 - result.rows.length);
    // Re-run query
    result = await db.query(query, params);
  }

  return result.rows;
}

async function getRecommendations(userId, mood, language, region, contentType = 'movie', topK = 100) {
  try {
    const userResult = await db.query(
      `SELECT id, preferred_language, location FROM users WHERE id = $1`,
      [userId]
    );

    let userPrefLang = null;
    let userLoc = null;
    if (userResult.rows.length > 0) {
      userPrefLang = userResult.rows[0].preferred_language?.toLowerCase();
      userLoc = userResult.rows[0].location?.toLowerCase();
    }

    const embeddingResult = await db.query(
      `SELECT embedding FROM user_embeddings WHERE user_id = $1`,
      [userId]
    );
    const userEmbedding = embeddingResult.rows.length > 0 ? embeddingResult.rows[0] : null;

    // 1. FILTERING BEFORE RANKING
    let queryArgs = [contentType, userId];
    let filterClauses = [
      "i.content_type = $1", 
      "i.id NOT IN (SELECT item_id FROM interactions WHERE user_id = $2 AND interaction_type = 'watch')"
    ];

    // Exclude soap operas, talk shows, reality, and adult content from recommendations
    filterClauses.push("i.genre NOT ILIKE '%soap%'");
    filterClauses.push("i.genre NOT ILIKE '%talk show%'");
    filterClauses.push("i.genre NOT ILIKE '%reality%'");
    filterClauses.push("i.genre NOT ILIKE '%adult%'");

    let selectSimilarity = ", 0 AS similarity_score";

    if (language) {
      queryArgs.push(language);
      filterClauses.push(`LOWER(i.language) = LOWER($${queryArgs.length})`);
    }

    if (region) {
      queryArgs.push(region);
      filterClauses.push(`LOWER(i.region) = LOWER($${queryArgs.length})`);
    }

    if (mood) {
      if (mood.toLowerCase() === 'sci-fi') {
        filterClauses.push(`(i.genre ILIKE '%Science Fiction%' OR i.genre ILIKE '%Sci-Fi%')`);
      } else {
        queryArgs.push(mood);
        filterClauses.push(`i.genre ILIKE '%' || $${queryArgs.length} || '%'`);
      }
    }

    let orderClause = `ORDER BY i.popularity_score DESC NULLS LAST LIMIT 500`;

    if (userEmbedding && userEmbedding.embedding) {
      queryArgs.push(userEmbedding.embedding);
      const userVecParamIdx = queryArgs.length;
      // Using <=> for cosine distance. Similarity is 1 - distance.
      selectSimilarity = `, (1 - (i.embedding <=> $${userVecParamIdx}::vector)) AS similarity_score`;
      
      orderClause = `ORDER BY i.embedding <=> $${userVecParamIdx}::vector LIMIT 500`;
    }

    const finalQuery = `
      SELECT
        i.id, i.title, i.description, i.genre, i.language, i.region,
        i.poster_url, i.backdrop_url, i.popularity_score, i.content_type,
        i.emotion_tag_id
        ${selectSimilarity}
      FROM items i
      WHERE ${filterClauses.join(' AND ')}
      ${orderClause}
    `;

    let candidatesResult = await db.query(finalQuery, queryArgs);
    let candidates = candidatesResult.rows;

    if (candidates.length < 20 && (language || mood)) {
      await dynamicFetch(mood, language, contentType, 40 - candidates.length);
      // Re-run query after dynamic ingestion
      candidatesResult = await db.query(finalQuery, queryArgs);
      candidates = candidatesResult.rows;
    }

    // 2. INTERACTIONS (User History for Emotion Matching)
    const interactionsResult = await db.query(`
      SELECT i.created_at, COALESCE(i.score, 0) as score, it.genre, it.emotion_tag_id
      FROM interactions i
      JOIN items it ON i.item_id = it.id
      WHERE i.user_id = $1 AND i.interaction_type = 'watch'
    `, [userId]);

    const interactions = interactionsResult.rows;
    const now = new Date();
    
    const implicitEmotionMap = {};
    let maxEmotionScore = 0;

    for (const int of interactions) {
      const daysDiff = (now - new Date(int.created_at)) / (1000 * 60 * 60 * 24);
      const decay = Math.max(0.1, Math.exp(-0.05 * daysDiff));
      const weight = (parseFloat(int.score) || 1) * decay;
      
      if (int.emotion_tag_id) {
        implicitEmotionMap[int.emotion_tag_id] = (implicitEmotionMap[int.emotion_tag_id] || 0) + weight;
        if (implicitEmotionMap[int.emotion_tag_id] > maxEmotionScore) {
          maxEmotionScore = implicitEmotionMap[int.emotion_tag_id];
        }
      }
    }

    // Normalize emotion scores
    if (maxEmotionScore > 0) {
      for (const k in implicitEmotionMap) {
        implicitEmotionMap[k] = implicitEmotionMap[k] / maxEmotionScore;
      }
    }

    const currentHour = now.getHours();
    const currentBucket = getBucket(currentHour);
    const day = now.getDay();
    const isWeekend = (day === 0 || day === 6);
    
    const scoredItems = [];

    // Weights setup (Total 1.0)
    const W1 = 0.25; // Popularity
    const W2 = 0.25; // Similarity
    const W3 = 0.20; // Emotion
    const W4 = 0.15; // Regional
    const W5 = 0.15; // Time

    for (const item of candidates) {
      // 1. POPULARITY (w1)
      const popularity = Math.min(parseFloat(item.popularity_score || 0) / 10.0, 1.0);

      // 2. SIMILARITY (w2) - Pre-calculated from PGVector
      const similarity = Math.max(0, parseFloat(item.similarity_score) || 0);

      // 3. EMOTION (w3)
      let emotion_score = 0;
      if (item.emotion_tag_id && implicitEmotionMap[item.emotion_tag_id]) {
        emotion_score = implicitEmotionMap[item.emotion_tag_id];
      }

      // 4. REGIONAL (w4)
      let regional_score = 0;
      const iReg = item.region?.toLowerCase();
      const iLang = item.language?.toLowerCase();
      
      const targetRegion = region?.toLowerCase() || userLoc;
      const targetLang = language?.toLowerCase() || userPrefLang;

      if (targetRegion && iReg === targetRegion) {
        regional_score += 0.6;
      } else if (targetLang && iLang === targetLang) {
        regional_score += 0.4;
      } else if (targetRegion) {
        const mappedLang = REGION_LANGUAGE_MAP[targetRegion];
        if (mappedLang && iLang === mappedLang) {
          regional_score += 0.3;
        }
      }
      regional_score = Math.min(regional_score, 1.0);

      // 5. TIME CONTEXT (w5)
      let time_score = 0;
      if (item.genre) {
        const itemGenres = item.genre.split(',').map(g => g.trim().toLowerCase());
        let isLight = itemGenres.includes('comedy') || itemGenres.includes('family') || itemGenres.includes('animation');
        let isHeavy = itemGenres.includes('thriller') || itemGenres.includes('horror') || itemGenres.includes('crime');
        
        if (currentBucket === 'morning' && isLight) time_score = 1.0;
        else if (currentBucket === 'night' && isHeavy) time_score = 1.0;
        else time_score = 0.5;
      }
      
      if (isWeekend) {
        const itemGenres = item.genre ? item.genre.split(',').map(g => g.trim().toLowerCase()) : [];
        if (itemGenres.includes('action') || itemGenres.includes('adventure') || itemGenres.includes('sci-fi')) {
          time_score = Math.min(time_score + 0.3, 1.0);
        }
      }

      // FINAL HYBRID CALCULATION
      const finalScore = (W1 * popularity) + 
                         (W2 * similarity) + 
                         (W3 * emotion_score) + 
                         (W4 * regional_score) + 
                         (W5 * time_score);

      scoredItems.push({
        ...item,
        match_percentage: Math.round(finalScore * 100), // Normalize roughly
        finalScore,
        debug_scores: { popularity, similarity, emotion_score, regional_score, time_score }
      });
    }

    scoredItems.sort((a, b) => b.finalScore - a.finalScore);
    return scoredItems.slice(0, topK);
  } catch (err) {
    console.error('Recommendation Engine Error:', err);
    return await getFallback(topK);
  }
}

async function getDashboardRecommendations(userId, mood, language, region) {
  try {
    const [movieRecs, tvRecs, trendData] = await Promise.all([
      getRecommendations(userId, mood, language, region, 'movie', 300),
      getRecommendations(userId, mood, language, region, 'web_series', 200),
      getFallback(100, mood, language, region)
    ]);

    const allRecs = [...movieRecs, ...tvRecs].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

    // Removed usedIds so the same limited movies can populate multiple applicable rows instead of vanishing
    const getUnique = (arr, limit) => {
      const res = [];
      const seen = new Set();
      for (const item of arr) {
        if (!seen.has(item.id)) {
          res.push(item);
          seen.add(item.id);
        }
        if (res.length >= limit) break;
      }
      return res;
    };

    const getMovies = (arr) => arr.filter(m => m.content_type === 'movie');
    const getWebSeries = (arr) => arr.filter(m => m.content_type === 'web_series');

    let sim = allRecs.filter(m => m.debug_scores && m.debug_scores.similarity > 0.1);
    let reg = allRecs.filter(m => m.debug_scores && m.debug_scores.regional_score > 0);
    let tim = allRecs.filter(m => m.debug_scores && m.debug_scores.time_score > 0);
    let moo = allRecs.filter(m => m.debug_scores && m.debug_scores.emotion_score > 0.1);
    const india = allRecs.filter(m => m.region?.toLowerCase() === 'india' || m.language?.toLowerCase() === 'hindi');

    const heroMovie = allRecs.length > 0 ? allRecs[0] : (trendData[0] || null);

    const similarityMovies = getUnique(getMovies(sim), 50);
    const similarityWebSeries = getUnique(getWebSeries(sim), 50);

    const regionMovies = getUnique(getMovies(reg), 50);
    const regionWebSeries = getUnique(getWebSeries(reg), 50);

    const timeMovies = getUnique(getMovies(tim), 50);
    const timeWebSeries = getUnique(getWebSeries(tim), 50);

    const moodMovies = getUnique(getMovies(moo), 50);
    const moodWebSeries = getUnique(getWebSeries(moo), 50);

    const indiaMovies = getUnique(getMovies(india), 50);
    const indiaWebSeries = getUnique(getWebSeries(india), 50);

    const popularMovies = getUnique(getMovies(trendData), 50);
    const popularWebSeries = getUnique(getWebSeries(trendData), 50);

    const moviesList = getUnique(getMovies(allRecs), 50);
    const tvList = getUnique(getWebSeries(allRecs), 50);

    return {
      heroMovie,
      similarityMovies,
      similarityWebSeries,
      regionMovies,
      regionWebSeries,
      timeMovies,
      timeWebSeries,
      moodMovies,
      moodWebSeries,
      indiaMovies,
      indiaWebSeries,
      movieRecs: moviesList,
      tvRecs: tvList,
      popularMovies,
      popularWebSeries
    };
  } catch (err) {
    console.error("Dashboard Rec Error:", err);
    return { popularPicks: await getFallback(20) };
  }
}

export { getRecommendations, getDashboardRecommendations };