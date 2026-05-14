import db from '../config/db.js';
import { fetchTMDB, langRegionMap, movieGenreMap, initGenres } from '../utils/tmdb.js';
import { processItem } from './search.service.js';
import itemRepository from '../repositories/item.repository.js';
import { emotionToGenreMap } from '../utils/emotionMap.js';

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

async function dynamicFetch(mood, language, contentType, emotion, requiredCount) {
  // Keeping dynamic fetch simple for fallback purposes. Ingestion should handle the bulk.
  await initGenres();
  
  let langCode = null;
  if (language) {
    const entry = Object.entries(langRegionMap).find(([k, v]) => v.langName.toLowerCase() === language.toLowerCase());
    if (entry) langCode = entry[0];
  }

  let genreIds = [];
  if (mood) {
    const moods = mood.split(',').map(m => m.trim()).filter(Boolean);
    for (const m of moods) {
      const moodLower = m.toLowerCase() === 'sci-fi' ? 'science fiction' : m.toLowerCase();
      const gEntry = Object.entries(movieGenreMap).find(([k, v]) => v.toLowerCase() === moodLower || v.toLowerCase().includes(moodLower));
      if (gEntry) genreIds.push(gEntry[0]);
    }
  } 
  
  if (emotion) {
    const emotions = emotion.split(',').map(e => e.trim()).filter(Boolean);
    for (const e of emotions) {
      const mappedGenre = emotionToGenreMap[e.toLowerCase()];
      if (mappedGenre) {
        const gEntry = Object.entries(movieGenreMap).find(([k, v]) => v.toLowerCase() === mappedGenre.toLowerCase());
        if (gEntry) genreIds.push(gEntry[0]);
      }
    }
  }

  genreIds = [...new Set(genreIds)];

  const endpoint = contentType === 'movie' ? '/discover/movie' : '/discover/tv';
  const params = {
    sort_by: 'popularity.desc'
  };
  if (langCode) params.with_original_language = langCode;
  if (genreIds.length > 0) params.with_genres = genreIds.join('|');

  if (!langCode && genreIds.length === 0) return;

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

async function getFallback(topK, mood, language, region, emotion = null) {
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
    const langs = language.split(',').map(l => l.trim()).filter(Boolean);
    if (langs.length > 0) {
      const conditions = langs.map(l => {
        params.push(l);
        return `language ILIKE '%' || $${params.length} || '%'`;
      });
      query += ` AND (${conditions.join(' OR ')})`;
    }
  }
  if (region) {
    const regions = region.split(',').map(r => r.trim()).filter(Boolean);
    if (regions.length > 0) {
      const conditions = regions.map(r => {
        params.push(r);
        return `region ILIKE '%' || $${params.length} || '%'`;
      });
      query += ` AND (${conditions.join(' OR ')})`;
    }
  }
  if (mood) {
    const moods = mood.split(',').map(m => m.trim()).filter(Boolean);
    if (moods.length > 0) {
      const conditions = moods.map(m => {
        if (m.toLowerCase() === 'sci-fi') {
          return `(genre ILIKE '%Science Fiction%' OR genre ILIKE '%Sci-Fi%')`;
        } else {
          params.push(m);
          return `genre ILIKE '%' || $${params.length} || '%'`;
        }
      });
      query += ` AND (${conditions.join(' OR ')})`;
    }
  }

  if (emotion) {
    const emotions = emotion.split(',').map(e => e.trim()).filter(Boolean);
    if (emotions.length > 0) {
      const conditions = emotions.map(e => {
        params.push(e);
        return `name ILIKE '%' || $${params.length} || '%'`;
      });
      query += ` AND emotion_tag_id IN (SELECT id FROM emotion_tags WHERE ${conditions.join(' OR ')})`;
    }
  }
  
  params.push(topK);
  query += ` ORDER BY popularity_score DESC NULLS LAST LIMIT $${params.length}`;

  let result = await db.query(query, params);
  
  if (result.rows.length < 20 && (language || mood || emotion)) {
    await dynamicFetch(mood, language, 'movie', emotion, 40 - result.rows.length);
    await dynamicFetch(mood, language, 'web_series', emotion, 40 - result.rows.length);
    result = await db.query(query, params);
  }

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
    const userEmbedding = embeddingResult.rows.length > 0 ? embeddingResult.rows[0].embedding : null;

    // Build the interactions implicitly mapping emotions
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

    // Time context
    const currentHour = now.getHours();
    const currentBucket = getBucket(currentHour);
    const day = now.getDay();
    const isWeekend = (day === 0 || day === 6);

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

    if (language) {
      const langs = language.split(',').map(l => l.trim()).filter(Boolean);
      if (langs.length > 0) {
        const conditions = langs.map(l => {
          queryArgs.push(l);
          return `i.language ILIKE '%' || $${queryArgs.length} || '%'`;
        });
        filterClauses.push(`(${conditions.join(' OR ')})`);
      }
    }

    if (region) {
      const regions = region.split(',').map(r => r.trim()).filter(Boolean);
      if (regions.length > 0) {
        const conditions = regions.map(r => {
          queryArgs.push(r);
          return `i.region ILIKE '%' || $${queryArgs.length} || '%'`;
        });
        filterClauses.push(`(${conditions.join(' OR ')})`);
      }
    }

    if (mood) {
      const moods = mood.split(',').map(m => m.trim()).filter(Boolean);
      if (moods.length > 0) {
        const conditions = moods.map(m => {
          if (m.toLowerCase() === 'sci-fi') {
            return `(i.genre ILIKE '%Science Fiction%' OR i.genre ILIKE '%Sci-Fi%')`;
          } else {
            queryArgs.push(m);
            return `i.genre ILIKE '%' || $${queryArgs.length} || '%'`;
          }
        });
        filterClauses.push(`(${conditions.join(' OR ')})`);
      }
    }

    if (emotion) {
      const emotions = emotion.split(',').map(e => e.trim()).filter(Boolean);
      if (emotions.length > 0) {
        const conditions = emotions.map(e => {
          queryArgs.push(e);
          return `name ILIKE '%' || $${queryArgs.length} || '%'`;
        });
        filterClauses.push(`i.emotion_tag_id IN (SELECT id FROM emotion_tags WHERE ${conditions.join(' OR ')})`);
      }
    }

    // Weights setup (Total 1.0)
    const W1 = 0.25; // Popularity
    const W2 = 0.25; // Similarity
    const W3 = 0.20; // Emotion
    const W4 = 0.15; // Regional
    const W5 = 0.15; // Time

    // Score Calculations
    // 1. Popularity (w1)
    const popScoreExpr = `LEAST(COALESCE(i.popularity_score, 0) / 1000.0, 1.0)`; // Normalize against a reasonable max

    // 2. Similarity (w2)
    let simScoreExpr = "0.5";
    if (userEmbedding) {
      queryArgs.push(userEmbedding);
      const userVecParamIdx = queryArgs.length;
      simScoreExpr = `GREATEST(0, (1 - (i.embedding <=> $${userVecParamIdx}::vector)))`;
    }

    // 3. Emotion (w3)
    let emotionScoreExpr = "0.1";
    if (Object.keys(implicitEmotionMap).length > 0) {
      emotionScoreExpr = "CASE i.emotion_tag_id ";
      for (const [eId, weight] of Object.entries(implicitEmotionMap)) {
        emotionScoreExpr += `WHEN ${eId} THEN ${weight} `;
      }
      emotionScoreExpr += "ELSE 0.1 END";
    }

    // 4. Regional (w4)
    const targetRegion = region?.toLowerCase() || userLoc;
    const targetLang = language?.toLowerCase() || userPrefLang;
    
    let regionalCases = "";
    if (targetRegion) {
      queryArgs.push(`%${targetRegion}%`);
      regionalCases += `WHEN i.region ILIKE $${queryArgs.length} THEN 0.6 `;
      const mappedLang = REGION_LANGUAGE_MAP[targetRegion];
      if (mappedLang) {
        queryArgs.push(`%${mappedLang}%`);
        regionalCases += `WHEN i.language ILIKE $${queryArgs.length} THEN 0.3 `;
      }
    }
    if (targetLang) {
      queryArgs.push(`%${targetLang}%`);
      regionalCases += `WHEN i.language ILIKE $${queryArgs.length} THEN 0.4 `;
    }
    const regionalScoreExpr = regionalCases ? `CASE ${regionalCases} ELSE 0.0 END` : "0.0";

    // 5. Time Context (w5)
    let timeScoreExpr = "0.5";
    if (currentBucket === 'morning') {
      timeScoreExpr = `CASE WHEN i.genre ILIKE '%comedy%' OR i.genre ILIKE '%family%' OR i.genre ILIKE '%animation%' THEN 1.0 ELSE 0.5 END`;
    } else if (currentBucket === 'night') {
      timeScoreExpr = `CASE WHEN i.genre ILIKE '%thriller%' OR i.genre ILIKE '%horror%' OR i.genre ILIKE '%crime%' OR i.genre ILIKE '%mystery%' THEN 1.0 ELSE 0.5 END`;
    }
    
    if (isWeekend) {
      timeScoreExpr = `LEAST((${timeScoreExpr}) + CASE WHEN i.genre ILIKE '%action%' OR i.genre ILIKE '%adventure%' OR i.genre ILIKE '%sci-fi%' THEN 0.5 ELSE 0 END, 1.0)`;
    }

    const finalScoreExpr = `((${W1} * ${popScoreExpr}) + (${W2} * ${simScoreExpr}) + (${W3} * ${emotionScoreExpr}) + (${W4} * ${regionalScoreExpr}) + (${W5} * ${timeScoreExpr}))`;

    queryArgs.push(topK);
    const limitParamIdx = queryArgs.length;

    const finalQuery = `
      SELECT
        i.id, i.title, i.description, i.genre, i.language, i.region,
        i.poster_url, i.backdrop_url, i.popularity_score, i.content_type,
        i.emotion_tag_id,
        ${simScoreExpr} AS similarity_score,
        ${finalScoreExpr} AS finalScore,
        ROUND((${finalScoreExpr} * 100)::numeric) AS match_percentage
      FROM items i
      WHERE ${filterClauses.join(' AND ')}
      ORDER BY finalScore DESC NULLS LAST
      LIMIT $${limitParamIdx}
    `;

    let candidatesResult = await db.query(finalQuery, queryArgs);
    let candidates = candidatesResult.rows;

    if (candidates.length < 20 && (language || mood || emotion)) {
      // Dynamic fetch if we really have nothing
      await dynamicFetch(mood, language, contentType, emotion, 40 - candidates.length);
      candidatesResult = await db.query(finalQuery, queryArgs);
      candidates = candidatesResult.rows;
    }

    return candidates;
  } catch (err) {
    console.error('Recommendation Engine Error:', err);
    return await getFallback(topK, mood, language, region, emotion);
  }
}

