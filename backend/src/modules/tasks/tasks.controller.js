const Task = require('../../models/Task');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');
const redis = require('../../config/redis');

const CACHE_TTL = 300; // 5 minutes

/**
 * Build a Redis cache key for a user's task list query
 */
const buildCacheKey = (userId, role, query) => {
  const { status, priority, page = 1, limit = 10 } = query;
  return `tasks:${role}:${userId}:s=${status || ''}:p=${priority || ''}:pg=${page}:l=${limit}`;
};

/**
 * Invalidate all task caches for a given user
 */
const invalidateUserTaskCache = async (userId) => {
  try {
    const stream = redis.scanStream({ match: `tasks:*:${userId}:*`, count: 100 });
    const pipeline = redis.pipeline();
    let count = 0;

    for await (const keys of stream) {
      keys.forEach((key) => { pipeline.del(key); count++; });
    }

    // Also clear admin caches since they see all tasks
    const adminStream = redis.scanStream({ match: 'tasks:admin:*', count: 100 });
    for await (const keys of adminStream) {
      keys.forEach((key) => { pipeline.del(key); count++; });
    }

    // Clear stats cache too
    pipeline.del('admin:stats');

    if (count > 0) await pipeline.exec();
  } catch (err) {
    // Redis errors should not break functionality
    console.error('Redis cache invalidation error:', err.message);
  }
};

/**
 * @swagger
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Get all tasks (admin sees all, user sees own)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [todo, in-progress, done] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of tasks
 */
const getAllTasks = async (req, res, next) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    const cacheKey = buildCacheKey(req.user._id, req.user.role, req.query);

    // Check Redis cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return res.status(200).json({ ...parsed, _cached: true });
      }
    } catch (err) {
      // If Redis is down, fall through to DB
    }

    const filter = {};
    if (req.user.role !== 'admin') filter.owner = req.user._id;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const skip = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('owner', 'name email')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Task.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    const responseBody = {
      success: true,
      message: 'Tasks fetched.',
      data: tasks,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages },
    };

    // Cache the response in Redis
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(responseBody));
    } catch (err) {
      // Non-blocking
    }

    return res.status(200).json(responseBody);
  } catch (err) { next(err); }
};

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get a single task by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('assignedTo', 'name email');

    if (!task) return sendError(res, 404, 'Task not found.');

    if (req.user.role !== 'admin' && task.owner._id.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Not authorized to view this task.');
    }

    return sendSuccess(res, 200, 'Task fetched.', { task });
  } catch (err) { next(err); }
};

/**
 * @swagger
 * /tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [todo, in-progress, done] }
 *               priority: { type: string, enum: [low, medium, high] }
 *               dueDate: { type: string, format: date }
 *               tags: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Task created
 */
const createTask = async (req, res, next) => {
  try {
    const task = await Task.create({ ...req.body, owner: req.user._id });
    await task.populate('owner', 'name email');

    // Invalidate cache after mutation
    await invalidateUserTaskCache(req.user._id);

    return sendSuccess(res, 201, 'Task created successfully!', { task });
  } catch (err) { next(err); }
};

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     tags: [Tasks]
 *     summary: Update a task
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
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [todo, in-progress, done] }
 *               priority: { type: string, enum: [low, medium, high] }
 *     responses:
 *       200:
 *         description: Task updated
 *       404:
 *         description: Task not found
 */
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return sendError(res, 404, 'Task not found.');

    if (req.user.role !== 'admin' && task.owner.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Not authorized to update this task.');
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('owner', 'name email');

    // Invalidate cache after mutation
    await invalidateUserTaskCache(task.owner.toString());

    return sendSuccess(res, 200, 'Task updated successfully!', { task: updated });
  } catch (err) { next(err); }
};

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete a task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task deleted
 *       404:
 *         description: Task not found
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return sendError(res, 404, 'Task not found.');

    if (req.user.role !== 'admin' && task.owner.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Not authorized to delete this task.');
    }

    await task.deleteOne();

    // Invalidate cache after mutation
    await invalidateUserTaskCache(task.owner.toString());

    return sendSuccess(res, 200, 'Task deleted successfully!');
  } catch (err) { next(err); }
};

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask };
