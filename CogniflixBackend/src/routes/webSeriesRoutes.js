import express from 'express';
import { getWebSeries } from '../controllers/content.controller.js';

const router = express.Router();

router.get('/', getWebSeries);

export default router;

