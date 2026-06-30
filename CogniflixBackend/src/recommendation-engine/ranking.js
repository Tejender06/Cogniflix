import { REGION_LANGUAGE_MAP, RANKING_WEIGHTS } from './constants.js';

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function tokenizeGenres(item) {
  return String(item.genre || '')
    .split(',')
    .map((genre) => genre.trim().toLowerCase())
    .filter(Boolean);
}

function includesAny(source, values) {
  const lower = String(source || '').toLowerCase();
  return values.some((value) => lower.includes(String(value).toLowerCase()));
}

function getBehaviorScore(item, profile) {
  const genres = tokenizeGenres(item);
  const positive = genres.reduce((sum, genre) => sum + (profile.genreAffinity[genre] || 0), 0);
  const negative = genres.reduce((sum, genre) => sum + (profile.dislikedGenres[genre] || 0), 0);
  return clamp((positive / Math.max(genres.length, 1)) - (negative * 0.45));
}

function getRegionalScore(item, profile, context) {
  const language = String(item.language || '').toLowerCase();
  const region = String(item.region || '').toLowerCase();
  const targetLanguages = [...profile.preferredLanguages];
  const targetRegions = [...profile.preferredRegions];

  for (const targetRegion of targetRegions) {
    const mappedLanguage = REGION_LANGUAGE_MAP[targetRegion];
    if (mappedLanguage) targetLanguages.push(mappedLanguage);
  }

  let score = 0;
  if (includesAny(language, targetLanguages)) score += 0.55;
  if (includesAny(region, targetRegions)) score += 0.45;
  if (context.languages.length && includesAny(language, context.languages)) score += 0.25;
  if (context.regions.length && includesAny(region, context.regions)) score += 0.25;

  return clamp(score);
}

function getTimeScore(item, context) {
  const genre = String(item.genre || '').toLowerCase();
  let score = 0.45;

  if (context.timeBucket === 'morning') {
    if (genre.includes('comedy') || genre.includes('family') || genre.includes('animation')) score = 1;
  } else if (context.timeBucket === 'afternoon') {
    if (genre.includes('adventure') || genre.includes('drama') || genre.includes('documentary')) score = 0.85;
  } else if (context.timeBucket === 'evening') {
    if (genre.includes('action') || genre.includes('romance') || genre.includes('drama')) score = 0.9;
  } else if (genre.includes('thriller') || genre.includes('horror') || genre.includes('crime') || genre.includes('mystery')) {
    score = 0.95;
  }

  if (context.isWeekend && (genre.includes('action') || genre.includes('adventure') || genre.includes('sci-fi'))) {
    score += 0.25;
  }

  return clamp(score);
}

function getEmotionScore(item, profile, context) {
  const emotion = String(item.emotion_name || item.emotion_tag_id || '').toLowerCase();
  const explicitEmotion = context.emotions.some((value) => emotion.includes(value.toLowerCase()));
  return clamp((profile.emotionAffinity[emotion] || 0) + (explicitEmotion ? 0.55 : 0));
}

function getFreshnessScore(item) {
  if (!item.created_at) return 0.35;
  const daysOld = Math.max(0, (Date.now() - new Date(item.created_at).getTime()) / 86400000);
  return clamp(Math.exp(-0.015 * daysOld));
}

function getExplorationScore(item, profile) {
  if (profile.isColdStart) return 0.55;
  const genres = tokenizeGenres(item);
  const knownGenreScore = genres.reduce((sum, genre) => sum + (profile.genreAffinity[genre] || 0), 0);
  return knownGenreScore > 0 ? 0.2 : 0.8;
}

function getPopularityScore(item) {
  return clamp((Number.parseFloat(item.popularity_score) || 0) / 1000);
}

function buildExplanation({ item, scores, profile, context }) {
  const title = profile.recentlyWatched[0]?.title;
  const genre = tokenizeGenres(item)[0];
  const language = String(item.language || '').toLowerCase();
  const region = String(item.region || '').toLowerCase();

  if (scores.similarity >= 0.72 && title) return `Because you watched ${title}`;
  if (scores.regional >= 0.65 && region) return `Trending in ${item.region}`;
  if (scores.regional >= 0.55 && language) return `Matches your ${item.language} preference`;
  if (scores.time >= 0.85) return `Recommended for ${context.timeBucket}`;
  if (scores.emotion >= 0.55 && item.emotion_name) return `Fits your ${item.emotion_name} mood`;
  if (scores.behavior >= 0.45 && genre) return `More ${genre} picks for you`;
  if (scores.exploration >= 0.65) return 'A fresh pick to broaden your taste';
  return 'Popular among viewers with similar interests';
}

export function rankCandidates(candidates, profile, context) {
  return candidates
    .map((item) => {
      const scores = {
        behavior: getBehaviorScore(item, profile),
        similarity: clamp(Number.parseFloat(item.similarity_score) || 0.5),
        popularity: getPopularityScore(item),
        regional: getRegionalScore(item, profile, context),
        time: getTimeScore(item, context),
        emotion: getEmotionScore(item, profile, context),
        freshness: getFreshnessScore(item),
        exploration: getExplorationScore(item, profile),
      };

      const finalScore = Object.entries(RANKING_WEIGHTS).reduce(
        (sum, [key, weight]) => sum + (scores[key] || 0) * weight,
        0
      );

      const matchPercentage = Math.max(62, Math.min(99, Math.round(finalScore * 100)));

      return {
        ...item,
        finalScore,
        match_percentage: matchPercentage,
        recommendation_reason: buildExplanation({ item, scores, profile, context }),
        debug_scores: scores,
        quality_badge: 'HD',
        ai_badge: finalScore >= 0.62,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}

export function diversify(rankedItems, limit) {
  const selected = [];
  const genreCounts = new Map();
  const languageCounts = new Map();

  for (const item of rankedItems) {
    const primaryGenre = tokenizeGenres(item)[0] || 'general';
    const language = String(item.language || 'global').toLowerCase();
    const genreCount = genreCounts.get(primaryGenre) || 0;
    const languageCount = languageCounts.get(language) || 0;

    if (genreCount >= 6 || languageCount >= 8) {
      continue;
    }

    selected.push(item);
    genreCounts.set(primaryGenre, genreCount + 1);
    languageCounts.set(language, languageCount + 1);

    if (selected.length >= limit) break;
  }

  if (selected.length < limit) {
    for (const item of rankedItems) {
      if (!selected.some((selectedItem) => selectedItem.id === item.id)) {
        selected.push(item);
      }
      if (selected.length >= limit) break;
    }
  }

  return selected;
}

export function byGenre(items, genre) {
  const target = genre.toLowerCase();
  return items.filter((item) => String(item.genre || '').toLowerCase().includes(target));
}

