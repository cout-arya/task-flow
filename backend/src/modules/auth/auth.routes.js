const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('./auth.controller');
const { protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { registerSchema, loginSchema } = require('./auth.validation');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);

module.exports = router;
