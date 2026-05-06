import express from 'express';
const router = express.Router();
import pool from '../config/db.js';

router.get("/trending", async (req, res) => {
  try {
    const trendingResult = await pool.query(
      `
      SELECT it.*, COUNT(i.id) as interaction_count
      FROM items it
      LEFT JOIN interactions i ON it.id = i.item_id
      WHERE it.content_type = 'movie'
      GROUP BY it.id
      ORDER BY interaction_count DESC, it.popularity_score DESC
      LIMIT 50
      `
    );
    res.json({ movies: trendingResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch trending movies" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { genre, emotion, search, sort } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, parseInt(req.query.limit) || 100);
    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM items it 
      LEFT JOIN emotion_tags et ON it.emotion_tag_id = et.id
      WHERE it.content_type = 'movie'
    `;
    
    const values = [];
    const conditions = [];

    if (genre) {
      values.push(`%${genre}%`);
      conditions.push(`it.genre ILIKE $${values.length}`);
    }
    if (emotion) {
      values.push(`%${emotion}%`);
      conditions.push(`et.name ILIKE $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`it.title ILIKE $${values.length}`);
    }

    if (conditions.length > 0) {
      baseQuery += " AND " + conditions.join(" AND ");
    }

    let orderClause = `ORDER BY it.popularity_score DESC NULLS LAST, it.created_at DESC NULLS LAST`;
    if (sort === 'recent') {
      orderClause = `ORDER BY it.created_at DESC NULLS LAST`;
    }

    const countQuery = `SELECT COUNT(*) AS total ` + baseQuery;
    const dataQuery = `SELECT it.*, et.name as emotion_name ` + baseQuery + 
                      ` ${orderClause} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

    let countResult = await pool.query(countQuery, values);
    let moviesResult = await pool.query(dataQuery, [...values, limit, offset]);

    let total = parseInt(countResult.rows[0].total);
    
    // The frontend SearchFeature directly uses /api/search now.
    // So /api/movies only returns the populated database.

    res.json({
      data: moviesResult.rows,
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

router.get("/genres", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT genre 
      FROM items 
      WHERE genre IS NOT NULL AND genre != ''
      ORDER BY genre ASC
    `);
    
    // Some movies might have multiple genres in a string, but assuming simple comma separated or single
    const rawGenres = result.rows.map(row => row.genre);
    
    // Normalize and split comma separated genres just in case
    const uniqueGenres = new Set();
    rawGenres.forEach(g => {
      const parts = g.split(',').map(p => p.trim());
      parts.forEach(p => {
        if (p) uniqueGenres.add(p);
      });
    });

    res.json({ genres: Array.from(uniqueGenres).sort() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch genres" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate UUID to prevent DB crash if an invalid string like "genres" falls through
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: "Invalid movie ID" });
    }

    const movieResult = await pool.query(
      `
      SELECT it.*, et.name as emotion_name 
      FROM items it 
      LEFT JOIN emotion_tags et ON it.emotion_tag_id = et.id
      WHERE it.id = $1
      `,
      [id]
    );

    if (movieResult.rows.length === 0) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json({ movie: movieResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch movie details" });
  }
});

router.get("/:id/similar", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: "Invalid movie ID" });
    }

    // Use cosine similarity on embeddings
    const similarResult = await pool.query(
      `
      SELECT it.*
      FROM items it
      WHERE it.id != $1
      ORDER BY it.embedding <=> (SELECT embedding FROM items WHERE id = $1)
      LIMIT 10
      `,
      [id]
    );

    res.json({ movies: similarResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch similar movies" });
  }
});

export default router;