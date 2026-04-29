const db = require('../config/db');

function parseVector(pgVectorString) {
  return pgVectorString.replace(/[\[\]]/g, '').split(',').map(Number);
}

async function getFallback(topK) {
  const result = await db.query(
    `SELECT id, title, description, genre, language, region,
            poster_url, backdrop_url, popularity_score, content_type
     FROM items ORDER BY popularity_score DESC NULLS LAST LIMIT $1`,
    [topK]
  );
  return result.rows;
}

async function getRecommendations(userId, contentType = 'movie', topK = 20) {
  try {
    // STEP 1 — FETCH USER
    const userResult = await db.query(
      `SELECT id, preferred_language, location FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return await getFallback(topK);
    }
    const user = userResult.rows[0];

    const embeddingResult = await db.query(
      `SELECT embedding FROM user_embeddings WHERE user_id = $1`,
      [userId]
    );
    const userEmbedding = embeddingResult.rows.length > 0 ? embeddingResult.rows[0] : null;

    // STEP 2 — CANDIDATE ITEMS
    const candidatesResult = await db.query(
      `SELECT
        i.id, i.title, i.description, i.genre, i.language, i.region,
        i.poster_url, i.backdrop_url, i.popularity_score, i.content_type,
        i.embedding::text AS embedding_text,
        et.name AS emotion_name,
        COALESCE(et.weight_multiplier, 1.0) AS weight_multiplier
      FROM items i
      LEFT JOIN emotion_tags et ON i.emotion_tag_id = et.id
      WHERE i.content_type = $1
        AND i.id NOT IN (
          SELECT item_id FROM interactions WHERE user_id = $2
        )
      ORDER BY i.popularity_score DESC NULLS LAST
      LIMIT 100`,
      [contentType, userId]
    );

    const candidates = candidatesResult.rows;

    // STEP 3 — TIME CONTEXT
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = (day === 0 || day === 6);

    const getMatchedMultiplier = (genreStr) => {
      if (isWeekend) return 1.1;
      if (!genreStr) return 1.0;
      
      const genreLower = genreStr.toLowerCase();
      
      if (hour >= 5 && hour <= 11) {
        if (genreLower.includes('action') || genreLower.includes('adventure') || genreLower.includes('motivational')) return 1.2;
      } else if (hour >= 12 && hour <= 16) {
        if (genreLower.includes('drama') || genreLower.includes('comedy') || genreLower.includes('family')) return 1.1;
      } else if (hour >= 17 && hour <= 21) {
        if (genreLower.includes('thriller') || genreLower.includes('romance') || genreLower.includes('mystery')) return 1.2;
      } else if (hour >= 22 || hour <= 4) {
        if (genreLower.includes('horror') || genreLower.includes('sci-fi') || genreLower.includes('documentary')) return 1.15;
      }
      return 1.0;
    };

    // STEP 4 — PARSE USER EMBEDDING
    const userVec = userEmbedding && userEmbedding.embedding ? parseVector(userEmbedding.embedding) : null;

    // STEP 5 — SCORE EACH ITEM IN A JS LOOP
    const scoredItems = [];

    for (const item of candidates) {
      // A. popularity_score
      const popularity_score = Math.min(parseFloat(item.popularity_score || 0) / 10.0, 1.0);

      // B. similarity_score
      let similarity_score = 0;
      if (userVec !== null && item.embedding_text !== null) {
        const itemVec = parseVector(item.embedding_text);
        
        let dot = 0;
        let sumA = 0;
        let sumB = 0;
        for (let i = 0; i < userVec.length; i++) {
          dot += userVec[i] * itemVec[i];
          sumA += userVec[i] * userVec[i];
          sumB += itemVec[i] * itemVec[i];
        }
        
        const magA = Math.sqrt(sumA);
        const magB = Math.sqrt(sumB);
        
        let similarity = (magA === 0 || magB === 0) ? 0 : dot / (magA * magB);
        similarity_score = Math.max(0, Math.min(1, similarity));
      }

      // C. emotion_score
      const emotion_score = Math.min(parseFloat(item.weight_multiplier || 1.0) / 2.0, 1.0);

      // D. regional_score
      let regional_score = 0;
      if (item.language === user.preferred_language) regional_score += 0.6;
      if (item.region === user.location) regional_score += 0.4;
      regional_score = Math.min(regional_score, 1.0);

      // E. time_context_score
      const matchedMultiplier = getMatchedMultiplier(item.genre);
      const time_context_score = parseFloat((matchedMultiplier - 1.0).toFixed(4));

      // F. finalScore
      const finalScore = (0.25 * popularity_score) + 
                         (0.25 * similarity_score) + 
                         (0.20 * emotion_score) + 
                         (0.15 * regional_score) + 
                         (0.15 * time_context_score);

      scoredItems.push({
        id: item.id,
        title: item.title,
        description: item.description,
        genre: item.genre,
        language: item.language,
        region: item.region,
        poster_url: item.poster_url,
        backdrop_url: item.backdrop_url,
        popularity_score: item.popularity_score,
        emotion_name: item.emotion_name,
        content_type: item.content_type,
        finalScore: finalScore
      });
    }

    // STEP 6 — SORT AND RETURN
    scoredItems.sort((a, b) => b.finalScore - a.finalScore);
    const topItems = scoredItems.slice(0, topK);

    return topItems;
  } catch (err) {
    console.error(err);
    return await getFallback(topK);
  }
}

module.exports = { getRecommendations };