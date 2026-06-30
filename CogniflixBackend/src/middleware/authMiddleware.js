import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  try {
    let token;

    // 1. Check Authorization header (fallback support)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2. Check cookies (primary)
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    // No token found
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired", expired: true });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

export default authMiddleware;