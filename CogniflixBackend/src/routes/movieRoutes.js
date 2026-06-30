import express from 'express';
import {
  getGenres,
  getMovieById,
  getMovies,
  getSimilarMovies,
  getTrendingMovies,
} from '../controllers/content.controller.js';

const router = express.Router();

router.get('/trending', getTrendingMovies);
router.get('/genres', getGenres);
router.get('/', getMovies);
router.get('/:id', getMovieById);
router.get('/:id/similar', getSimilarMovies);

export default router;

