const jsonwebtoken = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../errors/AppError');

function signToken(payload) {
  return jsonwebtoken.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn
  });
}

function verifyToken(token) {
  try {
    return jsonwebtoken.verify(token, env.jwt.secret);
  } catch (error) {
    throw new AppError('JWT 已过期或无效', 401, 'INVALID_TOKEN');
  }
}

function decodeToken(token) {
  return jsonwebtoken.decode(token);
}

module.exports = {
  signToken,
  verifyToken,
  decodeToken
};
