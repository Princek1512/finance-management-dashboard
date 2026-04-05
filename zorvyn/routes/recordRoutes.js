const express = require('express');
const {
  createRecord,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
} = require('../controllers/recordController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateRecord } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/', restrictTo('analyst', 'admin'), getRecords);
router.get('/:id', restrictTo('analyst', 'admin'), getRecord);
router.post('/', restrictTo('admin'), validateRecord, createRecord);
router.patch('/:id', restrictTo('admin'), updateRecord);
router.delete('/:id', restrictTo('admin'), deleteRecord);

module.exports = router;
