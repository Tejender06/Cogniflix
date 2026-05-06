/*
FILE: removeTVSerials.js

PURPOSE:
Script to clean up database by identifying and removing low-quality TV serials.

FLOW:
Script -> PostgreSQL

USED BY:
Developer/Admin manually

NEXT FLOW:
PostgreSQL Database

*/
import pool from '../config/db.js';

async function removeTVSerials() {
  console.log("🧹 Removing remaining TV serials, reality shows, and explicit content...");
  
  const deleteQuery = `
    DELETE FROM items 
    WHERE 
      genre ILIKE '%soap%' OR 
      genre ILIKE '%talk show%' OR 
      genre ILIKE '%reality%' OR 
      genre ILIKE '%news%' OR 
      genre ILIKE '%adult%' OR 
      title ~* '\\y(idol|roadies|bigg boss|splitsvilla|khatron ke khiladi|sa re ga ma pa|dance india dance|kapil sharma|masterchef|kbc|kaun banega crorepati|kaisa ye|rangrasiya|kumkum|kyunki|kahaani|kasautii|naagin|yeh rishta|tarak mehta|taarak mehta|cid|savdhaan|crime patrol)\\y' OR
      title ~* '\\y(sex|porn|porno|hentai|erotica|erotic|adult|lustful|lust|sensual|naked|prostitute|prostitutes|seduction|sexual|sexually|cuckold|perverted|stepdad|stepdaddy|stepmom|impregnates|incest)\\y' OR
      description ~* '\\y(sex|porn|porno|hentai|erotica|erotic|adult|lustful|lust|sensual|naked|prostitute|prostitutes|seduction|sexual|sexually|cuckold|perverted|stepdad|stepdaddy|stepmom|impregnates|incest)\\y'
  `;
  
  try {
    const res = await pool.query(deleteQuery);
    console.log(`🗑️ Deleted ${res.rowCount} inappropriate or low-quality items.`);
  } catch (err) {
    console.error("❌ Error deleting items:", err.message);
  } finally {
    pool.end();
  }
}

removeTVSerials();
