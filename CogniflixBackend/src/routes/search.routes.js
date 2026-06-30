/*
FILE: search.routes.js

PURPOSE:
Defines API endpoints for searching content across the database.

FLOW:
Client -> Routes -> search.controller.js

USED BY:
app.js

NEXT FLOW:
search.controller.js

*/
import express from 'express';
import { search } from '../controllers/search.controller.js';

const router = express.Router();

router.get('/', search);

export default router;
