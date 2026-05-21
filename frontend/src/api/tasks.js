import api from './axios';
export const getTasksAPI = (params) => api.get('/tasks', { params });
export const getTaskAPI = (id) => api.get(`/tasks/${id}`);
export const createTaskAPI = (data) => api.post('/tasks', data);
export const updateTaskAPI = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTaskAPI = (id) => api.delete(`/tasks/${id}`);
