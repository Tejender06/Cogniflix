/*
FILE: item.repository.js

PURPOSE:
Manages database operations related to content items (movies, web series).

FLOW:
Service -> Repository -> Database

USED BY:
movie.service.js, search.service.js

NEXT FLOW:
PostgreSQL Database

*/
import pool from '../config/db.js';

class ItemRepository {
  async findByTitleExact(query) {
    const result = await pool.query(
      `SELECT * FROM items WHERE title ILIKE $1 LIMIT 1`,
      [query]
    );
    return result.rows[0] || null;
  }

  async searchByTitleFuzzy(query, limit = 10) {
    const words = query.trim().split(/\s+/).map(w => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()).filter(w => w.length > 0);
    if (words.length === 0) return [];
    
    const conditions = words.map((_, i) => `regexp_replace(LOWER(title), '[^a-z0-9]', '', 'g') LIKE $${i + 1}`);
    const params = words.map(w => `%${w}%`);
    params.push(limit);
    
    const result = await pool.query(
      `SELECT * FROM items WHERE ${conditions.join(' AND ')} ORDER BY length(title) ASC LIMIT $${params.length}`,
      params
    );
    return result.rows;
  }

  /**
   * Insert a single movie into the database
   */
  async insertMovie(item) {
    try {
      const result = await pool.query(
        `INSERT INTO items 
        (title, description, language, region, genre, emotion_tag_id, popularity_score, poster_url, backdrop_url, embedding, content_type)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (title) DO NOTHING
        RETURNING *`,
        [
          item.title, item.description, item.language, item.region, item.genre,
          item.emotion_tag_id, item.popularity_score, item.poster_url, item.backdrop_url,
          item.embedding, item.content_type
        ]
      );
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      // If conflict occurred, DO NOTHING returns no rows, so we fetch the existing one
      const existing = await this.findByTitleExact(item.title);
      return existing;
    } catch (err) {
      console.error(`Error inserting item ${item.title}:`, err.message);
      return null;
    }
  }

  /**
   * Bulk insert movies avoiding duplicates
   */
  async bulkInsertMovies(movies) {
    if (!movies || movies.length === 0) return [];
    
    const insertedMovies = [];
    for (const item of movies) {
      const inserted = await this.insertMovie(item);
      if (inserted) insertedMovies.push(inserted);
    }
    return insertedMovies;
  }

  /**
   * Find similar items using vector similarity
   */
  async findSimilarByVector(embeddingText, limit = 10, excludeId = null) {
    try {
      let query = `
        SELECT *, 1 - (embedding <-> $1::vector) as similarity
        FROM items
        WHERE embedding IS NOT NULL
      `;
      const params = [embeddingText];

      if (excludeId) {
        query += ` AND id != $2`;
        params.push(excludeId);
      }

      query += ` ORDER BY embedding <-> $1::vector LIMIT $${params.length > 1 ? '3' : '2'}`;
      params.push(limit);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (err) {
      console.error("Error finding similar items by vector:", err.message);
      return [];
    }
  }
}

export default new ItemRepository();
