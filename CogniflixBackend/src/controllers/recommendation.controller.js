/*
FILE: recommendation.controller.js

PURPOSE:
Handles incoming recommendation requests and sends response.

FLOW:
Routes -> Controller -> Service

USED BY:
recommendation.routes.js

NEXT FLOW:
recommendation.service.js

*/
import * as recommendationService from '../services/recommendation.service.js';

const getRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.user_id;
    let { mood, language, region, content_type, emotion } = req.query;

    if (mood?.toLowerCase() === 'all') mood = null;
    if (language?.toLowerCase() === 'all') language = null;
    if (region?.toLowerCase() === 'all') region = null;

    if (!userId) {
      return res.status(400).json({
        error: 'user_id is required'
      });
    }

    const results = await recommendationService.getRecommendations(userId, mood, language, region, content_type, emotion);

    if (!Array.isArray(results)) {
      return res.status(200).json({
        user_id: userId,
        count: 0,
        data: []
      });
    }

    return res.status(200).json({
      user_id: userId,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Recommendation Controller Error:', error);

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const getDashboard = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.user_id;
    let { mood, language, region, emotion } = req.query;

    if (mood?.toLowerCase() === 'all') mood = null;
    if (language?.toLowerCase() === 'all') language = null;
    if (region?.toLowerCase() === 'all') region = null;

    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const dashboardData = await recommendationService.getDashboardRecommendations(userId, mood, language, region, emotion);

    return res.status(200).json({
      user_id: userId,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard Controller Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export {
  getRecommendations,
  getDashboard
};