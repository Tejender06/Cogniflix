/*
FILE: recommendation.routes.js

PURPOSE:
Defines API endpoints for fetching recommendations.

FLOW:
Client -> Routes -> Controller

USED BY:
app.js

NEXT FLOW:
recommendation.controller.js

*/
import express from 'express';
const router = express.Router();
import authMiddleware from '../middleware/authMiddleware.js';
import * as recommendationController from '../controllers/recommendation.controller.js';

router.get("/", authMiddleware, recommendationController.getRecommendations);
router.get("/dashboard", authMiddleware, recommendationController.getDashboard);

export default router;