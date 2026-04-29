require('dotenv').config();
const pool = require('../config/db');

async function migrate() {
  try {
    console.log("Creating vector extension...");
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector;");
    
    console.log("Adding columns to users...");
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT 'Global';
    `);
    
    console.log("Adding embedding column to items...");
    await pool.query(`
      ALTER TABLE items
      ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);
    `);
    
    console.log("Creating user_embeddings table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_embeddings (
      user_id   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      embedding VECTOR(1536),
      updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log("Creating items_embedding_idx...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS items_embedding_idx
      ON items USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    
    console.log("Creating unique_user_item_save index...");
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_user_item_save
      ON interactions (user_id, item_id)
      WHERE interaction_type = 'save';
    `);

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
