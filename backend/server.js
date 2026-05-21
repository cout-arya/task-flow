require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');

const connectDB = require('./src/config/db');
const swaggerSpec = require('./src/config/swagger');
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');

const authRoutes = require('./src/modules/auth/auth.routes');
const taskRoutes = require('./src/modules/tasks/tasks.routes');
const adminRoutes = require('./src/modules/admin/admin.routes');

const app = express();

// Connect DB
connectDB();

// Security middleware
app.use(helmet());
app.use(mongoSanitize());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (mobile apps, Postman, health checks)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests, please try again later.' });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts, please try again later.' });
app.use('/api/', limiter);
app.use('/api/v1/auth', authLimiter);

// Logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { background: linear-gradient(135deg, #6366f1, #8b5cf6); }',
  customSiteTitle: 'Intern Assignment API Docs',
}));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date(), version: '1.0.0' }));

// 404 handler
app.use('*', (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` }));

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Only start listening when run directly (not imported by tests)
if (require.main === module) {
  app.listen(PORT, () => logger.info(`🚀 Server running on http://localhost:${PORT}`));
}

module.exports = app;
