import pool from '../config/db.js';

async function createIndexes() {
  console.log("Starting database indexing...");

  try {
    // Ensure pg_trgm is available for fast ILIKE searches
    try {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
      console.log("Created/Verified pg_trgm extension");
    } catch (err) {
      console.log("Could not create pg_trgm extension. This requires superuser privileges on some DBs.");
      console.log("Error details:", err.message);
    }

    // Basic indexes for quick exact match filtering
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_content_type ON items(content_type);`);
    console.log("Created basic index on content_type");

    // Trigram GIN indexes for fast ILIKE and partial matches
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_genre_trgm ON items USING gin (genre gin_trgm_ops);`);
      console.log("Created trigram GIN index on genre");

      await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_language_trgm ON items USING gin (language gin_trgm_ops);`);
      console.log("Created trigram GIN index on language");

      await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_region_trgm ON items USING gin (region gin_trgm_ops);`);
      console.log("Created trigram GIN index on region");
      
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_title_trgm ON items USING gin (title gin_trgm_ops);`);
      console.log("Created trigram GIN index on title");
    } catch (err) {
      console.log("Could not create GIN trigram indexes. Falling back to regular B-tree indexes.");
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_genre ON items(genre);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_language ON items(language);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_region ON items(region);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_title ON items(title);`);
    }

    // Optimize vector queries using hnsw (requires pgvector 0.5.0+)
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_embedding ON items USING hnsw (embedding vector_cosine_ops);`);
      console.log("Created HNSW index on embedding");
    } catch (err) {
      console.log("HNSW index failed, falling back to ivfflat...");
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_embedding ON items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`);
      console.log("Created IVFFLAT index on embedding");
    }

  } catch (error) {
    console.error("Error creating indexes:", error);
  } finally {
    pool.end();
  }
}

createIndexes();
