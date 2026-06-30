import pool from '../config/db.js';

function pushIlikeFilter({ clauses, params, column, value }) {
  if (!value) return;
  params.push(`%${value}%`);
  clauses.push(`${column} ILIKE $${params.length}`);
}

function buildCatalogFilters({ contentType, genre, emotion, search }) {
  const params = [];
  const clauses = ['it.content_type = $1'];
  params.push(contentType);

  pushIlikeFilter({ clauses, params, column: 'it.genre', value: genre });
  pushIlikeFilter({ clauses, params, column: 'et.name', value: emotion });
  pushIlikeFilter({ clauses, params, column: 'it.title', value: search });

  return {
    whereClause: clauses.join(' AND '),
    params,
  };
}

function resolveOrder(sort) {
  switch (sort) {
    case 'recent':
      return 'ORDER BY it.created_at DESC NULLS LAST, it.popularity_score DESC NULLS LAST';
    case 'title':
      return 'ORDER BY it.title ASC';
    case 'rating':
    case 'top-rated':
      return 'ORDER BY it.popularity_score DESC NULLS LAST, it.created_at DESC NULLS LAST';
    default:
      return 'ORDER BY it.popularity_score DESC NULLS LAST, it.created_at DESC NULLS LAST';
  }
}

async function listContent({ contentType, genre, emotion, search, sort, limit, offset }) {
  const { whereClause, params } = buildCatalogFilters({
    contentType,
    genre,
    emotion,
    search,
  });
  const orderClause = resolveOrder(sort);

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM items it
    LEFT JOIN emotion_tags et ON it.emotion_tag_id = et.id
    WHERE ${whereClause}
  `;

  const dataParams = [...params, limit, offset];
  const dataQuery = `
    SELECT
      it.*,
      et.name AS emotion_name,
      ROUND(LEAST(COALESCE(it.popularity_score, 0) / 10.0, 10.0)::numeric, 1) AS rating,
      CASE WHEN it.content_type = 'web_series' THEN 'Series' ELSE 'Movie' END AS format_label
    FROM items it
    LEFT JOIN emotion_tags et ON it.emotion_tag_id = et.id
    WHERE ${whereClause}
    ${orderClause}
    LIMIT $${dataParams.length - 1}
    OFFSET $${dataParams.length}
  `;

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, params),
    pool.query(dataQuery, dataParams),
  ]);

  return {
    rows: dataResult.rows,
    total: Number.parseInt(countResult.rows[0]?.total || '0', 10),
  };
}

async function findTrendingMovies(limit = 50) {
  const result = await pool.query(
    `
    SELECT
      it.*,
      COUNT(i.id) AS interaction_count,
      ROUND(LEAST(COALESCE(it.popularity_score, 0) / 10.0, 10.0)::numeric, 1) AS rating
    FROM items it
    LEFT JOIN interactions i ON it.id = i.item_id
    WHERE it.content_type = 'movie'
    GROUP BY it.id
    ORDER BY interaction_count DESC, it.popularity_score DESC NULLS LAST
    LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

async function listGenres() {
  const result = await pool.query(`
    SELECT DISTINCT genre
    FROM items
    WHERE genre IS NOT NULL AND genre != ''
    ORDER BY genre ASC
  `);

  const uniqueGenres = new Set();
  for (const row of result.rows) {
    String(row.genre || '')
      .split(',')
      .map((genre) => genre.trim())
      .filter(Boolean)
      .forEach((genre) => uniqueGenres.add(genre));
  }

  return Array.from(uniqueGenres).sort();
}

async function findById(id) {
  const result = await pool.query(
    `
    SELECT
      it.*,
      et.name AS emotion_name,
      ROUND(LEAST(COALESCE(it.popularity_score, 0) / 10.0, 10.0)::numeric, 1) AS rating
    FROM items it
    LEFT JOIN emotion_tags et ON it.emotion_tag_id = et.id
    WHERE it.id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function findSimilar(itemId, limit = 12) {
  const result = await pool.query(
    `
    SELECT
      it.*,
      ROUND((GREATEST(0, 1 - (it.embedding <=> source.embedding)) * 100)::numeric) AS match_percentage
    FROM items source
    JOIN items it ON it.id != source.id
    WHERE source.id = $1
      AND source.embedding IS NOT NULL
      AND it.embedding IS NOT NULL
      AND it.content_type = source.content_type
    ORDER BY it.embedding <=> source.embedding
    LIMIT $2
    `,
    [itemId, limit]
  );

  return result.rows;
}

export default {
  listContent,
  findTrendingMovies,
  listGenres,
  findById,
  findSimilar,
};

