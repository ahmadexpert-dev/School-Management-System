import api from './api';

export const listTimetable = (params) => api.get('/timetable', { params }).then((r) => r.data.entries);
export const listClassSections = (classId) =>
  api.get(`/timetable/classes/${classId}/sections`).then((r) => r.data.sections);
export const createTimetableEntry = (data) => api.post('/timetable', data).then((r) => r.data.entry);
export const updateTimetableEntry = (id, data) => api.put(`/timetable/${id}`, data).then((r) => r.data.entry);
export const deleteTimetableEntry = (id) => api.delete(`/timetable/${id}`);
