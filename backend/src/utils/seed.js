require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();
  await User.deleteMany();
  await Task.deleteMany();

  const admin = await User.create({ name: 'Admin User', email: 'admin@primetrade.ai', password: 'admin123', role: 'admin' });
  const user1 = await User.create({ name: 'Arya Verma', email: 'arya@example.com', password: 'user123', role: 'user' });
  const user2 = await User.create({ name: 'Jane Doe', email: 'jane@example.com', password: 'user123', role: 'user' });

  await Task.insertMany([
    { title: 'Design database schema', description: 'Create ERD and Mongoose models', status: 'done', priority: 'high', owner: user1._id },
    { title: 'Build REST API', description: 'Implement CRUD endpoints with Express', status: 'in-progress', priority: 'high', owner: user1._id },
    { title: 'Setup JWT Auth', description: 'Register, login, and protect routes', status: 'todo', priority: 'medium', owner: user1._id },
    { title: 'Write API docs', description: 'Add Swagger annotations to all routes', status: 'todo', priority: 'low', owner: user2._id },
    { title: 'Deploy to production', description: 'Docker + cloud deployment', status: 'todo', priority: 'high', owner: user2._id },
  ]);

  console.log('✅ Database seeded successfully!');
  console.log('Admin: admin@primetrade.ai / admin123');
  console.log('User:  arya@example.com / user123');
  process.exit(0);
};

seed().catch((err) => { console.error(err); process.exit(1); });
