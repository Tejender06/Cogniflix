import { GENRE_ROW_CONFIG } from './constants.js';
import { byGenre } from './ranking.js';

function uniqueById(items, limit, globalSeen = null) {
  const seen = globalSeen || new Set();
  const result = [];

  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    result.push(item);
    seen.add(item.id);
    if (result.length >= limit) break;
  }

  return result;
}

function getMovies(items) {
  return items.filter((item) => item.content_type === 'movie');
}

function getWebSeries(items) {
  return items.filter((item) => item.content_type === 'web_series');
}

export function buildDashboardPayload({
  movieRecs,
  tvRecs,
  popular,
  history,
  context,
}) {
  const ranked = [...movieRecs, ...tvRecs].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
  const globalSeen = new Set();
  const heroMovie = ranked.find((item) => item.backdrop_url) || ranked[0] || popular[0] || null;
  if (heroMovie) globalSeen.add(heroMovie.id);

  const rows = [];
  const pushRow = ({ id, title, items, subtitle }) => {
    const uniqueItems = uniqueById(items, 30, globalSeen);
    if (uniqueItems.length > 0) {
      rows.push({ id, title, subtitle, items: uniqueItems });
    }
    return uniqueItems;
  };

  const continueWatching = history || [];
  if (continueWatching.length > 0) {
    rows.push({
      id: 'continueWatching',
      title: 'Continue Watching',
      subtitle: 'Pick up where you left off',
      items: continueWatching.slice(0, 20),
    });
  }

  const aiTopPicks = pushRow({
    id: 'aiTopPicks',
    title: 'AI Top Picks For You',
    subtitle: 'Hybrid ranking across behavior, similarity, context, and freshness',
    items: ranked,
  });

  const recommendedMovies = pushRow({
    id: 'movieRecs',
    title: context.moods.length ? `Top ${context.moods.join(', ')} Movies For You` : 'Top Picks For You',
    subtitle: 'Personalized movies with explainable ranking',
    items: getMovies(movieRecs),
  });

  const recommendedSeries = pushRow({
    id: 'tvRecs',
    title: context.moods.length ? `Top ${context.moods.join(', ')} Series For You` : 'Series You Might Love',
    subtitle: 'Long-form picks tuned to your taste',
    items: getWebSeries(tvRecs),
  });

  const similarityMovies = pushRow({
    id: 'similarityMovies',
    title: 'Because You Watched',
    subtitle: 'Similarity-weighted from your recent activity',
    items: getMovies(ranked.filter((item) => Number(item.debug_scores?.similarity || 0) >= 0.55)),
  });

  const regionMovies = pushRow({
    id: 'regionMovies',
    title: context.regions.length ? `Popular In ${context.regions.join(', ')}` : 'Popular In Your Region',
    subtitle: 'Language and location aware ranking',
    items: getMovies(ranked.filter((item) => Number(item.debug_scores?.regional || 0) >= 0.45)),
  });

  const timeMovies = pushRow({
    id: 'timeMovies',
    title: context.isWeekend ? 'Weekend Binge' : `Recommended For ${context.timeBucket}`,
    subtitle: 'Time-aware contextual ranking',
    items: getMovies(ranked.filter((item) => Number(item.debug_scores?.time || 0) >= 0.8)),
  });

  const moodMovies = pushRow({
    id: 'moodMovies',
    title: context.emotions.length ? `Mood-Based Picks: ${context.emotions.join(', ')}` : 'Mood-Based Picks',
    subtitle: 'Emotion signals from your profile and filters',
    items: getMovies(ranked.filter((item) => Number(item.debug_scores?.emotion || 0) >= 0.4)),
  });

  const popularMovies = pushRow({
    id: 'popularMovies',
    title: 'Trending Now',
    subtitle: 'Popular titles filtered for quality and safety',
    items: getMovies(popular),
  });

  const popularWebSeries = pushRow({
    id: 'popularWebSeries',
    title: 'Binge-Worthy Series',
    subtitle: 'Popular web series to start tonight',
    items: getWebSeries(popular),
  });

  const genreRows = {};
  for (const [title, id, genre] of GENRE_ROW_CONFIG) {
    genreRows[id] = pushRow({
      id,
      title,
      subtitle: `Dynamic ${genre.toLowerCase()} recommendations`,
      items: getMovies(byGenre(ranked, genre)),
    });
  }

  return {
    heroMovie,
    rows,
    aiTopPicks,
    movieRecs: recommendedMovies,
    tvRecs: recommendedSeries,
    similarityMovies,
    similarityWebSeries: uniqueById(getWebSeries(ranked.filter((item) => Number(item.debug_scores?.similarity || 0) >= 0.55)), 30),
    regionMovies,
    regionWebSeries: uniqueById(getWebSeries(ranked.filter((item) => Number(item.debug_scores?.regional || 0) >= 0.45)), 30),
    timeMovies,
    timeWebSeries: uniqueById(getWebSeries(ranked.filter((item) => Number(item.debug_scores?.time || 0) >= 0.8)), 30),
    moodMovies,
    moodWebSeries: uniqueById(getWebSeries(ranked.filter((item) => Number(item.debug_scores?.emotion || 0) >= 0.4)), 30),
    indiaMovies: uniqueById(getMovies(ranked.filter((item) => String(item.region || '').toLowerCase().includes('india') || String(item.language || '').toLowerCase().includes('hindi'))), 30),
    indiaWebSeries: uniqueById(getWebSeries(ranked.filter((item) => String(item.region || '').toLowerCase().includes('india') || String(item.language || '').toLowerCase().includes('hindi'))), 30),
    popularMovies,
    popularWebSeries,
    genreRows,
  };
}

