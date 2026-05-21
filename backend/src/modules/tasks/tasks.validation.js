const Joi = require('joi');

const createTaskSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).allow('').optional(),
  status: Joi.string().valid('todo', 'in-progress', 'done').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  dueDate: Joi.date().iso().optional().allow(null),
  tags: Joi.array().items(Joi.string()).optional(),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).allow('').optional(),
  status: Joi.string().valid('todo', 'in-progress', 'done').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  dueDate: Joi.date().iso().optional().allow(null),
  tags: Joi.array().items(Joi.string()).optional(),
});

module.exports = { createTaskSchema, updateTaskSchema };
