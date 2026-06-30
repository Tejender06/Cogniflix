import db from '../config/db.js';
import { upsertUserEmbedding } from '../repositories/userEmbedding.repository.js';

async function updateUserEmbedding(userId) {
  try {
    // Step A
    const result = await db.query(
      `SELECT i.embedding::text AS embedding_text
       FROM interactions intr
       JOIN items i ON intr.item_id = i.id
       WHERE intr.user_id = $1
       AND intr.interaction_type IN ('watch', 'like', 'rate')
       AND i.embedding IS NOT NULL
       ORDER BY intr.created_at DESC
       LIMIT 50`,
      [userId]
    );

    // Step B
    if (result.rows.length === 0) {
      return;
    }

    // Step C
    const vecs = result.rows.map(row => 
      row.embedding_text.replace(/[\[\]]/g, '').split(',').map(Number)
    );

    // Step D
    const dims = 1536;
    const avg = new Array(dims).fill(0);
    for (const vec of vecs) {
      for (let i = 0; i < dims; i++) {
        avg[i] += vec[i];
      }
    }
    for (let i = 0; i < dims; i++) {
      avg[i] = avg[i] / vecs.length;
    }

    // Step E
    const mag = Math.sqrt(avg.reduce((s, v) => s + v * v, 0));
    if (mag === 0) return;
    const normalized = avg.map(v => v / mag);

    // Step F
    await upsertUserEmbedding(userId, normalized);
  } catch (error) {
    console.error(error);
  }
}

export { updateUserEmbedding };
