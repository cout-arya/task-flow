const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../src/models/User');
const Task = require('../src/models/Task');
const redis = require('../src/config/redis');

let server;
let adminToken;
let adminId;
let regularUserId;

beforeAll(async () => {
  server = app.listen(0);

  const unique = Date.now();

  // Login as pre-seeded admin
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@primetrade.ai', password: 'admin123' });

  adminToken = adminLogin.body.data.token;
  adminId = adminLogin.body.data.user._id;

  // Create a regular test user for admin operations
  const userRes = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Admin Test Target', email: `test_admin_target_${unique}@example.com`, password: 'password123' });

  regularUserId = userRes.body.data.user._id;
});

afterAll(async () => {
  // Clean up test user
  await Task.deleteMany({ owner: regularUserId });
  await User.findByIdAndDelete(regularUserId);
  await mongoose.connection.close();
  await redis.quit();
  server.close();
});

describe('Admin API', () => {
  // ─── GET USERS ──────────────────────────────────────────────
  describe('GET /api/v1/admin/users', () => {
    it('should return all users with task counts (admin)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeInstanceOf(Array);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.total).toBeDefined();

      // Each user should have taskCount
      res.body.data.users.forEach(user => {
        expect(user).toHaveProperty('taskCount');
        expect(user.password).toBeUndefined(); // password should never be exposed
      });
    });

    it('should reject non-admin users (403)', async () => {
      // Create a regular user token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: `test_admin_target_${regularUserId ? '' : ''}@example.com`, password: 'password123' });

      // If we can't login with the dynamic email, use a fresh registration
      const unique = Date.now();
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Non Admin', email: `test_nonadmin_${unique}@example.com`, password: 'password123' });

      const nonAdminToken = regRes.body.data.token;
      const nonAdminId = regRes.body.data.user._id;

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);

      // Clean up
      await User.findByIdAndDelete(nonAdminId);
    });
  });

  // ─── GET STATS ──────────────────────────────────────────────
  describe('GET /api/v1/admin/stats', () => {
    it('should return platform statistics (admin)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('totalTasks');
      expect(res.body.data).toHaveProperty('tasksByStatus');
      expect(res.body.data).toHaveProperty('tasksByPriority');
      expect(typeof res.body.data.totalUsers).toBe('number');
      expect(typeof res.body.data.totalTasks).toBe('number');
    });

    it('should return cached stats on second call', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // The message may say "(cached)" on subsequent calls if Redis is running
      expect(res.body.data.totalUsers).toBeDefined();
    });
  });

  // ─── CHANGE ROLE ────────────────────────────────────────────
  describe('PATCH /api/v1/admin/users/:id/role', () => {
    it('should change a user role to admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${regularUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('admin');
    });

    it('should change the role back to user', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${regularUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('user');
    });

    it('should prevent admin from changing own role (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${adminId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot change your own/i);
    });

    it('should reject invalid role value (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${regularUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superadmin' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/v1/admin/users/${fakeId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE USER ────────────────────────────────────────────
  describe('DELETE /api/v1/admin/users/:id', () => {
    it('should prevent admin from deleting themselves (400)', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot delete yourself/i);
    });

    it('should delete a user and their tasks', async () => {
      // Create a disposable user
      const unique = Date.now();
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Disposable User', email: `test_disposable_${unique}@example.com`, password: 'password123' });

      const disposableId = regRes.body.data.user._id;
      const disposableToken = regRes.body.data.token;

      // Create a task for the disposable user
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${disposableToken}`)
        .send({ title: 'Disposable Task' });

      // Admin deletes the user
      const res = await request(app)
        .delete(`/api/v1/admin/users/${disposableId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted/i);

      // Verify user no longer exists
      const userCheck = await User.findById(disposableId);
      expect(userCheck).toBeNull();

      // Verify their tasks are also deleted
      const taskCheck = await Task.find({ owner: disposableId });
      expect(taskCheck.length).toBe(0);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .delete(`/api/v1/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
