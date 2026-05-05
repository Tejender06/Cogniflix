/*
FILE: protectedRoutes.js

PURPOSE:
Defines a generic set of protected endpoints.

FLOW:
Client -> Middleware -> Routes

USED BY:
app.js

NEXT FLOW:
Various Controllers

*/
import express from 'express';
const router = express.Router();

import authMiddleware from '../middleware/authMiddleware.js';
import interactionRoutes from './interactionRoutes.js';

router.use(authMiddleware);
router.use("/interactions", interactionRoutes);

export default router;