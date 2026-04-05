const Record = require('../models/Record');
const catchAsync = require('../utils/catchAsync');

exports.getSummary = catchAsync(async (req, res) => {
  const [summary] = await Record.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] },
        },
        totalExpense: {
          $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalIncome: 1,
        totalExpense: 1,
        netBalance: { $subtract: ['$totalIncome', '$totalExpense'] },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: summary || { totalIncome: 0, totalExpense: 0, netBalance: 0 },
  });
});

exports.getCategoryTotals = catchAsync(async (req, res) => {
  const { type } = req.query;
  const matchStage = { isDeleted: false };
  if (type && ['income', 'expense'].includes(type)) matchStage.type = type;

  const categories = await Record.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { category: '$category', type: '$type' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        category: '$_id.category',
        type: '$_id.type',
        total: 1,
        count: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  res.status(200).json({ status: 'success', data: { categories } });
});

exports.getRecentTransactions = catchAsync(async (req, res) => {
  const records = await Record.find({ isDeleted: false })
    .sort({ date: -1 })
    .limit(5)
    .populate('userId', 'name email');

  res.status(200).json({ status: 'success', data: { records } });
});

exports.getMonthlyTrends = catchAsync(async (req, res) => {
  const { year } = req.query;
  const matchStage = { isDeleted: false };

  if (year) {
    const y = Number(year);
    matchStage.date = {
      $gte: new Date(`${y}-01-01`),
      $lte: new Date(`${y}-12-31`),
    };
  }

  const trends = await Record.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          type: '$type',
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: { year: '$_id.year', month: '$_id.month' },
        entries: {
          $push: { type: '$_id.type', total: '$total', count: '$count' },
        },
      },
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        income: {
          $sum: {
            $map: {
              input: {
                $filter: { input: '$entries', cond: { $eq: ['$$this.type', 'income'] } },
              },
              in: '$$this.total',
            },
          },
        },
        expense: {
          $sum: {
            $map: {
              input: {
                $filter: { input: '$entries', cond: { $eq: ['$$this.type', 'expense'] } },
              },
              in: '$$this.total',
            },
          },
        },
      },
    },
    { $sort: { year: 1, month: 1 } },
  ]);

  res.status(200).json({ status: 'success', data: { trends } });
});

exports.getFullDashboard = catchAsync(async (req, res) => {
  const [summaryResult, categories, recentRecords, trends] = await Promise.all([
    Record.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] },
          },
          totalExpense: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalIncome: 1,
          totalExpense: 1,
          netBalance: { $subtract: ['$totalIncome', '$totalExpense'] },
        },
      },
    ]),
    Record.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id.category',
          type: '$_id.type',
          total: 1,
        },
      },
      { $sort: { total: -1 } },
    ]),
    Record.find({ isDeleted: false })
      .sort({ date: -1 })
      .limit(5)
      .populate('userId', 'name email'),
    Record.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      {
        $group: {
          _id: { year: '$_id.year', month: '$_id.month' },
          entries: { $push: { type: '$_id.type', total: '$total' } },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          income: {
            $sum: {
              $map: {
                input: {
                  $filter: { input: '$entries', cond: { $eq: ['$$this.type', 'income'] } },
                },
                in: '$$this.total',
              },
            },
          },
          expense: {
            $sum: {
              $map: {
                input: {
                  $filter: { input: '$entries', cond: { $eq: ['$$this.type', 'expense'] } },
                },
                in: '$$this.total',
              },
            },
          },
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      summary: summaryResult[0] || { totalIncome: 0, totalExpense: 0, netBalance: 0 },
      categoryTotals: categories,
      recentTransactions: recentRecords,
      monthlyTrends: trends,
    },
  });
});
