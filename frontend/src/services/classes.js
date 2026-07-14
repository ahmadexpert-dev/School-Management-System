import api from './api';
import { compareClassNames } from '../utils/classOrder';

export const listClasses = () =>
  api.get('/classes').then((r) => [...r.data.classes].sort((a, b) => compareClassNames(a.className, b.className)));
export const getClass = (id) => api.get(`/classes/${id}`).then((r) => r.data.class);
export const createClass = (data) => api.post('/classes', data).then((r) => r.data.class);
export const updateClass = (id, data) => api.put(`/classes/${id}`, data).then((r) => r.data.class);
export const deleteClass = (id) => api.delete(`/classes/${id}`);
export const assignTeacher = (classId, teacherId) =>
  api.post(`/classes/${classId}/teachers`, { teacherId }).then((r) => r.data.assignment);
export const unassignTeacher = (classId, teacherId) =>
  api.delete(`/classes/${classId}/teachers/${teacherId}`);
