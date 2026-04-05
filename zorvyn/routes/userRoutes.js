const express = require('express');
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getMe,
} = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateUserUpdate } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/me', getMe);

router.use(restrictTo('admin'));
router.get('/', getAllUsers);
router.get('/:id', getUser);
router.patch('/:id', validateUserUpdate, updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
