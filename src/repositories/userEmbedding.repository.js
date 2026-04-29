const db = require('../config/db');

async function getUserEmbedding(userId) {
  try {
    const result = await db.query(
      `SELECT embedding FROM user_embeddings WHERE user_id = $1`,
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function upsertUserEmbedding(userId, vectorArray) {
  try {
    const pgVec = '[' + vectorArray.join(',') + ']';
    await db.query(
      `INSERT INTO user_embeddings (user_id, embedding, updated_at)
       VALUES ($1, $2::vector, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET embedding = EXCLUDED.embedding, updated_at = NOW()`,
      [userId, pgVec]
    );
  } catch (error) {
    console.error(error);
  }
}

module.exports = { getUserEmbedding, upsertUserEmbedding };
