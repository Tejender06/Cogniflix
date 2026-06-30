import {
  getDashboardRecommendations as runDashboardPipeline,
  getPersonalizedRecommendations,
} from '../recommendation-engine/pipeline.js';
import recommendationRepository from '../repositories/recommendation.repository.js';

async function getRecommendations(
  userId,
  mood,
  language,
  region,
  contentType = 'movie',
  emotion = null,
  topK = 100
) {
  try {
    return await getPersonalizedRecommendations({
      userId,
      mood,
      language,
      region,
      contentType,
      emotion,
      topK,
    });
  } catch (err) {
    console.error('Recommendation Pipeline Error:', err);
    return recommendationRepository.getPopularFallback({
      topK,
      contentType,
    });
  }
}

async function getDashboardRecommendations(userId, mood, language, region, emotion = null) {
  try {
    return await runDashboardPipeline({
      userId,
      mood,
      language,
      region,
      emotion,
    });
  } catch (err) {
    console.error('Dashboard Recommendation Pipeline Error:', err);
    const fallback = await recommendationRepository.getPopularFallback({ topK: 100 });
    return {
      heroMovie: fallback[0] || null,
      rows: [
        {
          id: 'popularFallback',
          title: 'Popular on Cogniflix',
          subtitle: 'Fallback recommendations while personalization recovers',
          items: fallback,
        },
      ],
      popularMovies: fallback.filter((item) => item.content_type === 'movie'),
      popularWebSeries: fallback.filter((item) => item.content_type === 'web_series'),
    };
  }
}

export { getRecommendations, getDashboardRecommendations };