async function getDashboardRecommendations(userId, mood, language, region, emotion = null) {
  try {
    const [movieRecs, tvRecs, trendData] = await Promise.all([
      getRecommendations(userId, mood, language, region, 'movie', emotion, 300),
      getRecommendations(userId, mood, language, region, 'web_series', emotion, 200),
      getFallback(200, mood, language, region, emotion)
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

    // Using match_percentage and scores from SQL query
    let sim = allRecs.filter(m => m.similarity_score > 0.4);
    // Since SQL no longer exposes individual debug scores, we'll infer categories safely:
    // Or we could have added them to SELECT, but let's filter based on known properties.
    let reg = allRecs.filter(m => {
        const userReg = region?.toLowerCase();
        const userLang = language?.toLowerCase();
        return (userReg && m.region?.toLowerCase().includes(userReg)) || (userLang && m.language?.toLowerCase() === userLang);
    });
    
    const currentHour = new Date().getHours();
    const currentBucket = getBucket(currentHour);
    let tim = allRecs.filter(m => {
        if (currentBucket === 'morning') return m.genre?.toLowerCase().includes('comedy') || m.genre?.toLowerCase().includes('family');
        if (currentBucket === 'night') return m.genre?.toLowerCase().includes('thriller') || m.genre?.toLowerCase().includes('horror');
        return true;
    });

    let moo = allRecs.filter(m => m.emotion_tag_id != null);
    const india = allRecs.filter(m => m.region?.toLowerCase().includes('india') || m.language?.toLowerCase() === 'hindi');

    const heroMovie = allRecs.length > 0 ? allRecs[0] : (trendData[0] || null);
    if (heroMovie) globalSeen.add(heroMovie.id);

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