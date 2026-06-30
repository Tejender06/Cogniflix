import express from 'express';
const router = express.Router();

import authMiddleware from '../middleware/authMiddleware.js';
import interactionRoutes from './interactionRoutes.js';

router.use(authMiddleware);
router.use("/interactions", interactionRoutes);

export default router;