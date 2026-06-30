import express from 'express';
const router = express.Router();
import { fetchAndStoreMovies, fetchAndStoreTvShows } from '../services/movie.service.js';

router.get("/load-movies", async (req, res) => {
    await fetchAndStoreMovies();
    res.send("Movies loaded successfully");
});

router.get("/load-tv", async (req, res) => {
    await fetchAndStoreTvShows();
    res.send("TV Shows loaded successfully");
});

export default router;
