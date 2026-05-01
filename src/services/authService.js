/*
FILE: authService.js

PURPOSE:
Implements business logic for user registration and login.

FLOW:
Controller -> Service -> Repository

USED BY:
authController.js

NEXT FLOW:
userRepository.js

*/
import * as userRepo from '../repositories/userRepository.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { generateToken } from '../utils/jwt.js';

async function registerUser(name, email, password) {
  const existing = await userRepo.findUserByEmail(email);
  if (existing) throw new Error("User already exists");

  const hashed = await hashPassword(password);
  return await userRepo.createUser(name, email, hashed);
}

async function loginUser(email, password) {
  const user = await userRepo.findUserByEmail(email);
  if (!user) throw new Error("Invalid credentials");

  const match = await comparePassword(password, user.password);
  if (!match) throw new Error("Invalid credentials");

  const token = generateToken({ id: user.id });

  return { token };
}

export { registerUser, loginUser };