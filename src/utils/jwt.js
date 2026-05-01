/*
FILE: jwt.js

PURPOSE:
Provides utility functions for generating and verifying JSON Web Tokens.

FLOW:
Service -> Util -> Value Return

USED BY:
authService.js, authMiddleware.js

NEXT FLOW:
None

*/
import jwt from 'jsonwebtoken';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

export { generateToken };