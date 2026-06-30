import express from 'express';
const router = express.Router();
import authMiddleware from '../middleware/authMiddleware.js';
import * as recommendationController from '../controllers/recommendation.controller.js';

router.get("/", authMiddleware, recommendationController.getRecommendations);
router.get("/dashboard", authMiddleware, recommendationController.getDashboard);

export default router;