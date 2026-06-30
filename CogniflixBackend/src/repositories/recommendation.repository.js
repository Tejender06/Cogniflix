import db from '../config/db.js';
import { EXPLICIT_REGEX, MAX_CANDIDATE_LIMIT, TV_SERIAL_REGEX } from '../recommendation-engine/constants.js';

function addMultiValueFilter({ clauses, params, column, values }) {
  if (!values || values.length === 0) return;

  const parts = values.map((value) => {
    params.push(value);
    return `${column} ILIKE '%' || $${params.length} || '%'`;
  });

  clauses.push(`(${parts.join(' OR ')})`);
}

async function getUserProfile(userId) {
  const result = await db.query(
    `SELECT id, name, preferred_language, location FROM users WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

async function getUserEmbedding(userId) {
  const result = await db.query(
    `SELECT embedding FROM user_embeddings WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0]?.embedding || null;
}

async function getBehaviorEvents(userId, limit = 200) {
  const result = await db.query(
    `
    SELECT
      intr.interaction_type,
      COALESCE(intr.score, 0) AS score,
      intr.watch_time,
      intr.created_at,
      it.id,
      it.title,
      it.genre,
      it.language,
      it.region,
      it.content_type,
      it.emotion_tag_id,
      et.name AS emotion_name
    FROM interactions intr
    JOIN items it ON intr.item_id = it.id
    LEFT JOIN emotion_tags et ON it.emotion_tag_id = et.id
    WHERE intr.user_id = $1
    ORDER BY intr.created_at DESC
    LIMIT $2
    `,
    [userId, limit]
  );

  return result.rows;
}

async function getCandidatePool(context, userEmbedding, limit = MAX_CANDIDATE_LIMIT) {
  const params = [context.contentType, context.userId, TV_SERIAL_REGEX, EXPLICIT_REGEX];
  const clauses = [
    'i.content_type = $1',
    "NOT EXISTS (SELECT 1 FROM interactions seen WHERE seen.item_id = i.id AND seen.user_id = $2 AND seen.interaction_type IN ('watch', 'like', 'rate', 'dislike'))",
    'i.title !~* $3',
    'i.title !~* $4',
    'COALESCE(i.description, \'\') !~* $4',
    "COALESCE(i.genre, '') NOT ILIKE '%soap%'",
    "COALESCE(i.genre, '') NOT ILIKE '%talk show%'",
    "COALESCE(i.genre, '') NOT ILIKE '%reality%'",
    "COALESCE(i.genre, '') NOT ILIKE '%adult%'",
  ];

  addMultiValueFilter({ clauses, params, column: 'i.language', values: context.languages });
  addMultiValueFilter({ clauses, params, column: 'i.region', values: context.regions });
  addMultiValueFilter({ clauses, params, column: 'et.name', values: context.emotions });

  if (context.moods.length > 0) {
    const genreParts = context.moods.map((mood) => {
      if (mood.toLowerCase() === 'sci-fi') {
        return "(i.genre ILIKE '%Science Fiction%' OR i.genre ILIKE '%Sci-Fi%')";
      }
      params.push(mood);
      return `i.genre ILIKE '%' || $${params.length} || '%'`;
    });
    clauses.push(`(${genreParts.join(' OR ')})`);
  }

  let similarityExpression = '0.5';
  if (userEmbedding) {
    params.push(userEmbedding);
    similarityExpression = `GREATEST(0, 1 - (i.embedding <=> $${params.length}::vector))`;
  }

  params.push(limit);
  const limitParam = params.length;

  const result = await db.query(
    `
    SELECT
      i.id,
      i.title,
      i.description,
      i.genre,
      i.language,
      i.region,
      i.poster_url,
      i.backdrop_url,
      i.popularity_score,
      i.content_type,
      i.emotion_tag_id,
      i.created_at,
      et.name AS emotion_name,
      ${similarityExpression} AS similarity_score,
      ROUND(LEAST(COALESCE(i.popularity_score, 0) / 10.0, 10.0)::numeric, 1) AS rating
    FROM items i
    LEFT JOIN emotion_tags et ON i.emotion_tag_id = et.id
    WHERE ${clauses.join(' AND ')}
    ORDER BY COALESCE(i.popularity_score, 0) DESC, i.created_at DESC NULLS LAST
    LIMIT $${limitParam}
    `,
    params
  );

  return result.rows;
}

async function getPopularFallback({ topK = 100, contentType = null } = {}) {
  const params = [TV_SERIAL_REGEX, EXPLICIT_REGEX];
  const clauses = [
    'i.title !~* $1',
    'COALESCE(i.description, \'\') !~* $2',
    "COALESCE(i.genre, '') NOT ILIKE '%soap%'",
    "COALESCE(i.genre, '') NOT ILIKE '%talk show%'",
    "COALESCE(i.genre, '') NOT ILIKE '%reality%'",
    "COALESCE(i.genre, '') NOT ILIKE '%adult%'",
  ];

  if (contentType) {
    params.push(contentType);
    clauses.push(`i.content_type = $${params.length}`);
  }

  params.push(topK);

  const result = await db.query(
    `
    SELECT
      i.*,
      et.name AS emotion_name,
      ROUND(LEAST(COALESCE(i.popularity_score, 0) / 10.0, 10.0)::numeric, 1) AS rating
    FROM items i
    LEFT JOIN emotion_tags et ON i.emotion_tag_id = et.id
    WHERE ${clauses.join(' AND ')}
    ORDER BY COALESCE(i.popularity_score, 0) DESC NULLS LAST, i.created_at DESC NULLS LAST
    LIMIT $${params.length}
    `,
    params
  );

  return result.rows;
}

export default {
  getUserProfile,
  getUserEmbedding,
  getBehaviorEvents,
  getCandidatePool,
  getPopularFallback,
};

