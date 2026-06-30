/*
FILE: userPreference.repository.js

PURPOSE:
Fetches and updates user preference embeddings based on interactions.

FLOW:
Service -> Repository -> Database

USED BY:
interactionService.js

NEXT FLOW:
PostgreSQL Database

*/
import db from '../config/db.js';

const saveUserPreferences = async (userId, genres = [], emotions = []) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM user_preferences WHERE user_id = $1`,
      [userId]
    );

    for (const genre of genres) {
      await client.query(
        `INSERT INTO user_preferences (user_id, preference_type, value)
         VALUES ($1, 'GENRE', $2)`,
        [userId, genre]
      );
    }

    for (const emotionId of emotions) {
      await client.query(
        `INSERT INTO user_preferences (user_id, preference_type, value)
         VALUES ($1, 'EMOTION', $2)`,
        [userId, emotionId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getUserPreferences = async (userId) => {
  const result = await db.query(
    `SELECT preference_type, value
     FROM user_preferences
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows;
};

export {
  saveUserPreferences,
  getUserPreferences
};