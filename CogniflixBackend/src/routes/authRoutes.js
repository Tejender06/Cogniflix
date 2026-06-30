/*
FILE: authRoutes.js

PURPOSE:
Defines API endpoints for user authentication.

FLOW:
Client -> Routes -> Controller

USED BY:
app.js

NEXT FLOW:
authController.js

*/
import express from 'express';
const router = express.Router();

import {
  register,
  login,
  logout,
} from '../controllers/authController.js';

import protect from '../middleware/authMiddleware.js';

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

router.get("/me", protect, (req, res) => {
  res.json({ user: req.user });
});

export default router;