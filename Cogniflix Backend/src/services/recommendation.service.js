import db from '../config/db.js';
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

// Regex filters for database
const TV_SERIAL_REGEX = '\\y(idol|roadies|bigg boss|splitsvilla|khatron ke khiladi|sa re ga ma pa|dance india dance|kapil sharma|masterchef|kbc|kaun banega crorepati|kaisa ye|rangrasiya|kumkum|kyunki|kahaani|kasautii|naagin|yeh rishta|tarak mehta|taarak mehta|cid|savdhaan|crime patrol)\\y';
const EXPLICIT_REGEX = '\\y(sex|porn|porno|hentai|erotica|erotic|adult|lustful|lust|sensual|naked|prostitute|prostitutes|seduction|sexual|sexually|cuckold|perverted|stepdad|stepdaddy|stepmom|impregnates|incest)\\y';

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
    if (!res || !res.results || res.results.length === 0) break;
    if (insertedCount >= requiredCount) break;
  }
}

async function getFallback(topK, mood, language, region) {
  let query = `
     SELECT id, title, description, genre, language, region,
            poster_url, backdrop_url, popularity_score, content_type
     FROM items 
     WHERE genre NOT ILIKE '%soap%' 
       AND genre NOT ILIKE '%talk show%' 
       AND genre NOT ILIKE '%reality%' 
       AND genre NOT ILIKE '%adult%'
       AND title !~* $1
       AND title !~* $2
       AND description !~* $2
  `;
  let params = [TV_SERIAL_REGEX, EXPLICIT_REGEX];
  
  if (language) {
    params.push(language);
    query += ` AND language ILIKE '%' || $${params.length} || '%'`;
  }
  if (region) {
    params.push(region);
    query += ` AND region ILIKE '%' || $${params.length} || '%'`;
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
    await dynamicFetch(mood, language, 'movie', 40 - result.rows.length);
    await dynamicFetch(mood, language, 'web_series', 40 - result.rows.length);
    result = await db.query(query, params);
  }

  // Ensure diversity by slightly shuffling fallback based on score range
  const sorted = result.rows.sort((a, b) => b.popularity_score - a.popularity_score);
  return sorted;
}

