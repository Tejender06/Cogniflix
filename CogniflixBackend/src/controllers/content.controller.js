import * as contentService from '../services/content.service.js';
import { asyncHandler } from '../utils/request.js';

const getMovies = asyncHandler(async (req, res) => {
  const result = await contentService.listCatalog(req.query, 'movie');
  res.json(result);
});

const getWebSeries = asyncHandler(async (req, res) => {
  const result = await contentService.listCatalog(req.query, 'web_series');
  res.json(result);
});

const getTrendingMovies = asyncHandler(async (req, res) => {
  const movies = await contentService.getTrendingMovies();
  res.json({ movies });
});

const getGenres = asyncHandler(async (req, res) => {
  const genres = await contentService.getGenres();
  res.json({ genres });
});

const getMovieById = asyncHandler(async (req, res) => {
  const movie = await contentService.getContentById(req.params.id);
  res.json({ movie });
});

const getSimilarMovies = asyncHandler(async (req, res) => {
  const movies = await contentService.getSimilarContent(req.params.id);
  res.json({ movies });
});

export {
  getMovies,
  getWebSeries,
  getTrendingMovies,
  getGenres,
  getMovieById,
  getSimilarMovies,
};

