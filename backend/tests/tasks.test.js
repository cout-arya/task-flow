const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../src/models/User');
const Task = require('../src/models/Task');
const redis = require('../src/config/redis');

let server;
let userToken;
let userId;
let taskId;

beforeAll(async () => {
  server = app.listen(0);

  // Create a test user and get token
  const unique = Date.now();
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Task Test User', email: `test_task_${unique}@example.com`, password: 'password123' });

  userToken = res.body.data.token;
  userId = res.body.data.user._id;
});

afterAll(async () => {
  await Task.deleteMany({ owner: userId });
  await User.deleteMany({ _id: userId });
  await mongoose.connection.close();
  await redis.quit();
  server.close();
});

describe('Tasks API', () => {
  // ─── CREATE ─────────────────────────────────────────────────
  describe('POST /api/v1/tasks', () => {
    it('should create a new task', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Test Task One', description: 'A test task', priority: 'high', status: 'todo' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.task.title).toBe('Test Task One');
      expect(res.body.data.task.priority).toBe('high');
      expect(res.body.data.task.owner._id).toBe(userId);
      taskId = res.body.data.task._id;
    });

    it('should create a second task for pagination testing', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Test Task Two', status: 'in-progress', priority: 'low' })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('should fail without a title (400)', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ description: 'No title' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid status (400)', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Bad Status', status: 'invalid-status' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail without auth token (401)', async () => {
      await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'No Auth' })
        .expect(401);
    });
  });

  // ─── READ ──────────────────────────────────────────────────
  describe('GET /api/v1/tasks', () => {
    it('should return all tasks for the user', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter tasks by status', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?status=todo')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.forEach(task => expect(task.status).toBe('todo'));
    });

    it('should filter tasks by priority', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?priority=high')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.forEach(task => expect(task.priority).toBe('high'));
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?page=1&limit=1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should return a single task by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.task._id).toBe(taskId);
      expect(res.body.data.task.title).toBe('Test Task One');
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/v1/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────
  describe('PUT /api/v1/tasks/:id', () => {
    it('should update a task', async () => {
      const res = await request(app)
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated Test Task', status: 'done' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.task.title).toBe('Updated Test Task');
      expect(res.body.data.task.status).toBe('done');
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .put(`/api/v1/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Ghost Task' })
        .expect(404);
    });
  });

  // ─── DELETE ────────────────────────────────────────────────
  describe('DELETE /api/v1/tasks/:id', () => {
    it('should delete a task', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('should return 404 when deleting already-deleted task', async () => {
      await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });
});
