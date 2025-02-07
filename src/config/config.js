require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cs_quiz_app',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiration: '24h',
}; 