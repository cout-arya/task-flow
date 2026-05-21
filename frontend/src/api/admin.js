import api from './axios';
export const getAllUsersAPI = () => api.get('/admin/users');
export const getStatsAPI = () => api.get('/admin/stats');
export const changeRoleAPI = (id, role) => api.patch(`/admin/users/${id}/role`, { role });
export const deleteUserAPI = (id) => api.delete(`/admin/users/${id}`);
