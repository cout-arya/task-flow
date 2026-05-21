const User = require('../../models/User');
const { generateToken } = require('../../utils/jwt');
const { sendSuccess, sendError } = require('../../utils/response');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Arya Verma }
 *               email: { type: string, example: arya@example.com }
 *               password: { type: string, example: secret123 }
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       409:
 *         description: Email already exists
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return sendError(res, 409, 'Email already registered.');
    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    return sendSuccess(res, 201, 'Registration successful!', { token, user });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive JWT
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: arya@example.com }
 *               password: { type: string, example: secret123 }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401:
 *         description: Invalid credentials
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, 401, 'Invalid email or password.');
    }
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    const token = generateToken(user._id);
    const userObj = user.toJSON();
    return sendSuccess(res, 200, 'Login successful!', { token, user: userObj });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('taskCount');
    return sendSuccess(res, 200, 'User profile fetched.', { user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
