const express = require('express');
const router = express.Router();
const { getAllUsers, changeUserRole, deleteUser, getStats } = require('./admin.controller');
const { protect } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/roleCheck');

router.use(protect, restrictTo('admin'));
router.get('/users', getAllUsers);
router.get('/stats', getStats);
router.patch('/users/:id/role', changeUserRole);
router.delete('/users/:id', deleteUser);

module.exports = router;
