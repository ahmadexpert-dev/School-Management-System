import api from './api';

export const listDepartments = () => api.get('/departments').then((r) => r.data.departments);
export const createDepartment = (data) => api.post('/departments', data).then((r) => r.data.department);
export const updateDepartment = (id, data) => api.put(`/departments/${id}`, data).then((r) => r.data.department);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`);
