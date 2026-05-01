/*
FILE: interactionRoutes.js

PURPOSE:
Defines API endpoints for recording user interactions.

FLOW:
Client -> Routes -> Controller

USED BY:
app.js

NEXT FLOW:
interactionController.js

*/
import express from 'express';
const router = express.Router();

import * as interactionController from '../controllers/interactionController.js';
import authMiddleware from '../middleware/authMiddleware.js';

router.post("/", authMiddleware, interactionController.addInteraction);
router.get("/history", authMiddleware, interactionController.getHistory);
router.get("/saved", authMiddleware, interactionController.getSaved);
router.delete("/saved/:itemId", authMiddleware, interactionController.removeSaved);
router.delete("/:interactionType/:itemId", authMiddleware, interactionController.removeInteraction);

export default router;