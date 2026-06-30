import recommendationRepository from '../repositories/recommendation.repository.js';
import * as interactionRepository from '../repositories/interactionRepository.js';
import { getAiRecommendations } from '../services/ai.service.js';
import { buildBehaviorProfile } from './behaviorProfile.js';
import { createRecommendationContext } from './context.js';
import { buildDashboardPayload } from './dashboardRows.js';
import { diversify, rankCandidates } from './ranking.js';

function mergeFallback(primary, fallback, topK) {
  const seen = new Set(primary.map((item) => item.id));
  const merged = [...primary];

  for (const item of fallback) {
    if (!seen.has(item.id)) {
      merged.push({
        ...item,
        match_percentage: item.match_percentage || 72,
        recommendation_reason: item.recommendation_reason || 'Popular with Cogniflix viewers',
        quality_badge: item.quality_badge || 'HD',
        ai_badge: false,
      });
      seen.add(item.id);
    }
    if (merged.length >= topK) break;
  }

  return merged;
}

export async function getPersonalizedRecommendations({
  userId,
  mood,
  language,
  region,
  contentType,
  emotion,
  topK,
}) {
  const context = createRecommendationContext({
    userId,
    mood,
    language,
    region,
    contentType,
    emotion,
    topK,
  });

  const [user, userEmbedding, behaviorEvents] = await Promise.all([
    recommendationRepository.getUserProfile(userId),
    recommendationRepository.getUserEmbedding(userId),
    recommendationRepository.getBehaviorEvents(userId),
  ]);

  const profile = buildBehaviorProfile({
    user,
    events: behaviorEvents,
    context,
  });

  const candidates = await recommendationRepository.getCandidatePool(
    context,
    userEmbedding,
    500
  );

  const ranked = rankCandidates(candidates, profile, context);
  const deterministicTop = diversify(ranked, Math.min(context.topK, ranked.length));

  const aiWindow = deterministicTop.slice(0, Math.min(80, deterministicTop.length));
  const aiRanked = aiWindow.length > 0
    ? await getAiRecommendations(aiWindow, {
      mood: context.moods.join(', '),
      language: context.languages.join(', '),
      region: context.regions.join(', '),
      emotion: context.emotions.join(', '),
      timeBucket: context.timeBucket,
    }, Math.min(context.topK, aiWindow.length))
    : [];

  const result = aiRanked.length > 0 ? mergeFallback(aiRanked, deterministicTop, context.topK) : deterministicTop;

  if (result.length >= Math.min(20, context.topK)) {
    return result.slice(0, context.topK);
  }

  const fallback = await recommendationRepository.getPopularFallback({
    topK: context.topK,
    contentType: context.contentType,
  });

  return mergeFallback(result, fallback, context.topK);
}

export async function getDashboardRecommendations({
  userId,
  mood,
  language,
  region,
  emotion,
}) {
  const context = createRecommendationContext({
    userId,
    mood,
    language,
    region,
    emotion,
    contentType: 'movie',
    topK: 100,
  });

  const [movieRecs, tvRecs, popular, history] = await Promise.all([
    getPersonalizedRecommendations({
      userId,
      mood,
      language,
      region,
      emotion,
      contentType: 'movie',
      topK: 140,
    }),
    getPersonalizedRecommendations({
      userId,
      mood,
      language,
      region,
      emotion,
      contentType: 'web_series',
      topK: 100,
    }),
    recommendationRepository.getPopularFallback({ topK: 180 }),
    interactionRepository.getHistory(userId).catch(() => []),
  ]);

  return buildDashboardPayload({
    movieRecs,
    tvRecs,
    popular,
    history,
    context,
  });
}

