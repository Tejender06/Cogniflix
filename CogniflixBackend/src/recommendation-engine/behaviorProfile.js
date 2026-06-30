function increment(map, key, amount) {
  if (!key) return;
  map[key] = (map[key] || 0) + amount;
}

function normalizeMap(map) {
  const max = Math.max(...Object.values(map), 0);
  if (max <= 0) return map;

  return Object.fromEntries(
    Object.entries(map).map(([key, value]) => [key, value / max])
  );
}

function getInteractionWeight(event) {
  const score = Number.parseFloat(event.score) || 0;
  const baseWeights = {
    watch: Math.max(0.6, Math.min(2.5, (Number(event.watch_time) || 25) / 45)),
    like: 2.2,
    save: 1.8,
    rate: Math.max(0.2, score / 2.5),
    dislike: -2.4,
  };

  return baseWeights[event.interaction_type] ?? Math.max(0.2, score || 0.5);
}

export function buildBehaviorProfile({ user, events, context }) {
  const genreAffinity = {};
  const languageAffinity = {};
  const regionAffinity = {};
  const emotionAffinity = {};
  const dislikedGenres = {};
  const recentlyWatched = [];
  const watchedIds = new Set();
  const now = context.now.getTime();

  for (const event of events) {
    const daysOld = Math.max(0, (now - new Date(event.created_at).getTime()) / 86400000);
    const recencyDecay = Math.max(0.12, Math.exp(-0.045 * daysOld));
    const weight = getInteractionWeight(event) * recencyDecay;

    if (event.interaction_type === 'watch') {
      watchedIds.add(event.id);
      recentlyWatched.push(event);
    }

    const genres = String(event.genre || '')
      .split(',')
      .map((genre) => genre.trim().toLowerCase())
      .filter(Boolean);

    if (event.interaction_type === 'dislike') {
      genres.forEach((genre) => increment(dislikedGenres, genre, Math.abs(weight)));
      continue;
    }

    genres.forEach((genre) => increment(genreAffinity, genre, weight));
    increment(languageAffinity, String(event.language || '').toLowerCase(), weight);
    increment(regionAffinity, String(event.region || '').toLowerCase(), weight);
    increment(emotionAffinity, String(event.emotion_name || event.emotion_tag_id || '').toLowerCase(), weight);
  }

  const preferredLanguages = [
    ...context.languages.map((value) => value.toLowerCase()),
    String(user?.preferred_language || '').toLowerCase(),
    ...Object.keys(languageAffinity),
  ].filter(Boolean);

  const preferredRegions = [
    ...context.regions.map((value) => value.toLowerCase()),
    String(user?.location || '').toLowerCase(),
    ...Object.keys(regionAffinity),
  ].filter(Boolean);

  return {
    genreAffinity: normalizeMap(genreAffinity),
    languageAffinity: normalizeMap(languageAffinity),
    regionAffinity: normalizeMap(regionAffinity),
    emotionAffinity: normalizeMap(emotionAffinity),
    dislikedGenres: normalizeMap(dislikedGenres),
    recentlyWatched: recentlyWatched.slice(0, 12),
    watchedIds,
    preferredLanguages: [...new Set(preferredLanguages)],
    preferredRegions: [...new Set(preferredRegions)],
    isColdStart: events.length === 0,
  };
}

