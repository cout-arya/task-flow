const express = require('express');
const router = express.Router();
const { getAllTasks, getTaskById, createTask, updateTask, deleteTask } = require('./tasks.controller');
const { protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { createTaskSchema, updateTaskSchema } = require('./tasks.validation');

router.use(protect);
router.get('/', getAllTasks);
router.post('/', validate(createTaskSchema), createTask);
router.get('/:id', getTaskById);
router.put('/:id', validate(updateTaskSchema), updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
