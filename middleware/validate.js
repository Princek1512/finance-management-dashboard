const AppError = require('../utils/AppError');

const validateRecord = (req, res, next) => {
  const { amount, type, category, date } = req.body;

  if (amount === undefined || amount === null) {
    return next(new AppError('Amount is required.', 400));
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return next(new AppError('Amount must be a positive number.', 400));
  }
  if (!type || !['income', 'expense'].includes(type)) {
    return next(new AppError("Type must be 'income' or 'expense'.", 400));
  }
  if (!category || typeof category !== 'string' || category.trim() === '') {
    return next(new AppError('Category is required.', 400));
  }
  if (date && isNaN(new Date(date).getTime())) {
    return next(new AppError('Invalid date format.', 400));
  }

  next();
};

const validateUser = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || name.trim() === '') return next(new AppError('Name is required.', 400));
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return next(new AppError('A valid email is required.', 400));
  if (!password || password.length < 6) return next(new AppError('Password must be at least 6 characters.', 400));

  next();
};

const validateUserUpdate = (req, res, next) => {
  const { role, status, name } = req.body;

  if (role && !['viewer', 'analyst', 'admin'].includes(role)) {
    return next(new AppError("Role must be 'viewer', 'analyst', or 'admin'.", 400));
  }
  if (status && !['active', 'inactive'].includes(status)) {
    return next(new AppError("Status must be 'active' or 'inactive'.", 400));
  }
  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return next(new AppError('Name must be a non-empty string.', 400));
  }

  next();
};

module.exports = { validateRecord, validateUser, validateUserUpdate };
