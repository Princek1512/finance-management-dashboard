const Record = require('../models/Record');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.createRecord = catchAsync(async (req, res) => {
  const { amount, type, category, date, note } = req.body;

  const record = await Record.create({
    amount,
    type,
    category,
    date: date || Date.now(),
    note,
    userId: req.user._id,
  });

  res.status(201).json({ status: 'success', data: { record } });
});

exports.getRecords = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    type,
    category,
    startDate,
    endDate,
    search,
    sortBy = 'date',
    order = 'desc',
  } = req.query;

  const filter = { isDeleted: false };
  if (type && ['income', 'expense'].includes(type)) filter.type = type;
  if (category) filter.category = { $regex: category, $options: 'i' };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  if (search) {
    const regex = { $regex: search, $options: 'i' };
    filter.$or = [{ category: regex }, { note: regex }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sortOrder = order === 'asc' ? 1 : -1;
  const allowedSortFields = ['date', 'amount', 'createdAt'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'date';

  const [records, total] = await Promise.all([
    Record.find(filter)
      .populate('userId', 'name email')
      .skip(skip)
      .limit(Number(limit))
      .sort({ [sortField]: sortOrder }),
    Record.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: records.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: { records },
  });
});

exports.getRecord = catchAsync(async (req, res, next) => {
  const record = await Record.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).populate('userId', 'name email');

  if (!record) return next(new AppError('Record not found.', 404));

  res.status(200).json({ status: 'success', data: { record } });
});

exports.updateRecord = catchAsync(async (req, res, next) => {
  const { amount, type, category, date, note } = req.body;
  const allowedUpdates = {};

  if (amount !== undefined) {
    if (typeof amount !== 'number' || amount <= 0) {
      return next(new AppError('Amount must be a positive number.', 400));
    }
    allowedUpdates.amount = amount;
  }
  if (type) {
    if (!['income', 'expense'].includes(type)) {
      return next(new AppError("Type must be 'income' or 'expense'.", 400));
    }
    allowedUpdates.type = type;
  }
  if (category) allowedUpdates.category = category;
  if (date) {
    if (isNaN(new Date(date).getTime())) return next(new AppError('Invalid date format.', 400));
    allowedUpdates.date = date;
  }
  if (note !== undefined) allowedUpdates.note = note;

  const record = await Record.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    allowedUpdates,
    { new: true, runValidators: true }
  );

  if (!record) return next(new AppError('Record not found.', 404));

  res.status(200).json({ status: 'success', data: { record } });
});

exports.deleteRecord = catchAsync(async (req, res, next) => {
  const record = await Record.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!record) return next(new AppError('Record not found.', 404));

  res.status(200).json({ status: 'success', message: 'Record deleted successfully.' });
});
