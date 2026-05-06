import { fetchTMDB, initGenres, langRegionMap } from '../utils/tmdb.js';
import { processItem } from '../services/search.service.js';
import itemRepository from '../repositories/item.repository.js';
import pool from '../config/db.js';

async function seedData() {
  console.log("Initializing genres...");
  await initGenres();

  const pagesToFetch = 3; // 3 pages * 20 items = 60 items per category

  // 1. Fetch by Language
  for (const [langCode, config] of Object.entries(langRegionMap)) {
    console.log(`Fetching popular movies and web series for language: ${config.langName}...`);

    // Movies
    const moviesToInsert = [];
    for (let page = 1; page <= pagesToFetch; page++) {
      const res = await fetchTMDB('/discover/movie', { with_original_language: langCode, sort_by: 'popularity.desc', page }).catch(() => null);
      if (res && res.results) {
        for (const item of res.results) {
          item.media_type = 'movie';
          const processed = await processItem(item);
          if (processed) moviesToInsert.push(processed);
        }
      }
    }
    if (moviesToInsert.length > 0) {
      await itemRepository.bulkInsertMovies(moviesToInsert);
      console.log(`Inserted ${moviesToInsert.length} movies for ${config.langName}`);
    }

    // Web Series
    const tvToInsert = [];
    for (let page = 1; page <= pagesToFetch; page++) {
      const res = await fetchTMDB('/discover/tv', { with_original_language: langCode, sort_by: 'popularity.desc', page }).catch(() => null);
      if (res && res.results) {
        for (const item of res.results) {
          item.media_type = 'tv';
          const processed = await processItem(item);
          if (processed) tvToInsert.push(processed);
        }
      }
    }
    if (tvToInsert.length > 0) {
      await itemRepository.bulkInsertMovies(tvToInsert);
      console.log(`Inserted ${tvToInsert.length} web series for ${config.langName}`);
    }
  }

  // 2. Fetch Global Popular (Regardless of language)
  console.log("Fetching global popular movies and web series...");
  const globalMovies = [];
  for (let page = 1; page <= pagesToFetch; page++) {
    const res = await fetchTMDB('/discover/movie', { sort_by: 'popularity.desc', page }).catch(() => null);
    if (res && res.results) {
      for (const item of res.results) {
        item.media_type = 'movie';
        const processed = await processItem(item);
        if (processed) globalMovies.push(processed);
      }
    }
  }
  if (globalMovies.length > 0) {
    await itemRepository.bulkInsertMovies(globalMovies);
    console.log(`Inserted ${globalMovies.length} global popular movies`);
  }

  const globalTv = [];
  for (let page = 1; page <= pagesToFetch; page++) {
    const res = await fetchTMDB('/discover/tv', { sort_by: 'popularity.desc', page }).catch(() => null);
    if (res && res.results) {
      for (const item of res.results) {
        item.media_type = 'tv';
        const processed = await processItem(item);
        if (processed) globalTv.push(processed);
      }
    }
  }
  if (globalTv.length > 0) {
    await itemRepository.bulkInsertMovies(globalTv);
    console.log(`Inserted ${globalTv.length} global popular web series`);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seedData().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});