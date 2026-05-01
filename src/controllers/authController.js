import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === "production";

// ================= REGISTER =================
const register = async (req, res) => {
  try {
    const { name, email, password, preferred_language = 'en', location = 'Global' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, preferred_language, location)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, preferred_language, location`,
      [name, email, hashedPassword, preferred_language, location]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: err.message });
  }
};

// ================= LOGIN =================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);

    // ✅ COOKIE CONFIG (Environment specific)
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,         // true in prod for HTTPS
      sameSite: isProduction ? "none" : "lax", // none in prod for cross-domain
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
      },
      token: token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= LOGOUT =================
const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });

  res.json({ message: "Logged out successfully" });
};

// ================= GET CURRENT USER =================
const getCurrentUser = (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      id: decoded.id,
      email: decoded.email,
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export {
  register,
  login,
  logout,
  getCurrentUser,
};