/*
FILE: webSeriesRoutes.js

PURPOSE:
Defines API endpoints for fetching web series data.

FLOW:
Client -> Routes -> Controller

USED BY:
app.js
*/
import express from 'express';
const router = express.Router();
import pool from '../config/db.js';

router.get("/", async (req, res) => {
  try {
    const { genre, emotion, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, parseInt(req.query.limit) || 100);
    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM items it 
      LEFT JOIN emotion_tags et ON it.emotion_tag_id = et.id
      WHERE it.content_type = 'web_series'
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

    const countQuery = `SELECT COUNT(*) AS total ` + baseQuery;
    const dataQuery = `SELECT it.*, et.name as emotion_name ` + baseQuery + 
                      ` ORDER BY it.popularity_score DESC NULLS LAST, it.created_at DESC NULLS LAST LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

    let countResult = await pool.query(countQuery, values);
    let tvResult = await pool.query(dataQuery, [...values, limit, offset]);

    let total = parseInt(countResult.rows[0].total);

    // Frontend uses /api/search directly now

    res.json({
      data: tvResult.rows,
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch web series" });
  }
});

export default router;
