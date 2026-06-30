import catalogRepository from '../repositories/catalog.repository.js';
import { createHttpError } from '../middleware/errorMiddleware.js';
import { isUuid, parsePagination } from '../utils/request.js';

async function listCatalog(query, contentType) {
  const { page, limit, offset } = parsePagination(query, {
    defaultPage: 1,
    defaultLimit: 60,
    maxLimit: 120,
  });

  const { rows, total } = await catalogRepository.listContent({
    contentType,
    genre: query.genre,
    emotion: query.emotion,
    search: query.search,
    sort: query.sort,
    limit,
    offset,
  });

  return {
    data: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

async function getTrendingMovies() {
  return catalogRepository.findTrendingMovies(50);
}

async function getGenres() {
  return catalogRepository.listGenres();
}

async function getContentById(id) {
  if (!isUuid(id)) {
    throw createHttpError(400, 'Invalid movie ID');
  }

  const movie = await catalogRepository.findById(id);
  if (!movie) {
    throw createHttpError(404, 'Movie not found');
  }

  return movie;
}

async function getSimilarContent(id) {
  if (!isUuid(id)) {
    throw createHttpError(400, 'Invalid movie ID');
  }

  return catalogRepository.findSimilar(id, 12);
}

export {
  listCatalog,
  getTrendingMovies,
  getGenres,
  getContentById,
  getSimilarContent,
};

