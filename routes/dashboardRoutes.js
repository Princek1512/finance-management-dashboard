const express = require('express');
const {
  getSummary,
  getCategoryTotals,
  getRecentTransactions,
  getMonthlyTrends,
  getFullDashboard,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getFullDashboard);
router.get('/summary', getSummary);
router.get('/categories', getCategoryTotals);
router.get('/recent', getRecentTransactions);
router.get('/trends', getMonthlyTrends);

module.exports = router;