async function getRecommendations(userId, mood, language, region, contentType = 'movie', emotion = null, topK = 100) {
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

    let queryArgs = [contentType, userId, TV_SERIAL_REGEX, EXPLICIT_REGEX];
    let filterClauses = [
      "i.content_type = $1", 
      "NOT EXISTS (SELECT 1 FROM interactions int_sub WHERE int_sub.item_id = i.id AND int_sub.user_id = $2 AND int_sub.interaction_type IN ('watch', 'like', 'rate', 'dislike'))",
      "i.title !~* $3",
      "i.title !~* $4",
      "i.description !~* $4",
      "i.genre NOT ILIKE '%soap%'",
      "i.genre NOT ILIKE '%talk show%'",
      "i.genre NOT ILIKE '%reality%'",
      "i.genre NOT ILIKE '%adult%'"
    ];

    let selectSimilarity = ", 0 AS similarity_score";

    if (language) {
      queryArgs.push(language);
      filterClauses.push(`i.language ILIKE '%' || $${queryArgs.length} || '%'`);
    }

    if (region) {
      queryArgs.push(region);
      filterClauses.push(`i.region ILIKE '%' || $${queryArgs.length} || '%'`);
    }

    if (mood) {
      if (mood.toLowerCase() === 'sci-fi') {
        filterClauses.push(`(i.genre ILIKE '%Science Fiction%' OR i.genre ILIKE '%Sci-Fi%')`);
      } else {
        queryArgs.push(mood);
        filterClauses.push(`i.genre ILIKE '%' || $${queryArgs.length} || '%'`);
      }
    }

    if (emotion) {
      queryArgs.push(emotion);
      filterClauses.push(`i.emotion_tag_id IN (SELECT id FROM emotion_tags WHERE name ILIKE '%' || $${queryArgs.length} || '%')`);
    }

    let orderClause = `ORDER BY i.popularity_score DESC NULLS LAST LIMIT 600`;

    if (userEmbedding && userEmbedding.embedding) {
      queryArgs.push(userEmbedding.embedding);
      const userVecParamIdx = queryArgs.length;
      selectSimilarity = `, (1 - (i.embedding <=> $${userVecParamIdx}::vector)) AS similarity_score`;
      orderClause = `ORDER BY i.embedding <=> $${userVecParamIdx}::vector LIMIT 600`;
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
      candidatesResult = await db.query(finalQuery, queryArgs);
      candidates = candidatesResult.rows;
    }

    // 2. INTERACTIONS
    const interactionsResult = await db.query(`
      SELECT i.created_at, COALESCE(i.score, 0) as score, it.genre, it.emotion_tag_id
      FROM interactions i
      JOIN items it ON i.item_id = it.id
      WHERE i.user_id = $1 AND i.interaction_type IN ('watch', 'like', 'rate')
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
    const maxPopScore = candidates.reduce((max, i) => Math.max(max, i.popularity_score || 0), 10); // Find max popularity dynamically to normalize

    // Weights setup (Total 1.0)
    const W1 = 0.25; // Popularity
    const W2 = 0.25; // Similarity
    const W3 = 0.20; // Emotion
    const W4 = 0.15; // Regional
    const W5 = 0.15; // Time

    for (const item of candidates) {
      // 1. POPULARITY (w1)
      const popularity = Math.min((parseFloat(item.popularity_score || 0) / maxPopScore), 1.0);

      // 2. SIMILARITY (w2)
      let similarity = Math.max(0, parseFloat(item.similarity_score) || 0);
      if (!userEmbedding) similarity = 0.5; // neutral if no history

      // 3. EMOTION (w3)
      let emotion_score = 0.1; // Baseline
      if (item.emotion_tag_id && implicitEmotionMap[item.emotion_tag_id]) {
        emotion_score = implicitEmotionMap[item.emotion_tag_id];
      }

      // 4. REGIONAL (w4)
      let regional_score = 0;
      const iReg = item.region?.toLowerCase();
      const iLang = item.language?.toLowerCase();
      
      const targetRegion = region?.toLowerCase() || userLoc;
      const targetLang = language?.toLowerCase() || userPrefLang;

      if (targetRegion && iReg && iReg.includes(targetRegion)) {
        regional_score += 0.6;
      } else if (targetLang && iLang && iLang.includes(targetLang)) {
        regional_score += 0.4;
      } else if (targetRegion) {
        const mappedLang = REGION_LANGUAGE_MAP[targetRegion];
        if (mappedLang && iLang && iLang.includes(mappedLang)) {
          regional_score += 0.3;
        }
      }
      regional_score = Math.min(regional_score, 1.0);

      // 5. TIME CONTEXT (w5)
      let time_score = 0.5; // Baseline
      if (item.genre) {
        const itemGenres = item.genre.split(',').map(g => g.trim().toLowerCase());
        let isLight = itemGenres.includes('comedy') || itemGenres.includes('family') || itemGenres.includes('animation');
        let isHeavy = itemGenres.includes('thriller') || itemGenres.includes('horror') || itemGenres.includes('crime') || itemGenres.includes('mystery');
        
        if (currentBucket === 'morning' && isLight) time_score = 1.0;
        else if (currentBucket === 'night' && isHeavy) time_score = 1.0;
      }
      
      if (isWeekend) {
        const itemGenres = item.genre ? item.genre.split(',').map(g => g.trim().toLowerCase()) : [];
        if (itemGenres.includes('action') || itemGenres.includes('adventure') || itemGenres.includes('sci-fi')) {
          time_score = Math.min(time_score + 0.5, 1.0);
        }
      }

      const finalScore = (W1 * popularity) + 
                         (W2 * similarity) + 
                         (W3 * emotion_score) + 
                         (W4 * regional_score) + 
                         (W5 * time_score);

      scoredItems.push({
        ...item,
        match_percentage: Math.round(finalScore * 100),
        finalScore,
        debug_scores: { popularity, similarity, emotion_score, regional_score, time_score }
      });
    }

    scoredItems.sort((a, b) => b.finalScore - a.finalScore);

    // Filter duplicates
    const uniqueItems = [];
    const seenIds = new Set();
    for (const item of scoredItems) {
      if (!seenIds.has(item.id)) {
        uniqueItems.push(item);
        seenIds.add(item.id);
      }
    }

    return uniqueItems.slice(0, topK);
  } catch (err) {
    console.error('Recommendation Engine Error:', err);
    return await getFallback(topK, mood, language, region);
  }
}

async function getDashboardRecommendations(userId, mood, language, region, emotion = null) {
  try {
    const [movieRecs, tvRecs, trendData] = await Promise.all([
      getRecommendations(userId, mood, language, region, 'movie', emotion, 300),
      getRecommendations(userId, mood, language, region, 'web_series', emotion, 200),
      getFallback(200, mood, language, region)
    ]);

    const allRecs = [...movieRecs, ...tvRecs].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

    const globalSeen = new Set();
    const getUnique = (arr, limit) => {
      const res = [];
      for (const item of arr) {
        if (!globalSeen.has(item.id)) {
          res.push(item);
          globalSeen.add(item.id);
        }
        if (res.length >= limit) break;
      }
      return res;
    };

    const getMovies = (arr) => arr.filter(m => m.content_type === 'movie');
    const getWebSeries = (arr) => arr.filter(m => m.content_type === 'web_series');

    let sim = allRecs.filter(m => m.debug_scores && m.debug_scores.similarity > 0.4);
    let reg = allRecs.filter(m => m.debug_scores && m.debug_scores.regional_score > 0.3);
    let tim = allRecs.filter(m => m.debug_scores && m.debug_scores.time_score > 0.6);
    let moo = allRecs.filter(m => m.debug_scores && m.debug_scores.emotion_score > 0.5);
    const india = allRecs.filter(m => m.region?.toLowerCase().includes('india') || m.language?.toLowerCase() === 'hindi');

    const heroMovie = allRecs.length > 0 ? allRecs[0] : (trendData[0] || null);
    if (heroMovie) globalSeen.add(heroMovie.id);

    // Shuffle the lists slightly to ensure freshness between loads
    const shuffle = (array) => array.sort(() => Math.random() - 0.5);

    return {
      heroMovie,
      similarityMovies: getUnique(getMovies(sim), 30),
      similarityWebSeries: getUnique(getWebSeries(sim), 30),
      regionMovies: getUnique(getMovies(reg), 30),
      regionWebSeries: getUnique(getWebSeries(reg), 30),
      timeMovies: getUnique(getMovies(tim), 30),
      timeWebSeries: getUnique(getWebSeries(tim), 30),
      moodMovies: getUnique(getMovies(moo), 30),
      moodWebSeries: getUnique(getWebSeries(moo), 30),
      indiaMovies: getUnique(getMovies(india), 30),
      indiaWebSeries: getUnique(getWebSeries(india), 30),
      movieRecs: getUnique(getMovies(allRecs), 50),
      tvRecs: getUnique(getWebSeries(allRecs), 50),
      popularMovies: getUnique(getMovies(trendData), 50),
      popularWebSeries: getUnique(getWebSeries(trendData), 50)
    };
  } catch (err) {
    console.error("Dashboard Rec Error:", err);
    const fallback = await getFallback(100, mood, language, region);
    return { popularPicks: fallback };
  }
}

export { getRecommendations, getDashboardRecommendations };