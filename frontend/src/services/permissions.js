import api from './api';

export const listAvailablePermissions = () => api.get('/permissions').then((r) => r.data.permissions);
export const listUserPermissions = (userId) =>
  api.get(`/permissions/users/${userId}`).then((r) => r.data.permissions);
export const setUserPermissions = (userId, keys) =>
  api.put(`/permissions/users/${userId}`, { keys }).then((r) => r.data.permissions);
