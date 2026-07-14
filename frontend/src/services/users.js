import api from './api';

export const listUsers = () => api.get('/users').then((r) => r.data.users);
export const createUser = (data) => api.post('/users', data).then((r) => r.data.user);
export const updateUser = (id, data) => api.put(`/users/${id}`, data).then((r) => r.data.user);
export const deleteUser = (id) => api.delete(`/users/${id}`);
