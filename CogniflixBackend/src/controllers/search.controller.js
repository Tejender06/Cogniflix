/*
FILE: search.controller.js

PURPOSE:
Handles incoming search queries from users and returns matching movies or web series.

FLOW:
Routes -> Controller -> search.service.js

USED BY:
search.routes.js

NEXT FLOW:
search.service.js

*/
import { searchMovie } from '../services/search.service.js';

export async function search(req, res) {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const result = await searchMovie(query);
    if (result.message) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in search controller:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
