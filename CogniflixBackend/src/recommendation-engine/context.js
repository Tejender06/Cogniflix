import { normalizeList } from '../utils/request.js';

export function getTimeBucket(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 21) return 'evening';
  return 'night';
}

export function createRecommendationContext({
  userId,
  mood,
  language,
  region,
  contentType = 'movie',
  emotion,
  topK = 100,
}) {
  const now = new Date();
  const day = now.getDay();

  return {
    userId,
    moods: normalizeList(mood).filter((item) => item.toLowerCase() !== 'all'),
    languages: normalizeList(language).filter((item) => item.toLowerCase() !== 'all'),
    regions: normalizeList(region).filter((item) => item.toLowerCase() !== 'all'),
    emotions: normalizeList(emotion).filter((item) => item.toLowerCase() !== 'all'),
    contentType: contentType || 'movie',
    topK: Math.max(1, Math.min(Number.parseInt(topK, 10) || 100, 300)),
    now,
    hour: now.getHours(),
    dayOfWeek: day,
    isWeekend: day === 0 || day === 6,
    timeBucket: getTimeBucket(now),
  };
}

