const User = require('../../models/User');
const Task = require('../../models/Task');
const { sendSuccess, sendError } = require('../../utils/response');
const redis = require('../../config/redis');

const STATS_CACHE_TTL = 60; // 60 seconds for stats

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       403:
 *         description: Forbidden
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').lean();

    // Attach task counts
    const userIds = users.map(u => u._id);
    const taskCounts = await Task.aggregate([
      { $match: { owner: { $in: userIds } } },
      { $group: { _id: '$owner', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    taskCounts.forEach(t => { countMap[t._id.toString()] = t.count; });

    const enriched = users.map(u => ({ ...u, taskCount: countMap[u._id.toString()] || 0 }));
    return sendSuccess(res, 200, 'Users fetched.', { users: enriched, total: enriched.length });
  } catch (err) { next(err); }
};

/**
 * @swagger
 * /admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Change a user role (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [user, admin] }
 *     responses:
 *       200:
 *         description: Role updated
 */
const changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return sendError(res, 400, 'Role must be user or admin.');
    if (req.params.id === req.user._id.toString()) return sendError(res, 400, 'You cannot change your own role.');

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return sendError(res, 404, 'User not found.');

    return sendSuccess(res, 200, `User role updated to ${role}.`, { user });
  } catch (err) { next(err); }
};

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a user and their tasks (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) return sendError(res, 400, 'You cannot delete yourself.');

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return sendError(res, 404, 'User not found.');

    await Task.deleteMany({ owner: req.params.id });

    // Invalidate stats cache after user deletion
    try { await redis.del('admin:stats'); } catch (err) { /* non-blocking */ }

    return sendSuccess(res, 200, 'User and their tasks deleted successfully.');
  } catch (err) { next(err); }
};

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get platform statistics (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform stats
 */
const getStats = async (req, res, next) => {
  try {
    // Check Redis cache first
    try {
      const cached = await redis.get('admin:stats');
      if (cached) {
        const parsed = JSON.parse(cached);
        return sendSuccess(res, 200, 'Stats fetched (cached).', parsed);
      }
    } catch (err) {
      // If Redis is down, fall through to DB
    }

    const [totalUsers, totalTasks, tasksByStatus, tasksByPriority] = await Promise.all([
      User.countDocuments(),
      Task.countDocuments(),
      Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
    ]);

    const statsData = { totalUsers, totalTasks, tasksByStatus, tasksByPriority };

    // Cache the stats in Redis
    try {
      await redis.setex('admin:stats', STATS_CACHE_TTL, JSON.stringify(statsData));
    } catch (err) {
      // Non-blocking
    }

    return sendSuccess(res, 200, 'Stats fetched.', statsData);
  } catch (err) { next(err); }
};

module.exports = { getAllUsers, changeUserRole, deleteUser, getStats };
