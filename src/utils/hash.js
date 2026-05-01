/*
FILE: hash.js

PURPOSE:
Provides utility functions for hashing and comparing passwords.

FLOW:
Service -> Util -> Value Return

USED BY:
authService.js

NEXT FLOW:
None

*/
import bcrypt from 'bcrypt';

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

export { hashPassword, comparePassword };