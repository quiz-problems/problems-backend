const admin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = admin; 